const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildExtraVariationLabels,
  indexExtraVariationRowsByProductCode,
} = require('../src/ExtraVariationLookup');

test('buildExtraVariationLabels: 該当行が無ければ空配列を返す', () => {
  assert.deepEqual(buildExtraVariationLabels(undefined), []);
});

test('buildExtraVariationLabels: 軸名・選択肢が両方揃っているペアだけラベル化する', () => {
  const row = {
    '商品コード': 'abc-01',
    '追加軸1軸名': 'タイプ',
    '追加軸1選択肢': 'スタンダード',
    '追加軸2軸名': '',
    '追加軸2選択肢': '',
  };
  assert.deepEqual(buildExtraVariationLabels(row), ['スタンダード']);
});

test('buildExtraVariationLabels: 2軸とも登録されていれば両方返す', () => {
  const row = {
    '商品コード': 'abc-01',
    '追加軸1軸名': 'タイプ',
    '追加軸1選択肢': 'スタンダード',
    '追加軸2軸名': '文字入れの有無',
    '追加軸2選択肢': 'あり',
  };
  assert.deepEqual(buildExtraVariationLabels(row), ['スタンダード', 'あり']);
});

test('buildExtraVariationLabels: 軸名だけ・選択肢だけの片方欠けは無視する', () => {
  const row = {
    '追加軸1軸名': 'タイプ',
    '追加軸1選択肢': '',
    '追加軸2軸名': '',
    '追加軸2選択肢': 'あり',
  };
  assert.deepEqual(buildExtraVariationLabels(row), []);
});

test('indexExtraVariationRowsByProductCode: 商品コードをキーにしたマップを作る', () => {
  const rows = [
    { '商品コード': 'abc-01', '追加軸1軸名': 'タイプ', '追加軸1選択肢': 'A' },
    { '商品コード': 'abc-02', '追加軸1軸名': 'タイプ', '追加軸1選択肢': 'B' },
    { '商品コード': '', '追加軸1軸名': '無視されるべき行' },
  ];
  const byCode = indexExtraVariationRowsByProductCode(rows);
  assert.equal(Object.keys(byCode).length, 2);
  assert.equal(byCode['abc-01']['追加軸1選択肢'], 'A');
  assert.equal(byCode['abc-02']['追加軸1選択肢'], 'B');
});
