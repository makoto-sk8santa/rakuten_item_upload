// Google スプレッドシート上のエントリーポイント。
// このファイルは GAS 上でのみ動作する（SpreadsheetApp を使用するため Node ではテストしない）。
// ロジック本体（SkuRules / VariationBuilder / RakutenSkuRowBuilder）は
// 純粋な関数として実装しており、gas/test 配下で Node.js から直接テストできる。

var MASTER_SHEET_NAME = '商品マスター';
var TARGET_SHEET_NAME = '楽天登録対象';
var OUTPUT_SHEET_NAME = '楽天SKU展開';

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('楽天登録データ作成')
    .addItem('SKU展開を実行', 'runSkuExpansion')
    .addToUi();
}

/**
 * 「商品マスター」シートを読み込み、「楽天登録対象」シートでONになっている
 * 代表商品コードに属する行だけを対象に、SKU行（区分A・Bの列）を計算して
 * 「楽天SKU展開」シートに書き出す。
 *
 * 区分C（固定値）・D（AI生成）・E（人間確認）の列は Sheet5「楽天CSV出力」側で
 * 別途合成する想定（本ファイルでは未実装。Phase1の残タスク）。
 */
function runSkuExpansion() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var masterSheet = ss.getSheetByName(MASTER_SHEET_NAME);
  var targetSheet = ss.getSheetByName(TARGET_SHEET_NAME);
  if (!masterSheet || !targetSheet) {
    throw new Error('「' + MASTER_SHEET_NAME + '」または「' + TARGET_SHEET_NAME + '」シートが見つかりません。');
  }

  var targetCodes = readTargetRepresentativeCodes_(targetSheet);
  var masterRows = readSheetAsObjects_(masterSheet);

  var outputRows = [];
  var allWarnings = [];
  masterRows
    .filter(function (row) {
      return targetCodes.indexOf(row['代表商品コード']) !== -1;
    })
    .forEach(function (row) {
      var result = buildSkuRow(row, {});
      outputRows.push(result.row);
      allWarnings = allWarnings.concat(result.warnings);
    });

  writeSkuRows_(ss, outputRows);

  if (allWarnings.length > 0) {
    SpreadsheetApp.getUi().alert(
      '要確認の項目が ' + allWarnings.length + ' 件あります。詳細はログ(表示 > ログ)を確認してください。'
    );
    allWarnings.forEach(function (w) {
      Logger.log(w);
    });
  }
}

function readTargetRepresentativeCodes_(targetSheet) {
  var rows = readSheetAsObjects_(targetSheet);
  return rows
    .filter(function (row) {
      return String(row['登録対象']).toUpperCase() === 'TRUE';
    })
    .map(function (row) {
      return row['代表商品コード'];
    });
}

function readSheetAsObjects_(sheet) {
  var values = sheet.getDataRange().getValues();
  var header = values[0];
  return values.slice(1).map(function (rowValues) {
    var obj = {};
    header.forEach(function (key, i) {
      obj[key] = rowValues[i];
    });
    return obj;
  });
}

function writeSkuRows_(ss, outputRows) {
  var sheet = ss.getSheetByName(OUTPUT_SHEET_NAME) || ss.insertSheet(OUTPUT_SHEET_NAME);
  sheet.clearContents();
  if (outputRows.length === 0) return;

  var header = Object.keys(outputRows[0]);
  var values = [header].concat(
    outputRows.map(function (row) {
      return header.map(function (key) {
        return row[key];
      });
    })
  );
  sheet.getRange(1, 1, values.length, header.length).setValues(values);
}
