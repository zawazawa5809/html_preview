import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '../js/lib/core.js';

const App = window.App;

describe('App.debounce', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('遅延後に1回だけ実行される', () => {
    const fn = vi.fn();
    const d = App.debounce(fn, 300);
    d();
    d();
    d();
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(300);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('最後の引数で呼ばれる', () => {
    const fn = vi.fn();
    const d = App.debounce(fn, 100);
    d('a');
    d('b');
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledWith('b');
  });

  it('flush() は保留中の呼び出しを即時実行する', () => {
    const fn = vi.fn();
    const d = App.debounce(fn, 1000);
    d('x');
    d.flush();
    expect(fn).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1000);
    expect(fn).toHaveBeenCalledTimes(1); // 二重実行しない
  });

  it('保留が無いとき flush() は何もしない', () => {
    const fn = vi.fn();
    const d = App.debounce(fn, 100);
    d.flush();
    expect(fn).not.toHaveBeenCalled();
  });

  it('cancel() は保留中の呼び出しを破棄する', () => {
    const fn = vi.fn();
    const d = App.debounce(fn, 100);
    d();
    d.cancel();
    vi.advanceTimersByTime(500);
    expect(fn).not.toHaveBeenCalled();
  });
});

describe('App.escHtml', () => {
  it('HTML特殊文字をエスケープする', () => {
    expect(App.escHtml('<a href="x">&\'</a>')).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;');
  });
  it('null/undefined は空文字を返す', () => {
    expect(App.escHtml(null)).toBe('');
    expect(App.escHtml(undefined)).toBe('');
  });
});

describe('App.colorToHex', () => {
  it('rgb() を #hex に変換する', () => {
    expect(App.colorToHex('rgb(91, 143, 204)')).toBe('#5b8fcc');
    expect(App.colorToHex('rgba(0, 0, 0, 1)')).toBe('#000000');
  });
  it('transparent / rgba(0,0,0,0) は空文字', () => {
    expect(App.colorToHex('transparent')).toBe('');
    expect(App.colorToHex('rgba(0, 0, 0, 0)')).toBe('');
  });
  it('rgb形式でなければそのまま返す', () => {
    expect(App.colorToHex('#abc')).toBe('#abc');
  });
});

describe('App.parsePx', () => {
  it('px値を数値にする', () => {
    expect(App.parsePx('16px')).toBe(16);
    expect(App.parsePx('auto')).toBe(0);
    expect(App.parsePx('')).toBe(0);
  });
});
