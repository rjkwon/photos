import fs from "fs";
import path from "path";
import sharp from "sharp";

const inputRoot = "src/images";
const outputRoot = "public/photos";
const formats = [
  { ext: "webp", options: { quality: 90 } },
  { ext: "avif", options: { quality: 90 } },
  { ext: "jpg", options: { quality: 90 } },
];
const maxWidths = [480, 1000, 1600];

const CONCURRENCY = 4; // Number of images to process concurrently

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// Check if any output files are missing or older than source
function needsRegeneration(srcPath, destFolder, filename) {
  const name = path.parse(filename).name;
  const srcStats = fs.statSync(srcPath);
  
  for (const width of maxWidths) {
    for (const { ext } of formats) {
      const outputPath = path.join(destFolder, `${name}-${width}.${ext}`);
      
      // If file doesn't exist, needs regeneration
      if (!fs.existsSync(outputPath)) return true;
      
      // If source is newer than output, needs regeneration
      const outStats = fs.statSync(outputPath);
      if (srcStats.mtimeMs > outStats.mtimeMs) return true;
    }
  }
  
  return false;
}

async function processImage(srcPath, destFolder, filename) {
  const name = path.parse(filename).name;
  
  try {
    const input = sharp(srcPath).rotate();
    
    // Process all variants in parallel
    const tasks = [];
    for (const width of maxWidths) {
      for (const { ext, options } of formats) {
        const outputName = `${name}-${width}.${ext}`;
        const outputPath = path.join(destFolder, outputName);
        
        tasks.push(
          input
            .clone()
            .resize(width)
            .toFormat(ext, options)
            .toFile(outputPath)
            .then(() => console.log("✅", outputPath))
        );
      }
    }
    
    await Promise.all(tasks);
  } catch (error) {
    console.error(`❌ Error processing ${filename}:`, error.message);
  }
}

async function processFolder(folderPath, outputFolder) {
  ensureDir(outputFolder);
  
  const files = fs
    .readdirSync(folderPath)
    .filter((f) => /\.(jpg|jpeg|png|heic|dng)$/i.test(f));
  
  // Filter to only files that need regeneration
  const filesToProcess = files.filter((file) => {
    const inputPath = path.join(folderPath, file);
    return needsRegeneration(inputPath, outputFolder, file);
  });
  
  if (filesToProcess.length === 0) {
    console.log("  ⏭️  All images up to date!");
    return;
  }
  
  console.log(`  🔄 Processing ${filesToProcess.length} of ${files.length} images...`);
  
  // Process images with concurrency limit
  for (let i = 0; i < filesToProcess.length; i += CONCURRENCY) {
    const batch = filesToProcess.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map((file) => {
        const inputPath = path.join(folderPath, file);
        return processImage(inputPath, outputFolder, file);
      })
    );
  }
}

async function main() {
  const galleries = fs
    .readdirSync(inputRoot)
    .filter((f) => fs.statSync(path.join(inputRoot, f)).isDirectory());
  
  for (const gallery of galleries) {
    const inputFolder = path.join(inputRoot, gallery);
    const outputFolder = path.join(outputRoot, gallery);
    console.log(`\n📸 Processing gallery: ${gallery}`);
    await processFolder(inputFolder, outputFolder);
  }
  
  console.log("\n🎉 Done processing images!");
}

main();