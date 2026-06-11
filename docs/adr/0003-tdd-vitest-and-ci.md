# ADR-0003: Vitest + jsdom によるTDDと、GitHub Actions によるCI/CD

- Status: Accepted
- Date: 2026-06-11

## Context

従来は手動ブラウザ確認のみで、リファクタや機能追加のたびに全機能の手動回帰が
必要だった。マルチファイル化（ADR-0002）でロジックがモジュール単位になり、
自動テストが現実的になった。

## Decision

1. **テストランナーは Vitest**（環境: jsdom）。
   選定理由: Vite と同一のトランスフォーム基盤であり、将来のVite移行（ADR-0002）
   でテスト資産がそのまま使える。クラシックスクリプトも `import '../js/lib/x.js'`
   の副作用ロードで `window.App` 経由のままテストできる。
2. **テストの層構造**:
   - ユニット: `js/lib/*` と `App.design.*`（純粋ロジック・DOM操作）
   - 注入スクリプト検証: `buildInjectionScript()` の生成コードを `new Function` で
     構文検証し、jsdom上で実行してメッセージプロトコル（`__design_click__` 等）を検証
   - スモーク: 両HTMLの参照整合性（script/link実在・CDN参照ゼロ・必須ID存在）
3. **開発はTDDで進める**: 振る舞いをテストで固定してから実装・リファクタする。
   既存挙動の移植では、旧実装の仕様をテストに書き起こしてから移植した。
4. **CI**（`.github/workflows/ci.yml`）: push / PR で `npm ci && npm test` を実行。
   `npm run vendor` 後に差分が無いことも検証し、vendor/ と package.json の
   乖離（更新漏れ・手編集）を検出する。
5. **CD**（`.github/workflows/deploy-pages.yml`）: main への push でテスト通過後、
   実行時ファイルのみを GitHub Pages へデプロイする（ADR-0001のオンライン配布）。

## Consequences

- (+) リグレッションがCIで自動検出される。リファクタの安全性が大幅に向上
- (+) main = デプロイ済み、という単純な運用になる
- (-) jsdom の制約（実レイアウト・印刷・クリップボード等）があるため、
  ドラッグリサイズや印刷などは引き続き手動確認が必要
- 注意: GitHub Pages への初回デプロイは、リポジトリ設定で
  Settings → Pages → Source を「GitHub Actions」にする必要がある
