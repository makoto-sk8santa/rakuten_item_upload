// 商品マスターの1行から、楽天CSVのSKU行（区分A・Bに分類された列のみ）を組み立てる。
// 区分C（固定値）・区分D（AI生成）・区分E（人間確認）の列は Phase1 の対象外。
// 参照: docs/reference/column-mapping.csv, docs/data-analysis.md
if (typeof require !== 'undefined') {
  var _RB_SkuRules = require('./SkuRules');
  var _RB_VariationBuilder = require('./VariationBuilder');
  var _RB_Config = require('./Config');
  var getSystemLinkedSkuNumber = _RB_SkuRules.getSystemLinkedSkuNumber;
  var getSkuManagementNumber = _RB_SkuRules.getSkuManagementNumber;
  var calcPrices = _RB_SkuRules.calcPrices;
  var buildVariation = _RB_VariationBuilder.buildVariation;
  var DEFAULT_STOCK_COUNT = _RB_Config.DEFAULT_STOCK_COUNT;
}

/**
 * 商品マスターの1行から楽天SKU行を組み立てる。新規商品登録のみを対象とする
 * （既に楽天に登録済みの商品の再アップロードは想定しない。ユーザー確認済み）。
 *
 * @param {Object} masterRow 商品マスターの1行（列名をキーとするオブジェクト）
 * @returns {Object} { row, warnings }
 *   row: 楽天CSVの列名をキーとする値（区分A・Bのみ）
 *   warnings: 自動計算結果を鵜呑みにせず人間の確認が必要な項目のメッセージ一覧
 */
function buildSkuRow(masterRow) {
  var warnings = [];

  var systemLinkedSkuNumber = getSystemLinkedSkuNumber(masterRow);
  var skuManagementNumber = getSkuManagementNumber(masterRow);
  // 機種のバリエーション軸が無い商品(カラーバリエーションのみ等)では配列の要素数が
  // 少なくなる。先頭からKey0, Key1, ...として詰めて割り当てる。
  var variationLabels = buildVariation(masterRow);

  var salePrice = Number(masterRow['販売価格']);
  if (!isFinite(salePrice) || salePrice <= 0) {
    warnings.push('販売価格が不正です(商品コード=' + masterRow['商品コード'] + '): ' + masterRow['販売価格']);
  }
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
