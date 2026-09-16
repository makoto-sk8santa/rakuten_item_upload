// Google スプレッドシート上のエントリーポイント。
// このファイルは GAS 上でのみ動作する（SpreadsheetApp を使用するため Node ではテストしない）。
// ロジック本体（SkuRules / VariationBuilder / RakutenSkuRowBuilder）は
// 純粋な関数として実装しており、gas/test 配下で Node.js から直接テストできる。

var MASTER_SHEET_NAME = '商品マスター';
var TARGET_SHEET_NAME = '楽天登録対象';
var OUTPUT_SHEET_NAME = '楽天SKU展開';
var IMAGE_OUTPUT_SHEET_NAME = '楽天商品画像';
// SKU展開・画像パス生成でエラーになった行を書き出すシート。Apps Scriptの実行ログを
// 開かなくてもスプレッドシート上でエラー内容を確認できるようにするため。
var ERROR_SHEET_NAME = 'エラー一覧';
// 機種・カラー以外の追加バリエーション軸（タイプ、文字入れの有無等）を商品ごとに
// 人力で登録しておくシート。無くてもエラーにはしない（該当商品が無ければ単に使わない）。
// docs/data-analysis.md 12.3節(4)参照。
var EXTRA_VARIATION_SHEET_NAME = '追加バリエーション設定';
// Phase2：商品名・キャッチコピーのAI生成用シート（docs/spec.md シート4を、
// 最初のスコープ「商品名・キャッチコピー」に絞って実装したもの）。
var AI_GENERATION_SHEET_NAME = 'AI生成';
var REGISTRATION_TARGET_COLUMN_NAME = '登録対象';
// プルダウンを設定しておく行数の余裕分（既存行数にこの分を足した範囲まで設定する）
var TARGET_VALIDATION_ROW_BUFFER = 200;
// AI生成が完了した内容を人間が確認済みであることを示すステータス。
// このステータスの行は、AI生成を再実行しても上書きしない（誤って確認済み内容を
// 消さないための安全策。docs/spec.md 13章「AI生成文の安全策」参照）。
var AI_GENERATION_CONFIRMED_STATUS = '人間確認済';

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('楽天登録データ作成')
    .addItem('登録対象の候補を商品マスターから追加', 'syncTargetCandidates')
    .addItem('登録対象列にプルダウンを設定', 'setupRegistrationDropdown')
    .addItem('SKU展開を実行', 'runSkuExpansion')
    .addItem('商品画像パスを生成', 'runImageColumnGeneration')
    .addSeparator()
    .addItem('APIキーを設定(Claude)', 'setClaudeApiKey')
    .addItem('AI生成シートに登録対象を反映', 'syncAiGenerationCandidates')
    .addItem('商品名・キャッチコピーをAI生成', 'runAiTextGeneration')
    .addToUi();
}

/**
 * 「楽天登録対象」シートの「登録対象」列に、TRUE/FALSEのプルダウン（入力規則）を設定する。
 * 毎回手入力するのが面倒という要望に対応。既存行数より少し多め（TARGET_VALIDATION_ROW_BUFFER分）
 * まで設定しておくので、この後syncTargetCandidatesで追加される新しい行にもそのまま適用される。
 * 何度実行しても上書きされるだけなので安全。
 */
function setupRegistrationDropdown() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var targetSheet = ss.getSheetByName(TARGET_SHEET_NAME);
  if (!targetSheet) {
    throw new Error('「' + TARGET_SHEET_NAME + '」シートが見つかりません。');
  }
  applyRegistrationDropdown_(targetSheet);
  SpreadsheetApp.getUi().alert(
    '「' + REGISTRATION_TARGET_COLUMN_NAME + '」列にプルダウン(TRUE/FALSE)を設定しました。'
  );
}

function applyRegistrationDropdown_(targetSheet) {
  var header = targetSheet.getRange(1, 1, 1, targetSheet.getLastColumn()).getValues()[0];
  var colIndex = header.indexOf(REGISTRATION_TARGET_COLUMN_NAME) + 1; // 1始まりの列番号
  if (colIndex === 0) return;

  var rowCount = Math.max(targetSheet.getLastRow() - 1, 0) + TARGET_VALIDATION_ROW_BUFFER;
  var rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['TRUE', 'FALSE'], true)
    .setAllowInvalid(false)
    .build();
  targetSheet.getRange(2, colIndex, rowCount, 1).setDataValidation(rule);
}

/**
 * 「商品マスター」シートの代表商品コードのうち、「楽天登録対象」シートに
 * まだ無いものを新規行として追加する（登録対象=FALSEで追加するので、
 * 実際に処理したい商品だけ人間が後からTRUEにする）。
 *
 * 商品マスターは1年分などまとめて蓄積されていく想定のため、貼り付けただけで
 * 自動的に「楽天登録対象」へ反映されるわけではない。この関数を都度実行して
 * 差分を反映する運用にしている。
 */
function syncTargetCandidates() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var masterSheet = ss.getSheetByName(MASTER_SHEET_NAME);
  var targetSheet = ss.getSheetByName(TARGET_SHEET_NAME);
  if (!masterSheet || !targetSheet) {
    throw new Error('「' + MASTER_SHEET_NAME + '」または「' + TARGET_SHEET_NAME + '」シートが見つかりません。');
  }

  var masterRows = readSheetAsObjects_(masterSheet);
  var existingTargetRows = readSheetAsObjects_(targetSheet);
  var existingCodes = existingTargetRows.map(function (row) {
    return row['代表商品コード'];
  });

  var missingCodes = getMissingRepresentativeCodes(masterRows, existingCodes);
  if (missingCodes.length === 0) {
    SpreadsheetApp.getUi().alert('追加対象はありません（商品マスターの代表商品コードはすべて反映済みです）。');
    return;
  }

  var header = targetSheet.getRange(1, 1, 1, targetSheet.getLastColumn()).getValues()[0];
  var newRows = missingCodes.map(function (code) {
    var rowObj = buildTargetRow(code);
    return header.map(function (key) {
      return Object.prototype.hasOwnProperty.call(rowObj, key) ? rowObj[key] : '';
    });
  });
  targetSheet
    .getRange(targetSheet.getLastRow() + 1, 1, newRows.length, header.length)
    .setValues(newRows);
  applyRegistrationDropdown_(targetSheet);

  SpreadsheetApp.getUi().alert(
    missingCodes.length + '件の代表商品コードを「' + TARGET_SHEET_NAME + '」に追加しました(登録対象=FALSE)。' +
    '処理したい商品だけ登録対象をTRUEにしてください。'
  );
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
  var extraVariationByCode = readExtraVariationByProductCode_(ss);

  var outputRows = [];
  var allWarnings = [];
  var skuErrors = [];
  masterRows
    .filter(function (row) {
      return targetCodes.indexOf(row['代表商品コード']) !== -1;
    })
    .forEach(function (row) {
      // 1商品コードの不備（サイズコード/カラーコード未登録など）で全体を止めないよう、
      // 行単位でエラーを捕捉して処理を継続する。エラーになった行はSKU行を出力しない。
      try {
        var result = buildSkuRow(row, extraVariationByCode[row['商品コード']]);
        outputRows.push(result.row);
        allWarnings = allWarnings.concat(result.warnings);
      } catch (e) {
        // e.message だけだと発生箇所が分からず原因調査しづらいため、スタックトレース
        // （どのファイルの何行目か）もあわせて記録する。
        skuErrors.push({ code: row['商品コード'], message: e.message + '\n' + (e.stack || '') });
      }
    });

  writeSkuRows_(ss, outputRows);
  writeErrorRows_(ss, skuErrors);

  if (skuErrors.length > 0) {
    SpreadsheetApp.getUi().alert(
      'エラーで出力できなかった商品コードが ' + skuErrors.length + ' 件あります。' +
      '「' + ERROR_SHEET_NAME + '」シートに詳細を書き出したので確認してください' +
      '（販売価格が空欄の行は、セット商品組み立て用の部品行の可能性があり、その場合は正常です）。'
    );
  }

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
      errors.push({ code: representativeCode, message: '「画像枚数」が未入力または不正です: "' + row['画像枚数'] + '"' });
      return;
    }
    var imageColumns = buildImageColumns(representativeCode, imageCount);
    outputRows.push(
      Object.assign({ '商品管理番号（商品URL）': representativeCode }, imageColumns)
    );
  });

  writeImageRows_(ss, outputRows);
  writeErrorRows_(ss, errors);

  if (errors.length > 0) {
    SpreadsheetApp.getUi().alert(
      '「画像枚数」が未入力の商品が ' + errors.length + ' 件あります。' + TARGET_SHEET_NAME +
      'シートに画像枚数を入力してから再実行してください。「' + ERROR_SHEET_NAME + '」シートに詳細を書き出しました。'
    );
  }
}

/**
 * Claude APIキーをスクリプトプロパティに保存する。コードやスプレッドシートのセルに
 * 直接書かないことで、シートを共有してもキーが漏れないようにする。
 */
function setClaudeApiKey() {
  var ui = SpreadsheetApp.getUi();
  var response = ui.prompt(
    'Claude APIキーの設定',
    'Anthropic Consoleで発行したClaude APIキーを入力してください。',
    ui.ButtonSet.OK_CANCEL
  );
  if (response.getSelectedButton() !== ui.Button.OK) return;
  var apiKey = response.getResponseText().trim();
  if (!apiKey) {
    ui.alert('APIキーが入力されていません。');
    return;
  }
  PropertiesService.getScriptProperties().setProperty(CLAUDE_API_KEY_PROPERTY, apiKey);
  ui.alert('Claude APIキーを保存しました。');
}

/**
 * 「楽天登録対象」シートでONになっている代表商品コードのうち、「AI生成」シートに
 * まだ無いものを新規行として追加する（syncTargetCandidatesと同様の差分追加方式）。
 * 特徴・素材等の補足情報は空欄で追加するので、AI生成を実行する前に人間が入力する。
 */
function syncAiGenerationCandidates() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var targetSheet = ss.getSheetByName(TARGET_SHEET_NAME);
  var aiSheet = ss.getSheetByName(AI_GENERATION_SHEET_NAME);
  if (!targetSheet || !aiSheet) {
    throw new Error('「' + TARGET_SHEET_NAME + '」または「' + AI_GENERATION_SHEET_NAME + '」シートが見つかりません。');
  }

  var targetCodes = readTargetRepresentativeCodes_(targetSheet);
  var existingAiRows = readSheetAsObjects_(aiSheet);
  var existingCodes = existingAiRows.map(function (row) {
    return row['代表商品コード'];
  });
  var missingCodes = targetCodes.filter(function (code) {
    return existingCodes.indexOf(code) === -1;
  });

  if (missingCodes.length === 0) {
    SpreadsheetApp.getUi().alert('追加対象はありません（登録対象の代表商品コードはすべて反映済みです）。');
    return;
  }

  var header = aiSheet.getRange(1, 1, 1, aiSheet.getLastColumn()).getValues()[0];
  var newRows = missingCodes.map(function (code) {
    var rowObj = buildAiGenerationRow(code);
    return header.map(function (key) {
      return Object.prototype.hasOwnProperty.call(rowObj, key) ? rowObj[key] : '';
    });
  });
  aiSheet
    .getRange(aiSheet.getLastRow() + 1, 1, newRows.length, header.length)
    .setValues(newRows);

  SpreadsheetApp.getUi().alert(
    missingCodes.length + '件の代表商品コードを「' + AI_GENERATION_SHEET_NAME + '」に追加しました。' +
    '特徴・素材等の補足情報を入力してから「商品名・キャッチコピーをAI生成」を実行してください。'
  );
}

/**
 * 「楽天登録対象」でONになっている代表商品コードについて、商品名・キャッチコピーを
 * Claude APIで生成し、「AI生成」シートに書き戻す。
 *
 * ・ステータスが「人間確認済」の行は上書きしない（docs/spec.md 13章の安全策）。
 * ・1商品の失敗で全体を止めないよう、行単位でエラーを捕捉して処理を継続する
 *   （runSkuExpansionと同じ方針）。
 */
function runAiTextGeneration() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var masterSheet = ss.getSheetByName(MASTER_SHEET_NAME);
  var targetSheet = ss.getSheetByName(TARGET_SHEET_NAME);
  var aiSheet = ss.getSheetByName(AI_GENERATION_SHEET_NAME);
  if (!masterSheet || !targetSheet || !aiSheet) {
    throw new Error(
      '「' + MASTER_SHEET_NAME + '」「' + TARGET_SHEET_NAME + '」「' + AI_GENERATION_SHEET_NAME +
      '」のいずれかのシートが見つかりません。'
    );
  }

  var apiKey = PropertiesService.getScriptProperties().getProperty(CLAUDE_API_KEY_PROPERTY);
  if (!apiKey) {
    throw new Error('Claude APIキーが設定されていません。メニューの「APIキーを設定(Claude)」から設定してください。');
  }

  var targetCodes = readTargetRepresentativeCodes_(targetSheet);
  var masterRowsByCode = groupByRepresentativeCode_(readSheetAsObjects_(masterSheet));

  var aiHeader = aiSheet.getRange(1, 1, 1, aiSheet.getLastColumn()).getValues()[0];
  var codeColIndex = aiHeader.indexOf('代表商品コード');
  var statusColIndex = aiHeader.indexOf('ステータス');
  var nameColIndex = aiHeader.indexOf('生成商品名');
  var catchColIndex = aiHeader.indexOf('生成キャッチコピー');
  var updatedAtColIndex = aiHeader.indexOf('最終生成日時');
  if (codeColIndex === -1 || statusColIndex === -1 || nameColIndex === -1 || catchColIndex === -1) {
    throw new Error(
      '「' + AI_GENERATION_SHEET_NAME + '」シートの列構成が想定と異なります' +
      '（代表商品コード・ステータス・生成商品名・生成キャッチコピーの列が必要です）。'
    );
  }

  var aiValues = aiSheet.getDataRange().getValues();
  var errors = [];
  var generatedCount = 0;

  for (var i = 1; i < aiValues.length; i++) {
    var row = aiValues[i];
    var code = row[codeColIndex];
    if (!code || targetCodes.indexOf(code) === -1) continue;
    if (row[statusColIndex] === AI_GENERATION_CONFIRMED_STATUS) continue;

    var aiInputRow = {};
    aiHeader.forEach(function (key, idx) {
      aiInputRow[key] = row[idx];
    });

    try {
      var summary = buildAiInputSummary(masterRowsByCode[code] || [], aiInputRow);
      var prompt = buildProductNamePrompt(summary);
      var responseText = callClaudeApi_(apiKey, prompt);
      var result = parseAiTextResponse(responseText);

      aiSheet.getRange(i + 1, nameColIndex + 1).setValue(result.productName);
      aiSheet.getRange(i + 1, catchColIndex + 1).setValue(result.catchCopy);
      aiSheet.getRange(i + 1, statusColIndex + 1).setValue('生成済');
      if (updatedAtColIndex !== -1) {
        aiSheet.getRange(i + 1, updatedAtColIndex + 1).setValue(new Date());
      }
      generatedCount++;
    } catch (e) {
      errors.push({ code: code, message: e.message + '\n' + (e.stack || '') });
    }
  }

  writeErrorRows_(ss, errors);

  var message = generatedCount + '件の商品名・キャッチコピーを生成しました。';
  if (errors.length > 0) {
    message += '\n' + errors.length + '件エラーになりました。「' + ERROR_SHEET_NAME + '」シートを確認してください。';
  }
  SpreadsheetApp.getUi().alert(message);
}

function groupByRepresentativeCode_(masterRows) {
  var byCode = {};
  masterRows.forEach(function (row) {
    var code = row['代表商品コード'];
    if (!code) return;
    if (!byCode[code]) byCode[code] = [];
    byCode[code].push(row);
  });
  return byCode;
}

/** Claude API(Messages API)を呼び出し、応答テキスト本文を返す。 */
function callClaudeApi_(apiKey, prompt) {
  var payload = {
    model: CLAUDE_MODEL,
    max_tokens: CLAUDE_MAX_TOKENS,
    messages: [{ role: 'user', content: prompt }],
  };
  var options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  };
  var response = UrlFetchApp.fetch(CLAUDE_API_URL, options);
  var statusCode = response.getResponseCode();
  var body = response.getContentText();
  if (statusCode !== 200) {
    throw new Error('Claude APIの呼び出しに失敗しました(status=' + statusCode + '): ' + body);
  }
  var json = JSON.parse(body);
  if (!json.content || !json.content[0] || !json.content[0].text) {
    throw new Error('Claude APIの応答形式が想定と異なります: ' + body);
  }
  return json.content[0].text;
}

/**
 * SKU展開・画像パス生成でエラーになった行を「エラー一覧」シートに書き出す。
 * エラーが0件でも、前回実行時のエラーが残らないようシートは常に上書きする。
 */
function writeErrorRows_(ss, errors) {
  var sheet = ss.getSheetByName(ERROR_SHEET_NAME) || ss.insertSheet(ERROR_SHEET_NAME);
  sheet.clearContents();
  var header = ['対象コード', 'エラー内容'];
  var values = [header].concat(
    errors.map(function (e) {
      return [e.code, e.message];
    })
  );
  sheet.getRange(1, 1, values.length, header.length).setValues(values);
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

/**
 * 「追加バリエーション設定」シートを商品コードをキーにしたマップとして読み込む。
 * シート自体が無い場合は空のマップを返す（未登録の商品は追加軸なしのまま処理される）。
 */
function readExtraVariationByProductCode_(ss) {
  var sheet = ss.getSheetByName(EXTRA_VARIATION_SHEET_NAME);
  if (!sheet) return {};
  return indexExtraVariationRowsByProductCode(readSheetAsObjects_(sheet));
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

  // 商品によってバリエーション軸の数が異なる（機種の軸が無い商品など）ため、
  // 出力行の中で最も列数が多いものに合わせてヘッダーを揃える
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
