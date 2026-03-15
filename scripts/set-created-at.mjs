import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const IMAGES_DIR = path.join(ROOT, 'src/images');

const galleries = fs.readdirSync(IMAGES_DIR)
  .filter(f => fs.statSync(path.join(IMAGES_DIR, f)).isDirectory())
  .sort();

for (const slug of galleries) {
  const metaPath = path.join(IMAGES_DIR, slug, 'meta.json');

  if (!fs.existsSync(metaPath)) {
    console.log(`⏭️  ${slug}: no meta.json, skipping`);
    continue;
  }

  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));

  if (meta.createdAt) {
    console.log(`⏭️  ${slug}: already set (${meta.createdAt})`);
    continue;
  }

  const result = execSync(
    `git log --reverse --format=%aI -- "src/images/${slug}/"`,
    { cwd: ROOT }
  ).toString().trim();

  const firstCommit = result.split('\n')[0];

  if (!firstCommit) {
    console.log(`⚠️  ${slug}: no git history found`);
    continue;
  }

  meta.createdAt = new Date(firstCommit).toISOString().slice(0, 10);
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2) + '\n');
  console.log(`✅ ${slug}: createdAt=${meta.createdAt}`);
}
