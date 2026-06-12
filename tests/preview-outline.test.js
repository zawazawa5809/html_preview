import { describe, it, expect, beforeEach } from 'vitest';
import '../js/lib/core.js';
import '../js/lib/preview.js';
import '../js/pages/doceditor/outline.js';

const App = window.App;

function makeIframe() {
  const iframe = document.createElement('iframe');
  document.body.appendChild(iframe);
  return iframe;
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('App.renderPreview', () => {
  it('HTMLをiframeに描画する', () => {
    const iframe = makeIframe();
    const ok = App.renderPreview(iframe, '<p id="x">hello</p>');
    expect(ok).toBe(true);
    expect(iframe.contentDocument.getElementById('x').textContent).toBe('hello');
  });
});

describe('App.recreatePreviewIframe（保護プレビュー用のiframe差し替え）', () => {
  it('sandbox指定でid/class/titleを保ったまま新しいiframeに差し替える', () => {
    const iframe = makeIframe();
    iframe.id = 'preview-container';
    iframe.className = 'preview-frame';
    iframe.title = 'プレビュー';
    const fresh = App.recreatePreviewIframe(iframe, 'allow-same-origin');
    expect(fresh).not.toBe(iframe);
    expect(fresh.getAttribute('sandbox')).toBe('allow-same-origin');
    expect(fresh.id).toBe('preview-container');
    expect(fresh.className).toBe('preview-frame');
    expect(fresh.title).toBe('プレビュー');
    expect(document.body.contains(iframe)).toBe(false);
    expect(document.body.contains(fresh)).toBe(true);
  });

  it('sandbox=null で属性なしのiframeに戻す', () => {
    const iframe = makeIframe();
    iframe.setAttribute('sandbox', 'allow-same-origin');
    const fresh = App.recreatePreviewIframe(iframe, null);
    expect(fresh.hasAttribute('sandbox')).toBe(false);
  });

  it('差し替え後のiframeに描画できる', () => {
    const iframe = makeIframe();
    const fresh = App.recreatePreviewIframe(iframe, 'allow-same-origin');
    expect(App.renderPreview(fresh, '<p id="y">sandboxed</p>')).toBe(true);
    expect(fresh.contentDocument.getElementById('y').textContent).toBe('sandboxed');
  });
});

describe('App.buildOutline', () => {
  it('h1-h6 から階層付きアウトラインを生成する', () => {
    const iframe = makeIframe();
    App.renderPreview(iframe, '<h1>Title</h1><h2>Sec A</h2><h3>Sub</h3><h2>Sec B</h2>');
    const list = document.createElement('div');
    const empty = document.createElement('div');
    document.body.append(list, empty);
    App.buildOutline(iframe.contentDocument, list, empty);
    const items = list.querySelectorAll('.outline-item');
    expect(items.length).toBe(4);
    expect(items[0].getAttribute('data-level')).toBe('1');
    expect(items[0].textContent).toBe('Title');
    expect(items[2].getAttribute('data-level')).toBe('3');
    expect(empty.style.display).toBe('none');
  });

  it('見出しが無ければ empty 表示', () => {
    const iframe = makeIframe();
    App.renderPreview(iframe, '<p>no headings</p>');
    const list = document.createElement('div');
    const empty = document.createElement('div');
    App.buildOutline(iframe.contentDocument, list, empty);
    expect(list.children.length).toBe(0);
    expect(empty.style.display).toBe('');
  });

  it('60文字を超える見出しは切り詰める', () => {
    const iframe = makeIframe();
    App.renderPreview(iframe, `<h1>${'あ'.repeat(100)}</h1>`);
    const list = document.createElement('div');
    App.buildOutline(iframe.contentDocument, list, null);
    expect(list.querySelector('.outline-item').textContent.length).toBeLessThanOrEqual(60);
  });
});
