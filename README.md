# Vedāntic Study Archive

A static site hosting class notes on Vedāntic texts, starting with the **Bṛhadāraṇyaka Upaniṣad** with Śāṅkara Bhāṣya.

Built with [Astro](https://astro.build) and [Pagefind](https://pagefind.app).

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production (includes search index)
npm run build

# Preview production build
npm run preview
```

## Adding a New Class

### 1. Create content files

Each class requires two Markdown files — one in Devanagari, one in IAST:

```
src/content/classes/{series}/{adhyaya}-{brahmana}/class-{NN}.dev.md
src/content/classes/{series}/{adhyaya}-{brahmana}/class-{NN}.iast.md
```

For example, Class 4 of Maitreyī Brāhmaṇa (2.4):
```
src/content/classes/brhadaranyaka/2-4/class-04.dev.md
src/content/classes/brhadaranyaka/2-4/class-04.iast.md
```

### 2. Add frontmatter

```yaml
---
series: brhadaranyaka
series_title: Bṛhadāraṇyaka Upaniṣad
adhyaya: 2
brahmana: 4
brahmana_name: Maitreyī Brāhmaṇa
class_number: 4
date: "2026-04-24"
coverage: "Brief 1–3 sentence summary of what this class covers."
audio_url: ""              # Optional: external audio URL
script: iast               # or "devanagari"
source_ref: "Bṛhad. 2.4.3–4 bhāṣyam"  # Optional
related_verses: ""         # Optional: e.g., "Vārttika BV 2.4.15–20"
---
```

### 3. Write the body

- Use `**bold**` for Sanskrit terms inline
- Use `<blockquote class="verse">` for verse/citation blocks (these get distinct styling — indented, tinted, never bold)
- Use real daṇḍa `।` and double daṇḍa `॥`
- Use real em-dashes `—` and curly quotes `""`
- Use `##` for section headings, `###` for sub-sections

**Verse block example:**
```markdown
<blockquote class="verse">

आत्मा वा अरे द्रष्टव्यः श्रोतव्यो मन्तव्यो निदिध्यासितव्यः ॥

</blockquote>
```

### 4. Build and verify

```bash
npm run build
npm run preview
```

Open [http://localhost:4321](http://localhost:4321) to verify the new class appears.

## Content Conventions

| Convention | Example |
|---|---|
| Bold Sanskrit terms | `**brahmavidyā**`, `**saṁnyāsa**` |
| Verse/citation blocks | `<blockquote class="verse">...</blockquote>` |
| Daṇḍa | `।` (U+0964) |
| Double daṇḍa | `॥` (U+0965) |
| Em dash | `—` (U+2014) |
| Curly quotes | `""` (U+201C / U+201D) |
| Sanskrit lang attribute | Added automatically for `.devanagari` panels |

## Typography

### Fonts Used

| Purpose | Font | Source |
|---|---|---|
| IAST / English body | Gentium Plus | Google Fonts |
| Devanagari body | Noto Serif Devanagari | Google Fonts |
| UI elements (nav, buttons) | Inter | Google Fonts |

### Updating Fonts

Fonts are loaded via Google Fonts CDN in `src/layouts/BaseLayout.astro`. To change fonts:

1. Update the `<link>` tag in the `<head>` section of `BaseLayout.astro`
2. Update the CSS custom properties in `src/styles/typography.css`:
   ```css
   --font-body: 'Your Font', serif;
   --font-devanagari: 'Your Devanagari Font', serif;
   ```
3. Ensure your chosen font has full IAST diacritic coverage (āīūṛṝḷṃḥñṅṇṭḍśṣ)

### Self-hosting Fonts

To self-host fonts instead of using Google Fonts CDN:

1. Download the font files (`.woff2` format preferred)
2. Place them in `public/fonts/`
3. Add `@font-face` declarations in `typography.css`
4. Remove the Google Fonts `<link>` from `BaseLayout.astro`

## Deployment

### GitHub Pages

1. Push the repository to GitHub
2. In `astro.config.mjs`, set `site` to your GitHub Pages URL
3. Add a `.github/workflows/deploy.yml` (see [Astro docs](https://docs.astro.build/en/guides/deploy/github/))

### Cloudflare Pages

1. Push to GitHub/GitLab
2. In Cloudflare dashboard: Pages → Create → Connect to Git
3. Build command: `npm run build`
4. Build output directory: `dist`

### Netlify

1. Push to GitHub
2. In Netlify: Add new site → Import from Git
3. Build command: `npm run build`
4. Publish directory: `dist`

## Project Structure

```
vedantic-archive/
├── src/
│   ├── content/classes/       # Markdown class notes
│   ├── components/            # Astro components (Nav, Toggle, etc.)
│   ├── layouts/               # Base layout
│   ├── pages/                 # Route pages
│   └── styles/                # CSS (global, typography, components, print)
├── public/                    # Static assets (favicon, OG image)
├── astro.config.mjs           # Astro configuration
└── package.json               # Dependencies & scripts
```

## Features

- ✅ Devanagari ↔ IAST toggle (preserves scroll, remembers preference)
- ✅ Dark mode (system preference + manual toggle)
- ✅ Full-text search via Pagefind (both scripts indexed)
- ✅ Mobile-responsive layout
- ✅ Print-optimized CSS
- ✅ SEO (meta tags, Open Graph, sitemap)
- ✅ Accessibility (ARIA labels, semantic HTML, `lang` attributes)

## License

Content © Vedāntic Study Archive. All rights reserved.
