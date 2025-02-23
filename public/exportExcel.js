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

        // Create Excel workbook and worksheet
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Orders');

        // Add header row using the keys of the first row object
        worksheet.addRow(Object.keys(rows[0]));

        // Add data rows
        rows.forEach(row => worksheet.addRow(Object.values(row)));

        // Auto-fit columns for better readability
        worksheet.columns.forEach(column => {
            column.width = 20;
        });

        // Get Downloads folder path
        const downloadDir = path.join(os.homedir(), 'Downloads');

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