const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');
const os = require('os'); // Import os module for home directory
const db = require('./../db'); // Import our db functions


// Apply borders to a specific range of cells
function applyBorders(worksheet, startRow, endRow, totalColumns) {
    for (let rowNum = startRow; rowNum <= endRow; rowNum++) {
        const row = worksheet.getRow(rowNum);
        for (let colNum = 1; colNum <= totalColumns; colNum++) {
            const cell = row.getCell(colNum);
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' },
            };
        }
    }
}



// Function to format the date to 'YYYY-MM-DD HH:mm:ss'
function formatDate(dateString, isDateOnly = false) {
    const date = new Date(dateString);

    // Get the individual components of the date
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Month is 0-indexed
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');

    // If it's only a date (e.g., '2025-02-23'), return 'YYYY-MM-DD'
    if (isDateOnly) {
        return `${year}-${month}-${day}`;
    }

    // Otherwise, return 'YYYY-MM-DD HH:mm:ss'
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// Function to combine duplicate orders by the same customer
function combineDuplicateOrders(orders) {
    const combined = {};

    orders.forEach(order => {
        const key = `${order.orderDate}-${order.area}-${order.name}`;

        if (!combined[key]) {
            combined[key] = { ...order, orderDetails: {}, ids: [], msgDatetimes: [] };
        }

        // Avoid duplicate IDs and message datetimes
        if (!combined[key].ids.includes(order.id)) {
            combined[key].ids.push(order.id);
            combined[key].msgDatetimes.push(`${order.id}: ${formatDate(order.msgDatetime)}`);
        }

        const currentDetails = combined[key].orderDetails;

        order.orderDetails.split(/[;,]/).forEach(item => {
            const match = item.trim().match(/(.+?)\s*-\s*(\d+(\.\d+)?)\s*([a-zA-Z]*)/);
            if (match) {
                const [_, itemName, qty, __, unit] = match;
                const quantity = parseFloat(qty);
                // Convert item name and unit to lowercase for case-insensitive matching
                const itemKey = `${itemName.trim().toLowerCase()}-${unit.trim().toLowerCase()}`;

                if (currentDetails[itemKey]) {
                    // Track both the sum and individual quantities
                    currentDetails[itemKey].sum += quantity;
                    currentDetails[itemKey].details.push(quantity);
                } else {
                    currentDetails[itemKey] = { sum: quantity, details: [quantity] };
                }
            }
        });
    });

    return Object.values(combined).map(order => ({
        ...order,
        id: order.ids.join(" + "),
        msgDatetime: order.msgDatetimes.join(" ; "),
        orderDetails: Object.entries(order.orderDetails)
            .map(([nameUnit, { sum, details }]) => {
                const [name, unit] = nameUnit.split("-");
                const breakdown = details.length > 1 ? `(${details.join(" + ")})` : "";
                return `${name.trim()} - ${sum}${unit ? unit.trim() : ''} ${breakdown}`.trim();
            })
            .join("\n")
    }));
}


/**
 * Export orders to Excel filtered by:
 * - msgDatetime between startDateTime and endDateTime
 * - orderDate equals the provided orderDate
 * - area equals orderArea (if provided)
 */
async function exportExcel(startDateTime, endDateTime, orderDate, orderArea, res) {
    try {
        // Get filtered orders from the database
        const rows = await db.getOrdersWithFilters(startDateTime, endDateTime, orderDate, orderArea);

        if (rows.length === 0) {
            return res.status(404).json({ message: '⚠️ No matching orders found!' });
        }

        // Group rows by area
        const groupedByArea = rows.reduce((acc, row) => {
            acc[row.area] = acc[row.area] || []; // Initialize if not present
            acc[row.area].push(row); // Add the current row to the correct area group
            return acc; // Return the updated accumulator
        }, {});

        /*
         const rows = [
            { id: 1, area: 'North', product: 'A' },
            { id: 2, area: 'South', product: 'B' },
            { id: 3, area: 'North', product: 'C' }
        ];

        become

        {
            "North": [
                { id: 1, area: 'North', product: 'A' },
                { id: 3, area: 'North', product: 'C' }
            ],
            "South": [
                { id: 2, area: 'South', product: 'B' }
            ]
        }
         */


        // Create Excel workbook and worksheet
        const workbook = new ExcelJS.Workbook();
        // const worksheet = workbook.addWorksheet('Orders');





        // Iterate over each area group and add to the worksheet
        Object.entries(groupedByArea).forEach(([area, orders]) => {
            const worksheet = workbook.addWorksheet(area);

            worksheet.mergeCells('A1:C1');
            worksheet.getCell('A1').value = `Order Date: ${orderDate}`;
            worksheet.getCell('A1').font = { bold: true, size: 14 };

            worksheet.mergeCells('A2:C2');
            worksheet.getCell('A2').value = `Message Start Date Time: ${formatDate(startDateTime)}`;
            worksheet.getCell('A2').font = { bold: true, size: 14 };

            worksheet.mergeCells('A3:C3');
            worksheet.getCell('A3').value = `Message End Date Time: ${formatDate(endDateTime)}`;
            worksheet.getCell('A3').font = { bold: true, size: 14 };

            // const startRow = worksheet.rowCount + 2;

            // // Add Order Date
            // worksheet.mergeCells(`A${startRow}:E${startRow}`);
            // worksheet.getCell(`A${startRow}`).value = `Order Date: ${orderDate}`;
            // worksheet.getCell(`A${startRow}`).font = { bold: true, size: 14 };

            // // Add Message Start Date Time
            // const formattedStartDateTime = startDateTime.replace('T', ' ');
            // worksheet.mergeCells(`A${startRow + 1}:E${startRow + 1}`);
            // worksheet.getCell(`A${startRow + 1}`).value = `Message Start Date Time: ${formattedStartDateTime}`;
            // worksheet.getCell(`A${startRow + 1}`).font = { bold: true, size: 14 };

            // // Add Message End Date Time
            // const formattedEndDateTime = endDateTime.replace('T', ' ');
            // worksheet.mergeCells(`A${startRow + 2}:E${startRow + 2}`);
            // worksheet.getCell(`A${startRow + 2}`).value = `Message End Date Time: ${formattedEndDateTime}`;
            // worksheet.getCell(`A${startRow + 2}`).font = { bold: true, size: 14 };

            // // Add Area Header
            // const areaRow = worksheet.rowCount + 2;
            // worksheet.getCell(`A${areaRow}`).value = `Area: ${area}`;
            // worksheet.getCell(`A${areaRow}`).font = { bold: true, size: 12 };

            const headers = Object.keys(orders[0]).filter(key => !['msgDatetime', 'orderDate', 'area'].includes(key));
            worksheet.addRow(headers);

            const combinedOrders = combineDuplicateOrders(orders);

            console.log(combinedOrders);

            // Keep track of starting row number for borders
            const dataStartRow = worksheet.rowCount + 1;


            // Add combined rows to the worksheet
            combinedOrders.forEach(order => {
                const rowData = headers.map(key => order[key]);
                worksheet.addRow(rowData);
            });


            // Apply borders from headers to the last row of this area
            const dataEndRow = worksheet.rowCount; // Capture last row number
            applyBorders(worksheet, dataStartRow - 1, dataEndRow, headers.length);



            // let combinedOrders = {};

            // // Add data rows (exclude msgDatetime, orderDate, area)
            // orders.forEach(row => {





            //     const name = row.name.trim();

            //     if (!combinedOrders[name]) {
            //         // First occurrence of the name: Clone the row
            //         combinedOrders[name] = { ...row };
            //     } else {
            //         // Append the id if the name already exists
            //         combinedOrders[name].id += " + " + row.id;
            //     }



            // });

            // // Add combined rows to the worksheet
            // Object.values(combinedOrders).forEach(row => {
            //     const filteredRow = headers.map(key => row[key]);
            //     worksheet.addRow(filteredRow);
            // });


            // ✅ Move auto-fit columns here (inside the loop)
            worksheet.columns.forEach(column => {
                column.width = 10;
                column.alignment = { wrapText: true };
            });

            worksheet.getColumn(1).width = 12;
            worksheet.getColumn(2).width = 15;
            worksheet.getColumn(3).width = 45;

            const columns = [1, 2, 3];
            columns.forEach((col) => {
                worksheet.getColumn(col).alignment = {
                    horizontal: 'left', // Align text to the left
                    vertical: 'top',    // Align text to the top
                    wrapText: true      // Enable word wrap
                };
            });

        });


        /*
        input:
        {
            "North": [
                { id: 1, product: 'A', quantity: 10, area: 'North' },
                { id: 2, product: 'B', quantity: 5, area: 'North' }
            ],
            "South": [
                { id: 3, product: 'C', quantity: 15, area: 'South' }
            ]
        }
        
        output:
        
        [
            ["North", [{ id: 1, product: 'A' }, { id: 2, product: 'B' }]],
            ["South", [{ id: 3, product: 'C' }]]
        ]
        
        
        
        */

        // // Auto-fit columns for better readability
        // worksheet.columns.forEach(column => {
        //     column.width = 10;
        //     column.alignment = { wrapText: true };
        // });

        // worksheet.getColumn(1).width = 12; // Wraps column C
        // worksheet.getColumn(2).width = 15; // Wraps column C
        // worksheet.getColumn(3).width = 45; // Wraps column C

        // // Apply left-top alignment and word wrap
        // const columns = [1, 2, 3];
        // columns.forEach((col) => {
        //     worksheet.getColumn(col).alignment = {
        //         horizontal: 'left', // Align left
        //         vertical: 'top',    // Align top
        //         wrapText: true      // Enable word wrap
        //     };
        // });



        // Get Downloads folder path
        const downloadDir = path.join(os.homedir(), 'Downloads');

        // Ensure Downloads folder exists
        if (!fs.existsSync(downloadDir)) {
            fs.mkdirSync(downloadDir, { recursive: true });
        }

        // Build a unique filename. Use "all" if orderArea is empty.
        const areaPart = orderArea ? orderArea : 'all';
        const fileName = `orders_${orderDate}_${areaPart}.xlsx`;
        const filePath = path.join(downloadDir, fileName);

        // Write Excel file to disk
        await workbook.xlsx.writeFile(filePath);
        console.log(`✅ Excel file created: ${filePath}`);

        // Send file for download and delete file after download
        res.download(filePath, fileName, (err) => {
            if (err) {
                console.error('❌ Error sending file:', err);
                return res.status(500).json({ message: '❌ Error sending Excel file' });
            }
            fs.unlinkSync(filePath);
        });
    } catch (error) {
        console.error('❌ Error generating Excel:', error);
        throw error;
    }
}

module.exports = exportExcel;
