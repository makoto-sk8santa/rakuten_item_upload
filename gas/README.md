# 楽天登録データ作成（Google Apps Script）

商品マスター → 楽天SKU展開 の変換ロジック（Phase1）。

## 構成

```
gas/
  appsscript.json         Apps Script マニフェスト
  src/
    Config.js             固定値・対応表（機種/カラーの表示名、SKU管理番号ルール、価格計算式）
    SkuRules.js            商品コード解析、SKU番号・価格計算（純粋関数、GAS/Node両対応）
    VariationBuilder.js     バリエーション4軸(Key0〜Key3)の組み立て
    RakutenSkuRowBuilder.js 商品マスター1行→楽天SKU行の組み立て（区分A・Bのみ）
    Main.js                 GASのエントリーポイント（スプレッドシート連携、Node非対応）
  test/
    *.test.js              Node.js組み込みテストランナーによるユニットテスト
    fixtures/               実データから抽出したテスト用サンプル（価格・SKU番号を含む）
```

`Config.js` / `SkuRules.js` / `VariationBuilder.js` / `RakutenSkuRowBuilder.js` は
`if (typeof require !== 'undefined') / if (typeof module !== 'undefined')` で
GAS・Node.js 双方から読み込めるようにしてある。ロジックの正しさは Node.js 上でテストし、
実際の反映は `clasp push` で Apps Script に取り込む。

## テストの実行

```bash
npm test
# もしくは
node --test gas/test/*.test.js
```

テストは `docs/data-analysis.md` で解析した実データ（商品マスターCSV・楽天ダウンロードCSV）から
抽出したサンプルに対して行っており、SKU管理番号のルール・バリエーション4軸・価格計算式が
実データと一致することを検証している。

## 現状の実装範囲（Phase1）

`docs/reference/column-mapping.csv` の区分のうち、**区分A・B（商品マスター参照／SKU計算生成）**
の主要列のみ実装済み：

- システム連携用SKU番号
- SKU管理番号（機種依存ルール、既存値保持オプションあり）
- バリエーション項目キー1〜4／選択肢1〜4
- 通常購入販売価格／表示価格（「名入れあり」オプションは要確認フラグを返す）
- カタログID

**未実装（要確認事項が残っているため）**：
- 区分C（固定値・設定マスター）：現状はスプレッドシート「設定・固定値マスター」シートで
  人間が管理する想定。`Main.js` の SKU行出力に合成する処理は未実装。
- 区分D（AI生成：商品名／説明文／画像ALT等）：Phase2で対応。
- 区分E（人間確認・現状自動化不可）：在庫数、名入れオプションの価格例外、画像ファイルの実体確認など。
  `docs/data-analysis.md` の「次のアクション」を参照。

## Apps Script への反映（clasp）

このリポジトリには `.clasp.json`（Script ID を含む）はコミットしていない
（プロジェクトごとに異なるため）。初回セットアップ手順：

```bash
npm install -g @google/clasp
clasp login
cd gas
clasp create --type sheets --title "楽天登録データ作成" --rootDir .
# もしくは既存のスクリプトに紐付ける場合:
# echo '{"scriptId":"<既存のスクリプトID>","rootDir":"."}' > .clasp.json
clasp push
```

`.clasp.json` は `.gitignore` 済み。Script ID はチームで共有し、各自の環境で設定すること。
