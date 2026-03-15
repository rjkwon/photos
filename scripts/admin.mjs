import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const IMAGES_DIR = path.join(ROOT, 'src/images');
const PUBLIC_DIR = path.join(ROOT, 'public');
const PORT = 3001;

function getGalleries() {
  if (!fs.existsSync(IMAGES_DIR)) return [];

  return fs.readdirSync(IMAGES_DIR)
    .filter(f => fs.statSync(path.join(IMAGES_DIR, f)).isDirectory())
    .sort()
    .map(slug => {
      const galleryPath = path.join(IMAGES_DIR, slug);
      const metaPath = path.join(galleryPath, 'meta.json');

      let meta = { title: slug.replace(/-/g, ' ') };
      if (fs.existsSync(metaPath)) {
        try { meta = { ...meta, ...JSON.parse(fs.readFileSync(metaPath, 'utf-8')) }; } catch {}
      }

      const images = fs.readdirSync(galleryPath)
        .filter(f => /\.(jpg|jpeg|png|heic|dng)$/i.test(f))
        .sort()
        .map(file => {
          const baseName = path.parse(file).name;
          const imageData = (meta.images || {})[baseName] || {};
          const thumbPath = path.join(PUBLIC_DIR, 'photos', slug, `${baseName}-600.webp`);
          return {
            baseName,
            alt: imageData.alt || '',
            caption: imageData.caption || '',
            hasThumb: fs.existsSync(thumbPath),
          };
        });

      const galleryMeta = {
        title:     meta.title     || '',
        subtitle:  meta.subtitle  || '',
        dateRange: meta.dateRange || '',
        location:  meta.location  || '',
        cover:     meta.cover     || '',
        blurb:     meta.blurb     || '',
        createdAt: meta.createdAt || '',
      };

      return { slug, title: meta.title || slug, galleryMeta, images };
    });
}

function saveField(slug, imageName, field, value) {
  if (!['alt', 'caption'].includes(field)) throw new Error('Invalid field');

  const metaPath = path.join(IMAGES_DIR, slug, 'meta.json');
  let meta = {};
  if (fs.existsSync(metaPath)) {
    meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
  }

  if (!meta.images) meta.images = {};
  if (!meta.images[imageName]) meta.images[imageName] = {};
  meta.images[imageName][field] = value;

  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2) + '\n');
}

const GALLERY_FIELDS = ['title', 'subtitle', 'dateRange', 'location', 'cover', 'blurb', 'createdAt'];

function saveGalleryField(slug, field, value) {
  if (!GALLERY_FIELDS.includes(field)) throw new Error('Invalid field');

  const metaPath = path.join(IMAGES_DIR, slug, 'meta.json');
  let meta = {};
  if (fs.existsSync(metaPath)) {
    meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
  }

  if (value === '') {
    delete meta[field];
  } else {
    meta[field] = value;
  }

  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2) + '\n');
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderHtml(galleries) {
  const sidebarLinks = galleries.map((g, i) => `
    <button class="gallery-btn${i === 0 ? ' active' : ''}" onclick="showGallery('${g.slug}', this)">
      <div class="gallery-btn-title">${escapeHtml(g.title)}</div>
      <div class="gallery-btn-count">${g.images.length} image${g.images.length === 1 ? '' : 's'}</div>
    </button>`).join('');

  const gallerySections = galleries.map((g, i) => {
    const rows = g.images.map(img => {
      const thumb = img.hasThumb
        ? `<img src="/photos/${g.slug}/${img.baseName}-600.webp" alt="" />`
        : `<div class="no-thumb">no preview yet</div>`;

      const makeField = (field, label, placeholder, hint) => `
        <div class="field">
          <div class="field-label">
            <span>${label}</span>
            <span class="save-status" id="status-${g.slug}-${img.baseName}-${field}"></span>
          </div>
          <textarea
            rows="2"
            placeholder="${placeholder}"
            data-gallery="${g.slug}"
            data-image="${img.baseName}"
            data-field="${field}"
            onblur="saveField(this)"
          >${escapeHtml(img[field])}</textarea>
          ${hint ? `<div class="field-hint">${hint}</div>` : ''}
        </div>`;

      return `
      <div class="image-row">
        <div class="thumb-col">
          <div class="thumb-wrap">${thumb}</div>
          <div class="thumb-name">${img.baseName}</div>
        </div>
        <div class="fields">
          ${makeField('alt', 'Alt text', 'Describe the image for screen readers…', 'Concise description of what\'s in the photo. Used by screen readers and when images fail to load.')}
          ${makeField('caption', 'Caption', 'Optional caption shown below the image…', '')}
        </div>
      </div>`;
    }).join('');

    const m = g.galleryMeta;

    const makeGalleryField = (field, label, type = 'text', extra = '') => `
      <div class="field${type === 'textarea' || field === 'blurb' ? ' full' : ''}">
        <div class="field-label">
          <span>${label}</span>
          <span class="save-status" id="gstatus-${g.slug}-${field}"></span>
        </div>
        ${type === 'textarea'
          ? `<textarea rows="3" data-gallery="${g.slug}" data-field="${field}" onblur="saveGalleryField(this)">${escapeHtml(m[field])}</textarea>`
          : type === 'select'
          ? `<select data-gallery="${g.slug}" data-field="${field}" onchange="saveGalleryField(this)">
               <option value="">— none —</option>
               ${g.images.map(img => `<option value="${img.baseName}"${m.cover === img.baseName ? ' selected' : ''}>${img.baseName}</option>`).join('')}
             </select>`
          : `<input type="text" data-gallery="${g.slug}" data-field="${field}" value="${escapeHtml(m[field])}" onblur="saveGalleryField(this)" />`
        }
      </div>`;

    const galleryInfoForm = `
      <div class="gallery-info">
        <div class="gallery-info-heading">Gallery details</div>
        <div class="gallery-fields">
          ${makeGalleryField('title',     'Title')}
          ${makeGalleryField('subtitle',  'Subtitle')}
          ${makeGalleryField('dateRange', 'Date range')}
          ${makeGalleryField('location',  'Location')}
          ${makeGalleryField('cover',     'Cover image', 'select')}
          ${makeGalleryField('createdAt', 'Created (YYYY-MM-DD)')}
          ${makeGalleryField('blurb',     'Blurb', 'textarea')}
        </div>
      </div>`;

    return `
    <div class="gallery-section${i === 0 ? ' active' : ''}" id="gallery-${g.slug}">
      <div class="gallery-heading">
        <h1>${escapeHtml(g.title)}</h1>
        <p>${g.images.length} image${g.images.length === 1 ? '' : 's'}</p>
      </div>
      ${galleryInfoForm}
      <div class="images-list">${rows}</div>
    </div>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Gallery editor — kwon.photos</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #f9f9f9;
      color: #1a1a1a;
      display: flex;
      height: 100vh;
      overflow: hidden;
    }

    /* Sidebar */
    .sidebar {
      width: 220px;
      background: #fff;
      border-right: 1px solid #e8e8e8;
      overflow-y: auto;
      flex-shrink: 0;
    }
    .sidebar-header {
      padding: 1.25rem 1rem 1rem;
      font-size: 0.68rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #aaa;
      border-bottom: 1px solid #f0f0f0;
    }
    .gallery-btn {
      display: block;
      width: 100%;
      text-align: left;
      padding: 0.75rem 1rem;
      cursor: pointer;
      background: none;
      border: none;
      border-bottom: 1px solid #f2f2f2;
      font-family: inherit;
      transition: background 0.1s;
      color: #555;
    }
    .gallery-btn:hover { background: #f7f7f7; }
    .gallery-btn.active { background: #f0f0f0; color: #111; }
    .gallery-btn-title { font-size: 0.82rem; line-height: 1.4; font-weight: 500; }
    .gallery-btn-count { font-size: 0.7rem; color: #bbb; margin-top: 0.2rem; }

    /* Main area */
    .main { flex: 1; overflow-y: auto; min-width: 0; }

    .gallery-section { display: none; padding: 2rem 2.5rem 4rem; }
    .gallery-section.active { display: block; }

    .gallery-heading {
      margin-bottom: 2rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid #ebebeb;
    }
    .gallery-heading h1 { font-size: 1.1rem; font-weight: 600; }
    .gallery-heading p { font-size: 0.78rem; color: #bbb; margin-top: 0.3rem; }

    /* Image rows */
    .image-row {
      display: grid;
      grid-template-columns: 180px 1fr;
      gap: 1.75rem;
      align-items: start;
      padding: 1.5rem 0;
      border-bottom: 1px solid #f0f0f0;
    }
    .image-row:last-child { border-bottom: none; }

    .thumb-wrap {
      width: 180px;
      height: 120px;
      border-radius: 6px;
      overflow: hidden;
      background: #eee;
    }
    .thumb-wrap img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .no-thumb {
      width: 100%; height: 100%;
      display: flex; align-items: center; justify-content: center;
      font-size: 0.7rem; color: #ccc;
    }
    .thumb-name {
      font-size: 0.65rem;
      color: #ccc;
      margin-top: 0.4rem;
      font-family: 'SF Mono', Menlo, monospace;
      text-align: center;
    }

    .fields { display: flex; flex-direction: column; gap: 1rem; }

    .field-label {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.3rem;
    }
    .field-label span {
      font-size: 0.68rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #aaa;
    }
    .save-status {
      font-size: 0.68rem;
      font-weight: 400;
      text-transform: none;
      letter-spacing: 0;
      color: #4caf50;
      opacity: 0;
      transition: opacity 0.4s;
    }
    .save-status.visible { opacity: 1; }
    .save-status.error { color: #e53935; }

    textarea {
      width: 100%;
      padding: 0.5rem 0.65rem;
      font-size: 0.85rem;
      font-family: inherit;
      line-height: 1.55;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      resize: vertical;
      background: #fff;
      color: inherit;
      transition: border-color 0.15s;
    }
    textarea:focus { outline: none; border-color: #bbb; }
    textarea.just-saved { border-color: #81c784; }

    .field-hint { font-size: 0.68rem; color: #ccc; margin-top: 0.3rem; line-height: 1.45; }

    /* Gallery info section */
    .gallery-info {
      margin-bottom: 3rem;
      padding-bottom: 2.5rem;
      border-bottom: 1px solid #e8e8e8;
    }
    .gallery-info-heading {
      font-size: 0.68rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #aaa;
      margin-bottom: 1.25rem;
    }
    .gallery-fields {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    .gallery-fields .field.full { grid-column: 1 / -1; }

    input[type="text"], select {
      width: 100%;
      padding: 0.5rem 0.65rem;
      font-size: 0.85rem;
      font-family: inherit;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      background: #fff;
      color: inherit;
      transition: border-color 0.15s;
    }
    input[type="text"]:focus, select:focus { outline: none; border-color: #bbb; }
    input[type="text"].just-saved, select.just-saved { border-color: #81c784; }
  </style>
</head>
<body>
  <nav class="sidebar">
    <div class="sidebar-header">Galleries</div>
    ${sidebarLinks}
  </nav>
  <div class="main">
    ${gallerySections}
  </div>
  <script>
    function showGallery(slug, btn) {
      document.querySelectorAll('.gallery-section').forEach(s => s.classList.remove('active'));
      document.querySelectorAll('.gallery-btn').forEach(b => b.classList.remove('active'));
      document.getElementById('gallery-' + slug).classList.add('active');
      btn.classList.add('active');
      document.querySelector('.main').scrollTop = 0;
    }

    async function saveGalleryField(el) {
      const { gallery, field } = el.dataset;
      const value = el.value.trim();
      const statusEl = document.getElementById('gstatus-' + gallery + '-' + field);

      try {
        const res = await fetch('/api/save-gallery', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gallery, field, value }),
        });
        if (!res.ok) throw new Error('Server error');

        // Keep sidebar title in sync when title changes
        if (field === 'title') {
          document.querySelector('#gallery-' + gallery + ' .gallery-heading h1').textContent = value;
          const btn = document.querySelector('.gallery-btn.active .gallery-btn-title');
          if (btn) btn.textContent = value;
        }

        statusEl.textContent = 'Saved';
        statusEl.className = 'save-status visible';
        el.classList.add('just-saved');
        setTimeout(() => {
          statusEl.classList.remove('visible');
          el.classList.remove('just-saved');
        }, 2000);
      } catch (err) {
        statusEl.textContent = 'Error saving';
        statusEl.className = 'save-status visible error';
        setTimeout(() => statusEl.classList.remove('visible'), 3000);
      }
    }

    async function saveField(textarea) {
      const { gallery, image, field } = textarea.dataset;
      const value = textarea.value.trim();
      const statusEl = document.getElementById('status-' + gallery + '-' + image + '-' + field);

      try {
        const res = await fetch('/api/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gallery, imageName: image, field, value }),
        });
        if (!res.ok) throw new Error('Server error');

        statusEl.textContent = 'Saved';
        statusEl.className = 'save-status visible';
        textarea.classList.add('just-saved');
        setTimeout(() => {
          statusEl.classList.remove('visible');
          textarea.classList.remove('just-saved');
        }, 2000);
      } catch (err) {
        statusEl.textContent = 'Error saving';
        statusEl.className = 'save-status visible error';
        setTimeout(() => statusEl.classList.remove('visible'), 3000);
      }
    }
  </script>
</body>
</html>`;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // Serve thumbnail images from public/
  if (req.method === 'GET' && url.pathname.startsWith('/photos/')) {
    const filePath = path.join(PUBLIC_DIR, url.pathname);
    const ext = path.extname(filePath).slice(1).toLowerCase();
    const mimeTypes = { jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', png: 'image/png' };
    if (fs.existsSync(filePath) && mimeTypes[ext]) {
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] });
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.writeHead(404); res.end();
    }
    return;
  }

  // Save a single field
  if (req.method === 'POST' && url.pathname === '/api/save') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { gallery, imageName, field, value } = JSON.parse(body);
        saveField(gallery, imageName, field, value);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // Save a gallery-level field
  if (req.method === 'POST' && url.pathname === '/api/save-gallery') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { gallery, field, value } = JSON.parse(body);
        saveGalleryField(gallery, field, value);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // Main UI — regenerate on each request so changes are reflected on refresh
  if (req.method === 'GET' && url.pathname === '/') {
    const galleries = getGalleries();
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(renderHtml(galleries));
    return;
  }

  res.writeHead(404); res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`\n  Caption editor running at http://localhost:${PORT}\n`);
});
