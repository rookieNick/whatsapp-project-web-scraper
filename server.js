const express = require('express');
const runScraper = require('./scraper');
const db = require('./db'); // Ensure the DB connection is loaded
const app = express();
const port = 8000;

app.use(express.static('public'));
app.use(express.json());

app.post('/scrape', async (req, res) => {
    const { targetDate, chatName } = req.body;

    if (!targetDate || !chatName) {
        return res.status(400).json({ message: '❌ Missing targetDate or chatName' });
    }

    try {
        console.log(`📅 Starting scraper for: ${chatName} until ${targetDate}`);
        
        await runScraper(chatName, targetDate);

        res.json({ message: '✅ Scraping completed successfully! Please refresh to load the latest orders' });
    } catch (error) {
        console.error('❌ Error running scraper:', error);
        res.status(500).json({ message: '❌ Error running scraper' });
    }
});

// Endpoint to get orders
app.get('/orders', async (req, res) => {
    const { date, location } = req.query;  // Extract filters from the query parameters

    try {
        // Call getOrders function with optional filters
        const orders = await db.getOrders(date, location);
        res.json(orders);  // Send the orders back to the frontend
    } catch (error) {
        console.error('❌ Error fetching orders:', error);
        res.status(500).send('Error fetching orders');
    }
});









app.listen(port, () => {
    console.log(`🚀 Server running on http://localhost:${port}`);
});
