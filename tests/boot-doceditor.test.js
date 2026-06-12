/**
 * 起動結合テスト: doceditor.html の実マークアップに対して全スクリプトを読み込み、
 * Design Modeのデフォルト起動・iframe注入・タブ配線を検証する。
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

beforeAll(async () => {
  const html = readFileSync(join(root, 'doceditor.html'), 'utf8');
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
  await import('../js/pages/doceditor/design-mode.js');
  await import('../js/pages/doceditor/design-panel.js');
  await import('../js/pages/doceditor/outline.js');
  await import('../js/pages/doceditor/main.js');
});

describe('doceditor.html 起動', () => {
  it('Design Modeがデフォルトで有効になる', () => {
    expect(document.getElementById('design-mode-btn').classList.contains('active')).toBe(true);
    expect(document.getElementById('preview-panel').classList.contains('design-active')).toBe(true);
    expect(document.getElementById('tab-design').classList.contains('active')).toBe(true);
  });

  it('design toolbar / outline panel がエディタ側カラムへ移動している', () => {
    const container = document.getElementById('editor-container');
    expect(container.contains(document.getElementById('design-toolbar'))).toBe(true);
    expect(container.contains(document.getElementById('outline-panel'))).toBe(true);
  });

  it('iframeにdesigner CSS/スクリプトが注入される', () => {
    const iframeDoc = document.getElementById('preview-container').contentDocument;
    expect(iframeDoc.querySelector('style[data-designer-injected]')).not.toBeNull();
    expect(iframeDoc.querySelector('script[data-designer-injected]')).not.toBeNull();
  });

  it('サンプルドキュメントが描画される', () => {
    const iframeDoc = document.getElementById('preview-container').contentDocument;
    expect(iframeDoc.body.textContent).toContain('プロジェクト報告書');
  });

  it('Codeタブへ切り替えるとコードパネルが表示される', () => {
    document.getElementById('tab-code').click();
    expect(document.getElementById('code-panel').style.display).toBe('');
    expect(document.getElementById('design-toolbar').style.display).toBe('none');
    // タブ切替ではDesign Mode自体はOFFにならない
    expect(document.getElementById('design-mode-btn').classList.contains('active')).toBe(true);
  });

  it('Outlineタブで見出しツリーが構築される', () => {
    document.getElementById('tab-outline').click();
    const items = document.querySelectorAll('#outline-list .outline-item');
    expect(items.length).toBeGreaterThanOrEqual(3);
    expect(items[0].textContent).toContain('プロジェクト報告書');
  });

  it('ヘルプ表にデザインモード行が含まれる', () => {
    expect(document.getElementById('help-table').textContent).toContain('デザインモード切替');
  });

  it('セクションヘッダはEnter/Spaceで開閉でき、aria-expandedが追従する', () => {
    const header = document.querySelector('.dt-section-header[data-section="dt-colors"]');
    const body = document.getElementById('dt-colors');
    expect(header.getAttribute('aria-expanded')).toBe('true');

    header.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    expect(body.classList.contains('collapsed')).toBe(true);
    expect(header.getAttribute('aria-expanded')).toBe('false');

    header.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
    expect(body.classList.contains('collapsed')).toBe(false);
    expect(header.getAttribute('aria-expanded')).toBe('true');
  });

  it('子要素追加ドロップダウンの開閉で aria-expanded が追従する', () => {
    const btn = document.getElementById('dt-add-child');
    btn.click();
    expect(btn.getAttribute('aria-expanded')).toBe('true');
    btn.click();
    expect(btn.getAttribute('aria-expanded')).toBe('false');
  });

  it('ヘルプモーダルを開くと閉じるボタンにフォーカスし、閉じると復元される', () => {
    const helpBtn = document.getElementById('help-btn');
    helpBtn.focus();
    helpBtn.click();
    expect(document.getElementById('help-overlay').hidden).toBe(false);
    expect(document.activeElement.id).toBe('help-close-btn');

    document.getElementById('help-close-btn').click();
    expect(document.getElementById('help-overlay').hidden).toBe(true);
    expect(document.activeElement.id).toBe('help-btn');
  });

  it('__design_undo__ メッセージで選択パネルがクリアされる（多段Undo経路）', () => {
    // 注入スクリプトからtokenを取得してiframe→親メッセージを再現する
    const iframeDoc = document.getElementById('preview-container').contentDocument;
    const script = iframeDoc.querySelector('script[data-designer-injected]').textContent;
    const token = script.match(/"token":\s*"([^"]+)"/)[1];

    window.dispatchEvent(
      new MessageEvent('message', {
        data: { token, type: '__design_click__', tag: 'p', styles: {}, ancestors: [], occurrence: 0 },
      })
    );
    expect(document.getElementById('dt-controls').style.display).toBe('');

    window.dispatchEvent(new MessageEvent('message', { data: { token, type: '__design_undo__' } }));
    expect(document.getElementById('dt-controls').style.display).toBe('none');
    expect(document.getElementById('dt-hint').style.display).toBe('');
  });
});
