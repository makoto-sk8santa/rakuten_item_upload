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

// SKU管理番号の生成ルール。
//   'suffix5'  : システム連携用SKU番号 + "5"
//   'identity' : システム連携用SKU番号のまま
// 実データでは機種(サイズコード)ごとに規則が異なる（arrows We2/We2 Plus は suffix5、
// 最新機種の arrows We3 は identity）。
// 参照: docs/data-analysis.md 2.2節
var SKU_MANAGEMENT_NUMBER_RULE_BY_SIZE_CODE = {
  '-01We2': 'suffix5',
  '-02We2PLS': 'suffix5',
  '-03We3': 'identity',
};

// 上記テーブルに無い新しい機種が来た場合のデフォルトルール。
// 現状は直近の実績（arrows We3 = identity）に合わせているが、
// 新機種追加のたびに実際の運用ルールを確認すること。
var DEFAULT_SKU_MANAGEMENT_NUMBER_RULE = 'identity';

// 既存登録済みSKUのうち、上記ルールに従わないレガシー値。
// システム連携用SKU番号（=商品コード） -> 既存のSKU管理番号
var SKU_MANAGEMENT_NUMBER_OVERRIDES = {
  'f-bic-prt-01We2-01IVY': 'a003',
};

// 価格計算式のパラメータ。
// 通常購入販売価格 = floor(販売価格 * PRICE_DISCOUNT_RATE / 10) * 10
// 表示価格         = 通常購入販売価格 * PRICE_DISPLAY_MULTIPLIER + PRICE_DISPLAY_ADDITION
// 参照: docs/data-analysis.md 5章（「名入れあり」オプションの一部で例外あり、要確認）
var PRICE_DISCOUNT_RATE = 0.9;
var PRICE_DISPLAY_MULTIPLIER = 2;
var PRICE_DISPLAY_ADDITION = 10;

if (typeof module !== 'undefined') {
  module.exports = {
    KISHU_LABEL_BY_SIZE_CODE: KISHU_LABEL_BY_SIZE_CODE,
    COLOR_LABEL_BY_CODE: COLOR_LABEL_BY_CODE,
    VARIATION_KEY_DEFINITION: VARIATION_KEY_DEFINITION,
    VARIATION_NAME_DEFINITION: VARIATION_NAME_DEFINITION,
    SKU_MANAGEMENT_NUMBER_RULE_BY_SIZE_CODE: SKU_MANAGEMENT_NUMBER_RULE_BY_SIZE_CODE,
    DEFAULT_SKU_MANAGEMENT_NUMBER_RULE: DEFAULT_SKU_MANAGEMENT_NUMBER_RULE,
    SKU_MANAGEMENT_NUMBER_OVERRIDES: SKU_MANAGEMENT_NUMBER_OVERRIDES,
    PRICE_DISCOUNT_RATE: PRICE_DISCOUNT_RATE,
    PRICE_DISPLAY_MULTIPLIER: PRICE_DISPLAY_MULTIPLIER,
    PRICE_DISPLAY_ADDITION: PRICE_DISPLAY_ADDITION,
  };
}
