import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.js'],
    coverage: {
      provider: 'v8',
      include: ['js/**/*.js'],
      reporter: ['text', 'html'],
      // 回帰防止の下限（2026-06: Stmts 43.1 / Branch 33.8 / Funcs 48.4 / Lines 44.7）。
      // テストを増やしたら現状値に合わせて引き上げる。
      // 注: design-mode.js の注入ランタイムは new Function 実行のため計測対象外に見える
      thresholds: {
        statements: 42,
        branches: 33,
        functions: 48,
        lines: 44,
      },
    },
  },
});
