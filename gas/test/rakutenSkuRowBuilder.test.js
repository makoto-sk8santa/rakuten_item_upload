const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { buildSkuRow } = require('../src/RakutenSkuRowBuilder');

const masterSample = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'fixtures/master_sample.json'), 'utf8')
);
const expectedSample = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'fixtures/rakuten_expected_sample.json'), 'utf8')
);
const expectedByCode = new Map(expectedSample.map((e) => [e['商品コード'], e]));

test('buildSkuRow: バリエーションは実データと完全一致し、SKU番号・価格・在庫は確定した方針どおりになる', () => {
  const m = masterSample.find((m) => m['商品コード'] === 'f-bcpr-01We2-01IVY-9H');
  const expected = expectedByCode.get(m['商品コード']);
  const { row, warnings } = buildSkuRow(m);

  assert.equal(row['システム連携用SKU番号'], m['商品コード']);
  // 新規登録なのでSKU管理番号は商品コードそのまま（ユーザー確認済み。過去のWe2/We2Plusの
  // 末尾"5"付き採番は踏襲しない。既存登録済み商品の再アップロードは対象外）
  assert.equal(row['SKU管理番号'], m['商品コード']);
  assert.equal(row['バリエーション項目選択肢1'], expected['バリエーション項目選択肢1']);
  assert.equal(row['バリエーション項目選択肢2'], expected['バリエーション項目選択肢2']);
  assert.equal(row['バリエーション項目選択肢3'], expected['バリエーション項目選択肢3']);
  assert.equal(row['バリエーション項目選択肢4'], expected['バリエーション項目選択肢4']);
  // 価格は楽天CSVのセール中価格ではなく、商品マスターの販売価格をそのまま使う
  assert.equal(row['通常購入販売価格'], m['販売価格']);
  assert.equal(row['表示価格'], m['販売価格']);
  // 在庫数は倉庫システムとのAPI連携で後から自動更新されるため一律0
  assert.equal(row['在庫数'], 0);
  assert.deepEqual(warnings, []);
});

test('buildSkuRow: 「名入れあり」(-P-9H)も価格は商品マスターの販売価格をそのまま使う', () => {
  const m = masterSample.find((m) => m['商品コード'] === 'f-bcpr-01We2-01IVY-P-9H');
  const { row, warnings } = buildSkuRow(m);
  assert.equal(row['通常購入販売価格'], m['販売価格']);
  assert.equal(row['表示価格'], m['販売価格']);
  assert.deepEqual(warnings, []);
});

test('buildSkuRow: サイズコードが空欄の商品(機種の軸なし)は3軸分だけ出力し、4軸目は含まない', () => {
  const colorOnly = {
    '商品コード': 'x-color-only-01IVY',
    'サイズコード': '',
    'カラーコード': '-01IVY',
    '識別コード': '1234567890123',
    '販売価格': '1000',
  };
  const { row, warnings } = buildSkuRow(colorOnly);
  assert.equal(row['バリエーション項目キー1'], 'Key0');
  assert.equal(row['バリエーション項目選択肢1'], '01.ペールピンク');
  assert.equal(row['バリエーション項目キー2'], 'Key1');
  assert.equal(row['バリエーション項目選択肢2'], '名入れ無し');
  assert.equal(row['バリエーション項目キー3'], 'Key2');
  assert.equal(row['バリエーション項目選択肢3'], 'ケース単品');
  assert.equal(row['バリエーション項目キー4'], undefined);
  assert.equal(row['バリエーション項目選択肢4'], undefined);
  assert.deepEqual(warnings, []);
});

test('buildSkuRow: すべてのサンプル行で例外を投げずに処理できる', () => {
  for (const m of masterSample) {
    assert.doesNotThrow(() => buildSkuRow(m), m['商品コード']);
  }
});
