// 商品マスターの「代表商品コード」から、「楽天登録対象」シートに追加すべき
// 候補行を洗い出すロジック。商品マスターは1年分蓄積されていく想定なので、
// 「楽天登録対象」は毎回全件表示せず、まだ載っていない代表商品コードだけを
// 候補として追加する（差分追加）。

/**
 * 商品マスターの行一覧から、ユニークな代表商品コードを最初に登場した順で取り出す。
 */
function getUniqueRepresentativeCodes(masterRows) {
  var seen = {};
  var codes = [];
  masterRows.forEach(function (row) {
    var code = row['代表商品コード'];
    if (!code || seen[code]) return;
    seen[code] = true;
    codes.push(code);
  });
  return codes;
}

/**
 * 商品マスターに存在するが、「楽天登録対象」シートにまだ無い代表商品コードを返す。
 * @param {Array<Object>} masterRows 商品マスターの行一覧
 * @param {Array<string>} existingTargetCodes 「楽天登録対象」シートに既にある代表商品コード一覧
 */
function getMissingRepresentativeCodes(masterRows, existingTargetCodes) {
  var existing = {};
  existingTargetCodes.forEach(function (code) {
    existing[code] = true;
  });
  return getUniqueRepresentativeCodes(masterRows).filter(function (code) {
    return !existing[code];
  });
}

/**
 * 「楽天登録対象」シートに追加する1行分のデフォルト値を組み立てる。
 * 登録対象はFALSEのまま追加するので、実際に処理したい商品だけ人間がTRUEにする。
 */
function buildTargetRow(representativeCode) {
  return {
    '登録対象': 'FALSE',
    '代表商品コード': representativeCode,
    '商品管理番号': representativeCode,
    '商品ページ状態': '新規',
    'AI生成': '未生成',
    'CSV出力': '未出力',
    '最終確認': '',
    '画像枚数': '',
  };
}

if (typeof module !== 'undefined') {
  module.exports = {
    getUniqueRepresentativeCodes: getUniqueRepresentativeCodes,
    getMissingRepresentativeCodes: getMissingRepresentativeCodes,
    buildTargetRow: buildTargetRow,
  };
}
