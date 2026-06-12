/**
 * node_modules から vendor/ へ実行時ライブラリをコピーする。
 * 依存の更新手順: package.json のバージョンを上げて `npm install && npm run vendor`
 */
import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const nm = join(root, 'node_modules');
const vendor = join(root, 'vendor');

const FILES = [
  // CodeMirror 5 core
  'codemirror/lib/codemirror.js',
  'codemirror/lib/codemirror.css',
  // modes (htmlmixed は xml/javascript/css に依存)
  'codemirror/mode/xml/xml.js',
  'codemirror/mode/javascript/javascript.js',
  'codemirror/mode/css/css.js',
  'codemirror/mode/htmlmixed/htmlmixed.js',
  // addons: fold
  'codemirror/addon/fold/foldcode.js',
  'codemirror/addon/fold/foldgutter.js',
  'codemirror/addon/fold/foldgutter.css',
  'codemirror/addon/fold/xml-fold.js',
  'codemirror/addon/fold/brace-fold.js',
  // addons: search
  'codemirror/addon/dialog/dialog.js',
  'codemirror/addon/dialog/dialog.css',
  'codemirror/addon/search/searchcursor.js',
  'codemirror/addon/search/search.js',
  'codemirror/addon/search/jump-to-line.js',
  // addons: active line
  'codemirror/addon/selection/active-line.js',
  // icons
  'feather-icons/dist/feather.min.js',
  // HTML formatter
  'js-beautify/js/lib/beautify-html.js',
];

rmSync(vendor, { recursive: true, force: true });
for (const rel of FILES) {
  const dest = join(vendor, rel);
  mkdirSync(dirname(dest), { recursive: true });
  cpSync(join(nm, rel), dest);
  console.log('vendored:', rel);
}
console.log(`done (${FILES.length} files)`);
