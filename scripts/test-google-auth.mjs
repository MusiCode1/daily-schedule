#!/usr/bin/env bun

/**
 * סקריפט בדיקה אוטומטי לGoogle OAuth
 *
 * הסקריפט מבצע:
 * 1. פתיחת דפדפן עם דף הבדיקה
 * 2. התחברות רגילה (עם אישור משתמש)
 * 3. מחיקת token
 * 4. בדיקת Silent Refresh
 * 5. יצירת דוח JSON + screenshots
 *
 * הרצה: bun run test-google-auth.mjs
 */

import { chromium } from "../sveltekit-version/node_modules/playwright/index.mjs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import { createServer } from "http";

// Path helpers
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const htmlPath = join(__dirname, "google-auth-test.html");
const screenshotsDir = join(__dirname, "screenshots");
const reportPath = join(__dirname, "google-auth-test-report.json");

// יצירת תיקיית screenshots אם לא קיימת
if (!existsSync(screenshotsDir)) {
  mkdirSync(screenshotsDir, { recursive: true });
}

// דוח
const report = {
  timestamp: new Date().toISOString(),
  tests: [],
  screenshots: [],
  logs: [],
};

function log(message, type = "info") {
  const timestamp = new Date().toLocaleTimeString("he-IL");
  const prefix =
    {
      info: "ℹ️",
      success: "✓",
      error: "✗",
      warning: "⚠️",
    }[type] || "ℹ️";

  console.log(`[${timestamp}] ${prefix} ${message}`);
  report.logs.push({ timestamp, type, message });
}

async function takeScreenshot(page, name, description) {
  const screenshotPath = join(screenshotsDir, `${name}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  log(`צילום מסך נשמר: ${name}.png`, "success");
  report.screenshots.push({ name, path: screenshotPath, description });
}

async function injectTestResult(
  page,
  testName,
  status,
  data = null,
  error = null,
) {
  await page.evaluate(
    ({ testName, status, data, error }) => {
      const container = document.getElementById("test-results-container");
      const results = document.getElementById("test-results");

      container.style.display = "block";

      const resultDiv = document.createElement("div");
      resultDiv.className = `test-result ${status}`;

      let html = `<h3>${status === "success" ? "✓" : "✗"} ${testName}</h3>`;

      if (data) {
        html +=
          '<pre style="margin-top: 10px; direction: ltr; text-align: left;">';
        html += JSON.stringify(data, null, 2);
        html += "</pre>";
      }

      if (error) {
        html += `<div style="color: #721c24; margin-top: 10px;"><strong>שגיאה:</strong> ${error}</div>`;
      }

      resultDiv.innerHTML = html;
      results.appendChild(resultDiv);
    },
    { testName, status, data, error },
  );
}

async function waitForUserAction(message, seconds = 30) {
  console.log("\n" + "=".repeat(60));
  console.log(`⏳ ${message}`);
  console.log(`⏱️  ממתין עד ${seconds} שניות...`);
  console.log("=".repeat(60) + "\n");
}

async function startServer() {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      if (req.url === "/") {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(readFileSync(htmlPath));
      } else {
        res.writeHead(404);
        res.end();
      }
    });
    server.listen(4173, () => {
      console.log("🌍 Server running at http://localhost:4173/");
      resolve(server);
    });
  });
}

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("🔐 בדיקת Google OAuth - Silent Refresh");
  console.log("=".repeat(60) + "\n");

  log("מפעיל שרת מקומי...", "info");
  const server = await startServer();

  log("מפעיל דפדפן...", "info");

  // פתיחת דפדפן
  // חיבור לדפדפן קיים ב-CDP
  const browser = await chromium.connectOverCDP("http://localhost:9222");

  // שימוש ב-Context הקיים (כדי לשמור על Session/Cookies של המשתמש)
  const context = browser.contexts()[0];
  if (!context) {
    throw new Error("לא נמצא Context קיים. האם סגרת את כל הטאבים?");
  }

  const page = await context.newPage();

  // האזנה ללוגי קונסול
  page.on("console", (msg) => {
    const text = msg.text();
    if (text.includes("[") || text.includes("✓") || text.includes("✗")) {
      // log(`[דף] ${text}`, 'info');
    }
  });

  try {
    // ========================================
    // בדיקה 0: טעינת הדף
    // ========================================
    log("טוען את דף הבדיקה...", "info");
    await page.goto("http://localhost:4173");
    await page.waitForTimeout(2000);

    log("ממתין לאתחול Google APIs...", "info");
    await page.waitForTimeout(3000);

    await takeScreenshot(page, "00-initial-load", "טעינה ראשונית");

    // ========================================
    // בדיקה 1: התחברות רגילה
    // ========================================
    log("\n=== בדיקה 1: התחברות רגילה (prompt: consent) ===", "info");

    await waitForUserAction('אנא לחץ על "התחבר רגיל" והתחבר בחלון שנפתח', 60);

    // המתן לנוכחות של token ב-localStorage
    log("ממתין להתחברות...", "info");

    try {
      await page.waitForFunction(
        () => {
          return localStorage.getItem("gdrive_token") !== null;
        },
        { timeout: 60000 },
      );

      log("✓ התחברות הצליחה!", "success");

      // קריאת נתונים
      const tokenData = await page.evaluate(() => {
        const token = localStorage.getItem("gdrive_token");
        const expiry = localStorage.getItem("gdrive_expiry");
        return {
          token: token ? token.substring(0, 30) + "..." : null,
          tokenLength: token ? token.length : 0,
          expiry: expiry,
          expiryDate: expiry
            ? new Date(parseInt(expiry)).toLocaleString("he-IL")
            : null,
          timeUntilExpiry: expiry
            ? Math.floor((parseInt(expiry) - Date.now()) / 1000)
            : 0,
        };
      });

      report.tests.push({
        name: "התחברות רגילה",
        status: "passed",
        data: tokenData,
      });

      await injectTestResult(
        page,
        "בדיקה 1: התחברות רגילה",
        "success",
        tokenData,
      );
      await takeScreenshot(
        page,
        "01-after-normal-signin",
        "אחרי התחברות רגילה",
      );

      log(`Token: ${tokenData.token}`, "success");
      log(`תפוגה: ${tokenData.expiryDate}`, "success");
      log(`זמן עד תפוגה: ${tokenData.timeUntilExpiry} שניות`, "success");
    } catch (error) {
      log("✗ ההתחברות נכשלה או חרגה מזמן", "error");
      report.tests.push({
        name: "התחברות רגילה",
        status: "failed",
        error: "Timeout או משתמש לא התחבר",
      });
      await injectTestResult(
        page,
        "בדיקה 1: התחברות רגילה",
        "failed",
        null,
        error.message,
      );
      await takeScreenshot(page, "01-signin-failed", "כשל בהתחברות");
    }

    await page.waitForTimeout(2000);

    // ========================================
    // בדיקה 2: מחיקת Token
    // ========================================
    log("\n=== בדיקה 2: מחיקת Token מ-localStorage ===", "info");

    await page.click("#btn-clear-token");
    await page.waitForTimeout(1000);

    const afterClear = await page.evaluate(() => {
      return {
        hasToken: localStorage.getItem("gdrive_token") !== null,
        hasExpiry: localStorage.getItem("gdrive_expiry") !== null,
      };
    });

    if (!afterClear.hasToken && !afterClear.hasExpiry) {
      log("✓ Token נמחק בהצלחה", "success");
      report.tests.push({
        name: "מחיקת Token",
        status: "passed",
      });
      await injectTestResult(page, "בדיקה 2: מחיקת Token", "success");
    } else {
      log("✗ Token לא נמחק", "error");
      report.tests.push({
        name: "מחיקת Token",
        status: "failed",
      });
      await injectTestResult(
        page,
        "בדיקה 2: מחיקת Token",
        "failed",
        null,
        "Token עדיין קיים",
      );
    }

    await takeScreenshot(page, "02-after-token-clear", "אחרי מחיקת Token");
    await page.waitForTimeout(1000);

    // ========================================
    // בדיקה 3: Silent Refresh
    // ========================================
    log("\n=== בדיקה 3: Silent Refresh (prompt: '') ===", "info");
    log("⚠️  בדיקה זו תצליח רק אם Google Session Cookie תקף", "warning");
    log("⚠️  אם Cookie פג - תראה popup או שגיאה", "warning");

    await page.click("#btn-silent-refresh");

    // המתן לתוצאה (token חדש או שגיאה)
    log("ממתין 10 שניות לתוצאה...", "info");
    await page.waitForTimeout(10000);

    const silentRefreshResult = await page.evaluate(() => {
      const token = localStorage.getItem("gdrive_token");
      return {
        success: token !== null,
        token: token ? token.substring(0, 30) + "..." : null,
        expiry: localStorage.getItem("gdrive_expiry"),
        expiryDate: token
          ? new Date(
              parseInt(localStorage.getItem("gdrive_expiry")),
            ).toLocaleString("he-IL")
          : null,
      };
    });

    if (silentRefreshResult.success) {
      log("✓ Silent Refresh הצליח! קיבלנו token חדש ללא popup", "success");
      log("✓ המשמעות: Google Session Cookie תקף", "success");
      report.tests.push({
        name: "Silent Refresh",
        status: "passed",
        data: silentRefreshResult,
      });
      await injectTestResult(
        page,
        "בדיקה 3: Silent Refresh",
        "success",
        silentRefreshResult,
      );
    } else {
      log("✗ Silent Refresh נכשל", "error");
      log("הסבר: Google Session Cookie לא תקף או פג", "warning");
      log("פתרון: צריך התחברות מחדש עם popup", "warning");
      report.tests.push({
        name: "Silent Refresh",
        status: "failed",
        error: "לא התקבל token חדש - Cookie לא תקף",
      });
      await injectTestResult(
        page,
        "בדיקה 3: Silent Refresh",
        "failed",
        null,
        "Google Session Cookie לא תקף",
      );
    }

    await takeScreenshot(
      page,
      "03-after-silent-refresh",
      "אחרי Silent Refresh",
    );

    // ========================================
    // בדיקה 4: חליצת Cookies (Playwright)
    // ========================================
    log("\n=== בדיקה 4: חליצת Cookies מ-google.com ===", "info");

    const cookies = await context.cookies("https://accounts.google.com");
    const relevantCookies = cookies.filter((c) =>
      ["SID", "HSID", "SSID", "SAPISID"].includes(c.name),
    );

    if (relevantCookies.length > 0) {
      log(
        `✓ נמצאו ${relevantCookies.length} עוגיות אימות של Google`,
        "success",
      );

      const cookieData = relevantCookies.map((c) => ({
        name: c.name,
        value: c.value.substring(0, 10) + "...",
        domain: c.domain,
        expires: new Date(c.expires * 1000).toLocaleString("he-IL"),
      }));

      console.table(cookieData);

      report.tests.push({
        name: "Google Cookies",
        status: "passed",
        data: cookieData,
      });

      await injectTestResult(
        page,
        "בדיקה 4: Google Cookies",
        "success",
        cookieData,
      );

      // הזרקה לטבלת העוגיות בדף
      await page.evaluate((cookies) => {
        const tbody = document.getElementById("cookies-body");
        if (tbody) {
          tbody.innerHTML = cookies
            .map(
              (c) => `
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding: 5px; font-weight: bold;">${c.name}</td>
                        <td style="padding: 5px;">${c.value}</td>
                        <td style="padding: 5px; color: #666;">${c.domain}</td>
                        <td style="padding: 5px; color: #666;">${c.expires}</td>
                    </tr>
                `,
            )
            .join("");
        }
      }, cookieData);
    } else {
      log(
        "⚠️ לא נמצאו עוגיות אימות (SID, HSID, etc). האם אתה מחובר ב-Chrome?",
        "warning",
      );
      report.tests.push({
        name: "Google Cookies",
        status: "warning",
        error: "לא נמצאו עוגיות רלוונטיות",
      });
      await injectTestResult(
        page,
        "בדיקה 4: Google Cookies",
        "warning",
        null,
        "לא נמצאו עוגיות אימות",
      );
    }

    // ========================================
    // סיכום
    // ========================================
    log("\n" + "=".repeat(60), "info");
    log("✓ כל הבדיקות הושלמו!", "success");
    log("=".repeat(60) + "\n", "info");
  } catch (error) {
    log(`שגיאה כללית: ${error.message}`, "error");
    console.error(error);
  }

  // שמירת דוח
  writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf-8");
  log(`דוח נשמר: ${reportPath}`, "success");

  // הדפסת סיכום
  console.log("\n" + "=".repeat(60));
  console.log("📊 דוח בדיקות Google OAuth");
  console.log("=".repeat(60));
  console.log(
    `⏰ זמן: ${new Date(report.timestamp).toLocaleString("he-IL")}\n`,
  );

  report.tests.forEach((test, index) => {
    const icon = test.status === "passed" ? "✓" : "✗";
    const color = test.status === "passed" ? "\x1b[32m" : "\x1b[31m";
    const reset = "\x1b[0m";

    console.log(`${color}${icon} בדיקה ${index + 1}: ${test.name}${reset}`);

    if (test.data) {
      if (test.data.token) {
        console.log(`  Token: ${test.data.token}`);
      }
      if (test.data.expiryDate) {
        console.log(`  תפוגה: ${test.data.expiryDate}`);
      }
      if (test.data.timeUntilExpiry) {
        console.log(`  זמן עד תפוגה: ${test.data.timeUntilExpiry} שניות`);
      }
    }

    if (test.error) {
      console.log(`  שגיאה: ${test.error}`);
    }

    console.log("");
  });

  console.log("=".repeat(60));
  console.log(`📁 דוח מלא: ${reportPath}`);
  console.log(`📸 Screenshots: ${screenshotsDir}`);
  console.log(`🌐 HTML: ${htmlPath}`);
  console.log("=".repeat(60) + "\n");

  log("לחץ Enter לסגירת הדפדפן...", "info");

  // המתן ל-Enter
  await new Promise((resolve) => {
    process.stdin.once("data", resolve);
  });

  await browser.close();
  server.close();
  log("הדפדפן נסגר. סיום.", "success");
}

// הרצה
main().catch(console.error);
