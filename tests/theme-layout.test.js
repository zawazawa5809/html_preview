import { describe, it, expect, beforeEach } from 'vitest';
import '../js/lib/core.js';
import '../js/lib/storage.js';
import '../js/lib/theme.js';
import '../js/lib/layout.js';

const App = window.App;

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  document.body.innerHTML = `
    <button id="theme-btn"><i data-feather="moon"></i></button>
    <div class="split-view" id="sv">
      <div id="ep"></div><div id="g"></div><div id="pp"></div>
    </div>
    <button id="b-lr"></button><button id="b-tb"></button><button id="b-po"></button>
  `;
});

describe('App.createTheme', () => {
  function mkTheme() {
    return App.createTheme({
      storageKey: 'testTheme',
      button: document.getElementById('theme-btn'),
    });
  }

  it('apply で data-theme 属性と localStorage が更新される', () => {
    const theme = mkTheme();
    theme.apply('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem('testTheme')).toBe('dark');
  });

  it('toggle で light <-> dark が切り替わる', () => {
    const theme = mkTheme();
    theme.apply('light');
    theme.toggle();
    expect(theme.current()).toBe('dark');
    theme.toggle();
    expect(theme.current()).toBe('light');
  });

  it('init は保存値を復元し、不正値は light に落とす', () => {
    localStorage.setItem('testTheme', 'dark');
    const theme = mkTheme();
    theme.init();
    expect(theme.current()).toBe('dark');
    localStorage.setItem('testTheme', 'bogus');
    theme.init();
    expect(theme.current()).toBe('light');
  });
});

describe('App.createLayout', () => {
  function mkLayout() {
    return App.createLayout({
      storageKey: 'testLayout',
      splitView: document.getElementById('sv'),
      editorPane: document.getElementById('ep'),
      previewPane: document.getElementById('pp'),
      buttons: {
        lr: document.getElementById('b-lr'),
        tb: document.getElementById('b-tb'),
        po: document.getElementById('b-po'),
      },
    });
  }

  it('apply でレイアウトクラスとボタンactiveが切り替わる', () => {
    const layout = mkLayout();
    layout.apply('tb');
    const sv = document.getElementById('sv');
    expect(sv.className).toBe('split-view layout-tb');
    expect(document.getElementById('b-tb').classList.contains('active')).toBe(true);
    expect(document.getElementById('b-lr').classList.contains('active')).toBe(false);
    expect(localStorage.getItem('testLayout')).toBe('tb');
  });

  it('apply はインラインサイズをリセットする（gutterドラッグ後の切替）', () => {
    const layout = mkLayout();
    const ep = document.getElementById('ep');
    ep.style.width = '123px';
    layout.apply('po');
    expect(ep.style.width).toBe('');
  });

  it('init は保存値を復元し、不正値はデフォルト lr', () => {
    localStorage.setItem('testLayout', 'po');
    const layout = mkLayout();
    layout.init();
    expect(layout.current()).toBe('po');
    localStorage.setItem('testLayout', 'nope');
    layout.init();
    expect(layout.current()).toBe('lr');
  });
});
