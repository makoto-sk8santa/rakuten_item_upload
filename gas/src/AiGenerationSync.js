// 「AI生成」シートに追加する1行分のデフォルト値を組み立てる。
// 「楽天登録対象」がTRUEの代表商品コードのうち、まだ「AI生成」シートに無いものを
// 追加する際に使う（TargetSync.getUniqueRepresentativeCodes等の差分ロジックを流用する）。

/**
 * 「AI生成」シートに追加する1行分のデフォルト値を組み立てる。
 * ステータスは「未生成」で追加し、特徴・素材等の補足情報は空欄のまま
 * （人間が入力してからAI生成を実行する運用。docs/spec.md シート4参照）。
 */
function buildAiGenerationRow(representativeCode) {
  return {
    '代表商品コード': representativeCode,
    '特徴': '',
    '素材': '',
    '対応機種': '',
    '付属品': '',
    'オプション': '',
    'その他メモ': '',
    '生成商品名': '',
    '生成キャッチコピー': '',
    'ステータス': '未生成',
    '最終生成日時': '',
  };
}

if (typeof module !== 'undefined') {
  module.exports = {
    buildAiGenerationRow: buildAiGenerationRow,
  };
}
