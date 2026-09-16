const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildAiInputSummary,
  buildProductNamePrompt,
  parseAiTextResponse,
} = require('../src/AiTextGeneration');

test('buildAiInputSummary: 商品マスターから機種・カラーの候補を重複無しで集める', () => {
  const masterRowsForCode = [
    { '商品名': 'バンジーストラップ', '機種': '', 'カラー': 'アイボリー', '商品タグ': '[ストラップ系]', '販売価格': 2430 },
    { '商品名': 'バンジーストラップ', '機種': '', 'カラー': 'アイボリー', '商品タグ': '[ストラップ系]', '販売価格': 2780 },
    { '商品名': 'バンジーストラップ', '機種': '', 'カラー': 'イエロー', '商品タグ': '[ストラップ系]', '販売価格': 2430 },
  ];
  const aiInputRow = { '特徴': '伸縮性のあるバンジーコード', '素材': 'ナイロン' };

  const summary = buildAiInputSummary(masterRowsForCode, aiInputRow);

  assert.equal(summary.currentProductName, 'バンジーストラップ');
  assert.deepEqual(summary.kishu, []);
  assert.deepEqual(summary.color, ['アイボリー', 'イエロー']);
  assert.equal(summary.features, '伸縮性のあるバンジーコード');
  assert.equal(summary.material, 'ナイロン');
  assert.equal(summary.compatibleModels, '');
});

test('buildAiInputSummary: 補足情報(aiInputRow)が無くてもエラーにならない', () => {
  const summary = buildAiInputSummary([{ '商品名': 'X', 'カラー': '黒' }], undefined);
  assert.equal(summary.features, '');
  assert.deepEqual(summary.color, ['黒']);
});

test('buildAiInputSummary: 商品マスター行が空でもエラーにならない', () => {
  const summary = buildAiInputSummary([], {});
  assert.equal(summary.currentProductName, '');
  assert.deepEqual(summary.kishu, []);
  assert.deepEqual(summary.color, []);
});

test('buildProductNamePrompt: 入力した情報がプロンプトに含まれ、JSON出力形式を指示する', () => {
  const summary = buildAiInputSummary(
    [{ '商品名': 'バンジーストラップ', 'カラー': 'アイボリー', '商品タグ': '[ストラップ系]', '販売価格': 2430 }],
    { '特徴': '伸縮性のあるコード', '素材': 'ナイロン' }
  );
  const prompt = buildProductNamePrompt(summary);

  assert.match(prompt, /アイボリー/);
  assert.match(prompt, /伸縮性のあるコード/);
  assert.match(prompt, /ナイロン/);
  assert.match(prompt, /"product_name"/);
  assert.match(prompt, /"catch_copy"/);
  assert.match(prompt, /勝手に追加・変更しない/);
});

test('parseAiTextResponse: 素のJSON応答をパースできる', () => {
  const result = parseAiTextResponse('{"product_name": "商品名A", "catch_copy": "キャッチA"}');
  assert.deepEqual(result, { productName: '商品名A', catchCopy: 'キャッチA' });
});

test('parseAiTextResponse: 前後に説明文やコードブロックが付いていてもJSON部分を抽出できる', () => {
  const responseText = 'こちらが結果です。\n```json\n{"product_name": "商品名B", "catch_copy": "キャッチB"}\n```\nご確認ください。';
  const result = parseAiTextResponse(responseText);
  assert.deepEqual(result, { productName: '商品名B', catchCopy: 'キャッチB' });
});

test('parseAiTextResponse: JSONが見つからない場合はエラーを投げる', () => {
  assert.throws(() => parseAiTextResponse('生成できませんでした'), /JSONオブジェクトが見つかりません/);
});

test('parseAiTextResponse: 必要なキーが欠けている場合はエラーを投げる', () => {
  assert.throws(() => parseAiTextResponse('{"product_name": "商品名C"}'), /product_name\/catch_copy/);
});

test('parseAiTextResponse: 壊れたJSONの場合はエラーを投げる', () => {
  assert.throws(() => parseAiTextResponse('{product_name: 商品名D}'), /JSONとして解析できませんでした/);
});
