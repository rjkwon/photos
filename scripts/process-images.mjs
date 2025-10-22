import fs from "fs";
import path from "path";
import sharp from "sharp";

const inputRoot = "src/images";
const outputRoot = "public/photos";
const formats = [
  { ext: "webp", options: { quality: 90 } },
  { ext: "jpg", options: { quality: 90 } },
];
const maxWidths = [600, 1600];
const CONCURRENCY = 4;

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
      
      if (!fs.existsSync(outputPath)) return true;
      
      const outStats = fs.statSync(outputPath);
      if (srcStats.mtimeMs > outStats.mtimeMs) return true;
    }
  }
  
  return false;
}

// Clean up orphaned output files (source no longer exists)
function cleanOrphanedFiles(inputFolder, outputFolder) {
  if (!fs.existsSync(outputFolder)) return;
  
  // Get all source image base names
  const sourceFiles = fs
    .readdirSync(inputFolder)
    .filter((f) => /\.(jpg|jpeg|png|heic|dng)$/i.test(f))
    .map((f) => path.parse(f).name);
  
  const sourceNamesSet = new Set(sourceFiles);
  
  // Get all output files
  const outputFiles = fs.readdirSync(outputFolder);
  
  let deletedCount = 0;
  
  outputFiles.forEach((file) => {
    // Extract base name from output file (e.g., "20231217_01" from "20231217_01-1000.jpg")
    const match = file.match(/^(.+?)-\d+\.(jpg|webp|avif)$/);
    if (match) {
      const baseName = match[1];
      
      // If source file doesn't exist, delete the output file
      if (!sourceNamesSet.has(baseName)) {
        const outputPath = path.join(outputFolder, file);
        fs.unlinkSync(outputPath);
        console.log("🗑️  Deleted:", outputPath);
        deletedCount++;
      }
    }
  });
  
  if (deletedCount > 0) {
    const uniqueImages = Math.ceil(deletedCount / (maxWidths.length * formats.length));
    console.log(`  ✨ Cleaned up ${deletedCount} orphaned files (${uniqueImages} images)`);
  }
}

async function processImage(srcPath, destFolder, filename) {
  const name = path.parse(filename).name;
  
  try {
    const input = sharp(srcPath).rotate();
    
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
  
  // First, clean up orphaned files
  cleanOrphanedFiles(folderPath, outputFolder);
  
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

// Clean up orphaned gallery folders
function cleanOrphanedGalleries() {
  if (!fs.existsSync(outputRoot)) return;
  
  // Get all source gallery folders
  const sourceGalleries = fs
    .readdirSync(inputRoot)
    .filter((f) => fs.statSync(path.join(inputRoot, f)).isDirectory());
  
  const sourceGalleriesSet = new Set(sourceGalleries);
  
  // Get all output gallery folders
  const outputGalleries = fs
    .readdirSync(outputRoot)
    .filter((f) => fs.statSync(path.join(outputRoot, f)).isDirectory());
  
  outputGalleries.forEach((gallery) => {
    if (!sourceGalleriesSet.has(gallery)) {
      const galleryPath = path.join(outputRoot, gallery);
      fs.rmSync(galleryPath, { recursive: true, force: true });
      console.log(`🗑️  Deleted orphaned gallery: ${gallery}`);
    }
  });
}

async function main() {
  console.log("🔍 Checking for orphaned galleries...\n");
  cleanOrphanedGalleries();
  
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