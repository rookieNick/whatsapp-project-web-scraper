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
        } catch (error) {
            alert('❌ Error starting the scraper: ' + error.message);
        }
    });
});