const test = require('node:test');
const assert = require('node:assert/strict');

const { buildAiGenerationRow } = require('../src/AiGenerationSync');

test('buildAiGenerationRow: ステータス未生成・補足情報は空欄で追加する', () => {
  assert.deepEqual(buildAiGenerationRow('ch-bungee'), {
    '代表商品コード': 'ch-bungee',
    '特徴': '',
    '素材': '',
    '対応機種': '',
    '付属品': '',
    'オプション': '',
    'その他メモ': '',
    '生成商品名': '',
    '生成キャッチコピー': '',
    'ステータス': '未生成',
    '最終生成日時': '',
  });
});
