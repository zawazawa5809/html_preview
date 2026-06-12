/**
 * 起動結合テスト: index.html の実マークアップに対して全スクリプトを読み込み、
 * 配線（getElementById・イベント登録・初期化フロー）が壊れていないことを検証する。
 * CodeMirror(vendor)は読み込まない＝textareaフォールバック経路で起動する。
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

beforeAll(async () => {
  const html = readFileSync(join(root, 'index.html'), 'utf8');
  const doc = new DOMParser().parseFromString(html, 'text/html');
  document.body.innerHTML = doc.body.innerHTML;
  localStorage.clear();

  await import('../js/lib/core.js');
  await import('../js/lib/storage.js');
  await import('../js/lib/toast.js');
  await import('../js/lib/keymap.js');
  await import('../js/lib/modal.js');
  await import('../js/lib/editor.js');
  await import('../js/lib/theme.js');
  await import('../js/lib/layout.js');
  await import('../js/lib/preview.js');
  await import('../js/lib/file-io.js');
  await import('../js/pages/index.js');
});

describe('index.html 起動', () => {
  it('CodeMirror不在でもフォールバックで起動し、警告バナーが出る', () => {
    expect(document.querySelector('.asset-warning')).not.toBeNull();
  });

  it('サンプルコンテンツがプレビューiframeに描画される', () => {
    const iframeDoc = document.getElementById('preview-container').contentDocument;
    expect(iframeDoc.body.textContent).toContain('HTMLプレビューアーへようこそ');
  });

  it('デフォルトレイアウト lr が適用されボタンがactiveになる', () => {
    expect(document.getElementById('split-view').className).toBe('split-view layout-lr');
    expect(document.getElementById('layout-lr-btn').classList.contains('active')).toBe(true);
  });

  it('保存ステータスが「自動保存済み」になる', () => {
    expect(document.getElementById('save-status').textContent).toContain('自動保存済み');
  });

  it('ヘルプ表がキーマップ定義から生成されている', () => {
    const rows = document.querySelectorAll('#help-table tr');
    expect(rows.length).toBeGreaterThanOrEqual(8);
    expect(document.getElementById('help-table').textContent).toContain('HTMLファイルをダウンロード');
  });

  it('エディタ編集でプレビューが追従する', () => {
    const ta = document.getElementById('html-editor');
    ta.value = '<p id="live-edit">updated</p>';
    ta.dispatchEvent(new Event('input'));
    const iframeDoc = document.getElementById('preview-container').contentDocument;
    expect(iframeDoc.getElementById('live-edit')).not.toBeNull();
  });

  it('レイアウトボタンで po に切り替わる', () => {
    document.getElementById('layout-po-btn').click();
    expect(document.getElementById('split-view').className).toBe('split-view layout-po');
    expect(localStorage.getItem('htmlPreviewerLayout')).toBe('po');
  });

  it('保護プレビューの切替でiframeがsandbox付きで差し替わり、設定が永続化される', () => {
    document.getElementById('protected-mode-btn').click();
    const iframe = document.getElementById('preview-container');
    expect(iframe.getAttribute('sandbox')).toBe('allow-same-origin');
    expect(document.getElementById('protected-mode-btn').getAttribute('aria-pressed')).toBe('true');
    expect(localStorage.getItem('htmlPreviewerProtected')).toBe('1');
    // 差し替え後のiframeにもプレビューが描画されている
    expect(iframe.contentDocument.body.textContent).toContain('updated');

    document.getElementById('protected-mode-btn').click();
    expect(document.getElementById('preview-container').hasAttribute('sandbox')).toBe(false);
    expect(localStorage.getItem('htmlPreviewerProtected')).toBe('0');
  });
});
