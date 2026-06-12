import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.js'],
    coverage: {
      provider: 'v8',
      include: ['js/**/*.js'],
      reporter: ['text', 'html'],
      // 回帰防止の下限（2026-06: Stmts 38.9 / Branch 28.7 / Funcs 45.3 / Lines 40.3）。
      // テストを増やしたら現状値に合わせて引き上げる。
      // 注: design-mode.js の注入ランタイムは new Function 実行のため計測対象外に見える
      thresholds: {
        statements: 38,
        branches: 28,
        functions: 45,
        lines: 40,
      },
    },
  },
});
