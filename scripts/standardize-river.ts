import fs from "fs";
import path from "path";
import { TTS_DEFINITIONS } from "../sveltekit-version/src/lib/data/tts-definitions";

const TARGET_DIR =
  "d:/UserProjects/ThzoharHalev/daily-schedule/sveltekit-version/static/sounds/river-v0.2-t2";

console.log(`Standardizing filenames in ${TARGET_DIR}...`);

if (!fs.existsSync(TARGET_DIR)) {
  console.error("Target directory does not exist!");
  process.exit(1);
}

let renamedCount = 0;

TTS_DEFINITIONS.forEach((def) => {
  const idFilename = `${def.id}.mp3`;
  const targetFilename = def.baseFilename;

  if (idFilename === targetFilename) return; // No change needed

  const oldPath = path.join(TARGET_DIR, idFilename);
  const newPath = path.join(TARGET_DIR, targetFilename);

  if (fs.existsSync(oldPath)) {
    // If target already exists (duplicate?), don't overwrite blindly, but here we assume safe
    if (fs.existsSync(newPath)) {
      console.warn(
        `Skipping ${idFilename} -> ${targetFilename}: Target already exists.`,
      );
    } else {
      fs.renameSync(oldPath, newPath);
      console.log(`Renamed: ${idFilename} -> ${targetFilename}`);
      renamedCount++;
    }
  }
});

console.log(`Done. Renamed ${renamedCount} files.`);
