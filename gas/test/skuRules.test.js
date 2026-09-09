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
  isNamePersonalization,
  calcPrices,
} = require('../src/SkuRules');

const masterSample = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'fixtures/master_sample.json'), 'utf8')
);
const expectedSample = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'fixtures/rakuten_expected_sample.json'), 'utf8')
);
const expectedByCode = new Map(expectedSample.map((e) => [e['商品コード'], e]));

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

test('getSkuManagementNumber: 実データの全パターンと一致する', () => {
  for (const m of masterSample) {
    const expected = expectedByCode.get(m['商品コード']);
    assert.equal(getSkuManagementNumber(m, {}), expected['SKU管理番号'], m['商品コード']);
  }
});

test('getSkuManagementNumber: 既存値が渡された場合はルールを無視してそのまま返す', () => {
  const m = masterSample.find((m) => m['商品コード'] === 'f-bcpr-03We3-01IVY-9H');
  assert.equal(
    getSkuManagementNumber(m, { existingSkuManagementNumber: 'legacy-code-123' }),
    'legacy-code-123'
  );
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

test('isNamePersonalization: Pトークンの有無で判定する', () => {
  assert.equal(isNamePersonalization('-P'), true);
  assert.equal(isNamePersonalization('-P-9H'), true);
  assert.equal(isNamePersonalization('-MG'), false);
  assert.equal(isNamePersonalization(''), false);
});

test('calcPrices: 一般式が成立するグループ(接尾辞なし/9H/MG/MG-9H)は実データと一致する', () => {
  const generalSuffixes = ['', '-9H', '-MG', '-MG-9H'];
  for (const m of masterSample) {
    const parsed = parseProductCode(m);
    if (generalSuffixes.indexOf(parsed.suffix) === -1) continue;
    const expected = expectedByCode.get(m['商品コード']);
    const prices = calcPrices(m['販売価格'], { isNamePersonalization: false });
    assert.equal(prices.normal, expected['通常購入販売価格'], m['商品コード']);
    assert.equal(prices.display, expected['表示価格'], m['商品コード']);
    assert.equal(prices.reviewRequired, false);
  }
});

test('calcPrices: 「名入れあり」(接尾辞にP)は reviewRequired=true になる', () => {
  const prices = calcPrices(1980, { isNamePersonalization: true });
  assert.equal(prices.reviewRequired, true);
});
