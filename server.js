const express = require('express');
const runScraper = require('./scraper');
const exportExcel = require('./public/exportExcel');
const db = require('./db'); // Ensure the DB connection is loaded
const app = express();
const port = 8000;

app.use(express.static('public'));
app.use(express.json());


// Route to export data to Excel
app.post('/export', async (req, res) => {
    try {
        const { startDateTime, endDateTime, orderDate, orderArea } = req.body;

        // Validate input
        if (!startDateTime || !endDateTime || !orderDate) {
            return res.status(400).json({ message: '❌ Please fill in all fields!' });
        }

        // Call export function with parameters
        await exportExcel(startDateTime, endDateTime, orderDate, orderArea, res);
    } catch (error) {
        console.error('❌ Error exporting orders:', error);
        res.status(500).json({ message: '❌ Error exporting to Excel' });
    }
});


app.post('/scrape', async (req, res) => {
    const { targetDate, chatName } = req.body;

    if (!targetDate || !chatName) {
        return res.status(400).json({ message: '❌ Missing targetDate or chatName' });
    }

    try {
        console.log(`📅 Starting scraper for: ${chatName} until ${targetDate}`);

        // Run scraper and collect incorrect messages
        const incorrectMessages = await runScraper(chatName, targetDate);

        res.json({
            message: '✅ Scraping completed successfully! Please refresh to load the latest orders',
            incorrectMessages
        });
    } catch (error) {
        console.error('❌ Error running scraper:', error);
        res.status(500).json({ message: '❌ Error running scraper' });
    }
});

// Endpoint to get orders
// Endpoint to get orders with customer message date filter
app.get('/orders', async (req, res) => {
    const { startDate, endDate, orderDate, location } = req.query;  // Extract filters from the query parameters

    try {
        // Call getOrders function with customer message date range and location filter
        const orders = await db.getOrders(startDate, endDate, orderDate, location);
        res.json(orders);  // Send the orders back to the frontend
    } catch (error) {
        console.error('❌ Error fetching orders:', error);
        res.status(500).send('Error fetching orders');
    }
});










app.listen(port, () => {
    console.log(`🚀 Server running on http://localhost:${port}`);
});
