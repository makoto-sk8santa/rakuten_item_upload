// 商品マスターの1行から、楽天のバリエーション軸（Key0, Key1, ...）を組み立てる。
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
 * 商品マスターの1行（1SKU相当）から、バリエーション軸の表示名を順番に並べた配列を組み立てる。
 * 機種・カラーは商品マスターの文字列を直接使わず、Config の対応表を正として使う
 * （商品マスターの「カラー」列は表記ゆれがあるため。docs/data-analysis.md 4章）。
 *
 * 「サイズコード」が空欄の商品は機種のバリエーション軸自体が無いもの（カラーバリエーション
 * のみの商品など）として扱い、機種の軸を配列に含めない。ユーザー確認済み（2026-09-10）。
 * 呼び出し側（RakutenSkuRowBuilder）は、返ってきた配列の先頭からKey0, Key1, ...として
 * 詰めて割り当てる。
 *
 * @returns {string[]} バリエーション軸の表示名を先頭(Key0)から並べた配列
 */
function buildVariation(masterRow) {
  var parsed = parseProductCode(masterRow);
  var labels = [];

  if (parsed.sizeCode) {
    var kishuLabel = KISHU_LABEL_BY_SIZE_CODE[parsed.sizeCode];
    if (!kishuLabel) {
      throw new Error(
        '未登録の機種(サイズコード)です: "' + parsed.sizeCode + '"' +
        '(商品コード=' + masterRow['商品コード'] + ')。Config.KISHU_LABEL_BY_SIZE_CODE に追加してください。'
      );
    }
    labels.push(kishuLabel);
  }

  var colorLabel = COLOR_LABEL_BY_CODE[parsed.colorCode];
  if (!colorLabel) {
    throw new Error(
      '未登録のカラーコードです: "' + parsed.colorCode + '"' +
      '(商品コード=' + masterRow['商品コード'] + ')。' +
      (parsed.colorCode ? 'Config.COLOR_LABEL_BY_CODE に追加してください。' :
        '商品マスターの「カラーコード」列が空欄になっています。')
    );
  }
  labels.push(colorLabel);

  labels.push(getAdditionalOptionLabel(parsed.suffix));
  labels.push(getSetOptionLabel(parsed.suffix));

  return labels;
}

if (typeof module !== 'undefined') {
  module.exports = {
    buildVariation: buildVariation,
  };
}
