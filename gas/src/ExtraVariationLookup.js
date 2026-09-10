// 機種・カラー以外の追加バリエーション軸（タイプ、文字入れの有無、花種類、
// メタルアタッチメントを追加、など）を扱うためのロジック。
//
// 全商品マスターを確認したところ、36%の商品が機種・カラー以外の軸を必要としており、
// その軸名・選択肢は商品ごとに全く異なる語彙で、商品マスターの45列からは自動生成
// できないことが分かった（docs/data-analysis.md 12.3節(4)）。
//
// そのため、商品ごとに軸名と選択肢をあらかじめ「追加バリエーション設定」シートに
// 人力で登録しておき、SKU展開時にそこから読み込む方式にした（ユーザー確認済み。
// 2026-09-10）。シートの列構成：
//   商品コード, 追加軸1軸名, 追加軸1選択肢, 追加軸2軸名, 追加軸2選択肢
// 商品コードが完全一致する行が無ければ、追加軸は無いものとして扱う（エラーにしない）。

var MAX_EXTRA_AXES = 2;

/**
 * 「追加バリエーション設定」シートの1行から、追加軸の表示名を順番に並べた配列を組み立てる。
 * 軸名・選択肢のどちらかが空欄のペアは無視する。
 *
 * @param {Object} [extraVariationRow] 該当商品コードの行（無ければ undefined）
 * @returns {string[]} 追加軸の表示名の配列（機種・カラーの後ろに続ける想定）
 */
function buildExtraVariationLabels(extraVariationRow) {
  if (!extraVariationRow) return [];

  var labels = [];
  for (var i = 1; i <= MAX_EXTRA_AXES; i++) {
    var axisName = extraVariationRow['追加軸' + i + '軸名'];
    var label = extraVariationRow['追加軸' + i + '選択肢'];
    if (axisName && label) {
      labels.push(label);
    }
  }
  return labels;
}

/**
 * 「追加バリエーション設定」シートの全行から、商品コードをキーにした検索用マップを作る。
 */
function indexExtraVariationRowsByProductCode(extraVariationRows) {
  var byCode = {};
  extraVariationRows.forEach(function (row) {
    var code = row['商品コード'];
    if (code) {
      byCode[code] = row;
    }
  });
  return byCode;
}

if (typeof module !== 'undefined') {
  module.exports = {
    MAX_EXTRA_AXES: MAX_EXTRA_AXES,
    buildExtraVariationLabels: buildExtraVariationLabels,
    indexExtraVariationRowsByProductCode: indexExtraVariationRowsByProductCode,
  };
}
