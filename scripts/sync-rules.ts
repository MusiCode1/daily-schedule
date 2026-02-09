import fs from "fs";
import path from "path";

const CURSOR_RULES_DIR = path.resolve(".cursor/rules");
const CURSOR_COMMANDS_DIR = path.resolve(".cursor/commands");
const QODER_RULES_DIR = path.resolve(".qoder/rules");
const QODER_COMMANDS_DIR = path.resolve(".qoder/commands");
const AGENT_RULES_DIR = path.resolve(".agent/rules");
const AGENT_WORKFLOWS_DIR = path.resolve(".agent/workflows");

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

// --- Sync Logic: Cursor (Source) -> Agent & Qoder ---

function syncToAgent() {
  console.log("🔄 Syncing from Cursor (Source) to Agent & Qoder...");
  ensureDir(AGENT_RULES_DIR);
  ensureDir(AGENT_WORKFLOWS_DIR);
  ensureDir(QODER_RULES_DIR);
  ensureDir(QODER_COMMANDS_DIR);

  // Sync Rules from Cursor (.mdc) -> Agent & Qoder
  if (fs.existsSync(CURSOR_RULES_DIR)) {
    const files = fs.readdirSync(CURSOR_RULES_DIR);
    for (const file of files) {
      if (file.endsWith(".mdc")) {
        // Sync to Agent
        processRuleFile(CURSOR_RULES_DIR, file, ".mdc");

        // Sync to Qoder
        processRuleToQoder(CURSOR_RULES_DIR, file);
      }
    }
  }

  // NOTE: We disabling Qoder -> Agent sync as Cursor is now the single source of truth.
  // if (fs.existsSync(QODER_RULES_DIR)) { ... }

  // Sync Workflows (Commands -> Workflows)
  // From Cursor
  if (fs.existsSync(CURSOR_COMMANDS_DIR)) {
    const files = fs.readdirSync(CURSOR_COMMANDS_DIR);
    for (const file of files) {
      if (file.endsWith(".md")) {
        processCommandFile(CURSOR_COMMANDS_DIR, file);
        // Also sync command to Qoder if needed, assuming direct copy for commands
        // Qoder commands folder: .qoder/commands
        const srcPath = path.join(CURSOR_COMMANDS_DIR, file);
        const content = fs.readFileSync(srcPath, "utf-8");
        const destPath = path.join(QODER_COMMANDS_DIR, file);
        // Qoder expects proper frontmatter for commands?
        // For now, simple copy to keep them in sync.
        fs.writeFileSync(destPath, content);
      }
    }
  }
}

function processRuleToQoder(dir: string, file: string) {
  const srcPath = path.join(dir, file);
  const content = fs.readFileSync(srcPath, "utf-8");
  const { frontmatter, body } = parseFrontmatter(content);

  const newFrontmatter: any = { ...frontmatter };

  // Translate Cursor 'alwaysApply' -> Qoder 'trigger'
  if (newFrontmatter.alwaysApply === true) {
    newFrontmatter.trigger = "always_on";
    delete newFrontmatter.alwaysApply;
  } else if (newFrontmatter.alwaysApply === false) {
    // If it has globs, it's auto/glob triggered usually, but if explicit manual context:
    if (!newFrontmatter.globs) {
      newFrontmatter.trigger = "manual";
    }
    delete newFrontmatter.alwaysApply;
  }

  // Qoder uses .md
  const newContent = stringifyFrontmatter(newFrontmatter) + body;
  const destFileName = file.replace(".mdc", ".md");
  const destPath = path.join(QODER_RULES_DIR, destFileName);

  fs.writeFileSync(destPath, newContent);
  console.log(`✅ Rule (Qoder): ${file} -> ${destFileName}`);
}

function processRuleFile(
  dir: string,
  file: string,
  ext: string,
  isQoder = false,
) {
  const srcPath = path.join(dir, file);
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
    newFrontmatter.description = file.replace(ext, "");
  }

  // Add Source Header
  const sourceDir = isQoder ? ".qoder/rules" : ".cursor/rules";
  const header = `<!--\nSOURCE: ${sourceDir}/${file}\n-->\n\n`;
  const newContent = stringifyFrontmatter(newFrontmatter) + header + body;

  const destFileName = file.replace(ext, ".md");
  const destPath = path.join(AGENT_RULES_DIR, destFileName);

  fs.writeFileSync(destPath, newContent);
  console.log(
    `✅ Rule (${isQoder ? "Qoder" : "Cursor"}): ${file} -> ${destFileName}`,
  );
}

function processCommandFile(dir: string, file: string, isQoder = false) {
  const srcPath = path.join(dir, file);
  const content = fs.readFileSync(srcPath, "utf-8");

  // For Qoder, we might want to check for type: project_command, but broadly syncing is safer for now unless restricted
  // But let's verify if user specifically asked for restriction. "project_command" was mentioned as format.
  // If it's a Qoder command, it should have the Frontmatter.

  if (isQoder) {
    const { frontmatter } = parseFrontmatter(content);
    if (frontmatter.type !== "project_command") {
      // Use console.debug if valid, otherwise just skip silently or log info
      // console.log(`ℹ️ Skipping ${file} (not project_command)`);
      return;
    }
  }

  // Assuming simple copy for now as plans focus on rules
  // Note: Qoder commands might need transformation if format differs significantly,
  // but user mostly showed frontmatter.
  const destPath = path.join(AGENT_WORKFLOWS_DIR, file);
  fs.writeFileSync(destPath, content);
  console.log(
    `✅ Workflow (${isQoder ? "Qoder" : "Cursor"}): ${file} -> ${file}`,
  );
}

// --- Sync Logic: Agent -> Cursor/Qoder ---

function syncToCursor() {
  console.log("🔄 Syncing from Agent to Cursor/Qoder...");

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
        const originalSourceRelPath = sourceMatch[1].trim(); // e.g. .cursor/rules/foo.mdc OR .qoder/rules/foo.md
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

          // Update globs if changed in Agent
          if (agentFrontmatter.globs) {
            originalFrontmatter.globs = agentFrontmatter.globs;
          }

          // Translate Agent 'trigger: manual' -> Cursor 'alwaysApply: false'
          if (agentFrontmatter.trigger === "manual") {
            originalFrontmatter.alwaysApply = false;
          }
          // Translate Agent 'trigger: always_on' -> Cursor 'alwaysApply: true' (optional but good for consistency)
          if (agentFrontmatter.trigger === "always_on") {
            originalFrontmatter.alwaysApply = true;
          }

          const newContent =
            stringifyFrontmatter(originalFrontmatter) + cleanBody;
          fs.writeFileSync(destPath, newContent);
          console.log(`✅ Updated Rule: ${path.basename(destPath)}`);
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
