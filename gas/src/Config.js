// SKU展開・価格計算に使う固定値テーブル。
// 将来的には Google スプレッドシート「設定・固定値マスター」シートに移し、
// ここでは初期値（今回の実データから抽出した値）を保持する。

// サイズコード(機種コード) -> バリエーション表示名（Key0）
var KISHU_LABEL_BY_SIZE_CODE = {
  '-01We2': 'arrows We2',
  '-02We2PLS': 'arrows We2 Plus',
  '-03We3': 'arrows We3',
};

// カラーコード -> バリエーション表示名（Key1）
//
// 注意: 商品マスターの「カラー」列は表記ゆれ・不整合がある
// （例: カラーコード -01IVY が「アイボリー」「ペールピンク」の両方で登録されている）。
// そのため商品マスターの「カラー」列は使わず、このテーブルを正として扱う。
// 値は今回の楽天CSV実データ（バリエーション項目選択肢2）から抽出したもの。
// 参照: docs/data-analysis.md 4章
var COLOR_LABEL_BY_CODE = {
  '-01IVY': '01.ペールピンク',
  '-02PNK': '02.ピンク',
  '-03PPL': '03.パープル',
  '-04GRN': '04.グリーン',
  '-05GRY': '05.グレー',
  '-06BLK': '06.ブラック',
  '-07BLU': '07.ブルー',
  '-08WHT-BG': '08.ホワイト/ベージュ',
  '-08WHT-BGE': '08.ホワイト/ベージュ',
  '-09BGE-BG': '09.ベージュ/ベージュ',
  '-09BGE-BGE': '09.ベージュ/ベージュ',
  '-10WHT-BL': '10.ホワイト/ブラック',
  '-10WHT-BLK': '10.ホワイト/ブラック',
  '-11APR': '11.アプリコット',
  '-12EGG': '12.エッグイエロー',
  '-13PCO': '13.ピスタチオ',
  '-14DSP': '14.ダスティピンク',
  '-15GBE': '15.グレージュ',
  '-16LiGRY': '16.ライトグレー',
};

// バリエーション項目キー・項目名（4軸固定）
var VARIATION_KEY_DEFINITION = 'Key0|Key1|Key2|Key3';
var VARIATION_NAME_DEFINITION = '機種|カラー|追加オプション|お得なセット';

// SKU管理番号：新規SKUは基本的に商品コード（システム連携用SKU番号）をそのまま使う。
// ユーザー確認済み（2026-09-09）。
// 既存登録済みSKUについては、番号を変えるとRMS上で別SKU扱いになりかねないため、
// 呼び出し側から options.existingSkuManagementNumber を渡して現在の値を保持する。
var DEFAULT_SKU_MANAGEMENT_NUMBER_RULE = 'identity';

// 既存登録済みSKUのうち、上記ルールに従わないレガシー値（過去の採番）。
// システム連携用SKU番号（=商品コード） -> 既存のSKU管理番号
var SKU_MANAGEMENT_NUMBER_OVERRIDES = {
  'f-bic-prt-01We2-01IVY': 'a003',
};

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
    KISHU_LABEL_BY_SIZE_CODE: KISHU_LABEL_BY_SIZE_CODE,
    COLOR_LABEL_BY_CODE: COLOR_LABEL_BY_CODE,
    VARIATION_KEY_DEFINITION: VARIATION_KEY_DEFINITION,
    VARIATION_NAME_DEFINITION: VARIATION_NAME_DEFINITION,
    DEFAULT_SKU_MANAGEMENT_NUMBER_RULE: DEFAULT_SKU_MANAGEMENT_NUMBER_RULE,
    SKU_MANAGEMENT_NUMBER_OVERRIDES: SKU_MANAGEMENT_NUMBER_OVERRIDES,
    DEFAULT_STOCK_COUNT: DEFAULT_STOCK_COUNT,
    IMAGE_TYPE: IMAGE_TYPE,
    FIRST_IMAGE_DIR: FIRST_IMAGE_DIR,
    OTHER_IMAGE_DIR: OTHER_IMAGE_DIR,
  };
}
