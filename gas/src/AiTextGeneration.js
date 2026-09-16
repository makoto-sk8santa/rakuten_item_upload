// 商品名・キャッチコピーをAI(Claude)に生成させるための、プロンプト組み立てと
// AI応答のパース処理。実際のAPI呼び出し(UrlFetchApp)はMain.js側(GAS専用)で行う。
// Phase2（docs/spec.md 15章）の最初のスコープとして、商品名・キャッチコピーのみを対象にする。
//
// 方針（docs/spec.md 8章・13章）：
// ・AIには必要な入力情報だけを渡し、出力項目を限定する
// ・対応機種・素材・価格などの事実情報は、渡した情報の範囲でのみ使わせ、
//   AIが勝手に追加・変更しないよう注意事項として明記する
// ・出力はJSON形式に固定し、後続処理でパースしやすくする

/**
 * ある代表商品コードに属する商品マスター行と、「AI生成」シートの補足情報行から、
 * プロンプトに使う情報をまとめる。
 *
 * @param {Array<Object>} masterRowsForCode 同じ代表商品コードに属する商品マスター行の配列
 * @param {Object} [aiInputRow] 「AI生成」シートの該当行（特徴・素材等の人力補足情報。無ければ省略可）
 */
function buildAiInputSummary(masterRowsForCode, aiInputRow) {
  var rows = masterRowsForCode || [];
  var input = aiInputRow || {};
  var sampleRow = rows[0] || {};

  return {
    currentProductName: sampleRow['商品名'] || '',
    kishu: uniqueNonEmpty_(rows.map(function (r) { return r['機種']; })),
    color: uniqueNonEmpty_(rows.map(function (r) { return r['カラー']; })),
    tags: sampleRow['商品タグ'] || '',
    price: sampleRow['販売価格'] || '',
    features: input['特徴'] || '',
    material: input['素材'] || '',
    compatibleModels: input['対応機種'] || '',
    accessories: input['付属品'] || '',
    options: input['オプション'] || '',
    note: input['その他メモ'] || '',
  };
}

/**
 * buildAiInputSummaryの結果から、Claudeへ渡すプロンプト文字列を組み立てる。
 */
function buildProductNamePrompt(summary) {
  var lines = [];
  lines.push('あなたは楽天市場の商品ページ担当者です。以下の商品情報をもとに、楽天市場に掲載する「商品名」と「キャッチコピー」を作成してください。');
  lines.push('');
  lines.push('# 商品情報');
  lines.push('現行の商品名: ' + orNone_(summary.currentProductName));
  lines.push('機種: ' + (summary.kishu.length ? summary.kishu.join('、') : '(なし)'));
  lines.push('カラー: ' + (summary.color.length ? summary.color.join('、') : '(なし)'));
  lines.push('特徴: ' + orNone_(summary.features));
  lines.push('素材: ' + orNone_(summary.material));
  lines.push('対応機種: ' + orNone_(summary.compatibleModels));
  lines.push('付属品: ' + orNone_(summary.accessories));
  lines.push('オプション: ' + orNone_(summary.options));
  lines.push('価格: ' + orNone_(summary.price));
  lines.push('商品タグ: ' + orNone_(summary.tags));
  if (summary.note) {
    lines.push('その他メモ: ' + summary.note);
  }
  lines.push('');
  lines.push('# 出力形式');
  lines.push('説明や前置き、コードブロックの記号（```等）を一切含めず、以下のJSON形式のみを出力してください。');
  lines.push('{"product_name": "商品名", "catch_copy": "キャッチコピー"}');
  lines.push('');
  lines.push('# 注意事項');
  lines.push('・対応機種、素材、価格、セット内容など事実に関わる情報は、上記の商品情報にある内容だけを使い、勝手に追加・変更しないこと。');
  lines.push('・商品名には検索されやすいキーワード（機種名・カラー等）を含めること。');
  lines.push('・キャッチコピーは30文字前後を目安にすること。');
  return lines.join('\n');
}

/**
 * Claudeからの応答テキストをパースし、商品名・キャッチコピーを取り出す。
 * 前後に説明文やコードブロックが付いていてもJSON部分だけを抽出する。
 */
function parseAiTextResponse(responseText) {
  var jsonText = extractJsonObject_(responseText);
  var parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (e) {
    throw new Error('AIの応答をJSONとして解析できませんでした: ' + responseText);
  }
  if (!parsed.product_name || !parsed.catch_copy) {
    throw new Error('AIの応答にproduct_name/catch_copyが含まれていません: ' + responseText);
  }
  return {
    productName: String(parsed.product_name).trim(),
    catchCopy: String(parsed.catch_copy).trim(),
  };
}

function extractJsonObject_(text) {
  var match = String(text).match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error('AIの応答からJSONオブジェクトが見つかりませんでした: ' + text);
  }
  return match[0];
}

function orNone_(value) {
  return value ? value : '(なし)';
}

function uniqueNonEmpty_(values) {
  var seen = {};
  var result = [];
  values.forEach(function (v) {
    if (!v || seen[v]) return;
    seen[v] = true;
    result.push(v);
  });
  return result;
}

if (typeof module !== 'undefined') {
  module.exports = {
    buildAiInputSummary: buildAiInputSummary,
    buildProductNamePrompt: buildProductNamePrompt,
    parseAiTextResponse: parseAiTextResponse,
  };
}
