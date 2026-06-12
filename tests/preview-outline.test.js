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
