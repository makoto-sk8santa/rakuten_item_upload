// 商品マスターの1行から、楽天CSVのSKU行（区分A・Bに分類された列のみ）を組み立てる。
// 区分C（固定値）・区分D（AI生成）・区分E（人間確認）の列は Phase1 の対象外。
// 参照: docs/reference/column-mapping.csv, docs/data-analysis.md
if (typeof require !== 'undefined') {
  var _RB_SkuRules = require('./SkuRules');
  var _RB_VariationBuilder = require('./VariationBuilder');
  var _RB_Config = require('./Config');
  var _RB_ExtraVariationLookup = require('./ExtraVariationLookup');
  var getSystemLinkedSkuNumber = _RB_SkuRules.getSystemLinkedSkuNumber;
  var getSkuManagementNumber = _RB_SkuRules.getSkuManagementNumber;
  var calcPrices = _RB_SkuRules.calcPrices;
  var buildVariation = _RB_VariationBuilder.buildVariation;
  var DEFAULT_STOCK_COUNT = _RB_Config.DEFAULT_STOCK_COUNT;
  var buildExtraVariationLabels = _RB_ExtraVariationLookup.buildExtraVariationLabels;
}

/**
 * 商品マスターの1行から楽天SKU行を組み立てる。新規商品登録のみを対象とする
 * （既に楽天に登録済みの商品の再アップロードは想定しない。ユーザー確認済み）。
 *
 * @param {Object} masterRow 商品マスターの1行（列名をキーとするオブジェクト）
 * @param {Object} [extraVariationRow] 「追加バリエーション設定」シートで、この商品コードに
 *   一致した行（無ければ省略可）。機種・カラー以外の軸（タイプ、文字入れの有無等）を
 *   人力で登録しておくための仕組み。docs/data-analysis.md 12.3節(4)参照。
 * @returns {Object} { row, warnings }
 *   row: 楽天CSVの列名をキーとする値（区分A・Bのみ）
 *   warnings: 自動計算結果を鵜呑みにせず人間の確認が必要な項目のメッセージ一覧
 */
function buildSkuRow(masterRow, extraVariationRow) {
  var warnings = [];

  // 商品マスターには「通常商品」区分のまま販売価格が空欄の行が多数存在する
  // （セット商品を組み立てるための部品行で、単体では販売対象ではない。実データで
  // 全38,341行中12,687行=約33%を確認。docs/data-analysis.md 11章）。
  // 誤って0円のSKUとして出力しないよう、価格が空欄・不正な行はエラーとして
  // 呼び出し側(Main.jsのrunSkuExpansion)でスキップする。
  var salePriceRaw = masterRow['販売価格'];
  var salePrice = Number(salePriceRaw);
  if (!String(salePriceRaw).trim() || !isFinite(salePrice) || salePrice <= 0) {
    throw new Error(
      '販売価格が空欄または不正です(商品コード=' + masterRow['商品コード'] + '): "' + salePriceRaw + '"。' +
      '部品行など販売対象ではない可能性があります。'
    );
  }

  var systemLinkedSkuNumber = getSystemLinkedSkuNumber(masterRow);
  var skuManagementNumber = getSkuManagementNumber(masterRow);
  // 機種のバリエーション軸が無い商品(カラーバリエーションのみ等)では配列の要素数が
  // 少なくなる。先頭からKey0, Key1, ...として詰めて割り当てる。
  // 「追加バリエーション設定」シートに登録があれば、機種・カラー(・接尾辞由来の軸)の
  // 後ろに、タイプ等の追加軸を続けて割り当てる。
  var variationLabels = buildVariation(masterRow).concat(buildExtraVariationLabels(extraVariationRow));
  var prices = calcPrices(salePrice);

  var row = {
    'システム連携用SKU番号': systemLinkedSkuNumber,
    'SKU管理番号': skuManagementNumber,
    '通常購入販売価格': prices.normal,
    '表示価格': prices.display,
    '在庫数': DEFAULT_STOCK_COUNT,
    'カタログID': masterRow['識別コード'] || '',
  };
  variationLabels.forEach(function (label, i) {
    row['バリエーション項目キー' + (i + 1)] = 'Key' + i;
    row['バリエーション項目選択肢' + (i + 1)] = label;
  });

  return { row: row, warnings: warnings };
}

if (typeof module !== 'undefined') {
  module.exports = {
    buildSkuRow: buildSkuRow,
  };
}
