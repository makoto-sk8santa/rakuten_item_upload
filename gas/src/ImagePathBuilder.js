// 商品画像パスの組み立て。ユーザー確認済みの命名規則（2026-09-09）：
//   1枚目:     /top/{代表商品コード}.jpg
//   2枚目以降: /sumahoya10/{代表商品コード}_{連番}.jpg  （連番は2, 3, 4, ...）
//
// 画像の総枚数は商品マスターに情報が無いため、呼び出し側（スプレッドシート等）から
// 商品ごとの枚数を渡してもらう必要がある。実行のたびに枚数を尋ねるダイアログは、
// 複数商品をまとめて処理する際に毎回手が止まってしまうため採用しない。
// 代わりに、シート2「楽天登録対象」に商品ごとの「画像枚数」列を設け、
// 登録対象を選ぶタイミングで一度だけ人間が入力する運用を想定している。
if (typeof require !== 'undefined') {
  var _IP_Config = require('./Config');
  var IMAGE_TYPE = _IP_Config.IMAGE_TYPE;
  var FIRST_IMAGE_DIR = _IP_Config.FIRST_IMAGE_DIR;
  var OTHER_IMAGE_DIR = _IP_Config.OTHER_IMAGE_DIR;
}

/**
 * 画像1枚分のパスを組み立てる。
 * @param {string} representativeCode 代表商品コード（例: "f-bic-prt"）
 * @param {number} index 1始まりの画像連番
 */
function buildImagePath(representativeCode, index) {
  if (index === 1) {
    return FIRST_IMAGE_DIR + representativeCode + '.jpg';
  }
  return OTHER_IMAGE_DIR + representativeCode + '_' + index + '.jpg';
}

/**
 * 代表商品コードと画像枚数から、楽天CSVの「商品画像タイプN」「商品画像パスN」列を
 * まとめて組み立てる。
 * @param {string} representativeCode 代表商品コード
 * @param {number} imageCount 画像の総枚数（1以上）
 * @returns {Object} 例: { '商品画像タイプ1': 'CABINET', '商品画像パス1': '/top/xxx.jpg', ... }
 */
function buildImageColumns(representativeCode, imageCount) {
  if (!Number.isInteger(imageCount) || imageCount < 1) {
    throw new Error('画像枚数は1以上の整数で指定してください: ' + imageCount);
  }
  var columns = {};
  for (var i = 1; i <= imageCount; i++) {
    columns['商品画像タイプ' + i] = IMAGE_TYPE;
    columns['商品画像パス' + i] = buildImagePath(representativeCode, i);
  }
  return columns;
}

if (typeof module !== 'undefined') {
  module.exports = {
    buildImagePath: buildImagePath,
    buildImageColumns: buildImageColumns,
  };
}
