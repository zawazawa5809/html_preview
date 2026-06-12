import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.js'],
    coverage: {
      provider: 'v8',
      include: ['js/**/*.js'],
      reporter: ['text', 'html'],
      // 回帰防止の下限（2026-06: Stmts 44.3 / Branch 34.6 / Funcs 48.7 / Lines 46.2）。
      // テストを増やしたら現状値に合わせて引き上げる。
      // 注: design-mode.js の注入ランタイムは new Function 実行のため計測対象外に見える
      thresholds: {
        statements: 44,
        branches: 34,
        functions: 48,
        lines: 46,
      },
    },
  },
});
