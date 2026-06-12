/**
 * doceditor.html（DocEditor）のスモークE2E
 *
 * Design Modeの実ブラウザ動作（iframe内クリック選択・postMessage連携・
 * 要素削除→DOM→ソース同期・アウトライン）を確認する。
 */
import { test, expect } from '@playwright/test';
import { pageUrl } from './helpers.js';

test.beforeEach(async ({ page }) => {
  await page.goto(pageUrl('doceditor.html'));
});

test('起動: Design Modeがデフォルトで有効になり、注入が完了している', async ({ page }) => {
  await expect(page.locator('#design-mode-btn')).toHaveClass(/active/);
  await expect(page.locator('.asset-warning')).toHaveCount(0);
  const preview = page.frameLocator('#preview-container');
  await expect(preview.locator('style[data-designer-injected]')).toHaveCount(1);
});

test('iframe内の要素クリックでDesignパネルに選択が反映される', async ({ page }) => {
  const preview = page.frameLocator('#preview-container');
  const h1 = preview.locator('h1').first();
  await h1.click();

  await expect(page.locator('#dt-element-tag')).toContainText(/h1/i);
  await expect(page.locator('#dt-controls')).toBeVisible();
});

test('要素削除: iframeから消え、Undoトーストが出て、ソースにも同期される', async ({ page }) => {
  const preview = page.frameLocator('#preview-container');
  const h1 = preview.locator('h1').first();
  const headingText = (await h1.textContent()).trim();
  await h1.click();

  await page.locator('#dt-delete').click();
  await expect(preview.locator('h1')).toHaveCount(0);

  // 破壊的操作のUndoトースト（Key Patterns準拠）
  const toast = page.locator('.temp-message');
  await expect(toast).toBeVisible();
  await expect(toast.locator('.toast-action')).toBeVisible();

  // DOM→ソース同期: コードタブのエディタからも見出しが消えている（同期はdebounceされる）
  await page.locator('#tab-code').click();
  await expect
    .poll(() => page.evaluate(() => document.querySelector('.CodeMirror').CodeMirror.getValue()))
    .not.toContain(headingText);
});

test('アウトラインタブに見出しツリーが表示される', async ({ page }) => {
  await page.locator('#tab-outline').click();
  const items = page.locator('#outline-list .outline-item');
  await expect(items.first()).toBeVisible();
  expect(await items.count()).toBeGreaterThan(0);
});

test('Design Mode OFFで注入物が除去され、ONで復帰する', async ({ page }) => {
  const btn = page.locator('#design-mode-btn');
  const preview = page.frameLocator('#preview-container');

  await btn.click();
  await expect(btn).not.toHaveClass(/active/);
  await expect(preview.locator('style[data-designer-injected]')).toHaveCount(0);

  await btn.click();
  await expect(btn).toHaveClass(/active/);
  await expect(preview.locator('style[data-designer-injected]')).toHaveCount(1);
});
