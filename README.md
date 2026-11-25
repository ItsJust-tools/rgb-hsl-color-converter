# RGB HSL Color Converter

Convert colors between HEX, RGB, HSL and HSV with live previews, alpha support, and copyable output formats.

**Live:** [rgb-hsl-color-converter.itsjust.tools](https://rgb-hsl-color-converter.itsjust.tools)

## Features

- Bidirectional live conversion between HEX, RGB, HSL and HSV inputs
- Alpha/transparency channel support with HEX8, RGBA and HSLA output strings
- Round-trip editing: type in any field and all other formats update instantly with clamping and validation
- Large live color preview swatch plus light/dark readable-sample preview
- One-click copy buttons for each format (CSS-ready strings)
- Random color generator and shade/tint row for the current color
- Recently used colors history persisted between visits
- URL state parameter to share a specific color
- WCAG contrast readout of the current color on white and black backgrounds
- Keyboard-accessible inputs with inline validation error messages
- 100% client-side — no data ever leaves your browser

## Development

```bash
npm install
npm run build -w @itsjust/core   # build shared core first
npm run dev
npm test
```

## Deployment

```bash
docker build -t itsjust-rgb-hsl-color-converter .
docker run -p 3000:3000 itsjust-rgb-hsl-color-converter
```

## License

MIT
