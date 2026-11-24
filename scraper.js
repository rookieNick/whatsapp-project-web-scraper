const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");
const util = require("util");
const puppeteer = require("puppeteer");
const db = require("./db"); // Shared MySQL connection
const {
  parseWhatsAppMetadata,
  validateWhatsAppMetadataSettings,
} = require("./whatsapp-metadata");

const whatsappMetadataSettings = validateWhatsAppMetadataSettings(
  require("./appsettings.json").whatsappMetadata,
);

function redactMetadataSender(meta) {
  return String(meta || "").replace(/(\])\s*.*$/, "$1 [sender redacted]");
}

function mirrorConsoleToFile(logFilePath) {
  const methods = ["log", "info", "warn", "error", "debug"];
  const originalMethods = new Map();
  const transcript = fs.createWriteStream(logFilePath, { flags: "a" });
  let writeError;

  transcript.on("error", (error) => {
    writeError = error;
  });

  for (const method of methods) {
    const original = console[method];
    originalMethods.set(method, original);
    console[method] = (...args) => {
      original.apply(console, args);
      if (!writeError) {
        transcript.write(
          `${new Date().toISOString()} ${util.format(...args)}\n`,
        );
      }
    };
  }

  return async () => {
    for (const [method, original] of originalMethods) {
      console[method] = original;
    }

    if (writeError) {
      transcript.destroy();
      throw writeError;
    }

    await new Promise((resolve, reject) => {
      transcript.once("finish", resolve);
      transcript.once("error", reject);
      transcript.end();
    });

    if (writeError) {
      throw writeError;
    }
  };
}

// Function to extract sender's name
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
          chat.scrollIntoView({ behavior: "smooth", block: "center" });
          return true; // Found the chat
        }
        return false;
      }, chatName);

      if (!chatFound) {
        console.log("📜 Scrolling with mouse...");

        // Simulate mouse scroll down
        await page.mouse.wheel({ deltaY: 300 });

        // Wait for a short duration to allow DOM updates
        await new Promise((resolve) => setTimeout(resolve, 500));
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
      const systemMessages = Array.from(
        document.querySelectorAll('[data-testid="system_message"]'),
      );

      return systemMessages.some((el) =>
        el.innerText.includes("Messages and calls are end-to-end encrypted"),
      );
    });
  } catch (error) {
    console.error("Error checking beginning of chat:", error);
    return false;
  }
}

async function reachedBeforeTargetDate(page, targetDate) {
  try {
    const result = await page.evaluate((targetDate) => {
      const metaDivs = Array.from(
        document.querySelectorAll("div.copyable-text"),
      );

      const messageDates = metaDivs
        .map((metaDiv) => {
          const metaText = metaDiv.getAttribute("data-pre-plain-text");

          if (!metaText) return null;

          const dateMatch = metaText.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);

          if (!dateMatch) return null;

          const [, day, month, year] = dateMatch;

          return new Date(Number(year), Number(month) - 1, Number(day));
        })
        .filter((date) => date !== null);

      if (messageDates.length === 0) {
        return {
          totalMessages: metaDivs.length,
          validDates: 0,
          oldestDate: null,
          targetDate,
          reached: false,
        };
      }

      const oldestDate = new Date(
        Math.min(...messageDates.map((date) => date.getTime())),
      );
      const [year, month, day] = targetDate.split("-").map(Number);
      const parsedTargetDate = new Date(year, month - 1, day);

      return {
        totalMessages: metaDivs.length,
        validDates: messageDates.length,
        oldestDate: oldestDate.toLocaleDateString("en-GB"),
        targetDate: parsedTargetDate.toLocaleDateString("en-GB"),
        reached: oldestDate < parsedTargetDate,
      };
    }, targetDate);

    console.log("\n========== DATE DEBUG ==========");
    console.log("Total message containers:", result.totalMessages);
    console.log("Valid message dates:", result.validDates);
    console.log("Oldest loaded date:", result.oldestDate);
    console.log("Target date:", result.targetDate);
    console.log("Reached target boundary:", result.reached);
    console.log("================================\n");

    return result.reached;
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
    await new Promise((resolve) => setTimeout(resolve, 2000));

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
      'button:contains("OK")',
    ];

    for (const selector of freshLookSelectors) {
      try {
        const popupButton = await page.$(selector);
        if (popupButton) {
          await popupButton.click();
          console.log("✅ Dismissed popup with selector:", selector);
          await new Promise((resolve) => setTimeout(resolve, 1000));
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }

    await page.evaluate(() => {
      const closeButtons = Array.from(
        document.querySelectorAll("button"),
      ).filter((btn) => {
        const text = btn.textContent.toLowerCase();
        return (
          text.includes("got it") ||
          text.includes("ok") ||
          text.includes("continue") ||
          text.includes("close") ||
          text.includes("dismiss") ||
          text.includes("×")
        );
      });

      closeButtons.forEach((btn) => {
        try {
          btn.click();
          console.log("Clicked button:", btn.textContent);
        } catch (e) {
          // Ignore errors
        }
      });
    });

    try {
      const freshLookPopup = await page.evaluate(() => {
        const dialogs = Array.from(
          document.querySelectorAll('div[role="dialog"]'),
        );
        for (const dialog of dialogs) {
          const title = dialog.querySelector('h1, h2, h3, div[role="heading"]');
          if (title && title.textContent.includes("fresh look")) {
            const continueBtn = Array.from(
              dialog.querySelectorAll("button"),
            ).find((btn) => btn.textContent.toLowerCase().includes("continue"));
            if (continueBtn) {
              continueBtn.click();
              console.log("Clicked Continue button in Fresh look popup");
              return true;
            }
          }
        }
        return false;
      });

      if (freshLookPopup) {
        console.log("✅ Successfully dismissed Fresh look popup");
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch (e) {
      console.log("⚠️ Error handling Fresh look popup:", e.message);
    }

    try {
      await page.keyboard.press("Escape");
      console.log("⌨️ Pressed Escape key to dismiss popups");
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (e) {
      // Ignore keyboard errors
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log("✅ Popup dismissal completed");
  } catch (error) {
    console.log("⚠️ Error dismissing popups:", error.message);
  }
}

async function checkForPopups(page) {
  try {
    const hasPopup = await page.evaluate(() => {
      const popups = document.querySelectorAll(
        'div[role="dialog"], div[data-testid="popup-controls"]',
      );
      return popups.length > 0;
    });

    if (hasPopup) {
      console.log("🔍 Popup detected, attempting to dismiss...");
      await dismissWhatsAppPopups(page);
    }

    const freshLookDetected = await page.evaluate(() => {
      const dialogs = Array.from(
        document.querySelectorAll('div[role="dialog"]'),
      );
      for (const dialog of dialogs) {
        const title = dialog.querySelector('h1, h2, h3, div[role="heading"]');
        if (title && title.textContent.toLowerCase().includes("fresh look")) {
          const continueBtn = Array.from(
            dialog.querySelectorAll("button"),
          ).find((btn) => btn.textContent.toLowerCase().includes("continue"));
          if (continueBtn) {
            continueBtn.click();
            console.log("Auto-dismissed Fresh look popup");
            return true;
          }
        }
      }
      return false;
    });

    if (freshLookDetected) {
      console.log("✅ Fresh look popup auto-dismissed");
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  } catch (error) {
    // Ignore errors
  }
}

async function runScraper(chatName, targetDate) {
  const runId = `${new Date().toISOString().replace(/[:.]/g, "-")}-${process.pid}-${randomUUID()}`;
  const logFilePath = path.join(
    __dirname,
    "logs",
    `scraper-run-${runId}.txt`,
  );
  const startedAt = Date.now();
  let failureCount = 0;
  let runError;
  let incorrectMessages;

  await fs.promises.mkdir(path.dirname(logFilePath), { recursive: true });
  await fs.promises.writeFile(
    logFilePath,
    `Scraper run started: ${new Date().toISOString()}\nRun ID: ${runId}\nChat: ${chatName}\nTarget date: ${targetDate}\n\n`,
    "utf8",
  );
  const stopConsoleMirror = mirrorConsoleToFile(logFilePath);
  const logEvent = async (event, details = {}) => {
    if (event === "failure") {
      failureCount += 1;
    }
    console.error(`SCRAPER ${event.toUpperCase()}:`, details);
  };

  console.log("Run log:", logFilePath);

  try {
    incorrectMessages = await runScraperInternal(
      chatName,
      targetDate,
      logEvent,
    );
    console.log("SCRAPER RUN COMPLETED:", {
      outcome: failureCount === 0 ? "success" : "completed_with_failures",
      failureCount,
      durationMs: Date.now() - startedAt,
      incorrectMessageCount: incorrectMessages.length,
    });
  } catch (error) {
    runError = error;
    console.error("SCRAPER RUN FAILED:", error);
  }

  try {
    await stopConsoleMirror();
  } catch (logError) {
    if (runError) {
      process.stderr.write(`Could not finish scraper transcript: ${logError.message}\n`);
    } else {
      runError = logError;
    }
  }

  if (runError) {
    throw runError;
  }

  return incorrectMessages;
}

async function runScraperInternal(chatName, targetDate, logEvent) {
  const browser = await puppeteer.launch({
    headless: false,
    args: ["--window-size=1200,800", "--window-position=0,0"],
  });
  const page = await browser.newPage();

  await page.goto("https://web.whatsapp.com/?v=2");
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

  await page.waitForSelector('#main, [data-testid="conversation-panel-body"]', {
    timeout: 10000,
  });

  console.log("⏳ Waiting 5 seconds for messages to load...");
  await new Promise((resolve) => setTimeout(resolve, 5000));

  console.log("Target date:", targetDate);

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
    await page.keyboard.press("PageUp");
    await new Promise((resolve) => setTimeout(resolve, 50));

    const extraction = await page.evaluate(() => {
      const containers = Array.from(
        document.querySelectorAll("div.copyable-text"),
      );
      const rawMessages = containers.map((div) => {
        const selectableText = div.querySelector(
          '[data-testid="selectable-text"]',
        );

        return {
          meta: div.getAttribute("data-pre-plain-text"),
          text: selectableText ? selectableText.innerText : div.innerText,
        };
      });

      return {
        rawMessageCount: containers.length,
        sampleRawMessages: rawMessages.slice(0, 5),
        messages: rawMessages
          .map((msg) => ({
            meta: msg.meta || "",
            text: (msg.text || "").replace(/\n/g, ";").trim(),
          }))
          .filter(
            (msg) =>
              msg.meta &&
              /(?:^|[;\r\n])\s*date\s*:?\s*\d{1,2}[-/.]\d{1,2}[-/.](?:\d{2}|\d{4})\b/i.test(
                msg.text,
              ) &&
              /(?:^|[;\r\n])\s*name\s*:?\s*\S+/i.test(msg.text) &&
              /(?:^|[;\r\n])\s*location\s*:?\s*\S+/i.test(msg.text),
          ),
      };
    });

    console.log("RAW MESSAGE COUNT:", extraction.rawMessageCount);
    console.log("SAMPLE RAW MESSAGES:", extraction.sampleRawMessages);
    const currentMessages = extraction.messages;

    currentMessages.forEach((msg) => allMessages.add(JSON.stringify(msg)));

    reachedEnd = await reachedEndOfChat(page);
    beforeTargetDate = await reachedBeforeTargetDate(page, targetDate);

    console.log("========== SCRAPER STATUS ==========");
    console.log("Reached beginning:", reachedEnd);
    console.log("Passed target date:", beforeTargetDate);
    console.log("Unique messages collected:", allMessages.size);
    console.log("====================================");
  }

  console.log("📦 --- SCRAPED MESSAGES DATA DUMP ---");
  console.log(Array.from(allMessages).map((msgStr) => JSON.parse(msgStr)));
  console.log("📦 ----------------------------------");

  if (reachedEnd) {
    console.log("📌 Reached the beginning of the chat. Stopping scroll.");
  } else {
    console.log("✅ Target date found. Extracting messages...");
  }

  if (beforeTargetDate) {
    console.log("✅ Reached before target date. Extracting messages...");
  }

  const messages = Array.from(allMessages).map((msgStr) => JSON.parse(msgStr));

  const orderRegex =
    /(?:^|[;\r\n])\s*Date\s*:?\s*(\d{1,2}[-/.]\d{1,2}[-/.](?:\d{2}|\d{4}))\s*(?:;|\r?\n)+\s*Location\s*:?\s*([^;\r\n]+?)\s*(?:;|\r?\n)+\s*Name\s*:?\s*([^;\r\n]+?)\s*(?:;|\r?\n)+\s*Order\s*:?\s*(?:;|\r?\n)\s*([\s\S]*\S[\s\S]*)/i;

  const normalizeDate = (dateString) => {
    const parts = dateString.split(/[-/.]/);
    if (parts.length !== 3) return null;

    let day = parts[0].trim();
    let month = parts[1].trim();
    let year = parts[2].trim();

    if (year.length === 2) {
      year = `20${year}`;
    }

    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  };

  const incorrectMessages = [];

  for (const { meta, text } of messages) {
    let datetime = "";
    let sender = "";

    const parsedMetadata = parseWhatsAppMetadata(
      meta,
      whatsappMetadataSettings,
    );
    if (parsedMetadata) {
      datetime = parsedMetadata.datetime;
      sender = parsedMetadata.sender;
    }

    const orderMatch = text.match(orderRegex);

    // Keep your existing if (orderMatch) block below this line.

    if (orderMatch) {
      const extractedName = orderMatch[3].trim();
      const orderDetails = orderMatch[4]
        .split(";")
        .map((item) => item.trim())
        .filter(Boolean)
        .join("\n");

      const orderDate = normalizeDate(orderMatch[1]);
      const area = orderMatch[2].trim();

      if (!datetime) {
        const message =
          "WhatsApp metadata did not match appsettings.json; skipping database insert.";
        console.error(`❌ ${message}`);
        await logEvent("failure", {
          stage: "metadata_parse",
          message,
          metadata: redactMetadataSender(meta),
        });
        incorrectMessages.push({ datetime, sender, text });
        continue;
      }

      console.log(
        `✈️ Attempting MySQL Insert for order by [${extractedName}]...`,
      );

      let databaseOperation = "duplicate_check";
      try {
        const isDuplicate = await db.checkIfOrderExists(
          datetime,
          orderDate,
          area,
          extractedName,
          orderDetails,
        );

        if (isDuplicate) {
          console.log("⚠️ Duplicate order found. Skipping...");
          continue;
        } else {
          databaseOperation = "insert";
          await db.insertOrder(
            datetime,
            orderDate,
            area,
            extractedName,
            orderDetails,
            sender,
          );

          console.log("✅ Order written successfully to DB!");
        }
      } catch (dbErr) {
        console.error("❌ MySQL Error during insertion loop:", dbErr.message);
        await logEvent("failure", {
          stage: "database",
          operation: databaseOperation,
          error: {
            name: dbErr.name,
            message: dbErr.message,
            code: dbErr.code,
          },
          metadata: redactMetadataSender(meta),
          datetime,
          orderDate,
          area,
        });
      }
    } else {
      incorrectMessages.push({ datetime, sender, text });
    }
  }

  console.log(messages);
  await browser.close();

  return incorrectMessages;
}

module.exports = runScraper;
