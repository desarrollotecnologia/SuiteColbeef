/**
 * Iconos del menú lateral: el PNG original es enorme; aquí salen WebP ~96px.
 * Ejecutar: node scripts/optimize-menu-icons.js
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const siteDir = path.join(__dirname, "..", "img", "site");
const outDir = path.join(siteDir, "menu");

const entries = [
  ["gestionHumana.png", "gestionHumana.webp"],
  ["logistica.png", "logistica.webp"],
  ["inventario.png", "inventario.webp"],
  ["locker.png", "locker.webp"],
  ["liberacionCanales.png", "liberacionCanales.webp"]
];

const WIDTH = 96;

async function main() {
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  for (const [srcName, outName] of entries) {
    const src = path.join(siteDir, srcName);
    const dest = path.join(outDir, outName);
    if (!fs.existsSync(src)) {
      console.warn("Omisión, no existe:", src);
      continue;
    }
    await sharp(src)
      .rotate()
      .resize({ width: WIDTH, withoutEnlargement: true })
      .webp({ quality: 86, effort: 5 })
      .toFile(dest);
    const kb = (fs.statSync(dest).size / 1024).toFixed(1);
    console.log(outName, kb, "KB");
  }
  console.log("Listo →", outDir);
}

main().catch(function (e) {
  console.error(e);
  process.exit(1);
});
