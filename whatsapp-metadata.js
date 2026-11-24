const metadataPatterns = {
  "24h": /^\[(\d{1,2}):(\d{2}),\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\]\s*(.*?):/,
  "12h": /^\[(\d{1,2}):(\d{2})\s*(AM|PM),\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\]\s*(.*?):/i,
};

function validateWhatsAppMetadataSettings(settings) {
  if (!settings || !["12h", "24h"].includes(settings.timeFormat)) {
    throw new Error('appsettings.json whatsappMetadata.timeFormat must be "12h" or "24h".');
  }

  if (!["DD/MM/YYYY", "MM/DD/YYYY"].includes(settings.dateFormat)) {
    throw new Error(
      'appsettings.json whatsappMetadata.dateFormat must be "DD/MM/YYYY" or "MM/DD/YYYY".',
    );
  }

  return settings;
}

function parseWhatsAppMetadata(meta, settings) {
  const { timeFormat, dateFormat } =
    validateWhatsAppMetadataSettings(settings);
  const match = meta.match(metadataPatterns[timeFormat]);

  if (!match) {
    return null;
  }

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  let firstDatePart;
  let secondDatePart;
  let year;
  let sender;

  if (timeFormat === "12h") {
    const period = match[3].toUpperCase();
    firstDatePart = Number(match[4]);
    secondDatePart = Number(match[5]);
    year = Number(match[6]);
    sender = match[7].trim();

    if (hour < 1 || hour > 12) {
      return null;
    }

    if (period === "PM" && hour !== 12) {
      hour += 12;
    } else if (period === "AM" && hour === 12) {
      hour = 0;
    }
  } else {
    firstDatePart = Number(match[3]);
    secondDatePart = Number(match[4]);
    year = Number(match[5]);
    sender = match[6].trim();

    if (hour > 23) {
      return null;
    }
  }

  if (minute > 59) {
    return null;
  }

  const day =
    dateFormat === "DD/MM/YYYY" ? firstDatePart : secondDatePart;
  const month =
    dateFormat === "DD/MM/YYYY" ? secondDatePart : firstDatePart;
  const parsedDate = new Date(Date.UTC(year, month - 1, day));

  if (
    parsedDate.getUTCFullYear() !== year ||
    parsedDate.getUTCMonth() !== month - 1 ||
    parsedDate.getUTCDate() !== day
  ) {
    return null;
  }

  return {
    datetime: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")} ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`,
    sender,
  };
}

module.exports = {
  parseWhatsAppMetadata,
  validateWhatsAppMetadataSettings,
};
