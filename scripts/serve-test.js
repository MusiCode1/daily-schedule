import { createServer } from "http";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const htmlPath = join(__dirname, "google-auth-test.html");

if (!existsSync(htmlPath)) {
  console.error("❌ File not found:", htmlPath);
  process.exit(1);
}

const PORT = 4173;

const server = createServer((req, res) => {
  if (req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(readFileSync(htmlPath));
  } else {
    res.writeHead(404);
    res.end("Not Found");
  }
});

server.listen(PORT, () => {
  console.log("\n" + "=".repeat(60));
  console.log("🚀 שרת הבדיקה רץ!");
  console.log(`🌐 כתובת: http://localhost:${PORT}`);
  console.log("=".repeat(60));
  console.log("\nתוכל לפתוח את הקישור בדפדפן הרגיל שלך ולהתחבר.");
  console.log("לחץ Ctrl+C לסגירת השרת.\n");
});
