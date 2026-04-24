# Endspace Hexo

Hexo theme inspired by the official website of [Arknights: Endfield](https://endfield.arknights.com/).

## Features

- Industrial / sci-fi visual design with electric yellow accent and monospace tech labels
- Animated loading cover with boot-sequence phases
- Responsive sidebar navigation (desktop) and drawer navigation (mobile)
- Dark mode with system preference detection
- Client-side full-text search
- Auto-generated table of contents with scrollspy
- Smooth PJAX page transitions via Swup
- Post cards with cover images, categories, and tags
- Archive timeline, category listing, and tag cloud pages
- Extensive social link support (GitHub, Twitter/X, Bilibili, Telegram, etc.)
- Built with Tailwind CSS 3.4 and modular SCSS

## Acknowledgements

- Reference implementation: [cloud-oc/endspace](https://github.com/cloud-oc/endspace) (NotionNext version)
- Design inspiration: [Arknights: Endfield](https://endfield.arknights.com/) official website

## Installation

```bash
cd your-hexo-site
git clone https://github.com/YuzukiTsuru/endspace-hexo.git
```

Install dependencies:

```bash
npm install
```

Set the theme in your site `_config.yml`:

```yaml
theme: endspace
```

## Configuration

Edit `themes/endspace/_config.yml` to customize:

- Site identity (avatar, author, bio)
- Navigation menu items
- Loading cover text and behavior
- Social links
- Post list and article layout options
- Footer settings

## Development

```bash
# Start dev server with live reload (SCSS + Tailwind + Hexo)
npm run dev

# Build for production
npm run build

# Clean generated files
npm run clean
```
