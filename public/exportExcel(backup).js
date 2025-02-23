const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');
const os = require('os'); // Import os module for home directory
const db = require('./../db'); // Import our db functions

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
            acc[row.area] = acc[row.area] || [];
            acc[row.area].push(row);
            return acc;
        }, {});

        // Create Excel workbook and worksheet
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Orders');

        // Add date on top
        worksheet.mergeCells('A1:E1');
        worksheet.getCell('A1').value = `Order Date: ${orderDate}`;
        worksheet.getCell('A1').font = { bold: true, size: 14 };


        const formattedStartDateTime = startDateTime.replace('T', ' ');  // Replace 'T' with a space
        const formattedEndDateTime = endDateTime.replace('T', ' ');  // Replace 'T' with a space

        worksheet.mergeCells('A2:E2');
        worksheet.getCell('A2').value = `Message Start Date Time: ${formattedStartDateTime}`;
        worksheet.getCell('A2').font = { bold: true, size: 14 };

        worksheet.mergeCells('A3:E3');
        worksheet.getCell('A3').value = `Message End Date Time: ${formattedEndDateTime}`;
        worksheet.getCell('A3').font = { bold: true, size: 14 };

        // Iterate over each area group and add to the worksheet
        Object.entries(groupedByArea).forEach(([area, orders]) => {
            // Add area header
            const startRow = worksheet.rowCount + 2;
            worksheet.getCell(`A${startRow}`).value = `Area: ${area}`;
            worksheet.getCell(`A${startRow}`).font = { bold: true, size: 12 };

            // Add headers (excluding msgDatetime, orderDate, area)
            const headers = Object.keys(orders[0]).filter(key => !['msgDatetime', 'orderDate', 'area'].includes(key));
            worksheet.addRow(headers);

            // Add data rows (exclude msgDatetime, orderDate, area)
            orders.forEach(row => {
                const filteredRow = headers.map(key => row[key]);
                worksheet.addRow(filteredRow);
            });
        });

        // Auto-fit columns for better readability
        worksheet.columns.forEach(column => {
            column.width = 20;
        });

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
