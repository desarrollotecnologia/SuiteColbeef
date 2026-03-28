/**
 * Genera variantes ligeras del hero (fondoSite) para WebP + JPEG.
 * Ejecutar: node scripts/optimize-hero-image.js
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const src = path.join(__dirname, "..", "img", "site", "fondoSite.png");
const outDir = path.join(__dirname, "..", "img", "site");

async function main() {
  if (!fs.existsSync(src)) {
    console.error("No existe:", src);
    process.exit(1);
  }

  const base = sharp(src).rotate();

  // WebP responsive (ancho máximo; sin agrandar)
  const variants = [
    { w: 900, name: "fondoSite-900.webp" },
    { w: 1200, name: "fondoSite-1200.webp" },
    { w: 1600, name: "fondoSite-1600.webp" }
  ];

  for (const v of variants) {
    const dest = path.join(outDir, v.name);
    await base
      .clone()
      .resize({ width: v.w, withoutEnlargement: true })
      .webp({ quality: 80, effort: 5 })
      .toFile(dest);
    const st = fs.statSync(dest);
    console.log(v.name, (st.size / 1024).toFixed(1), "KB");
  }

  // JPEG fallback (sin canal alpha; fondo claro si había transparencia)
  const jpgPath = path.join(outDir, "fondoSite-hero.jpg");
  await base
    .clone()
    .resize({ width: 1600, withoutEnlargement: true })
    .flatten({ background: { r: 238, g: 242, b: 236 } })
    .jpeg({ quality: 82, mozjpeg: true, progressive: true })
    .toFile(jpgPath);
  console.log(
    "fondoSite-hero.jpg",
    (fs.statSync(jpgPath).size / 1024).toFixed(1),
    "KB"
  );

  console.log("Listo. PNG original se mantiene como último recurso.");
}

main().catch(function (e) {
  console.error(e);
  process.exit(1);
});
