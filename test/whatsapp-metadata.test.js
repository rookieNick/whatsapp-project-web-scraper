const assert = require("node:assert/strict");
const { test } = require("node:test");
const {
  parseWhatsAppMetadata,
} = require("../whatsapp-metadata");

test("parses the local 24-hour DD/MM/YYYY metadata format", () => {
  assert.deepEqual(
    parseWhatsAppMetadata(
      "[19:30, 24/11/2026] Tony (App): ",
      { timeFormat: "24h", dateFormat: "DD/MM/YYYY" },
    ),
    {
      datetime: "2026-11-24 19:30:00",
      sender: "Tony (App)",
    },
  );
});

test("parses the client 12-hour MM/DD/YYYY metadata format", () => {
  assert.deepEqual(
    parseWhatsAppMetadata(
      "[7:30 PM, 11/24/2026] ToNy: ",
      { timeFormat: "12h", dateFormat: "MM/DD/YYYY" },
    ),
    {
      datetime: "2026-11-24 19:30:00",
      sender: "ToNy",
    },
  );
});

test("converts 12 AM and 12 PM correctly", () => {
  const settings = { timeFormat: "12h", dateFormat: "MM/DD/YYYY" };

  assert.equal(
    parseWhatsAppMetadata("[12:05 AM, 11/24/2026] Sender: ", settings)
      .datetime,
    "2026-11-24 00:05:00",
  );
  assert.equal(
    parseWhatsAppMetadata("[12:05 PM, 11/24/2026] Sender: ", settings)
      .datetime,
    "2026-11-24 12:05:00",
  );
});

test("rejects a date that is invalid for the configured date order", () => {
  assert.equal(
    parseWhatsAppMetadata(
      "[7:30 PM, 11/24/2026] ToNy: ",
      { timeFormat: "12h", dateFormat: "DD/MM/YYYY" },
    ),
    null,
  );
});
