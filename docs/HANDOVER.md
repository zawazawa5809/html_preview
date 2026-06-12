# HANDOVER — 引き継ぎドキュメント

最終更新: 2026-06-12 / 対象: `main`（PR #22 マージ済み）

## 1. 現在の状態

- PR #22「マルチファイル構成へ移行」は **main へマージ済み**（マージコミット `0ce23c2`）。CI全チェックgreen、レビュー指摘1件（keymapのShift照合）は修正・resolve済み
- GitHub Pages 稼働確認済み（main マージで `deploy-pages.yml` が自動デプロイ）
- テスト: 12ファイル / 98テスト。`npm test` で全GREEN

### 直近の主要コミット

| コミット | 内容 |
|----------|------|
| `52060a2` | マルチファイル構成への移行本体（62ファイル） |
| `d285bbb` | keymap: 修飾キー無し印字キーのShift照合をスキップ（US配列の `?` 対応） |

## 2. このリポジトリの歩き方

- アーキテクチャの根拠: `docs/adr/0001`（オフライン/ホスト同一成果物・CDN全廃）、`0002`（no-build + Vite移行手順固定）、`0003`（TDD/CI方針）。**構成を変える前に必ずADRを読むこと**
- 開発規約の詳細: `CLAUDE.md`（モジュール一覧・Key Patterns・Testing Notes）
- 開発コマンド: `npm test` / `npm run test:watch` / `npm run vendor`（依存更新時のみ）
- 動作確認: HTMLをブラウザで直接開く。サーバー不要

### 壊しやすいポイント（先に知っておくべき不変条件）

- 外部URL参照を追加しない。`tests/smoke.test.js` が落ちる（意図的なガード）
- HTMLのscript/link追加・ID変更はスモークテストと両ページの整合を確認
- アクセント色は `--da-secondary`（CSS）と `App.design.ACCENT`（JS）の2箇所で同値 `#5b8fcc` を維持
- ショートカットは各ページの `KEY_BINDINGS` 配列だけを編集する（ヘルプ表は自動生成）
- 注入スクリプト（`designRuntime`）は自己完結必須。外側スコープを参照すると `toString()` 注入で壊れる。`cfg` 引数経由で渡すこと
- `vendor/` は生成物。手編集するとCIの整合性チェックで落ちる

### jsdomで検証できない領域（変更時は手動確認）

gutterドラッグリサイズ / 印刷 / クリップボード実挙動 / CodeMirror実描画（折りたたみ・検索ダイアログ）/ Design Modeのリサイズハンドル・D&Dの実操作感

## 3. 改善バックログ（推奨順）

### P1: 価値が高く、すぐ着手できる

1. **E2Eテスト（Playwright）の導入**
   上記「jsdomで検証できない領域」が現状すべて手動。実ブラウザでの起動・編集・ドラッグ・Design Mode選択のスモークE2EをCIに足せば、手動確認をほぼ撤廃できる。静的ファイルなので `npx serve` 不要、`file://` をそのまま開ける
2. **ESLint + Prettier + CIのlintステップ**
   現状フォーマッタ・リンタ無し。ES5スタイル（var/function）を規約として固定し、`no-undef` でグローバル参照ミス（`App.xxx` のtypo）を静的検出できる。導入コストは小さい
3. **カバレッジ計測（`vitest --coverage` + CI閾値）**
   テスト網の穴（特に `js/pages/doceditor/main.js` の分岐）を可視化する

### P2: 機能・品質の底上げ

1. **Design Modeの複数段Undo履歴**
   現状は直近1操作の「元に戻す」トーストのみ。`syncDesignToEditor` 時にスナップショットをリングバッファ（例: 20件）で保持すれば、Ctrl+Z での多段Undoに拡張できる。エディタ側のCodeMirror履歴と統合するのが理想
2. **ソース行ハイライトの精度向上（既知の制限）**
   `highlightSourceLine` はタグ名の最初の出現行を強調するだけで、同名タグが複数あると違う行を指す。要素のDOMパス（親からのインデックス列）をiframe側から送り、ソース側で出現順カウントで対応付けると正確になる
3. **`document.execCommand` 脱却**
   書式ツールバー（太字/色等）とtextareaフォールバックのundo/redoが非推奨APIに依存。Selection/Range APIベースの実装に置き換える。ブラウザから消えるまでは動くため緊急ではない
4. **プレビューiframeのセキュリティ方針の明文化**
   貼り付けたHTML内のスクリプトは親と同一オリジンで実行される（localStorageに到達可能）。Design Modeが同一オリジン前提のため sandbox 化とはトレードオフ。最低限READMEへの注意書き、将来的には「信頼しないHTMLを開くモード」（`sandbox="allow-same-origin"` なし＋Design Mode無効）の追加を検討
5. **アクセシビリティ強化**
   ヘルプモーダルのフォーカストラップ、`dt-add-dropdown` への `aria-expanded`/`aria-haspopup`、Designパネルのセクション開閉のキーボード操作（現状クリックのみ）

### P3: 中期（タイミングを見て）

1. **CodeMirror 6 への更新 + Vite移行（セットで実施）**
   CM5はメンテナンスモード。CM6はESMのみのため、ADR-0002に固定したVite移行手順とセットで行うのが効率的。移行トリガーの目安: TypeScriptが欲しくなった時 / 依存が増えてvendor管理が煩雑になった時 / CM5に支障が出た時
2. **大容量ドキュメント対応**
   localStorage上限（約5MB）が実質の文書サイズ上限。IndexedDBへの移行で解消できるが、現在の容量警告で実用上は足りている
3. **サンプルコンテンツの `<template>` 化**
   `DEFAULT_CONTENT` がJS文字列連結のため編集しづらい。HTML内 `<template>` 要素に移せばマークアップとして編集できる（スモークテストの追従が必要）
4. **モバイル/タッチでのDesign Mode操作**
   リサイズハンドル・D&DがマウスイベントのみのためタッチQ未対応。需要があれば PointerEvent への統一で対応

## 4. 運用メモ

- 依存更新フロー: package.jsonのバージョン変更 → `npm install && npm run vendor` → コミット（vendor差分込み）。CIが乖離を検出する
- デプロイ: mainマージのみ。ロールバックはmainのrevert
- localStorageキー: ページごとに独立（`htmlPreviewer*` / `docEditor*`）。**キー変更はユーザーの保存データ消失を意味する**ので避ける
