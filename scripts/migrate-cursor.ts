import fs from "fs";
import path from "path";

const SOURCE_DIR = path.resolve(".cursor");
const DEST_BASE = path.resolve(".agent");
const RULES_DEST = path.join(DEST_BASE, "rules");
const WORKFLOWS_DEST = path.join(DEST_BASE, "workflows");

// Ensure destination directories exist
if (!fs.existsSync(RULES_DEST)) {
  fs.mkdirSync(RULES_DEST, { recursive: true });
}
if (!fs.existsSync(WORKFLOWS_DEST)) {
  fs.mkdirSync(WORKFLOWS_DEST, { recursive: true });
}

function parseFrontmatter(content: string): { frontmatter: any; body: string } {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    return { frontmatter: {}, body: content };
  }
  const frontmatterLines = match[1].split(/\r?\n/);
  const frontmatter: any = {};
  for (const line of frontmatterLines) {
    const [key, ...valueParts] = line.split(":");
    if (key && valueParts.length > 0) {
      frontmatter[key.trim()] = valueParts.join(":").trim();
    }
  }
  return { frontmatter, body: match[2] };
}

function stringifyFrontmatter(frontmatter: any): string {
  let output = "---\n";
  for (const [key, value] of Object.entries(frontmatter)) {
    if (value !== undefined && value !== null) {
      output += `${key}: ${value}\n`;
    }
  }
  output += "---\n\n";
  return output;
}

function migrateRules() {
  const rulesDir = path.join(SOURCE_DIR, "rules");
  if (!fs.existsSync(rulesDir)) {
    console.log("No .cursor/rules directory found.");
    return;
  }

  const files = fs.readdirSync(rulesDir);
  for (const file of files) {
    if (file.endsWith(".mdc")) {
      const srcPath = path.join(rulesDir, file);
      const content = fs.readFileSync(srcPath, "utf-8");
      const { frontmatter, body } = parseFrontmatter(content);

      // Transformation logic
      // Use 'globs' from cursor if available, otherwise default. Use 'glob' as key for Antigravity.
      const globValue =
        frontmatter.globs || frontmatter.glob || "*.{js,ts,svelte,md,css}";

      const newFrontmatter: any = {
        trigger: "always_on", // Default as per new format preference
        glob: globValue,
        description: frontmatter.description || file.replace(".mdc", ""),
      };

      // If original had 'alwaysApply: false', we generally keep 'always_on' for now as requested,
      // but you could change trigger to 'user_message' if strictly needed.
      // Given the task, I will keep 'always_on' for broader compatibility unless specified.

      const newContent = stringifyFrontmatter(newFrontmatter) + body;
      const destPath = path.join(RULES_DEST, file.replace(".mdc", ".md"));

      fs.writeFileSync(destPath, newContent);
      console.log(`Migrated Rule: ${file} -> ${path.basename(destPath)}`);
    }
  }
}

function migrateWorkflows() {
  const commandsDir = path.join(SOURCE_DIR, "commands");
  if (!fs.existsSync(commandsDir)) {
    console.log("No .cursor/commands directory found.");
    return;
  }

  const files = fs.readdirSync(commandsDir);
  for (const file of files) {
    if (file.endsWith(".md")) {
      const srcPath = path.join(commandsDir, file);
      const content = fs.readFileSync(srcPath, "utf-8");

      // For workflows/commands, simple copy often works, but let's ensure frontmatter format
      const { frontmatter, body } = parseFrontmatter(content);

      // Ensure description exists
      if (!frontmatter.description) {
        frontmatter.description = file.replace(".md", "");
      }

      const newContent = stringifyFrontmatter(frontmatter) + body;
      const destPath = path.join(WORKFLOWS_DEST, file);

      fs.writeFileSync(destPath, newContent);
      console.log(`Migrated Workflow: ${file} -> ${path.basename(destPath)}`);
    }
  }
}

console.log("Starting migration...");
migrateRules();
migrateWorkflows();
console.log("Migration complete.");
