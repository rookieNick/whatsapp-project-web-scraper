# 📅 Date Format Data Pipeline Reference

This document maps out how date strings transition from your user-facing Frontend, through your Puppeteer Scraper, and down into your MySQL Backend database.

---

## 🗺️ Date Lifecycle Matrix

| Pipeline Stage | Responsibility | String Format | Example Payload |
| :--- | :--- | :--- | :--- |
| **1. Frontend Input** | User sets target range boundary | Standard ISO String or `YYYY-MM-DD` | `"2026-06-05"` |
| **2. Scraper Input Argument** | `runScraper(chatName, targetDate)` receives input | Standard Hyphenated String | `"2026-06-05"` |
| **3. WhatsApp WhatsApp DOM Matcher** | Matches browser metadata text attributes | Month-First Slash Format (`M/D/YYYY`) | `"6/5/2026"` |
| **4. Backend Normalizer Engine** | Regular expression isolates date from chat text | Any character-split format | `"05/06/2026"` or `"5-6-2026"` |
| **5. Database Transaction Layer** | Validated, clean insert query | MySQL Standard `YYYY-MM-DD` | `"2026-06-05"` |

---

## 🔀 Step-by-Step Format Transformations

### Step 1: What Your Frontend Passes
Your Frontend passes a standard date picker string argument down into the main Node.js function invocation:
```text
Format:  YYYY-MM-DD
Example: "2026-06-05"


# 🧩 Part 1: The Core Problems & Solutions

## Problem 1: The "Vanishing Message" Bug (Browser Filtering)

### What went wrong

Initially, the browser-side code (`page.evaluate`) was using a very strict filter. It would only extract messages from the WhatsApp DOM if they perfectly matched the expected template layout.

### The consequence

If a customer made a typo (e.g., typing `Date 200/6/2026`) or omitted a keyword such as `Location`, the browser completely ignored the message. The message never reached the backend, meaning it could not be processed or added to the `incorrectMessages` array for human review. The message effectively disappeared.

### The Solution

The browser-layer filter was relaxed to be more tolerant. Instead of requiring a perfect template match, the script now extracts any message that contains both the words **"date"** and **"order"**.

Once the message is successfully extracted from WhatsApp, it is passed to the backend, where the existing regex validation and business logic determine whether it is a valid or invalid order.

---

## Problem 2: The Semicolon Breakdown (Punctuation Sensitivity)

### What went wrong

The scraper converts WhatsApp line breaks (`\n`) into semicolons (`;`) so that messages can be processed as a single line.

However, if a user manually typed the order on one line using their own semicolons, such as:

```text
Date 03/06/2026; Location HQ; Order ABC
```

the resulting text could contain a mixture of:

* Single semicolons (`;`)
* Double semicolons (`;;`)

### The consequence

The original regular expression was designed to recognize only double semicolons (`;;`) as field separators.

As a result, messages containing single semicolons failed validation, even though they were perfectly readable.

### The Solution

The separator logic was updated to be more flexible.

The parser now treats both single semicolons (`;`) and double semicolons (`;;`) as valid delimiters.

This allows orders to be processed correctly regardless of whether they were entered using line breaks or manual semicolons.

---

# ⚙️ Part 2: How the New Parsing Logic Works

Although customers continue using the same template, the backend parsing engine now processes messages with much greater tolerance.

## 1. Multi-Delimiter Separators (`;;?`)

The master regular expression uses the following separator pattern:

```regex
\s*;;?\s*
```

### Breakdown

| Component | Meaning                    |
| --------- | -------------------------- |
| `\s*`     | Match any number of spaces |
| `;;?`     | Match either `;;` or `;`   |
| `\s*`     | Match any number of spaces |

Because of this adjustment, the backend can process messages consistently regardless of how they were formatted in WhatsApp.

### Scenario A: User presses Enter between fields

**Raw WhatsApp input**

```text
Date 05/06/2026

Location G
```

**Cleansed text sent to backend**

```text
Date 05/06/2026;;Location G
```

**Result**

✅ Matches successfully.

The regex recognizes the `;;` separator and extracts the required fields.

---

### Scenario B: User types everything on one line

**Raw WhatsApp input**

```text
Date 05/06/2026; Location G
```

**Cleansed text sent to backend**

```text
Date 05/06/2026; Location G
```

**Result**

✅ Matches successfully.

The regex recognizes the single `;` separator and extracts the same fields correctly.

---

# 📅 Part 3: Date Parsing & Normalization Logic

Once the regex extracts the value following the `Date` keyword, the raw date string is passed into the `normalizeDate()` function.

Examples:

```text
05/06/2026
5-6-2026
200/6/2026
```

The function performs several validation steps before allowing the date to be inserted into the database.

---

## Step 1: Splitting the String

The function separates the date into components using:

```javascript
dateString.split(/[-/.]/)
```

This allows users to enter dates with:

* `/`
* `-`
* `.`

### Examples

```text
"05/06/2026"
```

becomes:

```javascript
["05", "06", "2026"]
```

---

```text
"200/6/2026"
```

becomes:

```javascript
["200", "6", "2026"]
```

---

## Step 2: Structure Validation

The function verifies that exactly three segments exist:

```javascript
[day, month, year]
```

Example:

```text
05/06
```

would produce only two segments and immediately fail validation.

If the segment count is not exactly three, the function returns:

```javascript
null
```

---

## Step 3: Character-Length Validation (Typo Protection)

This is the key safeguard against malformed dates.

```javascript
if (day.length > 2 || month.length > 2 || year.length !== 4)
    return null;
```

### Valid Example

Input:

```text
05/06/2026
```

Produces:

```javascript
day   = "05"   // length 2
month = "06"   // length 2
year  = "2026" // length 4
```

Result:

✅ Passes validation.

---

### Invalid Example

Input:

```text
200/6/2026
```

Produces:

```javascript
day = "200" // length 3
```

Result:

❌ Fails validation.

Because a day value cannot contain more than two characters, the function immediately rejects the date and returns:

```javascript
null
```

This prevents invalid dates from reaching the database.

---

## Step 4: Normalization & Formatting

If all validation checks pass, the function:

1. Pads single-digit values with leading zeros.
2. Rearranges the date into SQL-friendly format.

Example:

```text
5/6/2026
```

becomes:

```text
2026-06-05
```

This ensures all stored dates follow a consistent format.

---

# 🔀 Final Routing Logic

After normalization, the system follows one of two paths:

## Valid Date

If `normalizeDate()` returns a valid formatted date:

```javascript
"2026-06-05"
```

The workflow continues:

1. Duplicate check
2. Database insertion
3. Success processing

Result:

✅ Order is stored in MySQL.

---

## Invalid Date

If `normalizeDate()` returns:

```javascript
null
```

due to issues such as:

```text
200/6/2026
05/06
99/99/2026
```

the workflow:

1. Marks the message as invalid.
2. Skips database insertion.
3. Routes the entire message into the `incorrectMessages` collection.

Result:

✅ No invalid data enters the database.
✅ Human reviewers can still see and correct the original message.
