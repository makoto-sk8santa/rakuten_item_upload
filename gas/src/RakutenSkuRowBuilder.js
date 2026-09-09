// 商品マスターの1行から、楽天CSVのSKU行（区分A・Bに分類された列のみ）を組み立てる。
// 区分C（固定値）・区分D（AI生成）・区分E（人間確認）の列は Phase1 の対象外。
// 参照: docs/reference/column-mapping.csv, docs/data-analysis.md
if (typeof require !== 'undefined') {
  var _RB_SkuRules = require('./SkuRules');
  var _RB_VariationBuilder = require('./VariationBuilder');
  var getSystemLinkedSkuNumber = _RB_SkuRules.getSystemLinkedSkuNumber;
  var getSkuManagementNumber = _RB_SkuRules.getSkuManagementNumber;
  var isNamePersonalization = _RB_SkuRules.isNamePersonalization;
  var calcPrices = _RB_SkuRules.calcPrices;
  var parseProductCode = _RB_SkuRules.parseProductCode;
  var buildVariation = _RB_VariationBuilder.buildVariation;
}

/**
 * 商品マスターの1行から楽天SKU行を組み立てる。
 *
 * @param {Object} masterRow 商品マスターの1行（列名をキーとするオブジェクト）
 * @param {Object} [options]
 * @param {string} [options.existingSkuManagementNumber] 既に楽天に登録済みのSKU管理番号。
 *   渡された場合は再計算せずそのまま使う（既存SKUの番号を変えないため）。
 * @returns {Object} { row, warnings }
 *   row: 楽天CSVの列名をキーとする値（区分A・Bのみ）
 *   warnings: 自動計算結果を鵜呑みにせず人間の確認が必要な項目のメッセージ一覧
 */
function buildSkuRow(masterRow, options) {
  options = options || {};
  var warnings = [];

  var systemLinkedSkuNumber = getSystemLinkedSkuNumber(masterRow);
  var skuManagementNumber = getSkuManagementNumber(masterRow, options);
  var variation = buildVariation(masterRow);
  var parsed = parseProductCode(masterRow);

  var salePrice = Number(masterRow['販売価格']);
  if (!isFinite(salePrice) || salePrice <= 0) {
    warnings.push('販売価格が不正です(商品コード=' + masterRow['商品コード'] + '): ' + masterRow['販売価格']);
  }
  var prices = calcPrices(salePrice, { isNamePersonalization: isNamePersonalization(parsed.suffix) });
  if (prices.reviewRequired) {
    warnings.push(
      '「名入れあり」SKUのため価格式が実データと一致しない例があります。金額を人間が確認してください(商品コード=' +
      masterRow['商品コード'] + ', 自動計算した通常購入販売価格=' + prices.normal + ')。docs/data-analysis.md 5.2節参照。'
    );
  }

  var row = {
    'システム連携用SKU番号': systemLinkedSkuNumber,
    'SKU管理番号': skuManagementNumber,
    'バリエーション項目キー1': 'Key0',
    'バリエーション項目選択肢1': variation.Key0,
    'バリエーション項目キー2': 'Key1',
    'バリエーション項目選択肢2': variation.Key1,
    'バリエーション項目キー3': 'Key2',
    'バリエーション項目選択肢3': variation.Key2,
    'バリエーション項目キー4': 'Key3',
    'バリエーション項目選択肢4': variation.Key3,
    '通常購入販売価格': prices.normal,
    '表示価格': prices.display,
    'カタログID': masterRow['識別コード'] || '',
  };

  return { row: row, warnings: warnings };
}

if (typeof module !== 'undefined') {
  module.exports = {
    buildSkuRow: buildSkuRow,
  };
}
