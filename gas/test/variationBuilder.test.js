const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { buildVariation } = require('../src/VariationBuilder');

const masterSample = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'fixtures/master_sample.json'), 'utf8')
);
const expectedSample = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'fixtures/rakuten_expected_sample.json'), 'utf8')
);
const expectedByCode = new Map(expectedSample.map((e) => [e['商品コード'], e]));

test('buildVariation: Key0〜Key3 が実データ(バリエーション項目選択肢1〜4)と一致する', () => {
  for (const m of masterSample) {
    const expected = expectedByCode.get(m['商品コード']);
    const variation = buildVariation(m);
    assert.equal(variation.Key0, expected['バリエーション項目選択肢1'], m['商品コード'] + ' Key0');
    assert.equal(variation.Key1, expected['バリエーション項目選択肢2'], m['商品コード'] + ' Key1');
    assert.equal(variation.Key2, expected['バリエーション項目選択肢3'], m['商品コード'] + ' Key2');
    assert.equal(variation.Key3, expected['バリエーション項目選択肢4'], m['商品コード'] + ' Key3');
  }
});

test('buildVariation: 未登録のカラーコードはエラーを投げる（沈黙して誤表示させない）', () => {
  const bogus = {
    '商品コード': 'f-bcpr-01We2-99ZZZ',
    'サイズコード': '-01We2',
    'カラーコード': '-99ZZZ',
  };
  assert.throws(() => buildVariation(bogus), /未登録のカラーコード/);
});

test('buildVariation: 未登録の機種(サイズコード)はエラーを投げる', () => {
  const bogus = {
    '商品コード': 'f-bcpr-99Xxx-01IVY',
    'サイズコード': '-99Xxx',
    'カラーコード': '-01IVY',
  };
  assert.throws(() => buildVariation(bogus), /未登録の機種/);
});
