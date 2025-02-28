document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('scrapeBtn').addEventListener('click', async () => {
        const chatName = document.getElementById('chatName').value.trim();
        const targetDate = document.getElementById('targetDate').value;

        if (!chatName || !targetDate) {
            alert('Please fill in both Chat Name and Target Date!');
            return;
        }

        try {
            const response = await fetch('/scrape', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chatName, targetDate })
            });

            const result = await response.json();
            alert(result.message);

            if (result.incorrectMessages && result.incorrectMessages.length > 0) {
                displayIncorrectMessages(result.incorrectMessages);
            }
        } catch (error) {
            console.error('❌ Error during scraping:', error);
            alert('❌ Error during scraping.');
        }
    });

    // Function to display incorrect messages in descending order
    function displayIncorrectMessages(incorrectMessages) {
        const incorrectContainer = document.getElementById('incorrectMessages');
        incorrectContainer.innerHTML = "<h2 class='incorrect-title'>🚨 Incorrect Messages:</h2>";

        // Sort messages by datetime in descending order (newest first)
        incorrectMessages.sort((a, b) => new Date(b.datetime) - new Date(a.datetime));

        incorrectMessages.forEach((msg, index) => {
            // Create a message element
            const messageElement = document.createElement('div');
            messageElement.className = 'incorrect-message';
            messageElement.id = `incorrect-msg-${index}`;

            // Split the error text on ';' and join with <br> for new lines
            const errorText = msg.text.split(';').map(part => part.trim()).join('<br>');

            // Populate message content
            messageElement.innerHTML = `
            <strong>${msg.datetime}</strong> <br> 
            <strong>Sender:</strong> ${msg.sender} <br> 
            <strong>Error:</strong> <br> ${errorText}
            <button class='close-btn' onclick='removeMessage(${index})'>✖</button>
        `;

            // Append to the incorrect message container
            incorrectContainer.appendChild(messageElement);
        });
    }




});

// Make removeMessage globally accessible
window.removeMessage = function (index) {
    const messageToRemove = document.getElementById(`incorrect-msg-${index}`);
    if (messageToRemove) {
        messageToRemove.remove();
    }
};


