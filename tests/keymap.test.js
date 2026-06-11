import { describe, it, expect, vi } from 'vitest';
import '../js/lib/core.js';
import '../js/lib/keymap.js';

const App = window.App;

function keyEvent(key, mods = {}) {
  return new KeyboardEvent('keydown', {
    key,
    ctrlKey: !!mods.ctrl,
    shiftKey: !!mods.shift,
    altKey: !!mods.alt,
    cancelable: true,
    bubbles: true,
  });
}

describe('App.createKeymap', () => {
  it('修飾キーとキーが一致したバインディングを実行し preventDefault する', () => {
    const save = vi.fn();
    const handler = App.createKeymap([
      { key: 's', ctrl: true, run: save, help: ['Ctrl + S', '保存'] },
    ]);
    const e = keyEvent('s', { ctrl: true });
    handler(e);
    expect(save).toHaveBeenCalledTimes(1);
    expect(e.defaultPrevented).toBe(true);
  });

  it('修飾キー不一致では実行しない（Ctrl+Shift+Z と Ctrl+Z を区別）', () => {
    const undo = vi.fn();
    const redo = vi.fn();
    const handler = App.createKeymap([
      { key: 'z', ctrl: true, run: undo, help: ['Ctrl + Z', '元に戻す'] },
      { key: 'Z', ctrl: true, shift: true, run: redo, help: ['Ctrl + Shift + Z', 'やり直す'] },
    ]);
    handler(keyEvent('z', { ctrl: true }));
    expect(undo).toHaveBeenCalledTimes(1);
    expect(redo).not.toHaveBeenCalled();
    handler(keyEvent('Z', { ctrl: true, shift: true }));
    expect(redo).toHaveBeenCalledTimes(1);
    expect(undo).toHaveBeenCalledTimes(1);
  });

  it('when 条件が false ならスキップする', () => {
    const fn = vi.fn();
    let enabled = false;
    const handler = App.createKeymap([
      { key: '?', run: fn, when: () => enabled, help: ['?', 'ヘルプ'] },
    ]);
    handler(keyEvent('?'));
    expect(fn).not.toHaveBeenCalled();
    enabled = true;
    handler(keyEvent('?'));
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('どれにも一致しなければ何もしない', () => {
    const handler = App.createKeymap([{ key: 's', ctrl: true, run: vi.fn(), help: ['', ''] }]);
    const e = keyEvent('x');
    handler(e);
    expect(e.defaultPrevented).toBe(false);
  });
});

describe('App.renderHelpRows', () => {
  it('バインディング定義からヘルプ表の行を生成する（実装とヘルプの一元管理）', () => {
    const table = document.createElement('table');
    App.renderHelpRows(table, [
      { key: 's', ctrl: true, run: () => {}, help: ['Ctrl + S', 'HTMLファイルをダウンロード'] },
      { key: 'z', ctrl: true, run: () => {}, help: null }, // help無しは表に出さない
    ], [['Esc', '閉じる']]);
    const rows = table.querySelectorAll('tr');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('Ctrl + S');
    expect(rows[0].textContent).toContain('HTMLファイルをダウンロード');
    expect(rows[1].textContent).toContain('Esc');
    // kbd要素でマークアップされている
    expect(rows[0].querySelectorAll('kbd').length).toBeGreaterThan(0);
  });
});

describe('App.isTypingContext', () => {
  it('input/textarea/contentEditable では true', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    expect(App.isTypingContext(input)).toBe(true);
    const div = document.createElement('div');
    document.body.appendChild(div);
    expect(App.isTypingContext(div)).toBe(false);
  });
  it('.CodeMirror 内部では true', () => {
    const cm = document.createElement('div');
    cm.className = 'CodeMirror';
    const inner = document.createElement('span');
    cm.appendChild(inner);
    document.body.appendChild(cm);
    expect(App.isTypingContext(inner)).toBe(true);
  });
});
