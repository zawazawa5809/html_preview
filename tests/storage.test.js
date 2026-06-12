import { describe, it, expect, vi, beforeEach } from 'vitest';
import '../js/lib/core.js';
import '../js/lib/storage.js';

const App = window.App;

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '';
});

describe('App.safeGet / App.safeSet', () => {
  it('localStorage に読み書きできる', () => {
    expect(App.safeSet('k', 'v')).toBe(true);
    expect(App.safeGet('k')).toBe('v');
  });
  it('例外時は safeGet=null / safeSet=false（クラッシュしない）', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });
    expect(App.safeSet('k', 'v')).toBe(false);
    spy.mockRestore();
  });
});

describe('App.createSaveStatus', () => {
  it('saving/saved/error で表示とクラスが切り替わる', () => {
    const el = document.createElement('span');
    const setStatus = App.createSaveStatus(el);
    setStatus('saving');
    expect(el.textContent).toBe('保存中…');
    setStatus('saved');
    expect(el.textContent).toContain('自動保存済み');
    expect(el.classList.contains('is-saved')).toBe(true);
    setStatus('error');
    expect(el.textContent).toBe('保存失敗');
    expect(el.classList.contains('is-error')).toBe(true);
    expect(el.classList.contains('is-saved')).toBe(false);
  });
  it('要素がnullでも落ちない', () => {
    expect(() => App.createSaveStatus(null)('saved')).not.toThrow();
  });
});

describe('App.createCodeStore', () => {
  function mkStore(overrides = {}) {
    const setStatus = vi.fn();
    const warn = vi.fn();
    const store = App.createCodeStore({
      key: 'testCode',
      quotaWarnChars: 10,
      setStatus,
      warn,
      ...overrides,
    });
    return { store, setStatus, warn };
  }

  it('save で保存し status=saved になる', () => {
    const { store, setStatus } = mkStore();
    store.save('hello');
    expect(localStorage.getItem('testCode')).toBe('hello');
    expect(setStatus).toHaveBeenLastCalledWith('saved');
  });

  it('load は保存値を返し、無ければ null', () => {
    const { store } = mkStore();
    expect(store.load()).toBe(null);
    store.save('abc');
    expect(store.load()).toBe('abc');
  });

  it('容量警告は閾値超過で1回だけ、下回るとリセットされる', () => {
    const { store, warn } = mkStore();
    store.save('x'.repeat(11));
    store.save('x'.repeat(12));
    expect(warn).toHaveBeenCalledTimes(1);
    store.save('short');
    store.save('x'.repeat(11));
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it('QuotaExceededError で status=error + quota警告', () => {
    const { store, setStatus, warn } = mkStore();
    const err = new Error('full');
    err.name = 'QuotaExceededError';
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw err; });
    store.save('data');
    expect(setStatus).toHaveBeenLastCalledWith('error');
    expect(warn).toHaveBeenCalled();
    spy.mockRestore();
  });
});
