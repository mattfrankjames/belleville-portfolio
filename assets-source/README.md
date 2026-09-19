# Source assets

Web-ready masters converted from the originals in iCloud
(`~/Library/Mobile Documents/com~apple~CloudDocs/Documents/becca-portfolio-site/`).
The originals are untouched; nothing here is deployed with the site.

These are the files to upload to Cloudinary. Cloudinary then handles format
(AVIF/WebP), quality and resizing per request, so only one master per image is needed.

- **Rendering**: each PDF page was rasterized at 2800px on the long side
  (CoreGraphics, high interpolation, white paper background).
- **Format per file**: whichever was smaller at equal fidelity — JPEG (quality 92,
  no chroma subsampling, so type and flat colour edges stay clean) or lossless PNG.
- **Screenshots**: kept as lossless PNG.
- **Animation**: `tgwdlm-animation.gif` is the 14.7MB original; `tgwdlm-animation.webp`
  is the same 10 frames at 1067×1600. Upload the GIF if Cloudinary should generate
  the MP4/AVIF versions itself.
- **Names**: lower-case and hyphenated; multi-page PDFs are numbered by page.

`manifest.json` lists every file with dimensions and byte size.
