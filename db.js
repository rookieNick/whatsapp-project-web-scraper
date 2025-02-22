const mysql = require('mysql2');

// Create and export the MySQL connection using promise wrapper
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'admin',
    database: 'whatsapp_order'
});

db.connect(err => {
    if (err) {
        console.error('❌ Database connection error:', err);
    } else {
        console.log('✅ Connected to MySQL database.');
    }
});

// Create a promise-based connection
const dbPromise = db.promise();

// Retrieve the latest order index
db.getLatestOrderIndex = async function () {
    try {
        const [results] = await dbPromise.query(
            "SELECT MAX(CAST(SUBSTRING(id, 6) AS UNSIGNED)) AS latestIndex FROM orders"
        );
        return results[0].latestIndex || 0;
    } catch (error) {
        console.error('❌ Error fetching latest order index:', error);
        return 0;
    }
};

// Insert new order with an auto-generated ID
db.insertOrder = async function (datetime, orderDate, area, name, orderDetails) {
    try {
        const latestIndex = await db.getLatestOrderIndex();
        const newIndex = latestIndex + 1;
        const orderId = `ORDER${newIndex}`;

        const sql = `
            INSERT INTO orders (id, msgDatetime, orderDate, area, name, orderDetails)
            VALUES (?, ?, ?, ?, ?, ?)
        `;

        await dbPromise.query(sql, [orderId, datetime, orderDate, area, name, orderDetails]);
        console.log(`✅ Order ${orderId} saved successfully.`);
    } catch (error) {
        console.error('❌ Error in insertOrder:', error);
    }
};

// Get orders from the database with optional filters (date and location)
db.getOrders = async function (date = '', location = '') {
    try {
        let query = 'SELECT * FROM orders';
        const params = [];

        if (date) {
            query += ' WHERE orderDate = ?';
            params.push(date);
        }

        if (location) {
            query += (params.length ? ' AND' : ' WHERE') + ' area = ?';
            params.push(location);
        }

        const [orders] = await dbPromise.query(query, params);
        return orders;
    } catch (error) {
        console.error('❌ Error fetching orders:', error);
        return [];
    }
};

// Check if an order already exists by multiple fields
db.checkIfOrderExists = async function (datetime, orderDate, area, name, orderDetails) {
    try {
        const [rows] = await dbPromise.query(
            `SELECT COUNT(*) AS count FROM orders 
             WHERE msgDatetime = ? AND orderDate = ? AND area = ? AND name = ? AND orderDetails = ?`,
            [datetime, orderDate, area, name, orderDetails]
        );
        return rows[0].count > 0; // Return true if duplicate exists
    } catch (error) {
        console.error('❌ Error checking order existence:', error);
        return false;
    }
};

module.exports = db;
