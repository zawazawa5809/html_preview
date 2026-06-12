import { pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** リポジトリ直下のHTMLファイルを file:// URL で返す */
export function pageUrl(filename) {
  return pathToFileURL(join(root, filename)).href;
}

/** CodeMirrorエディタの内容を全置換する（実キーボード操作） */
export async function replaceEditorContent(page, html) {
  await page.locator('.CodeMirror').click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.insertText(html);
}
