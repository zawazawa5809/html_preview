/**
 * スモークテスト: 両HTMLページの参照整合性を検証する。
 * - <script src> / <link href> が実在ファイルを指すこと（vendor漏れ・typo検出）
 * - 必須DOM要素のIDが存在すること（JS側のgetElementById前提の保証）
 * - 外部URL（CDN等）への実行時依存が無いこと（オフライン原則の回帰防止）
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PAGES = ['index.html', 'doceditor.html'];

function parse(page) {
  const html = readFileSync(join(root, page), 'utf8');
  return new DOMParser().parseFromString(html, 'text/html');
}

describe.each(PAGES)('%s', (page) => {
  const doc = parse(page);

  it('script/link の参照先ファイルが存在する', () => {
    const refs = [
      ...[...doc.querySelectorAll('script[src]')].map((s) => s.getAttribute('src')),
      ...[...doc.querySelectorAll('link[rel="stylesheet"]')].map((l) => l.getAttribute('href')),
    ];
    expect(refs.length).toBeGreaterThan(0);
    for (const ref of refs) {
      expect(ref.startsWith('http'), `外部URL参照が残っている: ${ref}`).toBe(false);
      expect(existsSync(join(root, ref)), `参照先が存在しない: ${ref}`).toBe(true);
    }
  });

  it('オフライン原則: 外部オリジンへの参照が無い', () => {
    const html = readFileSync(join(root, page), 'utf8');
    expect(html).not.toMatch(/https?:\/\/(unpkg\.com|cdnjs\.cloudflare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)/);
  });

  it('JSが前提とする必須要素IDが存在する', () => {
    const required = [
      'split-view', 'editor-container', 'preview-panel', 'gutter',
      'html-editor', 'preview-container', 'save-status', 'help-overlay',
      'layout-lr-btn', 'layout-tb-btn', 'layout-po-btn', 'theme-toggle-btn',
      'undo-btn', 'redo-btn', 'copy-btn', 'paste-btn', 'clear-btn',
      'open-btn', 'file-input', 'save-btn', 'help-btn',
    ];
    for (const id of required) {
      expect(doc.getElementById(id), `#${id} がない`).not.toBeNull();
    }
  });

  it('ツール間ナビゲーションが相互リンクされている', () => {
    const nav = [...doc.querySelectorAll('.toolbar-nav a')].map((a) => a.getAttribute('href'));
    expect(nav).toContain('index.html');
    expect(nav).toContain('doceditor.html');
  });
});

describe('doceditor.html 固有', () => {
  const doc = parse('doceditor.html');
  it('Design/Outline タブと design toolbar 要素が存在する', () => {
    ['tab-code', 'tab-design', 'tab-outline', 'design-toolbar', 'outline-panel',
     'dt-controls', 'dt-breadcrumb', 'dt-add-dropdown', 'design-mode-btn', 'print-btn',
    ].forEach((id) => expect(doc.getElementById(id), `#${id} がない`).not.toBeNull());
  });
});
