const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  parseProductCode,
  getSystemLinkedSkuNumber,
  getSkuManagementNumber,
  getAdditionalOptionLabel,
  getSetOptionLabel,
  calcPrices,
} = require('../src/SkuRules');

const masterSample = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'fixtures/master_sample.json'), 'utf8')
);

test('parseProductCode: 接尾辞なし(f-bic-prt)とあり(f-bcpr)を正しく分解する', () => {
  const noSuffix = masterSample.find((m) => m['商品コード'] === 'f-bic-prt-01We2-01IVY');
  assert.deepEqual(parseProductCode(noSuffix), {
    prefix: 'f-bic-prt',
    sizeCode: '-01We2',
    colorCode: '-01IVY',
    suffix: '',
  });

  const withSuffix = masterSample.find((m) => m['商品コード'] === 'f-bcpr-01We2-01IVY-P-9H');
  assert.deepEqual(parseProductCode(withSuffix), {
    prefix: 'f-bcpr',
    sizeCode: '-01We2',
    colorCode: '-01IVY',
    suffix: '-P-9H',
  });
});

test('getSystemLinkedSkuNumber: 商品コードをそのまま返す', () => {
  for (const m of masterSample) {
    assert.equal(getSystemLinkedSkuNumber(m), m['商品コード']);
  }
});

test('getSkuManagementNumber: 新規登録なので商品コード(システム連携用SKU番号)をそのまま使う', () => {
  // ユーザー確認済み（2026-09-09）。このシステムは新規商品登録のみを対象とし、
  // 過去データにあるWe2/We2Plusの末尾"5"付与のような既存登録済みSKUの扱いは対象外。
  for (const m of masterSample) {
    assert.equal(getSkuManagementNumber(m), m['商品コード'], m['商品コード']);
  }
});

test('getAdditionalOptionLabel / getSetOptionLabel: 接尾辞トークンから正しく判定する', () => {
  assert.equal(getAdditionalOptionLabel(''), '名入れ無し');
  assert.equal(getAdditionalOptionLabel('-9H'), '名入れ無し');
  assert.equal(getAdditionalOptionLabel('-MG'), '名入れ無しマグネットリング付き');
  assert.equal(getAdditionalOptionLabel('-MG-9H'), '名入れ無しマグネットリング付き');
  assert.equal(getAdditionalOptionLabel('-P'), '名入れあり(内容を入力して下さい)');
  assert.equal(getAdditionalOptionLabel('-P-9H'), '名入れあり(内容を入力して下さい)');

  assert.equal(getSetOptionLabel(''), 'ケース単品');
  assert.equal(getSetOptionLabel('-MG'), 'ケース単品');
  assert.equal(getSetOptionLabel('-P'), 'ケース単品');
  assert.equal(getSetOptionLabel('-9H'), 'ケース&ガラスフィルムセット');
  assert.equal(getSetOptionLabel('-MG-9H'), 'ケース&ガラスフィルムセット');
  assert.equal(getSetOptionLabel('-P-9H'), 'ケース&ガラスフィルムセット');
});

test('calcPrices: 通常購入販売価格・表示価格ともに商品マスターの販売価格をそのまま使う', () => {
  // ダウンロード時点の楽天CSVはセール中で一時的に値引きされていたため、
  // その数式は採用しない（ユーザー確認済み。docs/data-analysis.md 5章）。
  for (const m of masterSample) {
    const prices = calcPrices(m['販売価格']);
    assert.equal(prices.normal, m['販売価格'], m['商品コード']);
    assert.equal(prices.display, m['販売価格'], m['商品コード']);
  }
});
