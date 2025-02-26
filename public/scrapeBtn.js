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

    // Function to display incorrect messages
function displayIncorrectMessages(incorrectMessages) {
    const incorrectContainer = document.getElementById('incorrectMessages');
    incorrectContainer.innerHTML = "<h2 class='incorrect-title'>🚨 Incorrect Messages:</h2>";

    incorrectMessages.forEach((msg, index) => {
        // Create a message element
        const messageElement = document.createElement('div');
        messageElement.className = 'incorrect-message';
        messageElement.id = `incorrect-msg-${index}`;
        messageElement.innerHTML = `
            <strong>${msg.datetime}</strong> <br> 
            <strong>Name:</strong> ${msg.name} <br> 
            <strong>Error:</strong> ${msg.text}
        `;

        // Append to the incorrect message container
        incorrectContainer.appendChild(messageElement);
    });
}

});