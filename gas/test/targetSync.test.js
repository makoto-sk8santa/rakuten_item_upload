const test = require('node:test');
const assert = require('node:assert/strict');

const {
  getUniqueRepresentativeCodes,
  getMissingRepresentativeCodes,
  buildTargetRow,
} = require('../src/TargetSync');

const masterRows = [
  { '商品コード': 'f-bcpr-01We2-01IVY-9H', '代表商品コード': 'f-bic-prt' },
  { '商品コード': 'f-bcpr-01We2-02PNK-9H', '代表商品コード': 'f-bic-prt' },
  { '商品コード': 'g-xyz-01', '代表商品コード': 'g-xyz' },
  { '商品コード': 'h-abc-01', '代表商品コード': '' },
];

test('getUniqueRepresentativeCodes: 重複を除き初出順で返す', () => {
  assert.deepEqual(getUniqueRepresentativeCodes(masterRows), ['f-bic-prt', 'g-xyz']);
});

test('getMissingRepresentativeCodes: 既存の楽天登録対象に無いものだけ返す', () => {
  assert.deepEqual(getMissingRepresentativeCodes(masterRows, ['f-bic-prt']), ['g-xyz']);
  assert.deepEqual(getMissingRepresentativeCodes(masterRows, []), ['f-bic-prt', 'g-xyz']);
  assert.deepEqual(getMissingRepresentativeCodes(masterRows, ['f-bic-prt', 'g-xyz']), []);
});

test('buildTargetRow: 登録対象はFALSEで追加し、商品管理番号は代表商品コードと同じにする', () => {
  assert.deepEqual(buildTargetRow('f-bic-prt'), {
    '登録対象': 'FALSE',
    '代表商品コード': 'f-bic-prt',
    '商品管理番号': 'f-bic-prt',
    '商品ページ状態': '新規',
    'AI生成': '未生成',
    'CSV出力': '未出力',
    '最終確認': '',
    '画像枚数': '',
  });
});
