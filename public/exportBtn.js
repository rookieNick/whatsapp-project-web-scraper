document.addEventListener('DOMContentLoaded', () => {
    // Export Button Logic
    document.getElementById('exportBtn').addEventListener('click', async () => {
        const startDateTime = document.getElementById('startDateTime').value;
        const endDateTime = document.getElementById('endDateTime').value;
        const orderDate = document.getElementById('orderDate').value;
        const orderArea = document.getElementById('orderArea').value;



        try {
            const response = await fetch('/export', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ startDateTime, endDateTime, orderDate, orderArea })
            });

            if (response.ok) {
                const blob = await response.blob();
                const downloadUrl = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = downloadUrl;
                link.download = `orders_${startDateTime}_${endDateTime}.xlsx`;
                document.body.appendChild(link);
                link.click();
                link.remove();
                URL.revokeObjectURL(downloadUrl);
            } else {
                const result = await response.json();
                alert(result.message);
            }
        } catch (error) {
            alert('❌ Error exporting to Excel: ' + error.message);
        }
    });
});
