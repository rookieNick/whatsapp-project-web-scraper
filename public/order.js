document.addEventListener("DOMContentLoaded", function () {
    fetchOrders();  // Initially load all orders

    // Add event listeners for the filter buttons
    document.getElementById('filterBtn').addEventListener('click', fetchFilteredOrders);
    document.getElementById('showAllBtn').addEventListener('click', () => fetchOrders());
});

function fetchOrders(startDate = '', endDate = '', orderDate = '', location = '') {
    // Pass the filters (startDate, endDate, orderDate, location) as query parameters to the backend
    const url = `/orders?startDate=${startDate}&endDate=${endDate}&orderDate=${orderDate}&location=${location}`;

    console.log("fetch orders: " + orderDate);

    fetch(url)
        .then(response => response.json())
        .then(data => {
            const combinedOrders = combineDuplicateOrders(data);
            const groupedData = groupOrders(combinedOrders);
            displayGroupedOrders(groupedData);
        })
        .catch(error => console.error('Error fetching orders:', error));
}


function fetchFilteredOrders() {
    const selectedStartDate = document.getElementById("startDateFilter").value;
    const selectedEndDate = document.getElementById("endDateFilter").value;
    const selectedOrderDate = document.getElementById("orderDateFilter").value;  // For Order Date filter
    const selectedLocation = document.getElementById("locationFilter").value;
    
    console.log("fetch filtered orders: " + selectedOrderDate);

    // Pass the selected filters to the fetchOrders function
    fetchOrders(selectedStartDate, selectedEndDate, selectedOrderDate, selectedLocation);
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
            const match = item.trim().match(/(.+?)\s*-\s*(\d+(\.\d+)?)\s*([\p{L}\p{N}]*)/u);
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
        msgDatetime: order.msgDatetimes.join(" <br> "),
        orderDetails: Object.entries(order.orderDetails)
            .map(([nameUnit, { sum, details }]) => {
                const [name, unit] = nameUnit.split("-");
                const breakdown = details.length > 1 ? `(${details.join(" + ")})` : "";
                return `${name.trim()} - ${sum}${unit ? unit.trim() : ''} ${breakdown}`.trim();
            })
            .join(" <br> ")
    }));
}

// Function to group orders by date first, then by area
function groupOrders(orders) {
    const groupedByDate = {};

    orders.forEach(order => {
        const orderDate = formatDate(order.orderDate, true); // Use only date part (YYYY-MM-DD)
        const area = order.area;

        // Initialize the groupedByDate object if it doesn't exist
        if (!groupedByDate[orderDate]) {
            groupedByDate[orderDate] = {};
        }

        // Group by area inside the specific date
        if (!groupedByDate[orderDate][area]) {
            groupedByDate[orderDate][area] = [];
        }

        // Push the order into the correct date-area group
        groupedByDate[orderDate][area].push(order);
    });

    // Sort the dates in descending order
    const sortedGroupedByDate = Object.entries(groupedByDate)
        .sort(([dateA], [dateB]) => new Date(dateB) - new Date(dateA))  // Compare dates in descending order
        .reduce((acc, [date, areas]) => {
            acc[date] = areas;
            return acc;
        }, {});

    return sortedGroupedByDate;
}

// Function to display grouped orders by date and area
function displayGroupedOrders(groupedData) {
    const list = document.getElementById("orderList");
    list.innerHTML = '';  // Clear any existing content

    // Iterate over each date group
    Object.entries(groupedData).forEach(([date, areas]) => {
        const dateHTML = `<h3>${date}</h3>`;  // Display the date

        let areasHTML = '';
        // Iterate over each area within the date group
        Object.entries(areas).forEach(([area, orders]) => {
            const areaHTML = `
                <h4>Area: ${area}</h4>
                <ul class="orderListUl">
                    ${orders.map(order => `
                        <li class="order-item">
                            <p><strong>Order ID:</strong> ${order.id}</p>
                            <p><strong>Message Date & Time:</strong> ${order.msgDatetime}</p>
                            <p><strong>Order Date:</strong> ${formatDate(order.orderDate, true)}</p>
                            <p><strong>Area:</strong> ${order.area}</p>
                            <p><strong>Name:</strong> ${order.name}</p>
                            <p><strong>Order Details:</strong> ${order.orderDetails}</p>
                        </li>
                    `).join('')}
                </ul>
                <hr/>
            `;
            areasHTML += areaHTML;
        });

        list.innerHTML += dateHTML + areasHTML;
    });
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
