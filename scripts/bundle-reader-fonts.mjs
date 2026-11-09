// Разовый бандлер офлайн-шрифтов для читалки (public/inpx-reader/fonts).
// Скачивает woff2 (cyrillic/cyrillic-ext/latin/latin-ext, wght 400;700) для семейств
// GOOGLE_FONTS и генерирует reader-fonts.css с локальными @font-face (unicode-range).
// Запустить один раз: `node scripts/bundle-reader-fonts.mjs`
// Результат — статические ассеты (коммитятся; build-time сети не требуется).
import { writeFileSync, mkdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public/inpx-reader/fonts');
mkdirSync(outDir, { recursive: true });

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0 Safari/537.36';
const SUBSETS = ['cyrillic', 'cyrillic-ext', 'latin', 'latin-ext'];
const WEIGHTS = '400;700';

// 12 читательских семейств (зеркалит GOOGLE_FONTS в reader.js).
const FAMILIES = [
  'PT Serif', 'PT Sans', 'Literata', 'Merriweather', 'Noto Serif', 'EB Garamond',
  'Spectral', 'IBM Plex Serif', 'Roboto', 'Fira Sans', 'IBM Plex Sans', 'Commissioner',
];

function httpGet(url) {
  return execFileSync('curl', ['-sS', '-A', UA, url], { maxBuffer: 64 * 1024 * 1024 }).toString('utf8');
}
function httpDownload(url, dest) {
  execFileSync('curl', ['-sS', '-A', UA, '-o', dest, url], { maxBuffer: 64 * 1024 * 1024 });
}

const cssBlocks = [];
let total = 0;

for (const family of FAMILIES) {
  const famPlus = family.replace(/\s+/g, '+');
  const cssUrl = `https://fonts.googleapis.com/css2?family=${famPlus}:wght@${WEIGHTS}&display=swap`;
  let css;
  try {
    css = httpGet(cssUrl);
  } catch (e) {
    console.error(`skip ${family}: fetch failed: ${e.message}`);
    continue;
  }
  const slug = family.toLowerCase().replace(/\s+/g, '-');
  // parse /* subset */ @font-face { ... } blocks
  const re = /\/\*\s*([a-z-]+)\s*\*\/\s*@font-face\s*\{([\s\S]*?)\}/g;
  let m;
  const seen = new Set();
  while ((m = re.exec(css)) !== null) {
    const subset = m[1];
    if (!SUBSETS.includes(subset)) continue;
    const body = m[2];
    const wm = /font-weight:\s*(\d+)/.exec(body);
    const um = /unicode-range:\s*([^;]+);/.exec(body);
    const urlm = /url\((https:\/\/[^)]+\.woff2)\)/.exec(body);
    if (!wm || !urlm) continue;
    const weight = wm[1];
    const unicodeRange = um ? um[1].trim() : undefined;
    const key = `${slug}-${subset}-${weight}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const file = `${key}.woff2`;
    try {
      httpDownload(urlm[1], join(outDir, file));
    } catch (e) {
      console.error(`skip ${key}: ${e.message}`);
      continue;
    }
    cssBlocks.push(
      `@font-face{\n` +
      `font-family:'${family}';\n` +
      `font-style:normal;\n` +
      `font-weight:${weight};\n` +
      `font-display:swap;\n` +
      (unicodeRange ? `unicode-range:${unicodeRange};\n` : '') +
      `src:url('/inpx-reader/fonts/${file}') format('woff2');\n` +
      `}`,
    );
    total++;
  }
  console.log(`${family}: done`);
}

const header =
  `/* Генерируется scripts/bundle-reader-fonts.mjs — НЕ править руками.\n` +
  `   Офлайн-шрифты читалки (cyrillic + latin, wght 400/700). */\n`;
writeFileSync(join(outDir, 'reader-fonts.css'), header + cssBlocks.join('\n') + '\n');
console.log(`\nWrote ${total} @font-face blocks → public/inpx-reader/fonts/reader-fonts.css`);
// print total size
let size = 0;
for (const name of ['reader-fonts.css']) size += readFileSync(join(outDir, name)).length;
console.log(`css bytes: ${size}`);
