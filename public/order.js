let allGroupedOrders = {}; // Store all grouped orders globally
const ORDERS_PER_PAGE = 5;
let currentPage = 1;

document.addEventListener("DOMContentLoaded", function () {
    fetchOrders();  // Initially load all orders

    // Add event listeners for the filter buttons
    document.getElementById('filterBtn').addEventListener('click', fetchFilteredOrders);
    document.getElementById('showAllBtn').addEventListener('click', () => fetchOrders());

    document.getElementById('prevPageBtn').addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage -= 1;
            renderOrders();
        }
    });
    document.getElementById('nextPageBtn').addEventListener('click', () => {
        currentPage += 1;
        renderOrders();
    });
});

// Function to format order area to uppercase
function formatOrderArea(area) {
    return area.toUpperCase();
}


function fetchOrders(startDate = '', endDate = '', orderDate = '', location = '') {
    currentPage = 1;
    // Pass the filters (startDate, endDate, orderDate, location) as query parameters to the backend
    const url = `/orders?startDate=${startDate}&endDate=${endDate}&orderDate=${orderDate}&location=${location}`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            // Capitalize order area
            data.forEach(order => {
                order.area = formatOrderArea(order.area);
            });
            const combinedOrders = combineDuplicateOrders(data);
            allGroupedOrders = groupOrders(combinedOrders); // Store grouped data globally
            renderOrders(); // Render all orders
        })
        .catch(error => console.error('Error fetching orders:', error));
}


function fetchFilteredOrders() {
    const selectedStartDate = document.getElementById("startDateFilter").value;
    const selectedEndDate = document.getElementById("endDateFilter").value;
    const selectedOrderDate = document.getElementById("orderDateFilter").value;  // For Order Date filter
    const selectedLocation = document.getElementById("locationFilter").value;

    // console.log("fetch filtered orders: " + selectedOrderDate);

    // Pass the selected filters to the fetchOrders function
    fetchOrders(selectedStartDate, selectedEndDate, selectedOrderDate, selectedLocation);
}


// Function to combine duplicate orders by the same customer
function combineDuplicateOrders(orders) {
    const combined = {};

    orders.forEach(order => {
        const key = `${order.orderDate}-${order.area}-${order.name}`;

        if (!combined[key]) {
            // combined[key] = { ...order, orderDetails: {}, ids: [], msgDatetimes: [] };
            combined[key] = { ...order, orderDetails: [], ids: [], msgDatetimes: [], senders: [] };
        }

        // Avoid duplicate IDs and message datetimes
        if (!combined[key].ids.includes(order.id)) {
            combined[key].ids.push(order.id);
            combined[key].msgDatetimes.push(`${order.id}: ${formatDate(order.msgDatetime)}`);
            combined[key].senders.push(order.sender);
        }

        // Log the order details before splitting
        // console.log("Original order details:", order.orderDetails);

        // const currentDetails = combined[key].orderDetails;

        // order.orderDetails.split(/[;,]/).forEach(item => {
        //     const match = item.trim().match(/(.+?)\s*-\s*(\d+(\.\d+)?)\s*([\p{L}\p{N}]*)/u);
        //     if (match) {
        //         const [_, itemName, qty, __, unit] = match;
        //         const quantity = parseFloat(qty);
        //         // Convert item name and unit to lowercase for case-insensitive matching
        //         const itemKey = `${itemName.trim().toLowerCase()}-${unit.trim().toLowerCase()}`;

        //         if (currentDetails[itemKey]) {
        //             // Track both the sum and individual quantities
        //             currentDetails[itemKey].sum += quantity;
        //             currentDetails[itemKey].details.push(quantity);
        //         } else {
        //             currentDetails[itemKey] = { sum: quantity, details: [quantity] };
        //         }
        //     }
        // });

        // Split order details and add each item separately
        order.orderDetails.split(/[;,]/).forEach(item => {
            const formattedItem = item.trim();
            if (formattedItem) {
                combined[key].orderDetails.push(formattedItem);
            }
        });

        // Log the combined object after processing the order
        // console.log("Current combined state:", combined);
    });

    // return Object.values(combined).map(order => ({
    //     ...order,
    //     id: order.ids.join(" + "),
    //     msgDatetime: order.msgDatetimes.join(" <br> "),
    //     orderDetails: Object.entries(order.orderDetails)
    //         .map(([nameUnit, { sum, details }]) => {
    //             const [name, unit] = nameUnit.split("-");
    //             const breakdown = details.length > 1 ? `(${details.join(" + ")})` : "";
    //             return `${name.trim()} - ${sum}${unit ? unit.trim() : ''} ${breakdown}`.trim();
    //         })
    //         .join(" <br> ")
    // }));

    return Object.values(combined).map(order => ({
        ...order,
        id: order.ids.join(" + "),
        msgDatetime: order.msgDatetimes.join(" <br> "),
        orderDetails: order.orderDetails.join(" <br> "),
        sender: order.senders.join(" + ")
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

// Function to render orders for the current page
function renderOrders() {
    const list = document.getElementById("orderList");
    const paginationControls = document.getElementById("paginationControls");
    const pageIndicator = document.getElementById("pageIndicator");
    const prevPageBtn = document.getElementById("prevPageBtn");
    const nextPageBtn = document.getElementById("nextPageBtn");
    const pagedOrders = [];
    const allDates = Object.keys(allGroupedOrders).sort(
        (a, b) => new Date(b) - new Date(a),
    );

    for (const date of allDates) {
        for (const area in allGroupedOrders[date]) {
            allGroupedOrders[date][area].forEach(order => {
                pagedOrders.push({ date, area, order });
            });
        }
    }

    const totalPages = Math.max(1, Math.ceil(pagedOrders.length / ORDERS_PER_PAGE));
    currentPage = Math.min(currentPage, totalPages);
    const startIndex = (currentPage - 1) * ORDERS_PER_PAGE;
    const currentOrders = pagedOrders.slice(
        startIndex,
        startIndex + ORDERS_PER_PAGE,
    );

    let html = "";
    let currentDate = null;
    let currentArea = null;

    currentOrders.forEach(({ date, area, order }) => {
        if (date !== currentDate) {
            if (currentArea !== null) {
                html += "</ul><hr/>";
            }
            html += `<h3>${date}</h3>`;
            currentDate = date;
            currentArea = null;
        }

        if (area !== currentArea) {
            if (currentArea !== null) {
                html += "</ul><hr/>";
            }
            html += `<h4>Area: ${area}</h4><ul class="orderListUl">`;
            currentArea = area;
        }

        html += `
            <li class="order-item">
                <p><strong>Order ID:</strong> ${order.id}</p>
                <p><strong>Sender:</strong> ${order.sender}</p>
                <p><strong>Message Date & Time:</strong> ${order.msgDatetime}</p>
                <p><strong>Order Date:</strong> ${formatDate(order.orderDate, true)}</p>
                <p><strong>Area:</strong> ${order.area}</p>
                <p><strong>Name:</strong> ${order.name}</p>
                <p><strong>Order Details:</strong> ${order.orderDetails}</p>
            </li>
        `;
    });

    if (currentArea !== null) {
        html += "</ul><hr/>";
    }

    list.innerHTML = html || "<p>No orders found.</p>";
    paginationControls.hidden = pagedOrders.length <= ORDERS_PER_PAGE;
    pageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === totalPages;
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
