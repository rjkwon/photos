This is my photo site, built with Astro. It's a static site and you can see it live at [kwon.photos](https://kwon.photos/).
## Stack
- Static site generator: [Astro](https://astro.build/) 
- Image processing and optimization: [Sharp](https://sharp.pixelplumbing.com/) 
- Typography: [AUTHENTIC Sans](https://authentic.website/sans) by [Christina Janus](https://christinajan.us/) and [Desmond Wong](https://desmondwong.com/)

## Project Structure (basic)
```
root/
├── dist/                     👉 Generated static site (not tracked in git)
├── src/
│   ├── images/               👉 Source images
│   │   └── gallery-name/
│   │       ├── meta.json     👉 Gallery metadata
│   │       └── *.jpg         👉 Original photos
│   ├── pages/
│   │   ├── [slug].astro      👉 Gallery page
│   │   ├── [slug]/
│   │   │   └── [image].astro 👉 Individual image page
│   │   └── index.astro       👉 Homepage
│   └── styles/
│       └── global.css        👉 Global styles (fonts, resets)
├── public/
│   ├── fonts/                👉 Web fonts
│   └── photos/               👉 Processed images
│       └── gallery-name/
│           └── *.webp        👉 Optimized images
├── scripts/
│   ├── process-images.mjs    👉 Image processing script
│   └── admin.mjs             👉 Local caption/alt text editor
└── package.json
```

## Setup
Need to have Node.js 18+, and npm (or yarn)
### Installation

1. Clone repository
```bash
git clone https://github.com/rjkwon/kwon.photos.git
cd kwon.photos
```

2. Install dependencies
```bash
npm install
```

3. Add photos to `src/images/gallery-name/` and create a `meta.json`
```json
{
  "title": "Gallery title",
  "dateRange": "Month year to Month year",
  "location": "City, State, Country",
  "blurb": "Description of the gallery"
}
```

4. Process images (runs `scripts/process-images.mjs`)
```bash
npm run process-images
```

5. Start the dev server

```bash
npm run dev
```

See live site at `http://localhost:4321` 

## Creating galleries

### 1. Add source images

Create a folder in `src/images/` with your gallery name

```
src/images/gallery-name/
├── meta.json
├── photo-01.jpg
├── photo-02.jpg
└── photo-03.jpg
```

### 2. Create metadata file

Create `meta.json` in your gallery folder
```json
{
  "title": "My Gallery",
  "dateRange": "January 2024",
  "location": "New York, NY",
  "blurb": "A collection of photos from my trip."
}
```

### 3. Process images

Run the image processing script (locally)
```bash
npm run process-images
```

This generates optimized versions at multiple sizes (600, 1600) and formats (webP, jpeg). You could alternatively set it up to run as part of your build process, but that ended up being too bulky for me.

### 4. Add captions and alt text (optional)

Run the local admin UI to add captions and alt text to individual images:

```bash
npm run admin
```

Open `http://localhost:3001`. Each image has two fields:
- **Alt text** — used by screen readers and when images fail to load
- **Caption** — displayed below the image in the gallery

Changes save automatically when you click out of a field. This writes an `images` key into the gallery's `meta.json`:

```json
{
  "title": "My Gallery",
  "images": {
    "photo-01": { "alt": "Describe what's in the photo", "caption": "Optional caption" }
  }
}
```

### 5. Custom layouts (optional)

Add a `groups` array to `meta.json` for custom layouts:

```json
{
  "title": "My Gallery",
  "dateRange": "January 2024",
  "location": "New York, NY",
  "blurb": "A collection of photos.",
  "groups": [
    {
      "type": "hero",
      "images": ["photo-01"]
    },
    {
      "type": "side-by-side",
      "images": ["photo-02", "photo-03"]
    }
  ]
}
```

Available layout types: `hero`, `side-by-side`, `landscape-stack`, `grid-2x2`, `grid-3x3`, `featured`, `portrait-tall`, `auto`

See [README-layouts.md](README-layouts.md) for full documentation.

## Image Processing

The `process-images.mjs` script:

- Generates multiple sizes (600px, 1400px)
- Creates multiple formats (WebP, jpeg -- could also do AVIF if that's your bag)
- Only processes new or changed images
- Cleans up deleted images automatically
- Optimizes for web (quality: 90)

**Settings** (in `scripts/process-images.mjs`):

```javascript
const formats = [
  { ext: "webp", options: { quality: 90 } },
  { ext: "jpg", options: { quality: 90 } },
];
const maxWidths = [600, 1600];
```

## Deployment

I use Netlify, but this setup should work on any static hosting platform.

1. `git push` to remote repo
2. Connect repo to Netlify
3. Build settings:
    - **Build command:** `npm run build`
    - **Publish directory:** `dist`
4. Deploy!

**Note:** Processed images in `public/photos/` are committed to Git, so no image processing happens during deployment. This keeps builds fast and reliable.

## Development

### Commands

| Command                  | Description                          |
| ------------------------ | ------------------------------------ |
| `npm run dev`            | Start dev server at `localhost:4321` |
| `npm run build`          | Build for production to `dist/`      |
| `npm run preview`        | Preview production build locally     |
| `npm run process-images` | Process images from `src/images/`    |
| `npm run admin`          | Open caption/alt text editor UI      |

### Workflow

1. Add photos to `src/images/gallery-name/`
2. Run `npm run process-images`
3. Run `npm run admin` to add captions and alt text
4. Commit everything: `git add src/images/ public/photos/`
5. Push to deploy

## Customization

### Fonts

Replace AUTHENTIC Sans fonts in `public/fonts/` and update `src/styles/global.css`:

```css
@font-face {
  font-family: 'Your font';
  src: url('/fonts/your-font.woff2') format('woff2');
  font-weight: 400;
}
```

### Colors

Update colors in the scoped `<style>` blocks in:

- `src/pages/[slug].astro` - Gallery page
- `src/pages/[slug]/[image].astro` - Image page
- `src/pages/index.astro` - Homepage

### Layouts

Modify grid layouts in the CSS of `[slug].astro`:

```css
.group.auto {
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
}
```

## License

MIT

## Inspo and photo sites I like

- [Anirudh's photos](https://anirudh.fi/photos/)
- [Chris Glass's photo journal](https://chrisglass.com/photos/)
- [Erica Fustero](https://www.ericafustero.com/photography)
- [javier.computer/photos](https://javier.computer/photos/)
- [Katie Shoots Film](https://katieshootsfilm.wordpress.com/)
- [Maxtagram](https://www.maxtagram.com/)
- [robins.photos](https://robins.photos/)