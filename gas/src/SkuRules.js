// 商品マスターの「商品コード」を解析し、楽天SKU関連項目（システム連携用SKU番号、
// SKU管理番号、追加オプション／セットの判定、価格）を算出するロジック。
// GAS・Node.js の両方から読み込めるよう、Config の値は下記のガード節で取り込む。
// (GAS 上では Config.js が定義したグローバル変数をそのまま参照する)
if (typeof require !== 'undefined') {
  var _Config = require('./Config');
  var SKU_MANAGEMENT_NUMBER_RULE_BY_SIZE_CODE = _Config.SKU_MANAGEMENT_NUMBER_RULE_BY_SIZE_CODE;
  var DEFAULT_SKU_MANAGEMENT_NUMBER_RULE = _Config.DEFAULT_SKU_MANAGEMENT_NUMBER_RULE;
  var SKU_MANAGEMENT_NUMBER_OVERRIDES = _Config.SKU_MANAGEMENT_NUMBER_OVERRIDES;
  var PRICE_DISCOUNT_RATE = _Config.PRICE_DISCOUNT_RATE;
  var PRICE_DISPLAY_MULTIPLIER = _Config.PRICE_DISPLAY_MULTIPLIER;
  var PRICE_DISPLAY_ADDITION = _Config.PRICE_DISPLAY_ADDITION;
}

/**
 * 商品マスターの1行から、商品コードの構造（プレフィックス／接尾辞）を取り出す。
 * 商品コード = プレフィックス + サイズコード + カラーコード + 接尾辞 という構造になっている
 * ことを実データで確認済み（docs/data-analysis.md 2.1節）。
 */
function parseProductCode(masterRow) {
  var code = masterRow['商品コード'];
  var sizeCode = masterRow['サイズコード'];
  var colorCode = masterRow['カラーコード'];
  var key = sizeCode + colorCode;
  var idx = code.indexOf(key);
  if (idx === -1) {
    throw new Error(
      '商品コードの構造が想定と異なります。商品コード=' + code +
      ' サイズコード=' + sizeCode + ' カラーコード=' + colorCode
    );
  }
  return {
    prefix: code.slice(0, idx),
    sizeCode: sizeCode,
    colorCode: colorCode,
    suffix: code.slice(idx + key.length),
  };
}

/** システム連携用SKU番号 = 商品マスターの商品コードそのまま */
function getSystemLinkedSkuNumber(masterRow) {
  return masterRow['商品コード'];
}

/**
 * SKU管理番号を決定する。
 * - 既存登録済みSKU（options.existingSkuManagementNumber が渡された場合）は
 *   その値をそのまま返す。ルールで再計算し直して既存SKUの番号を変えてしまうと
 *   RMS上で別SKU扱いになる恐れがあるため。
 * - レガシーな例外（Config.SKU_MANAGEMENT_NUMBER_OVERRIDES）が存在する場合はそちらを優先。
 * - それ以外（新規SKU）は機種(サイズコード)ごとのルールに従って生成する。
 */
function getSkuManagementNumber(masterRow, options) {
  options = options || {};
  var systemLinkedSkuNumber = getSystemLinkedSkuNumber(masterRow);

  if (Object.prototype.hasOwnProperty.call(SKU_MANAGEMENT_NUMBER_OVERRIDES, systemLinkedSkuNumber)) {
    return SKU_MANAGEMENT_NUMBER_OVERRIDES[systemLinkedSkuNumber];
  }
  if (options.existingSkuManagementNumber) {
    return options.existingSkuManagementNumber;
  }

  var sizeCode = masterRow['サイズコード'];
  var rule = SKU_MANAGEMENT_NUMBER_RULE_BY_SIZE_CODE[sizeCode] || DEFAULT_SKU_MANAGEMENT_NUMBER_RULE;
  if (rule === 'suffix5') return systemLinkedSkuNumber + '5';
  if (rule === 'identity') return systemLinkedSkuNumber;
  throw new Error('未知のSKU管理番号ルールです: ' + rule);
}

/** 商品コードの接尾辞（"-P-9H" 等）に指定トークンが含まれるか判定する */
function hasSuffixToken(suffix, token) {
  return suffix.split('-').indexOf(token) !== -1;
}

/** Key2（追加オプション＝名入れ）の表示名を接尾辞から判定する */
function getAdditionalOptionLabel(suffix) {
  if (hasSuffixToken(suffix, 'P')) return '名入れあり(内容を入力して下さい)';
  if (hasSuffixToken(suffix, 'MG')) return '名入れ無しマグネットリング付き';
  return '名入れ無し';
}

/** Key3（お得なセット）の表示名を接尾辞から判定する */
function getSetOptionLabel(suffix) {
  if (hasSuffixToken(suffix, '9H')) return 'ケース&ガラスフィルムセット';
  return 'ケース単品';
}

/**
 * 「名入れあり」(接尾辞に P を含む)SKUかどうか。
 * このグループは実データ上、価格計算式が一部成立しないケースがあるため
 * 価格の自動計算結果を鵜呑みにせず要確認フラグを立てる対象。
 * 参照: docs/data-analysis.md 5.2節
 */
function isNamePersonalization(suffix) {
  return hasSuffixToken(suffix, 'P');
}

/**
 * 通常購入販売価格・表示価格を計算する。
 * isNamePersonalization な行は式が成立しない実例があるため reviewRequired=true を返す
 * （CSV出力前に人間の確認を必須にする）。
 */
function calcPrices(masterSalePrice, options) {
  options = options || {};
  var normal = Math.floor((masterSalePrice * PRICE_DISCOUNT_RATE) / 10) * 10;
  var display = normal * PRICE_DISPLAY_MULTIPLIER + PRICE_DISPLAY_ADDITION;
  return {
    normal: normal,
    display: display,
    reviewRequired: !!options.isNamePersonalization,
  };
}

if (typeof module !== 'undefined') {
  module.exports = {
    parseProductCode: parseProductCode,
    getSystemLinkedSkuNumber: getSystemLinkedSkuNumber,
    getSkuManagementNumber: getSkuManagementNumber,
    hasSuffixToken: hasSuffixToken,
    getAdditionalOptionLabel: getAdditionalOptionLabel,
    getSetOptionLabel: getSetOptionLabel,
    isNamePersonalization: isNamePersonalization,
    calcPrices: calcPrices,
  };
}
