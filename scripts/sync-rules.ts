import fs from "fs";
import path from "path";

const CURSOR_RULES_DIR = path.resolve(".cursor/rules");
const AGENT_RULES_DIR = path.resolve(".agent/rules");
const AGENT_WORKFLOWS_DIR = path.resolve(".agent/workflows");
const CURSOR_COMMANDS_DIR = path.resolve(".cursor/commands");

// --- Helper Functions ---

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function parseFrontmatter(content: string): { frontmatter: any; body: string } {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    return { frontmatter: {}, body: content };
  }
  const frontmatterLines = match[1].split(/\r?\n/);
  const frontmatter: any = {};
  for (const line of frontmatterLines) {
    const parts = line.split(":");
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const value = parts.slice(1).join(":").trim();
      // Basic parsing for arrays looking like [a, b] not fully robust but sufficient for simple strings
      if (value.startsWith("[") && value.endsWith("]")) {
        frontmatter[key] = value
          .slice(1, -1)
          .split(",")
          .map((s) => s.trim());
      } else {
        frontmatter[key] = value;
      }
    }
  }
  return { frontmatter, body: match[2] };
}

function stringifyFrontmatter(frontmatter: any): string {
  let output = "---\n";
  for (const [key, value] of Object.entries(frontmatter)) {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        output += `${key}: [${value.join(", ")}]\n`;
      } else {
        output += `${key}: ${value}\n`;
      }
    }
  }
  output += "---\n";
  return output;
}

// --- Sync Logic: Cursor -> Agent ---

function syncToAgent() {
  console.log("🔄 Syncing from Cursor to Agent...");
  ensureDir(AGENT_RULES_DIR);
  ensureDir(AGENT_WORKFLOWS_DIR);

  // Sync Rules
  if (fs.existsSync(CURSOR_RULES_DIR)) {
    const files = fs.readdirSync(CURSOR_RULES_DIR);
    for (const file of files) {
      if (file.endsWith(".mdc")) {
        const srcPath = path.join(CURSOR_RULES_DIR, file);
        const content = fs.readFileSync(srcPath, "utf-8");
        const { frontmatter, body } = parseFrontmatter(content);

        // Transform for Agent
        const newFrontmatter: any = { ...frontmatter };

        // Agent uses 'trigger: glob' if 'globs' is present
        if (newFrontmatter.globs) {
          newFrontmatter.trigger = "glob";
        }

        // Ensure description
        if (!newFrontmatter.description) {
          newFrontmatter.description = file.replace(".mdc", "");
        }

        // Add Source Header
        const header = `<!--\nSOURCE: .cursor/rules/${file}\n-->\n\n`;
        const newContent = stringifyFrontmatter(newFrontmatter) + header + body;

        const destFileName = file.replace(".mdc", ".md");
        const destPath = path.join(AGENT_RULES_DIR, destFileName);

        fs.writeFileSync(destPath, newContent);
        console.log(`✅ Rule: ${file} -> ${destFileName}`);
      }
    }
  }

  // Sync Workflows (Commands -> Workflows)
  if (fs.existsSync(CURSOR_COMMANDS_DIR)) {
    const files = fs.readdirSync(CURSOR_COMMANDS_DIR);
    for (const file of files) {
      if (file.endsWith(".md")) {
        const srcPath = path.join(CURSOR_COMMANDS_DIR, file);
        const content = fs.readFileSync(srcPath, "utf-8");
        // Assuming simple copy for now as plans focus on rules
        const destPath = path.join(AGENT_WORKFLOWS_DIR, file);
        fs.writeFileSync(destPath, content);
        console.log(`✅ Workflow: ${file} -> ${file}`);
      }
    }
  }
}

// --- Sync Logic: Agent -> Cursor ---

function syncToCursor() {
  console.log("🔄 Syncing from Agent to Cursor...");

  if (!fs.existsSync(AGENT_RULES_DIR)) {
    console.log("No agent rules found.");
    return;
  }

  const files = fs.readdirSync(AGENT_RULES_DIR);
  for (const file of files) {
    if (file.endsWith(".md")) {
      const srcPath = path.join(AGENT_RULES_DIR, file);
      const content = fs.readFileSync(srcPath, "utf-8");
      const { frontmatter: agentFrontmatter, body: fullBody } =
        parseFrontmatter(content);

      // Find Source Header
      const sourceMatch = fullBody.match(/<!--\s*SOURCE:\s*(.*?)\s*-->/);
      if (sourceMatch) {
        const originalSourceRelPath = sourceMatch[1].trim(); // e.g. .cursor/rules/foo.mdc
        // Clean body by removing the header
        const cleanBody = fullBody.replace(
          /<!--\s*SOURCE:.*?\s*-->\s*\n?/s,
          "",
        );

        const destPath = path.resolve(originalSourceRelPath);

        if (fs.existsSync(destPath)) {
          // Read original to preserve its specific frontmatter
          const originalContent = fs.readFileSync(destPath, "utf-8");
          const { frontmatter: originalFrontmatter } =
            parseFrontmatter(originalContent);

          // Update globs if changed in Agent (optional, but requested to sync back changes)
          if (agentFrontmatter.globs) {
            originalFrontmatter.globs = agentFrontmatter.globs;
          }

          const newContent =
            stringifyFrontmatter(originalFrontmatter) + cleanBody;
          fs.writeFileSync(destPath, newContent);
          console.log(`✅ Updated Cursor Rule: ${path.basename(destPath)}`);
        } else {
          console.warn(
            `⚠️ Original source not found for ${file}: ${destPath}. Skipping create to avoid duplication issues.`,
          );
        }
      } else {
        console.log(
          `ℹ️ No SOURCE header found in ${file}. Skipping sync back.`,
        );
      }
    }
  }
}

// --- Main ---

const args = process.argv.slice(2);
const toCursor = args.includes("--to-cursor");

if (toCursor) {
  syncToCursor();
} else {
  syncToAgent();
}
