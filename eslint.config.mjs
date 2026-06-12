/**
 * ESLint設定（flat config）
 *
 * js/ 配下はクラシックスクリプト（file://動作要件、ADR-0002）のため
 * ecmaVersion: 5 でパースし、ES6+構文の混入を構文エラーとして検出する。
 * no-undef でグローバル参照ミス（App.xxx のtypo等）を静的検出するのが主目的。
 */
import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: ['vendor/**', 'node_modules/**', 'coverage/**', 'playwright-report/**', 'test-results/**'],
  },

  // ブラウザ実行コード: クラシックスクリプト / ES5規約
  {
    files: ['js/**/*.js'],
    languageOptions: {
      ecmaVersion: 5,
      sourceType: 'script',
      globals: {
        ...globals.browser,
        // 構文はES5に固定しつつ、対象ブラウザに存在するES2015+の組み込み（Set等）は許可
        ...globals.es2015,
        // vendor/ 同梱ライブラリ（<script defer> でグローバルに公開される）
        CodeMirror: 'readonly',
        feather: 'readonly',
        html_beautify: 'readonly',
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-unused-vars': ['error', { args: 'after-used', caughtErrors: 'none' }],
    },
  },

  // Node実行コード: テスト / スクリプト / 設定（ESM）
  {
    files: ['tests/**/*.js', 'scripts/**/*.mjs', 'e2e/**/*.js', '*.config.js', '*.config.mjs', 'eslint.config.mjs'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.browser, // テストはjsdom環境でwindow/documentを参照する
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-unused-vars': ['error', { args: 'after-used', caughtErrors: 'none' }],
    },
  },
];
