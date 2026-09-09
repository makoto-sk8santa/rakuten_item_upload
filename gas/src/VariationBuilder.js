// 商品マスターの1行から、楽天のバリエーション4軸（Key0〜Key3）を組み立てる。
if (typeof require !== 'undefined') {
  var SkuRules = require('./SkuRules');
  var _VBConfig = require('./Config');
  var KISHU_LABEL_BY_SIZE_CODE = _VBConfig.KISHU_LABEL_BY_SIZE_CODE;
  var COLOR_LABEL_BY_CODE = _VBConfig.COLOR_LABEL_BY_CODE;
  var parseProductCode = SkuRules.parseProductCode;
  var getAdditionalOptionLabel = SkuRules.getAdditionalOptionLabel;
  var getSetOptionLabel = SkuRules.getSetOptionLabel;
}

/**
 * 商品マスターの1行（1SKU相当）から Key0〜Key3 の表示名を組み立てる。
 * 機種・カラーは商品マスターの文字列を直接使わず、Config の対応表を正として使う
 * （商品マスターの「カラー」列は表記ゆれがあるため。docs/data-analysis.md 4章）。
 */
function buildVariation(masterRow) {
  var parsed = parseProductCode(masterRow);

  var kishuLabel = KISHU_LABEL_BY_SIZE_CODE[parsed.sizeCode];
  if (!kishuLabel) {
    throw new Error(
      '未登録の機種(サイズコード)です: ' + parsed.sizeCode +
      '。Config.KISHU_LABEL_BY_SIZE_CODE に追加してください。'
    );
  }

  var colorLabel = COLOR_LABEL_BY_CODE[parsed.colorCode];
  if (!colorLabel) {
    throw new Error(
      '未登録のカラーコードです: ' + parsed.colorCode +
      '。Config.COLOR_LABEL_BY_CODE に追加してください。'
    );
  }

  return {
    Key0: kishuLabel,
    Key1: colorLabel,
    Key2: getAdditionalOptionLabel(parsed.suffix),
    Key3: getSetOptionLabel(parsed.suffix),
  };
}

if (typeof module !== 'undefined') {
  module.exports = {
    buildVariation: buildVariation,
  };
}
