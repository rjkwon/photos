# Gallery layouts

In each gallery's  `meta.json`, you can configure different layout types.

## Basic structure

Each gallery folder in `src/images/` can have a `meta.json` file with the following structure:

```json
{
  "title": "Gallery Title",
  "dateRange": "Month Year – Month Year",
  "location": "City, State/Country",
  "blurb": "Description of the gallery",
  "groups": [
    {
      "type": "layout-type",
      "images": ["image-basename-1", "image-basename-2"]
    }
  ]
}
```

## Default behavior

The `groups` array is optional. If you don't include one, the gallery will automatically display images in 3s and side-by-side (on desktop, or in a single column on mobile). If there's an odd number of images, the last one displays full-width. (I'll add a visual for this soon.)

This means you can create a gallery with just:

```json
{
  "title": "My Gallery",
  "dateRange": "2024",
  "location": "New York",
  "blurb": "A collection of photos"
}
```

And all images will be laid out automatically.

## Custom layouts

To create a custom layout, add a `groups` array. Each group defines how a set of images should be displayed.

### Image names

Use the **base filename** without the size or format suffix (I use a date format):

- ✅ `"20231217_01"`
- ❌ `"20231217_01-1000.jpg"`

The system will automatically load all size/format variants.

---

## Available layout types

These are all on desktop. On mobile, it's just a single column of images.
### `side-by-side`

Displays two images next to each other in equal-width columns.
```json
{
  "type": "side-by-side",
  "images": ["image1", "image2"]
}
```

---

### `hero`

Full-width single image spanning the entire container. Good for panoramas or landscape photos.
```json
{
  "type": "hero",
  "images": ["image1"]
}
```

---

### `portrait-tall`

Single column layout optimized for portrait/vertical images.
```json
{
  "type": "portrait-tall",
  "images": ["image1"]
}
```

---

### `landscape-stack`

Stacks multiple landscape images vertically in a single column.
```json
{
  "type": "landscape-stack",
  "images": ["image1", "image2", "image3"]
}
```

---

### `grid-2x2`

2×2 grid of images.

```json
{
  "type": "grid-2x2",
  "images": ["image1", "image2", "image3", "image4"]
}
```

---

### `grid-3x3`

3×3 grid of images.

```json
{
  "type": "grid-3x3",
  "images": ["img1", "img2", "img3", "img4", "img5", "img6", "img7", "img8", "img9"]
}
```


---

### `featured`

One large image at 2/3 width with a smaller one next to it at 1/3 width.

```json
{
  "type": "featured",
  "images": ["hero-image", "secondary-image"]
}
```

---

### `auto`

Default 3-column grid layout.

```json
{
  "type": "auto",
  "images": ["image1", "image2", "image3"]
}
```


---

## Example

```json
{
  "title": "Winter Walks 2023",
  "dateRange": "Dec 2023 – Feb 2024",
  "location": "Hudson Valley, New York",
  "blurb": "I love winter. For the past couple winters I've made a pilgrimage upstate for a month or so to hunker down and get cozy, while also going for a winter walk every day at least once a day.",
  "groups": [
    {
      "type": "hero",
      "images": ["20231217_01"]
    },
    {
      "type": "side-by-side",
      "images": ["20231217_02", "20231217_03"]
    },
    {
      "type": "landscape-stack",
      "images": ["20231217_04", "20231217_05", "20231217_06"]
    },
    {
      "type": "portrait-tall",
      "images": ["20231217_07"]
    },
    {
      "type": "grid-2x2",
      "images": ["20231217_08", "20231217_09", "20231217_10", "20231217_11"]
    },
    {
      "type": "featured",
      "images": ["20231217_12", "20231217_13"]
    }
  ]
}
```


## Workflow

### Quick Setup (No customization)

1. Add photos to `src/images/gallery-name/`
2. Add basic `meta.json`:
    ```json
    {  
	   "title": "Gallery Name",  
	   "dateRange": "2024",  
	   "location": "Location",  
	   "blurb": "Description"
		}
    ```
3. Run `npm run process-images`

### Custom layout

1. Start with the quick setup above
2. Look at the gallery and decide which images need special treatment
3. Add a `groups` array to customize specific sections
4. Ok to mix default and custom (leave some images in auto-layout and customize others)
