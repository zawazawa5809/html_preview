import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '../js/lib/core.js';
import '../js/lib/toast.js';

const App = window.App;

beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML = '';
});
afterEach(() => vi.useRealTimers());

describe('App.showToast', () => {
  it('メッセージを表示し、2秒後に自動で消える', () => {
    App.showToast('保存しました');
    const el = document.querySelector('.temp-message');
    expect(el).not.toBeNull();
    expect(el.textContent).toBe('保存しました');
    vi.advanceTimersByTime(2000 + 300);
    expect(document.querySelector('.temp-message')).toBeNull();
  });

  it('error タイプは toast-error クラスを持つ', () => {
    App.showToast('失敗', 'error');
    expect(document.querySelector('.temp-message').classList.contains('toast-error')).toBe(true);
  });

  it('既存トーストは置き換えられる（多重表示しない）', () => {
    App.showToast('1つ目');
    App.showToast('2つ目');
    const all = document.querySelectorAll('.temp-message');
    expect(all.length).toBe(1);
    expect(all[0].textContent).toBe('2つ目');
  });

  it('アクション付きは6秒表示・ボタンクリックで onAction 実行', () => {
    const onAction = vi.fn();
    App.showToast('クリアしました', 'success', { actionLabel: '元に戻す', onAction });
    const btn = document.querySelector('.toast-action');
    expect(btn.textContent).toBe('元に戻す');
    // 2秒では消えない
    vi.advanceTimersByTime(2300);
    expect(document.querySelector('.temp-message')).not.toBeNull();
    btn.click();
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(document.querySelector('.temp-message')).toBeNull();
  });

  it('SR向けに role=status が付与される', () => {
    App.showToast('x');
    expect(document.querySelector('.temp-message').getAttribute('role')).toBe('status');
  });
});
