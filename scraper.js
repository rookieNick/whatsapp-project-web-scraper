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

async function reachedBeforeTargetDate(page, targetDate) {
    try {
        return await page.evaluate((targetDate) => {
            // ✅ FIX: Parse Month-First string structure cleanly
            const parseDate = (dateStr) => {
                const [month, day, year] = dateStr.split('/').map(Number);
                return new Date(year, month - 1, day);
            };

            const parsedTargetDate = parseDate(targetDate);
            const metaDivs = Array.from(document.querySelectorAll('div.copyable-text'));
            
            return metaDivs.some(metaDiv => {
                const metaText = metaDiv.getAttribute('data-pre-plain-text');
                if (!metaText) return false;

                // ✅ FIX: Catch [HH:MM, M/D/YYYY] accurately
                const dateMatch = metaText.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
                if (!dateMatch) return false;

                // dateMatch[1] is Month, dateMatch[2] is Day
                const messageSentDate = parseDate(`${dateMatch[1]}/${dateMatch[2]}/${dateMatch[3]}`);

                return +messageSentDate < +parsedTargetDate;
            });
        }, targetDate);
    } catch (error) {
        console.error("❌ Error tracking history timeline alignment:", error);
        return false; 
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
            'div[role="dialog"] button:contains("Continue")',
            'div[role="dialog"] button:contains("Got it")',
            'div[role="dialog"] button:contains("OK")',
            'div[data-testid="popup-controls"] button[data-testid="popup-controls-ok"]',
            'div[role="dialog"] button[data-testid="popup-controls-ok"]',
            'div[role="dialog"] button',
            'div[data-testid="popup-controls"] button',
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
        
        try {
            const freshLookPopup = await page.evaluate(() => {
                const dialogs = Array.from(document.querySelectorAll('div[role="dialog"]'));
                for (const dialog of dialogs) {
                    const title = dialog.querySelector('h1, h2, h3, div[role="heading"]');
                    if (title && title.textContent.includes('fresh look')) {
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
        
        try {
            await page.keyboard.press('Escape');
            console.log("⌨️ Pressed Escape key to dismiss popups");
            await new Promise(resolve => setTimeout(resolve, 500));
        } catch (e) {
            // Ignore keyboard errors
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log("✅ Popup dismissal completed");
        
    } catch (error) {
        console.log("⚠️ Error dismissing popups:", error.message);
    }
}

async function checkForPopups(page) {
    try {
        const hasPopup = await page.evaluate(() => {
            const popups = document.querySelectorAll('div[role="dialog"], div[data-testid="popup-controls"]');
            return popups.length > 0;
        });
        
        if (hasPopup) {
            console.log("🔍 Popup detected, attempting to dismiss...");
            await dismissWhatsAppPopups(page);
        }
        
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
        // Ignore errors
    }
}


async function runScraper(chatName, targetDate) {
    const browser = await puppeteer.launch({
        headless: false,
        args: [
            '--window-size=1200,800',
            '--window-position=0,0'
        ]
    });
    const page = await browser.newPage();

    await page.goto('https://web.whatsapp.com/?v=2');
    console.log("📱 Scan the QR code to log in.");

    await page.waitForSelector('div[role="grid"]', { timeout: 60000 });
    await dismissWhatsAppPopups(page);
    await page.waitForSelector('div[role="grid"]');
    await dismissWhatsAppPopups(page);

    console.log(`🔍 Searching for chat: ${chatName}`);
    await scrollUntilChatFound(page, chatName);

    console.log("🔍 Checking for popups before opening chat...");
    await checkForPopups(page);
    
    await page.waitForSelector(`span[title="${chatName}"]`);
    await page.click(`span[title="${chatName}"]`);

    await page.waitForSelector('#main, [data-testid="conversation-panel-body"]', { timeout: 10000 });

    console.log("⏳ Waiting 5 seconds for messages to load...");
    await new Promise(resolve => setTimeout(resolve, 5000));

    const [tYear, tMonth, tDay] = targetDate.split('-');
    const formattedTargetDate = `${Number(tMonth)}/${Number(tDay)}/${tYear}`;
    console.log(`🎯 Target Date boundary set to: "${formattedTargetDate}"`);

    let reachedEnd = false;
    let beforeTargetDate = false;
    const allMessages = new Set();

    // const START_TIME = Date.now();
    // const TIMEOUT_LIMIT = 30 * 1000; 

    while (!reachedEnd && !beforeTargetDate) {
        // if ((Date.now() - START_TIME) > TIMEOUT_LIMIT) {
        //     console.log("⏱️ 30-second test window expired! Breaking loop to dump data.");
        //     break; 
        // }

        await checkForPopups(page);
        await page.keyboard.press('PageUp');
        await new Promise(resolve => setTimeout(resolve, 50));

        const currentMessages = await page.evaluate(() => {
            const containers = Array.from(document.querySelectorAll('div.copyable-text'));

            return containers
                .map(div => {
                    const metaText = div.getAttribute('data-pre-plain-text') || "";
                    const rawText = div.innerText || "";
                    const cleanedText = rawText.replace(/\n/g, ';').trim();
                    return { meta: metaText, text: cleanedText };
                })
                // ✅ FIX: Relaxed browser extraction to retain malformed structures with structural words
                .filter(msg => msg.meta && /date/i.test(msg.text) && /order/i.test(msg.text));
        });

        currentMessages.forEach(msg => allMessages.add(JSON.stringify(msg)));

        reachedEnd = await reachedEndOfChat(page);
        beforeTargetDate = await reachedBeforeTargetDate(page, formattedTargetDate);
    }

    console.log("📦 --- SCRAPED MESSAGES DATA DUMP ---");
    console.log(Array.from(allMessages).map(msgStr => JSON.parse(msgStr)));
    console.log("📦 ----------------------------------");

    if (reachedEnd) {
        console.log("📌 Reached the beginning of the chat. Stopping scroll.");
    } else {
        console.log("✅ Target date found. Extracting messages...");
    }

    if (beforeTargetDate) {
        console.log("✅ Reached before target date. Extracting messages...");
    }

    const messages = Array.from(allMessages).map(msgStr => JSON.parse(msgStr));

    const metaRegex24 = /\[(\d{2}:\d{2}),\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\]\s*(.*?):/;
    const metaRegex12 = /\[(\d{1,2}):(\d{2}) (AM|PM), (\d{1,2})\/(\d{1,2})\/(\d{4})\] (.*?):/;

    const orderRegex = /Date[:\s]*(\d{1,2}[-/.]\d{1,2}[-/.](?:\d{2}|\d{4}))\s*;;?\s*Location[:\s]*(\w+)\s*;;?\s*Name[:\s]*([^;]+)\s*;;?\s*Order[:\s;]*([\s\S]*)/i;

    const normalizeDate = (dateString) => {
        const parts = dateString.split(/[-/.]/);
        if (parts.length !== 3) return null;

        let day = parts[0].trim();
        let month = parts[1].trim();
        let year = parts[2].trim();

        if (year.length === 2) {
            year = `20${year}`;
        }

        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    };

    const incorrectMessages = [];

    for (const { meta, text } of messages) {
        let datetime = '';
        let sender = '';

        const metaMatch24 = meta.match(metaRegex24);
        const metaMatch12 = meta.match(metaRegex12);

        if (metaMatch24) {
            const time = metaMatch24[1];   
            const month = metaMatch24[2];  
            const day = metaMatch24[3];    
            const year = metaMatch24[4];   
            sender = extractSenderName(meta);

            datetime = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')} ${time}:00`;

        } else if (metaMatch12) {
            const hour = metaMatch12[1];   
            const minute = metaMatch12[2]; 
            const period = metaMatch12[3]; 
            const month = metaMatch12[4];  
            const day = metaMatch12[5];    
            const year = metaMatch12[6];   
            sender = extractSenderName(meta);

            const time24 = to24Hour(hour, minute, period);
            datetime = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')} ${time24}:00`;
        }

        const orderMatch = text.match(orderRegex);
        if (orderMatch) {
            let orderDate = normalizeDate(orderMatch[1]); 
            const area = orderMatch[2].trim();         
            const extractedName = orderMatch[3].trim().replace(/^;+|;+$/g, '');         
            const orderDetails = orderMatch[4].trim().replace(/^;+|;+$/g, '').replace(/;;/g, '\n'); 

            console.log(`✈️ Attempting MySQL Insert for order by [${extractedName}]...`);

            try {
                const isDuplicate = await db.checkIfOrderExists(datetime, orderDate, area, extractedName, orderDetails);

                if (isDuplicate) {
                    console.log("⚠️ Duplicate order found. Skipping...");
                    continue; 
                } else {
                    await db.insertOrder(datetime, orderDate, area, extractedName, orderDetails, sender);
                    console.log(`✅ Order written successfully to DB!`);
                }
            } catch (dbErr) {
                console.error("❌ MySQL Error during insertion loop:", dbErr.message);
            }

        } else {
            // ✅ SUCCESS: Invalid formats like '200/6/2026' hit this branch cleanly
            incorrectMessages.push({ datetime, sender, text });
        }
    }

    console.log(messages);
    await browser.close();

    return incorrectMessages;
}

module.exports = runScraper;