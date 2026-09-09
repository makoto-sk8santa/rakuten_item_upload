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

test('buildSkuRow: バリエーション・SKU番号は実データと完全一致し、価格・在庫は商品マスター基準になる', () => {
  const m = masterSample.find((m) => m['商品コード'] === 'f-bcpr-01We2-01IVY-9H');
  const expected = expectedByCode.get(m['商品コード']);
  const { row, warnings } = buildSkuRow(m, {});

  assert.equal(row['システム連携用SKU番号'], m['商品コード']);
  assert.equal(row['SKU管理番号'], expected['SKU管理番号']);
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
  const { row, warnings } = buildSkuRow(m, {});
  assert.equal(row['通常購入販売価格'], m['販売価格']);
  assert.equal(row['表示価格'], m['販売価格']);
  assert.deepEqual(warnings, []);
});

test('buildSkuRow: レガシー例外(a003)は商品マスターにだけ基づいて自動的にSKU管理番号を再現する', () => {
  const m = masterSample.find((m) => m['商品コード'] === 'f-bic-prt-01We2-01IVY');
  const { row } = buildSkuRow(m, {});
  assert.equal(row['SKU管理番号'], 'a003');
});

test('buildSkuRow: すべてのサンプル行で例外を投げずに処理できる', () => {
  for (const m of masterSample) {
    assert.doesNotThrow(() => buildSkuRow(m, {}), m['商品コード']);
  }
});
