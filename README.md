# rakuten_item_upload

楽天市場（RMS）商品登録自動化システム。

Googleスプレッドシートで管理する商品マスターから、楽天RMSへアップロードするCSVを自動生成することを目的とする。

詳細な仕様は [docs/spec.md](docs/spec.md) を参照。

## 開発方針（要約）

- 既存の商品マスター・SKU体系はそのまま維持し、AIに再設計させない
- SKU・価格・在庫・CSVフォーマットの正確な変換はプログラムで処理する
- AIは商品名・説明文などの文章生成・確認補助に限定して利用する
- Phase 1（CSV変換の自動化）から段階的に開発する（詳細は仕様書 15章）

## 実データ解析・Phase1実装状況

f-bic-prt 商品群（商品マスター288行・楽天CSV561列）の実データを解析し、
SKU番号・バリエーション・価格の生成ルールを特定した。詳細は
[docs/data-analysis.md](docs/data-analysis.md) と
[docs/reference/column-mapping.csv](docs/reference/column-mapping.csv)（楽天CSV561列の分類）を参照。

Phase1（商品マスター→楽天SKU展開）はGoogle Apps Script（[gas/](gas/)）で実装中。
ロジック本体はGAS・Node.js両方から実行できる純粋関数として書いており、
実データから抽出したテストケースで検証している。

```bash
npm test   # gas/ のロジックをNode.jsでテスト
```

実装状況・残タスクは [gas/README.md](gas/README.md) を参照。
