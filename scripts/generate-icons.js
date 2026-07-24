import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

const outDir = path.resolve(process.cwd(), 'build');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const sizes = [16, 24, 32, 48, 64, 96, 128, 256];
const baseColor = '#1f6feb';

async function createPngs() {
  const pngPaths = [];
  for (const size of sizes) {
    const file = path.join(outDir, `icon-${size}.png`);
    const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" rx="${Math.round(size * 0.15)}" fill="${baseColor}"/><text x="50%" y="52%" font-size="${Math.round(size * 0.5)}" font-family="sans-serif" font-weight="700" fill="white" text-anchor="middle" dominant-baseline="middle">E</text></svg>`;
    await sharp(Buffer.from(svg)).png().toFile(file);
    pngPaths.push(file);
  }
  return pngPaths;
}

async function createIco(pngPaths) {
  // png-to-ico expects largest sizes first
  const buffers = await Promise.all(pngPaths.map(p => fs.promises.readFile(p)));
  const ico = await pngToIco(buffers.reverse());
  await fs.promises.writeFile(path.join(outDir, 'icon.ico'), ico);
  // also create installer icons copies
  await fs.promises.copyFile(path.join(outDir, 'icon.ico'), path.join(outDir, 'installerIcon.ico'));
  await fs.promises.copyFile(path.join(outDir, 'icon.ico'), path.join(outDir, 'uninstallerIcon.ico'));
}

async function createHeaderAndSidebar() {
  // installer header: 150x57, sidebar: 164x314, uninstallerSidebar same
  // NSIS supports PNG format
  const headerSvg = `<svg width="150" height="57" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="${baseColor}"/><text x="12" y="36" font-size="20" font-family="sans-serif" font-weight="700" fill="white">JSERP</text></svg>`;
  await sharp(Buffer.from(headerSvg)).png().toFile(path.join(outDir, 'installerHeader.png'));

  const sidebarSvg = `<svg width="164" height="314" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#0b1226"/><text x="20" y="40" font-size="24" font-family="sans-serif" font-weight="700" fill="white">JSERP</text></svg>`;
  await sharp(Buffer.from(sidebarSvg)).png().toFile(path.join(outDir, 'installerSidebar.png'));
  await fs.promises.copyFile(path.join(outDir, 'installerSidebar.png'), path.join(outDir, 'uninstallerSidebar.png'));
}

async function createLicense() {
  const licenseTxt = `LICENSE AGREEMENT\n\nInsert your license text here. Replace this placeholder with your actual EULA or license file to be displayed during installation.`;
  await fs.promises.writeFile(path.join(outDir, 'license.txt'), licenseTxt, 'utf8');
}

async function run() {
  const pngs = await createPngs();
  await createIco(pngs);
  await createHeaderAndSidebar();
  await createLicense();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
