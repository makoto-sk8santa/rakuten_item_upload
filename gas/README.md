# 楽天登録データ作成（Google Apps Script）

商品マスター → 楽天SKU展開 の変換ロジック（Phase1）。

## 構成

```
gas/
  appsscript.json         Apps Script マニフェスト
  src/
    Config.js             固定値・対応表（機種/カラーの表示名、SKU管理番号の例外、在庫数・画像パスの固定値）
    SkuRules.js            商品コード解析、SKU番号算出・価格決定（純粋関数、GAS/Node両対応）
    VariationBuilder.js     バリエーション4軸(Key0〜Key3)の組み立て
    ImagePathBuilder.js     商品画像パス(商品画像タイプN／パスN)の組み立て
    RakutenSkuRowBuilder.js 商品マスター1行→楽天SKU行の組み立て（区分A・Bのみ）
    Main.js                 GASのエントリーポイント（スプレッドシート連携、Node非対応）
  test/
    *.test.js              Node.js組み込みテストランナーによるユニットテスト
    fixtures/               実データから抽出したテスト用サンプル（価格・SKU番号を含む）
```

`Config.js` / `SkuRules.js` / `VariationBuilder.js` / `ImagePathBuilder.js` /
`RakutenSkuRowBuilder.js` は `if (typeof require !== 'undefined') / if (typeof module !== 'undefined')`
で GAS・Node.js 双方から読み込めるようにしてある。ロジックの正しさは Node.js 上でテストし、
実際の反映は `clasp push` で Apps Script に取り込む。

## テストの実行

```bash
npm test
# もしくは
node --test gas/test/*.test.js
```

テストは `docs/data-analysis.md` で解析した実データ（商品マスターCSV・楽天ダウンロードCSV）から
抽出したサンプルに対して行っており、SKU管理番号のルール・バリエーション4軸が実データと一致すること、
および価格・在庫数がユーザー確認済みの方針（下記）どおりになることを検証している。

## 現状の実装範囲（Phase1）

`docs/reference/column-mapping.csv` の区分のうち、以下を実装済み：

**SKU行**（`RakutenSkuRowBuilder.buildSkuRow` → メニュー「SKU展開を実行」）：
- システム連携用SKU番号（区分A：商品マスターの商品コードをそのまま）
- SKU管理番号（区分B：新規SKUは商品コードそのまま。既存SKUは
  `options.existingSkuManagementNumber` で現在の値を保持できる。2026-09-09確定）
- バリエーション項目キー1〜4／選択肢1〜4（区分C／B）
- 通常購入販売価格／表示価格（区分A：商品マスターの `販売価格` をそのまま使用。
  ダウンロード時点の楽天CSVはセール中の価格だったため、そちらの数式は不採用。2026-09-09確定）
- 在庫数（区分C：一律0固定。公開後は倉庫システムとのAPI連携で自動更新される。2026-09-09確定）
- カタログID（区分A）

**商品画像パス**（`ImagePathBuilder.buildImageColumns` → メニュー「商品画像パスを生成」）：
- 商品画像タイプN（区分C：常に `CABINET`）
- 商品画像パスN（区分B：1枚目は `/top/{代表商品コード}.jpg`、2枚目以降は
  `/sumahoya10/{代表商品コード}_{連番}.jpg`。2026-09-09確定）
- 画像の総枚数は商品マスターから自動判定できないため、シート2「楽天登録対象」の
  「画像枚数」列（商品ごとに人間が1回入力）を読み取る。実行のたびに枚数を尋ねる
  ダイアログにはしていない（複数商品の一括処理で毎回手が止まるため）。

**未実装（残タスク）**：
- `Main.js`：既存登録済みの代表商品コードを再実行する際に、既存のSKU管理番号を
  読み込んで `buildSkuRow` に渡す仕組み（現状は未実装。渡さないと新規ルールで
  上書きされる）。
- シート2「楽天登録対象」への「画像枚数」列の追加（運用側の対応）。
- 区分C（上記以外の固定値・設定マスター）：現状はスプレッドシート「設定・固定値マスター」シートで
  人間が管理する想定。`Main.js` の SKU行出力に合成する処理は未実装。
- 区分D（AI生成：商品名／説明文／画像ALT等）：Phase2で対応。
- 画像ファイルの実体アップロード運用の確認：`docs/data-analysis.md` の「次のアクション」を参照。

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
