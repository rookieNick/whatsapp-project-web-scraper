const puppeteer = require('puppeteer');
const db = require('./db'); // Shared MySQL connection


// Function to extract sender's name
function extractSenderName(meta) {
    const senderRegex = /\] (.*?):/; // Matches text after the last ']' and before ':'
    const match = meta.match(senderRegex);

    if (match) {
        return match[1].trim(); // Return the captured sender name
    }

    return ''; // Fallback if no match
}


// Function to convert 12-hour time to 24-hour format
function to24Hour(hour, minute, period) {
    if (period === 'PM' && hour !== '12') hour = String(Number(hour) + 12);
    if (period === 'AM' && hour === '12') hour = '00';
    return `${hour.padStart(2, '0')}:${minute}`;
}
// Scroll down using mouse wheel until chat name is found
async function scrollUntilChatFound(page, chatName) {
    let chatFound = false;
    while (!chatFound) {
        try {
            // // Move the mouse to (300, 300)
            await page.mouse.move(300, 300);


            // Check if the chat is visible
            chatFound = await page.evaluate((chatName) => {
                const chat = document.querySelector(`span[title="${chatName}"]`);
                if (chat) {
                    chat.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    return true; // Found the chat
                }
                return false;
            }, chatName);

            if (!chatFound) {
                console.log("📜 Scrolling with mouse...");

                // Simulate mouse scroll down
                await page.mouse.wheel({ deltaY: 300 });

                // Wait for a short duration to allow DOM updates
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        } catch (error) {
            console.error("❌ Error while scrolling for chat:", error);
            break; // Exit loop if an error occurs
        }
    }

    if (chatFound) {
        console.log("✅ Chat found and scrolled into view.");
    } else {
        console.log("⚠️ Chat not found.");
    }
}

// Helper function to check if we reached the beginning of the chat
async function reachedEndOfChat(page) {
    try {
        return await page.evaluate(() => {
            // Use a more flexible selector with 'contains'
            return Array.from(document.querySelectorAll('span[class*="_ao3e"]')).some(el =>
                el.innerText.includes("Messages and calls are end-to-end encrypted")
            );
        });
    } catch (error) {
        console.error("❌ Error checking for end of chat:", error);
        return false; // Fallback to prevent crashes
    }
}


// Helper function to check if we reached a date before the target date
async function reachedBeforeTargetDate(page, targetDate) {
    try {
        console.log("get target date: " + targetDate);

        return await page.evaluate((targetDate) => {
            // Parse target date to YYYY-MM-DD for accurate comparison
            const parseDate = (dateStr) => {
                const [month, day, year] = dateStr.split('/').map(Number);
                return new Date(year, month - 1, day);
            };

            const parsedTargetDate = parseDate(targetDate);
            console.log("parsed target date: ", parsedTargetDate);

            // Extract all dates from message metadata
            const metaDivs = Array.from(document.querySelectorAll('div.copyable-text'));
            return metaDivs.some(metaDiv => {
                const metaText = metaDiv.getAttribute('data-pre-plain-text');
                if (!metaText) return false;

                // Extract date using regex (MM/DD/YYYY format)
                const dateMatch = metaText.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
                if (!dateMatch) return false;

                const messageDate = parseDate(`${dateMatch[1]}/${dateMatch[2]}/${dateMatch[3]}`);
                console.log("message date: ", messageDate);

                // Use + to compare the time values
                return +messageDate < +parsedTargetDate;
            });
        }, targetDate);
    } catch (error) {
        console.error("❌ Error checking for messages before target date:", error);
        return false; // Fallback to prevent crashes
    }
}

// Function to dismiss common WhatsApp popups
async function dismissWhatsAppPopups(page) {
    try {
        console.log("🔍 Looking for popups to dismiss...");
        
        // Wait a bit for popups to appear
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Try to dismiss "Fresh look" popup
        const freshLookSelectors = [
            // Specific selectors for the "Fresh look" popup
            'div[role="dialog"] button:contains("Continue")',
            'div[role="dialog"] button:contains("Got it")',
            'div[role="dialog"] button:contains("OK")',
            // More specific selectors based on the actual popup
            'div[data-testid="popup-controls"] button[data-testid="popup-controls-ok"]',
            'div[role="dialog"] button[data-testid="popup-controls-ok"]',
            // Generic dialog button selectors
            'div[role="dialog"] button',
            'div[data-testid="popup-controls"] button',
            // Fallback: any button with Continue text
            'button:contains("Continue")',
            'button:contains("Got it")',
            'button:contains("OK")'
        ];
        
        for (const selector of freshLookSelectors) {
            try {
                const popupButton = await page.$(selector);
                if (popupButton) {
                    await popupButton.click();
                    console.log("✅ Dismissed popup with selector:", selector);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    break;
                }
            } catch (e) {
                // Continue to next selector
            }
        }
        
        // Alternative method: Click on any visible close/dismiss buttons
        await page.evaluate(() => {
            const closeButtons = Array.from(document.querySelectorAll('button')).filter(btn => {
                const text = btn.textContent.toLowerCase();
                return text.includes('got it') || text.includes('ok') || text.includes('continue') || 
                       text.includes('close') || text.includes('dismiss') || text.includes('×');
            });
            
            closeButtons.forEach(btn => {
                try {
                    btn.click();
                    console.log('Clicked button:', btn.textContent);
                } catch (e) {
                    // Ignore errors
                }
            });
        });
        
        // Specific method for "Fresh look" popup
        try {
            const freshLookPopup = await page.evaluate(() => {
                // Look for the specific "Fresh look" popup
                const dialogs = Array.from(document.querySelectorAll('div[role="dialog"]'));
                for (const dialog of dialogs) {
                    const title = dialog.querySelector('h1, h2, h3, div[role="heading"]');
                    if (title && title.textContent.includes('fresh look')) {
                        // Find the Continue button in this popup
                        const continueBtn = Array.from(dialog.querySelectorAll('button')).find(btn => 
                            btn.textContent.toLowerCase().includes('continue')
                        );
                        if (continueBtn) {
                            continueBtn.click();
                            console.log('Clicked Continue button in Fresh look popup');
                            return true;
                        }
                    }
                }
                return false;
            });
            
            if (freshLookPopup) {
                console.log("✅ Successfully dismissed Fresh look popup");
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        } catch (e) {
            console.log("⚠️ Error handling Fresh look popup:", e.message);
        }
        
        // Try keyboard shortcuts to dismiss popups
        try {
            await page.keyboard.press('Escape');
            console.log("⌨️ Pressed Escape key to dismiss popups");
            await new Promise(resolve => setTimeout(resolve, 500));
        } catch (e) {
            // Ignore keyboard errors
        }
        
        // Wait for any animations to complete
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log("✅ Popup dismissal completed");
        
    } catch (error) {
        console.log("⚠️ Error dismissing popups:", error.message);
        // Continue execution even if popup dismissal fails
    }
}

// Function to check for and dismiss popups during scraping
async function checkForPopups(page) {
    try {
        // Quick check for common popup elements
        const hasPopup = await page.evaluate(() => {
            const popups = document.querySelectorAll('div[role="dialog"], div[data-testid="popup-controls"]');
            return popups.length > 0;
        });
        
        if (hasPopup) {
            console.log("🔍 Popup detected, attempting to dismiss...");
            await dismissWhatsAppPopups(page);
        }
        
        // Specific check for "Fresh look" popup
        const freshLookDetected = await page.evaluate(() => {
            const dialogs = Array.from(document.querySelectorAll('div[role="dialog"]'));
            for (const dialog of dialogs) {
                const title = dialog.querySelector('h1, h2, h3, div[role="heading"]');
                if (title && title.textContent.toLowerCase().includes('fresh look')) {
                    const continueBtn = Array.from(dialog.querySelectorAll('button')).find(btn => 
                        btn.textContent.toLowerCase().includes('continue')
                    );
                    if (continueBtn) {
                        continueBtn.click();
                        console.log('Auto-dismissed Fresh look popup');
                        return true;
                    }
                }
            }
            return false;
        });
        
        if (freshLookDetected) {
            console.log("✅ Fresh look popup auto-dismissed");
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
    } catch (error) {
        // Ignore errors to avoid interrupting the main scraping process
    }
}


async function runScraper(chatName, targetDate) {
    const browser = await puppeteer.launch({
        headless: false,
        args: [
            '--window-size=1200,800',      // Width: 1200px, Height: 800px
            '--window-position=0,0'        // Top-left corner (x: 0, y: 0)
        ]
    });
    const page = await browser.newPage();

    // Load WhatsApp Web
    await page.goto('https://web.whatsapp.com/?v=2');
    console.log("📱 Scan the QR code to log in.");

    // Wait for QR code to be scanned and page to load
    await page.waitForSelector('div[role="grid"]', { timeout: 60000 });
    
    // Immediately try to dismiss any popups that appeared
    await dismissWhatsAppPopups(page);

    // Wait for the main chat list to load
    await page.waitForSelector('div[role="grid"]');

    // Dismiss common WhatsApp popups
    await dismissWhatsAppPopups(page);

    // Scroll until the desired chat is found
    console.log(`🔍 Searching for chat: ${chatName}`);
    await scrollUntilChatFound(page, chatName);

    // WAIT FOR POPUPS TO BE DISMISSED BEFORE CLICKING CHAT
    console.log("🔍 Checking for popups before opening chat...");
    await checkForPopups(page);
    
    // Wait for chat and click
    await page.waitForSelector(`span[title="${chatName}"]`);
    await page.click(`span[title="${chatName}"]`);
    await page.waitForSelector('div[class*="message-in"], div[class*="message-out"]');

    // // Scroll up for 5 seconds
    // const startTime = Date.now();
    // while ((Date.now() - startTime) < 5000) {
    //     await page.keyboard.press('PageUp');
    //     await new Promise(resolve => setTimeout(resolve, 1000));
    // }


    // Convert targetDate to MM/DD/YYYY format
    const [year, month, day] = targetDate.split('-');
    const formattedTargetDate = `${Number(month)}/${Number(day)}/${year}`;



    // Scroll until target date is found or end of chat
    let foundDate = false;
    let reachedEnd = false;
    let beforeTargetDate = false;

    while (!foundDate && !reachedEnd && !beforeTargetDate) {
        // Check for and dismiss any popups that might have appeared
        await checkForPopups(page);
        
        await page.keyboard.press('PageUp');
        await new Promise(resolve => setTimeout(resolve, 20));

        // Check if the target date is found
        foundDate = await page.evaluate((formattedTargetDate) => {
            return Array.from(document.querySelectorAll('div.copyable-text'))
                .some(metaDiv => metaDiv.getAttribute('data-pre-plain-text')?.includes(formattedTargetDate));
        }, formattedTargetDate);

        // Check if we've reached the beginning of the chat
        reachedEnd = await reachedEndOfChat(page);

        beforeTargetDate = await reachedBeforeTargetDate(page, formattedTargetDate);


    }

    if (reachedEnd) {
        console.log("📌 Reached the beginning of the chat. Stopping scroll.");
    } else {
        console.log("✅ Target date found. Extracting messages...");
    }

    if (beforeTargetDate) {
        console.log("✅ Reached before target date. Extracting messages...");
    }

    // Extract messages
    const messages = await page.evaluate(() => {
        // Helper to decode message and handle line breaks
        const extractMessageText = (msg) => {
            const spans = msg.querySelectorAll('span._ao3e span:not(:has(ol)), span[data-pre-plain-text]'); // Select all message parts

            // Collect all spans and join with newlines
            return Array.from(spans)
                .map(span => span.innerText) // Extract text
                .join(';') // Use semicolon as the separator
        };

        return Array.from(document.querySelectorAll('div[class*="message-in"], div[class*="message-out"]'))
            .map(msg => {
                const metaDiv = msg.querySelector('div.copyable-text');
                const metaText = metaDiv ? metaDiv.getAttribute('data-pre-plain-text') : "";

                const messageText = extractMessageText(msg); // Get full message

                return { meta: metaText, text: messageText };
            })
            .filter(msg => msg.meta && msg.text); // Filter valid messages
    });

    // Regex to extract datetime and name
    // Regex for 24-hour and 12-hour formats
    const metaRegex24 = /\[(\d{2}:\d{2}), (\d{1,2})\/(\d{1,2})\/(\d{4})\] (.*?):/;
    const metaRegex12 = /\[(\d{1,2}):(\d{2}) (AM|PM), (\d{1,2})\/(\d{1,2})\/(\d{4})\] (.*?):/;

    // Regex for order extraction (date, area, name, and order details)
    // const orderRegex = /Date\s*(\d{1,2}[-/.]\d{1,2}[-/.](?:\d{2}|\d{4}))\s*;?Location\s*(\w+)\s*;?Name\s*(.*?)\s*;?Order\s*([\s\S]*)/i;
    const orderRegex = /Date[:\s]*(\d{1,2}[-/.]\d{1,2}[-/.](?:\d{2}|\d{4}))\s*;?\s*Location[:\s]*(\w+)\s*;?\s*Name[:\s]*(.*?)\s*;?\s*Order[:\s]*([\s\S]*)/i;


    // Updated date normalization logic (assumes yy is 2000-2099)
    const normalizeDate = (dateString) => {
        // Match day, month, and flexible year (yy or yyyy)
        const dateParts = dateString.match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
        if (!dateParts) return null; // Return null if no match

        let [_, day, month, year] = dateParts;

        // Convert 2-digit year (yy) to 4-digit year (20yy)
        if (year.length === 2) {
            year = `20${year}`;
        }

        // Ensure values are properly formatted as YYYY-MM-DD
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    };



    // Store incorrect messages
    const incorrectMessages = [];

    // Save messages to MySQL (orders table)
    for (const { meta, text } of messages) {




        //META (DATE TIME) LOGIC EXTRACTION MESSAGE
        let datetime = '';
        let name = '';
        let sender = '';

        // Try matching both regex patterns
        const metaMatch24 = meta.match(metaRegex24);
        const metaMatch12 = meta.match(metaRegex12);

        if (metaMatch24) {
            const time = metaMatch24[1];   // "20:25"
            const month = metaMatch24[2];  // "2"
            const day = metaMatch24[3];    // "24"
            const year = metaMatch24[4];   // "2025"
            name = metaMatch24[5];         // "A - Li Xiang"
            sender = extractSenderName(meta);

            datetime = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')} ${time}:00`;

        } else if (metaMatch12) {
            const hour = metaMatch12[1];   // "9"
            const minute = metaMatch12[2]; // "54"
            const period = metaMatch12[3]; // "PM"
            const month = metaMatch12[4];  // "2"
            const day = metaMatch12[5];    // "24"
            const year = metaMatch12[6];   // "2025"
            name = metaMatch12[7];         // "A - Li Xiang"
            sender = extractSenderName(meta);

            const time24 = to24Hour(hour, minute, period);
            datetime = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')} ${time24}:00`;
        }


        //ORDER LOGIC EXTRACTION MESSAGE
        // Apply regex to extract order details
        const orderMatch = text.match(orderRegex);
        if (orderMatch) {
            let orderDate = normalizeDate(orderMatch[1]); // Normalize to YYYY-MM-DD    // e.g. "23-2-2025"
            const area = orderMatch[2];         // e.g. "G"
            const name = orderMatch[3];         // e.g. "Fong Khee hotpot order"
            const orderDetails = orderMatch[4]; // e.g. "Pork belly- 1 block; Lamb belly- 1 block"


            // Check if this datetime and other details already exist in the database
            const isDuplicate = await db.checkIfOrderExists(datetime, orderDate, area, name, orderDetails);

            if (isDuplicate) {
                console.log("⚠️ Duplicate order found. Skipping...");
                continue; // Skip if duplicate
            } else {
                // Save to the database
                await db.insertOrder(datetime, orderDate, area, name, orderDetails, sender);
                // console.log(`✅ Order saved: ${meta} \n ${text}`);
            }


        } else {
            // console.log("❌ Invalid message format detected:", text);
            incorrectMessages.push({ datetime, sender, text });
        }

    }

    console.log(messages);
    // console.log("🚨 Incorrect messages:", incorrectMessages);

    await browser.close();

    return incorrectMessages;
}

module.exports = runScraper;
