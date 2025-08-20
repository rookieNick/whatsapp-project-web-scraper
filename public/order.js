let allGroupedOrders = {}; // Store all grouped orders globally
let currentPage = 1;
const itemsPerPage = 20; // 20 items per page

document.addEventListener("DOMContentLoaded", function () {
    fetchOrders();  // Initially load all orders

    // Add event listeners for the filter buttons
    document.getElementById('filterBtn').addEventListener('click', fetchFilteredOrders);
    document.getElementById('showAllBtn').addEventListener('click', () => fetchOrders());

    // Add event listeners for pagination controls (will be added to HTML later)
    document.getElementById('prevPageBtn').addEventListener('click', prevPage);
    document.getElementById('nextPageBtn').addEventListener('click', nextPage);
});

// Function to format order area to uppercase
function formatOrderArea(area) {
    return area.toUpperCase();
}


function fetchOrders(startDate = '', endDate = '', orderDate = '', location = '') {
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
            currentPage = 1; // Reset to first page on new fetch
            renderOrdersPage(); // Render the first page
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
function renderOrdersPage() {
    const list = document.getElementById("orderList");
    list.innerHTML = '';  // Clear any existing content

    const allDates = Object.keys(allGroupedOrders).sort((a, b) => new Date(b) - new Date(a)); // Sort dates descending
    const totalItems = allDates.reduce((count, date) => count + Object.values(allGroupedOrders[date]).flat().length, 0);
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    document.getElementById('pageInfo').textContent = `Page ${currentPage} of ${totalPages}`;
    document.getElementById('prevPageBtn').disabled = currentPage === 1;
    document.getElementById('nextPageBtn').disabled = currentPage === totalPages;

    let itemsRendered = 0;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;

    for (const date of allDates) {
        const areas = allGroupedOrders[date];
        const dateOrdersCount = Object.values(areas).flat().length;

        // If this date group starts after the current page's end, break
        if (itemsRendered >= endIndex) break;

        // If this date group ends before the current page's start, skip
        if (itemsRendered + dateOrdersCount <= startIndex) {
            itemsRendered += dateOrdersCount;
            continue;
        }

        const dateHTML = `<h3>${date}</h3>`;  // Display the date
        list.innerHTML += dateHTML;

        for (const area in areas) {
            const orders = areas[area];
            const areaOrdersCount = orders.length;

            // Determine which orders from this area to display on the current page
            const ordersToDisplay = orders.filter((_, orderIndex) => {
                const globalIndex = itemsRendered + orderIndex;
                return globalIndex >= startIndex && globalIndex < endIndex;
            });

            if (ordersToDisplay.length > 0) {
                const areaHTML = `
                    <h4>Area: ${area}</h4>
                    <ul class="orderListUl">
                        ${ordersToDisplay.map(order => `
                            <li class="order-item">
                                <p><strong>Order ID:</strong> ${order.id}</p>
                                <p><strong>Sender:</strong> ${order.sender}</p>
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
                list.innerHTML += areaHTML;
            }
            itemsRendered += areaOrdersCount;
        }
    }
}

function nextPage() {
    const totalItems = Object.keys(allGroupedOrders).reduce((count, date) => count + Object.values(allGroupedOrders[date]).flat().length, 0);
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        renderOrdersPage();
    }
}

function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        renderOrdersPage();
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
