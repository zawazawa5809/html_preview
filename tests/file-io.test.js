import { describe, it, expect } from 'vitest';
import '../js/lib/core.js';
import '../js/lib/file-io.js';

const App = window.App;

describe('App.filenameFromTitle', () => {
  it('<title> からファイル名を生成する', () => {
    expect(App.filenameFromTitle('<html><title>My Page</title></html>', { fallback: 'preview' })).toBe('My_Page.html');
  });
  it('日本語タイトルを保持する', () => {
    expect(App.filenameFromTitle('<title>レポート 2026</title>', { fallback: 'preview' })).toBe('レポート_2026.html');
  });
  it('ファイル名に使えない文字は _ に置換する', () => {
    expect(App.filenameFromTitle('<title>a/b\\c:d*e</title>', { fallback: 'preview' })).toBe('a_b_c_d_e.html');
  });
  it('Windows予約名には _ を前置する', () => {
    expect(App.filenameFromTitle('<title>CON</title>', { fallback: 'preview' })).toBe('_CON.html');
  });
  it('titleが無い場合はfallback名', () => {
    expect(App.filenameFromTitle('<p>no title</p>', { fallback: 'preview' })).toBe('preview.html');
  });
  it('suffix を付けられる（DocEditorのタイムスタンプ用途）', () => {
    expect(App.filenameFromTitle('<title>Doc</title>', { fallback: 'out', suffix: '_20260611_120000' })).toBe(
      'Doc_20260611_120000.html'
    );
    expect(App.filenameFromTitle('', { fallback: 'out', suffix: '_x' })).toBe('out_x.html');
  });
  it('複数行の title にも対応する', () => {
    expect(App.filenameFromTitle('<title>\n  Multi\n  Line\n</title>', { fallback: 'p' })).toBe('Multi_Line.html');
  });
});

describe('App.jstTimestamp', () => {
  it('UTC日時をJST(+9h)の YYYYMMDD_hhmmss に変換する', () => {
    // 2026-06-11T22:30:05Z -> JST 2026-06-12 07:30:05
    expect(App.jstTimestamp(new Date('2026-06-11T22:30:05Z'))).toBe('20260612_073005');
  });
});

describe('App.validateHtmlFile', () => {
  const mk = (name, size) => ({ name, size });
  it('html/htm 拡張子で5MB以下なら ok', () => {
    expect(App.validateHtmlFile(mk('a.html', 100)).ok).toBe(true);
    expect(App.validateHtmlFile(mk('B.HTM', 100)).ok).toBe(true);
  });
  it('5MB超はエラー', () => {
    const r = App.validateHtmlFile(mk('a.html', 5 * 1024 * 1024 + 1));
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/5MB/);
  });
  it('対応外拡張子はエラー', () => {
    const r = App.validateHtmlFile(mk('a.txt', 10));
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/html/i);
  });
  it('fileが無ければエラー', () => {
    expect(App.validateHtmlFile(null).ok).toBe(false);
  });
});
