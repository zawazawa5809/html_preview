/**
 * index.html（プレビューアー）のスモークE2E
 *
 * jsdomで検証できない領域（実CodeMirror描画・実プレビュー反映・
 * gutterドラッグ・レイアウト切替の実レイアウト）を実ブラウザで確認する。
 */
import { test, expect } from '@playwright/test';
import { pageUrl, replaceEditorContent } from './helpers.js';

test.beforeEach(async ({ page }) => {
  await page.goto(pageUrl('index.html'));
});

test('起動: CodeMirrorが描画され、デフォルトコンテンツがプレビューされる', async ({ page }) => {
  await expect(page.locator('.CodeMirror')).toBeVisible();
  // vendor/ 欠損時のフォールバックバナーが出ていないこと
  await expect(page.locator('.asset-warning')).toHaveCount(0);
  const preview = page.frameLocator('#preview-container');
  await expect(preview.locator('h1')).toBeVisible();
});

test('編集がリアルタイムにプレビューへ反映される', async ({ page }) => {
  await replaceEditorContent(page, '<h1 id="e2e-target">E2Eテスト見出し</h1>');
  const preview = page.frameLocator('#preview-container');
  await expect(preview.locator('#e2e-target')).toHaveText('E2Eテスト見出し');
});

test('gutterドラッグでエディタ/プレビューの分割比を変更できる', async ({ page }) => {
  const panel = page.locator('#preview-panel');
  const before = (await panel.boundingBox()).width;

  const gutter = page.locator('#gutter');
  const box = await gutter.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + 150, box.y + box.height / 2, { steps: 5 });
  await page.mouse.up();

  const after = (await panel.boundingBox()).width;
  expect(Math.abs(after - before)).toBeGreaterThan(50);
});

test('レイアウト切替: 上下分割・プレビューのみ', async ({ page }) => {
  await page.locator('#layout-tb-btn').click();
  await expect(page.locator('#split-view')).toHaveClass(/layout-tb/);

  await page.locator('#layout-po-btn').click();
  await expect(page.locator('#split-view')).toHaveClass(/layout-po/);
  await expect(page.locator('.CodeMirror')).toBeHidden();

  await page.locator('#layout-lr-btn').click();
  await expect(page.locator('.CodeMirror')).toBeVisible();
});

test('テーマ切替が反映され、再読込後も維持される', async ({ page }) => {
  const html = page.locator('html');
  await expect(html).not.toHaveAttribute('data-theme', 'dark');

  await page.locator('#theme-toggle-btn').click();
  await expect(html).toHaveAttribute('data-theme', 'dark');

  await page.reload();
  await expect(html).toHaveAttribute('data-theme', 'dark');
});

test('編集内容がlocalStorageに自動保存され、再読込後に復元される', async ({ page }) => {
  await replaceEditorContent(page, '<p id="persisted">保存テスト</p>');
  // 自動保存ステータスの表示を待つ（debounce後）
  await expect(page.locator('#save-status')).toContainText('自動保存済み');

  await page.reload();
  const preview = page.frameLocator('#preview-container');
  await expect(preview.locator('#persisted')).toHaveText('保存テスト');
});
