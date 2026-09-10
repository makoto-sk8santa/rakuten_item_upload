const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { buildVariation, stripBrackets } = require('../src/VariationBuilder');

const masterSample = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'fixtures/master_sample.json'), 'utf8')
);
const expectedSample = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'fixtures/rakuten_expected_sample.json'), 'utf8')
);
const expectedByCode = new Map(expectedSample.map((e) => [e['商品コード'], e]));

test('stripBrackets: 角括弧を取り除く', () => {
  assert.equal(stripBrackets('[arrows We2]'), 'arrows We2');
  assert.equal(stripBrackets('arrows We2'), 'arrows We2');
  assert.equal(stripBrackets(''), '');
  assert.equal(stripBrackets(undefined), '');
});

test('buildVariation: f-bic-prt(検証済み・上書きあり)は実データ(バリエーション項目選択肢1〜4)と一致する', () => {
  for (const m of masterSample) {
    const expected = expectedByCode.get(m['商品コード']);
    const labels = buildVariation(m);
    assert.equal(labels.length, 4, m['商品コード']);
    assert.equal(labels[0], expected['バリエーション項目選択肢1'], m['商品コード'] + ' Key0');
    assert.equal(labels[1], expected['バリエーション項目選択肢2'], m['商品コード'] + ' Key1');
    assert.equal(labels[2], expected['バリエーション項目選択肢3'], m['商品コード'] + ' Key2');
    assert.equal(labels[3], expected['バリエーション項目選択肢4'], m['商品コード'] + ' Key3');
  }
});

test('buildVariation: 未検証の商品(代表商品コードがConfigに無い)は商品マスターの機種/カラー列をそのまま使う', () => {
  const other = {
    '商品コード': 'g-xyz-01S-01BLK',
    '代表商品コード': 'g-xyz',
    'サイズコード': '-01S',
    'カラーコード': '-01BLK',
    '機種': '[汎用]',
    'カラー': 'ブラック',
  };
  // 追加オプション/セットの軸は Config.SUFFIX_OPTION_AXES_REPRESENTATIVE_CODES に
  // 登録されていない代表商品コードには適用しないため、機種とカラーの2軸だけになる
  assert.deepEqual(buildVariation(other), ['汎用', 'ブラック']);
});

test('buildVariation: サイズコードが空欄の商品は機種の軸を含めず、カラーがKey0になる', () => {
  // カラーバリエーションのみで機種の軸が無い商品の例（ユーザー確認済み。2026-09-10）
  const colorOnly = {
    '商品コード': 'g-color-only-01BLK',
    '代表商品コード': 'g-color-only',
    'サイズコード': '',
    'カラーコード': '-01BLK',
    'カラー': 'ブラック',
  };
  assert.deepEqual(buildVariation(colorOnly), ['ブラック']);
});

test('buildVariation: カラーコードが空欄の商品はカラーの軸も含めない', () => {
  const noColor = {
    '商品コード': 'g-no-color-01S',
    '代表商品コード': 'g-no-color',
    'サイズコード': '-01S',
    'カラーコード': '',
    '機種': '[汎用]',
  };
  assert.deepEqual(buildVariation(noColor), ['汎用']);
});

test('buildVariation: 機種・カラーどちらの軸も無い商品(単一商品)は空配列になる', () => {
  const noVariation = {
    '商品コード': 'g-single-item',
    '代表商品コード': 'g-single',
    'サイズコード': '',
    'カラーコード': '',
  };
  assert.deepEqual(buildVariation(noVariation), []);
});

test('buildVariation: 商品マスターの機種/カラー列も空欄なら、コード自体をそのまま表示名にする(沈黙して空文字にはしない)', () => {
  const noLabelText = {
    '商品コード': 'g-no-label-01S-01BLK',
    '代表商品コード': 'g-no-label',
    'サイズコード': '-01S',
    'カラーコード': '-01BLK',
  };
  assert.deepEqual(buildVariation(noLabelText), ['-01S', '-01BLK']);
});
