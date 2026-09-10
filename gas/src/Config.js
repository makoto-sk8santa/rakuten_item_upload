// SKU展開・価格計算に使う固定値テーブル。
// 将来的には Google スプレッドシート「設定・固定値マスター」シートに移し、
// ここでは初期値（今回の実データから抽出した値）を保持する。

// 機種・カラーの表示名は、商品マスターの「機種」「カラー」列の値をそのまま使うのが既定。
// 全商品マスター（1622商品・628種のサイズコード・740種のカラーコードを確認。2026-09-10）
// を見ると、コードごとに表示名を手動登録するConfigの固定表を取っていた旧方式は現実的で
// ない規模だったため、この方針に変更した。
//
// ただし商品マスターの表記をそのまま信用できない場合もある。実際に楽天へ登録された
// 表示名で確認済みの代表商品コードについては、下記のようにピンポイントで上書きする。
// キーは "代表商品コード|コード"。docs/data-analysis.md 4章・11章参照。
var KISHU_LABEL_OVERRIDES = {
};

// f-bic-prt: 実際の楽天CSVでは色名の先頭に "NN." という連番が付く表記になっており
// （例: -01IVY → "01.ペールピンク"）、商品マスターの「カラー」列にはこの連番が無いため
// （さらに -01IVY だけは商品マスター内でも「アイボリー」と表記が割れている）、
// 検証済みの19色すべてを明示的に上書きしている。
var COLOR_LABEL_OVERRIDES = {
  'f-bic-prt|-01IVY': '01.ペールピンク',
  'f-bic-prt|-02PNK': '02.ピンク',
  'f-bic-prt|-03PPL': '03.パープル',
  'f-bic-prt|-04GRN': '04.グリーン',
  'f-bic-prt|-05GRY': '05.グレー',
  'f-bic-prt|-06BLK': '06.ブラック',
  'f-bic-prt|-07BLU': '07.ブルー',
  'f-bic-prt|-08WHT-BG': '08.ホワイト/ベージュ',
  'f-bic-prt|-08WHT-BGE': '08.ホワイト/ベージュ',
  'f-bic-prt|-09BGE-BG': '09.ベージュ/ベージュ',
  'f-bic-prt|-09BGE-BGE': '09.ベージュ/ベージュ',
  'f-bic-prt|-10WHT-BL': '10.ホワイト/ブラック',
  'f-bic-prt|-10WHT-BLK': '10.ホワイト/ブラック',
  'f-bic-prt|-11APR': '11.アプリコット',
  'f-bic-prt|-12EGG': '12.エッグイエロー',
  'f-bic-prt|-13PCO': '13.ピスタチオ',
  'f-bic-prt|-14DSP': '14.ダスティピンク',
  'f-bic-prt|-15GBE': '15.グレージュ',
  'f-bic-prt|-16LiGRY': '16.ライトグレー',
};

// 「追加オプション(名入れ)」「お得なセット」の軸は、商品コード接尾辞のP/MG/9Hトークンから
// 判定している（docs/data-analysis.md 6.2節・11章）。このルールは f-bic-prt 等ごく一部
// （全商品マスターの中の約3.6%）でしか確認できておらず、他の商品にそのまま当てはめると
// 誤ったバリエーション名を作ってしまう（実データで検証済み。約8%の商品で接尾辞の
// トークンを誤検出する）。そのため、この配列に登録された代表商品コードの商品にだけ
// 適用する。他の商品群でも同じ命名規則を使っている場合はここに追加すること。
var SUFFIX_OPTION_AXES_REPRESENTATIVE_CODES = [
  'f-bic-prt',
];

// バリエーション項目キー・項目名（4軸固定）
var VARIATION_KEY_DEFINITION = 'Key0|Key1|Key2|Key3';
var VARIATION_NAME_DEFINITION = '機種|カラー|追加オプション|お得なセット';

// SKU管理番号：新規登録なので商品コード（システム連携用SKU番号）をそのまま使う
// （SkuRules.js の getSkuManagementNumber）。ユーザー確認済み（2026-09-09）。
// このシステムは新規商品登録のみを対象とし、既に楽天に登録済みの商品を
// 再アップロードする運用は想定しないため、既存値を保持する仕組みは設けていない。

// 価格：通常購入販売価格・表示価格ともに商品マスターの「販売価格」をそのまま使う。
// （ダウンロード時点の楽天CSVはセール中で一時的に値引き後の価格になっていたため、
//  そちらの数式は採用しない。ユーザー確認済み。docs/data-analysis.md 5章参照）

// 在庫数：商品マスターに在庫列が無いため、登録時は一律0固定とする。
// 商品ページ公開後、倉庫システムとのAPI連携で自動的に実在庫数へ更新される。
// ユーザー確認済み。docs/data-analysis.md 7章参照。
var DEFAULT_STOCK_COUNT = 0;

// 商品画像パスの規則。ユーザー確認済み（2026-09-09）。
//   1枚目:     /top/{代表商品コード}.jpg
//   2枚目以降: /sumahoya10/{代表商品コード}_{連番}.jpg  （連番は2, 3, 4, ...）
// 画像の総枚数は商品マスターに情報が無いため、シート2「楽天登録対象」等に
// 商品ごとの「画像枚数」列を設けて人間が入力する運用とする
// （実行のたびに枚数を尋ねるダイアログは、複数商品をまとめて処理する際に
//  手が止まってしまうため採用しない）。docs/data-analysis.md 9章参照。
var IMAGE_TYPE = 'CABINET';
var FIRST_IMAGE_DIR = '/top/';
var OTHER_IMAGE_DIR = '/sumahoya10/';

if (typeof module !== 'undefined') {
  module.exports = {
    KISHU_LABEL_OVERRIDES: KISHU_LABEL_OVERRIDES,
    COLOR_LABEL_OVERRIDES: COLOR_LABEL_OVERRIDES,
    SUFFIX_OPTION_AXES_REPRESENTATIVE_CODES: SUFFIX_OPTION_AXES_REPRESENTATIVE_CODES,
    VARIATION_KEY_DEFINITION: VARIATION_KEY_DEFINITION,
    VARIATION_NAME_DEFINITION: VARIATION_NAME_DEFINITION,
    DEFAULT_STOCK_COUNT: DEFAULT_STOCK_COUNT,
    IMAGE_TYPE: IMAGE_TYPE,
    FIRST_IMAGE_DIR: FIRST_IMAGE_DIR,
    OTHER_IMAGE_DIR: OTHER_IMAGE_DIR,
  };
}
