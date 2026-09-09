// Google スプレッドシート上のエントリーポイント。
// このファイルは GAS 上でのみ動作する（SpreadsheetApp を使用するため Node ではテストしない）。
// ロジック本体（SkuRules / VariationBuilder / RakutenSkuRowBuilder）は
// 純粋な関数として実装しており、gas/test 配下で Node.js から直接テストできる。

var MASTER_SHEET_NAME = '商品マスター';
var TARGET_SHEET_NAME = '楽天登録対象';
var OUTPUT_SHEET_NAME = '楽天SKU展開';
var IMAGE_OUTPUT_SHEET_NAME = '楽天商品画像';

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('楽天登録データ作成')
    .addItem('SKU展開を実行', 'runSkuExpansion')
    .addItem('商品画像パスを生成', 'runImageColumnGeneration')
    .addToUi();
}

/**
 * 「商品マスター」シートを読み込み、「楽天登録対象」シートでONになっている
 * 代表商品コードに属する行だけを対象に、SKU行（区分A・Bの列）を計算して
 * 「楽天SKU展開」シートに書き出す。新規商品登録のみを対象とする
 * （既に楽天に登録済みの商品の再アップロードは想定しない）。
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
      var result = buildSkuRow(row);
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

/**
 * 「楽天登録対象」シートでONになっている行の「画像枚数」列をもとに、
 * 商品画像パス（区分B）を組み立てて「楽天商品画像」シートに書き出す。
 *
 * 画像の総枚数は商品マスターから自動判定できないため、「楽天登録対象」シートに
 * あらかじめ「画像枚数」列（商品ごとに1回入力）を用意しておく必要がある。
 * 実行のたびに枚数を尋ねるダイアログにはしていない（複数商品をまとめて処理する際に
 * 毎回手が止まってしまうため）。docs/data-analysis.md 9章参照。
 */
function runImageColumnGeneration() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var targetSheet = ss.getSheetByName(TARGET_SHEET_NAME);
  if (!targetSheet) {
    throw new Error('「' + TARGET_SHEET_NAME + '」シートが見つかりません。');
  }

  var rows = readSheetAsObjects_(targetSheet).filter(function (row) {
    return String(row['登録対象']).toUpperCase() === 'TRUE';
  });

  var outputRows = [];
  var errors = [];
  rows.forEach(function (row) {
    var representativeCode = row['代表商品コード'];
    var imageCount = Number(row['画像枚数']);
    if (!Number.isInteger(imageCount) || imageCount < 1) {
      errors.push('「画像枚数」が未入力または不正です(代表商品コード=' + representativeCode + '): ' + row['画像枚数']);
      return;
    }
    var imageColumns = buildImageColumns(representativeCode, imageCount);
    outputRows.push(
      Object.assign({ '商品管理番号（商品URL）': representativeCode }, imageColumns)
    );
  });

  writeImageRows_(ss, outputRows);

  if (errors.length > 0) {
    SpreadsheetApp.getUi().alert(
      '「画像枚数」が未入力の商品が ' + errors.length + ' 件あります。' + TARGET_SHEET_NAME +
      'シートに画像枚数を入力してから再実行してください。詳細はログ(表示 > ログ)を確認してください。'
    );
    errors.forEach(function (e) {
      Logger.log(e);
    });
  }
}

function writeImageRows_(ss, outputRows) {
  var sheet = ss.getSheetByName(IMAGE_OUTPUT_SHEET_NAME) || ss.insertSheet(IMAGE_OUTPUT_SHEET_NAME);
  sheet.clearContents();
  if (outputRows.length === 0) return;

  // 商品ごとに画像枚数が異なるため、出力行の中で最も列数が多いものに合わせてヘッダーを揃える
  var header = outputRows.reduce(function (longest, row) {
    var keys = Object.keys(row);
    return keys.length > longest.length ? keys : longest;
  }, []);
  var values = [header].concat(
    outputRows.map(function (row) {
      return header.map(function (key) {
        return Object.prototype.hasOwnProperty.call(row, key) ? row[key] : '';
      });
    })
  );
  sheet.getRange(1, 1, values.length, header.length).setValues(values);
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
