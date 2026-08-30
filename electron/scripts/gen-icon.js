// Generates buildResources/icon.png + buildResources/icon.ico from
// buildResources/icon.svg so electron-builder can sign the Windows installer.
// Run via: npm run gen:icon

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const pngToIco = require('png-to-ico');
const toIco = typeof pngToIco === 'function' ? pngToIco : pngToIco.default;

const ROOT = path.join(__dirname, '..', '..');
const SVG = path.join(ROOT, 'buildResources', 'icon.svg');
const PNG = path.join(ROOT, 'buildResources', 'icon.png');
const ICO = path.join(ROOT, 'buildResources', 'icon.ico');

(async () => {
  // readFileSync forces materialization of OneDrive "Files On-Demand"
  // placeholders; sharp's own async reads can otherwise return empty bytes.
  const svgBuf = fs.readFileSync(SVG);
  const png512 = await sharp(svgBuf, { density: 384 }).resize(512, 512).png().toBuffer();
  fs.writeFileSync(PNG, png512);

  const png256 = await sharp(png512).resize(256, 256).png().toBuffer();
  const ico = await toIco([png256]);
  fs.writeFileSync(ICO, ico);

  const tray = await sharp(png512).resize(32, 32).png().toBuffer();
  fs.writeFileSync(path.join(ROOT, 'buildResources', 'tray.png'), tray);

  console.log('Generated', PNG, png512.length, 'bytes');
  console.log('Generated', ICO, ico.length, 'bytes');
  console.log('Generated', path.join(ROOT, 'buildResources', 'tray.png'), tray.length, 'bytes');
})().catch((err) => {
  console.error('icon generation failed:', err);
  process.exit(1);
});