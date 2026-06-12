import { describe, it, expect, beforeEach, vi } from 'vitest';
import '../js/lib/core.js';
import '../js/pages/doceditor/design-mode.js';

const design = () => window.App.design;

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('App.design.serializeCleanHtml', () => {
  it('designer注入要素・編集用属性を除去して DOCTYPE 付きで返す', () => {
    document.body.innerHTML = `
      <div id="keep" contenteditable="true" draggable="true">text</div>
      <div data-designer-selected="true">selected</div>
      <style data-designer-injected="true">.x{}</style>
      <script data-designer-injected="true"></script>
    `;
    const html = design().serializeCleanHtml(document);
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(html).toContain('id="keep"');
    expect(html).not.toContain('data-designer-injected');
    expect(html).not.toContain('data-designer-selected');
    expect(html).not.toContain('contenteditable');
    expect(html).not.toContain('draggable');
  });
});

describe('App.design.elementAction (move/duplicate の一元実装)', () => {
  function setup() {
    document.body.innerHTML = '<div id="a"></div><div id="b"></div><div id="c"></div>';
    return ['a', 'b', 'c'].map((id) => document.getElementById(id));
  }

  it('move-up は直前の兄弟の前に移動する', () => {
    const [, b] = setup();
    expect(design().elementAction(b, 'move-up')).toBe(true);
    expect([...document.body.children].map((e) => e.id)).toEqual(['b', 'a', 'c']);
  });

  it('move-up は injected な兄弟をスキップする', () => {
    setup();
    const injected = document.createElement('div');
    injected.setAttribute('data-designer-injected', 'true');
    const b = document.getElementById('b');
    document.body.insertBefore(injected, b);
    design().elementAction(b, 'move-up');
    expect([...document.body.children].filter((e) => e.id).map((e) => e.id)).toEqual(['b', 'a', 'c']);
  });

  it('先頭要素の move-up は何もせず false', () => {
    const [a] = setup();
    expect(design().elementAction(a, 'move-up')).toBe(false);
  });

  it('move-down は次の兄弟の後ろに移動する', () => {
    const [, b] = setup();
    design().elementAction(b, 'move-down');
    expect([...document.body.children].map((e) => e.id)).toEqual(['a', 'c', 'b']);
  });

  it('duplicate は選択状態属性を持たないクローンを直後に挿入する', () => {
    const [a] = setup();
    a.setAttribute('data-designer-selected', 'true');
    design().elementAction(a, 'duplicate');
    const children = [...document.body.children];
    expect(children.length).toBe(4);
    expect(children[1].id).toBe('a'); // クローン
    expect(children[1].hasAttribute('data-designer-selected')).toBe(false);
  });
});

describe('App.design.templates', () => {
  it('全テンプレートが要素を生成できる', () => {
    const t = design().templates;
    const names = Object.keys(t);
    expect(names).toContain('container');
    expect(names).toContain('page-break');
    names.forEach((name) => {
      const el = t[name](document);
      expect(el.nodeType).toBe(1);
    });
  });
  it('flex-row は3つの子を持つ', () => {
    const el = design().templates['flex-row'](document);
    expect(el.children.length).toBe(3);
    expect(el.style.display).toBe('flex');
  });
});

describe('App.design.tableContext', () => {
  it('td 選択からテーブル文脈を解決する', () => {
    document.body.innerHTML = `
      <table><tbody>
        <tr><td>1</td><td id="target">2</td></tr>
        <tr><td>3</td><td>4</td></tr>
      </tbody></table>`;
    const ctx = design().tableContext(document.getElementById('target'));
    expect(ctx.rowIndex).toBe(0);
    expect(ctx.cellIndex).toBe(1);
    expect(ctx.colCount).toBe(2);
  });
  it('テーブル外の要素では null', () => {
    document.body.innerHTML = '<div id="x"></div>';
    expect(design().tableContext(document.getElementById('x'))).toBe(null);
  });
});

describe('App.design.buildInjectionScript', () => {
  it('構文的に正しいJSを生成する（文字列連結スクリプトの撲滅）', () => {
    const src = design().buildInjectionScript('tok-123');
    expect(() => new Function(src)).not.toThrow();
    expect(src).toContain('tok-123');
  });

  it('jsdom 上で実行でき、オーバーレイ類がDOMに追加される', () => {
    const src = design().buildInjectionScript('tok-abc');
    // 注入先iframe相当の環境で実行
    window.parent.postMessage = vi.fn();
    new Function(src)();
    expect(document.querySelector('.designer-hover-overlay')).not.toBeNull();
    expect(document.querySelector('.designer-action-bar')).not.toBeNull();
    expect(document.querySelectorAll('.designer-resize-handle').length).toBe(8);
  });

  it('クリックで __design_click__ メッセージが token 付きで送られる', () => {
    document.body.innerHTML = '<p id="para">text</p>';
    const messages = [];
    window.parent.postMessage = (data) => messages.push(data);
    new Function(design().buildInjectionScript('tok-msg'))();
    document.getElementById('para').click();
    // 同一documentに複数runtimeが注入され得るため token で特定する
    const click = messages.find((m) => m.type === '__design_click__' && m.token === 'tok-msg');
    expect(click).toBeTruthy();
    expect(click.tag).toBe('p#para');
    expect(click.styles).toHaveProperty('backgroundColor');
    expect(click.styles).toHaveProperty('opacity');
  });
});

describe('App.design.STYLE_PROPS', () => {
  it('パネルが参照するプロパティ一覧が注入スクリプトと共有されている', () => {
    const props = design().STYLE_PROPS;
    expect(props).toContain('backgroundColor');
    expect(props).toContain('overflow');
    // 注入スクリプトにも同一リストが埋め込まれる
    const src = design().buildInjectionScript('t');
    props.forEach((p) => expect(src).toContain(p));
  });
});

function bootRuntime(token) {
  const messages = [];
  window.parent.postMessage = (data) => messages.push(data);
  new Function(design().buildInjectionScript(token))();
  return messages;
}

describe('注入ランタイム: Undo/Redoキーの親への中継', () => {
  it('Ctrl+Z で __design_undo__ が送られる', () => {
    const messages = bootRuntime('tok-undo');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true, cancelable: true }));
    expect(messages.some((m) => m.type === '__design_undo__' && m.token === 'tok-undo')).toBe(true);
  });

  it('Ctrl+Shift+Z / Ctrl+Y で __design_redo__ が送られる', () => {
    const messages = bootRuntime('tok-redo');
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Z', ctrlKey: true, shiftKey: true, bubbles: true, cancelable: true })
    );
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'y', ctrlKey: true, bubbles: true, cancelable: true }));
    expect(messages.filter((m) => m.type === '__design_redo__' && m.token === 'tok-redo').length).toBe(2);
  });

  it('contenteditable 編集中はネイティブのundoに任せる（中継しない）', () => {
    document.body.innerHTML = '<p id="edit" contenteditable="true">text</p>';
    const messages = bootRuntime('tok-ce');
    document
      .getElementById('edit')
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true, cancelable: true }));
    expect(messages.some((m) => m.type === '__design_undo__')).toBe(false);
  });
});

describe('注入ランタイム: クリック選択の出現順 (occurrence)', () => {
  it('同名タグの何番目かが __design_click__ に含まれる', () => {
    document.body.innerHTML = '<p id="p1">a</p><p id="p2">b</p>';
    const messages = bootRuntime('tok-occ');
    document.getElementById('p2').click();
    const click = messages.find((m) => m.type === '__design_click__' && m.token === 'tok-occ');
    expect(click.occurrence).toBe(1);
  });

  it('designer注入要素は出現順カウントから除外される', () => {
    document.body.innerHTML = '<div id="d1">a</div><div id="d2">b</div>';
    const messages = bootRuntime('tok-occ2');
    // 注入ランタイム自身が複数の<div>（オーバーレイ等）をbodyに追加している状況で
    document.getElementById('d2').click();
    const click = messages.find((m) => m.type === '__design_click__' && m.token === 'tok-occ2');
    expect(click.occurrence).toBe(1);
  });
});
