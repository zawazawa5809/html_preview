import { describe, it, expect, vi, beforeEach } from 'vitest';
import '../js/lib/core.js';
import '../js/lib/editor.js';

const App = window.App;

beforeEach(() => {
  document.body.innerHTML = '<textarea id="ed"></textarea>';
  delete window.CodeMirror;
});

describe('App.createEditor (CodeMirror不在時のフォールバック)', () => {
  it('CodeMirror が無ければ textarea アダプタを返し、その旨を通知する', () => {
    const onFallback = vi.fn();
    const ed = App.createEditor(document.getElementById('ed'), {}, onFallback);
    expect(onFallback).toHaveBeenCalled();
    expect(typeof ed.getValue).toBe('function');
  });

  it('getValue / setValue が textarea と同期する', () => {
    const ta = document.getElementById('ed');
    const ed = App.createEditor(ta, {});
    ed.setValue('<p>hi</p>');
    expect(ta.value).toBe('<p>hi</p>');
    expect(ed.getValue()).toBe('<p>hi</p>');
  });

  it('input イベントで change リスナーが呼ばれる', () => {
    const ta = document.getElementById('ed');
    const ed = App.createEditor(ta, {});
    const onChange = vi.fn();
    ed.on('change', onChange);
    ta.dispatchEvent(new Event('input'));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('lastLine / getLine / replaceRange が全文置換に使える', () => {
    const ed = App.createEditor(document.getElementById('ed'), {});
    ed.setValue('line1\nline2\nline3');
    expect(ed.lastLine()).toBe(2);
    expect(ed.getLine(2)).toBe('line3');
    ed.replaceRange('replaced', { line: 0, ch: 0 }, { line: 2, ch: 5 });
    expect(ed.getValue()).toBe('replaced');
  });

  it('design mode が使う拡張API（operation/refresh等）がスタブとして存在する', () => {
    const ed = App.createEditor(document.getElementById('ed'), {});
    expect(() => {
      ed.operation(() => {});
      ed.refresh();
      ed.scrollIntoView();
      ed.addLineClass(0, 'background', 'x');
      ed.removeLineClass(0, 'background', 'x');
    }).not.toThrow();
    expect(ed.getSearchCursor('x').findNext()).toBe(false);
  });

  it('undo/redo が内部履歴で動作する（execCommand非依存）', () => {
    const ta = document.getElementById('ed');
    const ed = App.createEditor(ta, {});
    const type = (v) => {
      ta.value = v;
      ta.dispatchEvent(new Event('input'));
    };
    type('a');
    type('ab');
    type('abc');

    ed.undo();
    expect(ed.getValue()).toBe('ab');
    ed.undo();
    expect(ed.getValue()).toBe('a');
    ed.redo();
    expect(ed.getValue()).toBe('ab');

    // undo後に新規入力すると、それ以降のredo履歴は破棄される
    type('abX');
    ed.redo();
    expect(ed.getValue()).toBe('abX');
  });

  it('undo/redo は change リスナーへ通知してプレビュー再描画につながる', () => {
    const ta = document.getElementById('ed');
    const ed = App.createEditor(ta, {});
    const onChange = vi.fn();
    ta.value = 'x';
    ta.dispatchEvent(new Event('input'));
    ed.on('change', onChange);
    ed.undo();
    expect(onChange).toHaveBeenCalledTimes(1);
    ed.redo();
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it('履歴の先頭/末尾を超える undo/redo は何もしない', () => {
    const ed = App.createEditor(document.getElementById('ed'), {});
    expect(() => {
      ed.undo();
      ed.redo();
    }).not.toThrow();
    expect(ed.getValue()).toBe('');
  });

  it('window.CodeMirror があれば fromTextArea を使う', () => {
    const fake = { fromTextArea: vi.fn(() => ({ marker: 'cm-instance' })) };
    window.CodeMirror = fake;
    const ed = App.createEditor(document.getElementById('ed'), { lineNumbers: true });
    expect(fake.fromTextArea).toHaveBeenCalled();
    expect(ed.marker).toBe('cm-instance');
  });
});
