// 商品マスターの1行から、楽天のバリエーション軸（Key0, Key1, ...）を組み立てる。
if (typeof require !== 'undefined') {
  var SkuRules = require('./SkuRules');
  var _VBConfig = require('./Config');
  var KISHU_LABEL_OVERRIDES = _VBConfig.KISHU_LABEL_OVERRIDES;
  var COLOR_LABEL_OVERRIDES = _VBConfig.COLOR_LABEL_OVERRIDES;
  var SUFFIX_OPTION_AXES_REPRESENTATIVE_CODES = _VBConfig.SUFFIX_OPTION_AXES_REPRESENTATIVE_CODES;
  var parseProductCode = SkuRules.parseProductCode;
  var getAdditionalOptionLabel = SkuRules.getAdditionalOptionLabel;
  var getSetOptionLabel = SkuRules.getSetOptionLabel;
}

/** "[arrows We2]" のような角括弧書きの値から括弧を取り除く */
function stripBrackets(text) {
  if (!text) return '';
  return String(text).replace(/^\[|\]$/g, '').trim();
}

/**
 * Config の上書き表に (代表商品コード, コード) の組み合わせがあればその表示名を、
 * 無ければ商品マスターの列の値（角括弧は除去）を、それも空ならコード自体を返す。
 */
function resolveLabel_(overrides, representativeCode, code, masterColumnValue) {
  var overrideKey = representativeCode + '|' + code;
  if (Object.prototype.hasOwnProperty.call(overrides, overrideKey)) {
    return overrides[overrideKey];
  }
  var fromMaster = stripBrackets(masterColumnValue);
  return fromMaster || code;
}

/**
 * 商品マスターの1行（1SKU相当）から、バリエーション軸の表示名を順番に並べた配列を組み立てる。
 *
 * 機種・カラーの表示名は商品マスターの「機種」「カラー」列の値をそのまま使うのが既定。
 * 全商品マスターを確認したところ、コードごとに表示名を手動登録する固定表では
 * 現実的に対応しきれない規模（628種のサイズコード・740種のカラーコード）だったため
 * （2026-09-10）。ごく一部の確認済みの表記ゆれだけ Config の上書き表で個別に直す。
 *
 * 「サイズコード」「カラーコード」が空欄の軸は、その軸自体が無い商品として扱いスキップする
 * （機種のバリエーションが無くカラーのみの商品、逆に色展開もない単一商品などが実データに
 * 存在することを確認済み。docs/data-analysis.md 3.1節）。
 *
 * @returns {string[]} バリエーション軸の表示名を先頭(Key0)から並べた配列
 */
function buildVariation(masterRow) {
  var parsed = parseProductCode(masterRow);
  var representativeCode = masterRow['代表商品コード'] || '';
  var labels = [];

  if (parsed.sizeCode) {
    labels.push(resolveLabel_(KISHU_LABEL_OVERRIDES, representativeCode, parsed.sizeCode, masterRow['機種'] || masterRow['サイズ']));
  }

  if (parsed.colorCode) {
    labels.push(resolveLabel_(COLOR_LABEL_OVERRIDES, representativeCode, parsed.colorCode, masterRow['カラー']));
  }

  // 追加オプション（名入れ）・お得なセットの軸は、商品コード接尾辞のP/MG/9Hトークン規則から
  // 判定しているが、この規則は Config.SUFFIX_OPTION_AXES_REPRESENTATIVE_CODES に
  // 登録された代表商品コードの商品にだけ適用する。全商品マスターを確認したところ、
  // この規則を無条件に適用すると約8%の商品で無関係な接尾辞を誤検出することが分かった
  // ため（docs/data-analysis.md 11章）、未登録の商品群ではこの2軸を出力しない。
  if (SUFFIX_OPTION_AXES_REPRESENTATIVE_CODES.indexOf(representativeCode) !== -1) {
    labels.push(getAdditionalOptionLabel(parsed.suffix));
    labels.push(getSetOptionLabel(parsed.suffix));
  }

  return labels;
}

if (typeof module !== 'undefined') {
  module.exports = {
    buildVariation: buildVariation,
    stripBrackets: stripBrackets,
  };
}
