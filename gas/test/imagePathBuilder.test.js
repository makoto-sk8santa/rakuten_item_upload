const test = require('node:test');
const assert = require('node:assert/strict');

const { buildImagePath, buildImageColumns } = require('../src/ImagePathBuilder');

test('buildImagePath: 1枚目は /top/{代表商品コード}.jpg', () => {
  assert.equal(buildImagePath('f-bic-prt', 1), '/top/f-bic-prt.jpg');
});

test('buildImagePath: 2枚目以降は /sumahoya10/{代表商品コード}_{連番}.jpg', () => {
  assert.equal(buildImagePath('f-bic-prt', 2), '/sumahoya10/f-bic-prt_2.jpg');
  assert.equal(buildImagePath('f-bic-prt', 3), '/sumahoya10/f-bic-prt_3.jpg');
  assert.equal(buildImagePath('f-bic-prt', 4), '/sumahoya10/f-bic-prt_4.jpg');
});

test('buildImageColumns: 画像枚数分の タイプ/パス 列をまとめて生成する', () => {
  const columns = buildImageColumns('f-bic-prt', 4);
  assert.deepEqual(columns, {
    '商品画像タイプ1': 'CABINET',
    '商品画像パス1': '/top/f-bic-prt.jpg',
    '商品画像タイプ2': 'CABINET',
    '商品画像パス2': '/sumahoya10/f-bic-prt_2.jpg',
    '商品画像タイプ3': 'CABINET',
    '商品画像パス3': '/sumahoya10/f-bic-prt_3.jpg',
    '商品画像タイプ4': 'CABINET',
    '商品画像パス4': '/sumahoya10/f-bic-prt_4.jpg',
  });
});

test('buildImageColumns: 画像1枚のみでも動作する', () => {
  const columns = buildImageColumns('f-bic-prt', 1);
  assert.deepEqual(columns, {
    '商品画像タイプ1': 'CABINET',
    '商品画像パス1': '/top/f-bic-prt.jpg',
  });
});

test('buildImageColumns: 画像枚数が不正な場合はエラーを投げる', () => {
  assert.throws(() => buildImageColumns('f-bic-prt', 0), /画像枚数/);
  assert.throws(() => buildImageColumns('f-bic-prt', -1), /画像枚数/);
  assert.throws(() => buildImageColumns('f-bic-prt', 1.5), /画像枚数/);
});
