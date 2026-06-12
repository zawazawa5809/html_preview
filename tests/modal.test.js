import { describe, it, expect, beforeEach } from 'vitest';
import '../js/lib/modal.js';

const App = window.App;

beforeEach(() => {
  document.body.innerHTML = `
    <button id="opener">open</button>
    <div id="overlay" hidden>
      <div class="modal">
        <button id="m-close">✕</button>
        <a href="#x" id="m-link">link</a>
        <button id="m-last">last</button>
      </div>
    </div>
  `;
});

const overlay = () => document.getElementById('overlay');

describe('App.createModal (フォーカストラップ付きモーダル)', () => {
  it('open で表示され、最初のフォーカス可能要素にフォーカスする', () => {
    const modal = App.createModal(overlay());
    document.getElementById('opener').focus();
    modal.open();
    expect(overlay().hidden).toBe(false);
    expect(document.activeElement.id).toBe('m-close');
  });

  it('close で非表示になり、開く前の要素へフォーカスを戻す', () => {
    const modal = App.createModal(overlay());
    document.getElementById('opener').focus();
    modal.open();
    modal.close();
    expect(overlay().hidden).toBe(true);
    expect(document.activeElement.id).toBe('opener');
  });

  it('末尾要素で Tab すると先頭へ循環する', () => {
    const modal = App.createModal(overlay());
    modal.open();
    document.getElementById('m-last').focus();
    overlay().dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    expect(document.activeElement.id).toBe('m-close');
  });

  it('先頭要素で Shift+Tab すると末尾へ循環する', () => {
    const modal = App.createModal(overlay());
    modal.open();
    document.getElementById('m-close').focus();
    overlay().dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true })
    );
    expect(document.activeElement.id).toBe('m-last');
  });

  it('toggle が open/close を切り替え、isOpen が状態を返す', () => {
    const modal = App.createModal(overlay());
    expect(modal.isOpen()).toBe(false);
    modal.toggle();
    expect(modal.isOpen()).toBe(true);
    modal.toggle();
    expect(modal.isOpen()).toBe(false);
  });
});
