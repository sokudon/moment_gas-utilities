if (typeof moment === 'undefined') {
  loadMomentWithTzData();
}

//https://grok.com/chat/f6f0e6dc-f641-46e1-bc48-84a38e444a45 
// スクリプトを取得して検証する関数
async function loadAndVerifyScript(url,expectedHash) {
  try {
   
   // 1. スクリプトをバイナリデータとして取得
    const response = UrlFetchApp.fetch(url);//
    const byteArray = response.getBlob().getBytes(); // バイト配列を取得

    // 2. SHA-512ハッシュを計算
    const hashBuffer = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_512, byteArray);
    const hashArray = hashBuffer.map(byte => byte < 0 ? byte + 256 : byte); // 符号なしバイトに変換
    const calculatedHash = 'sha512-' + Utilities.base64Encode(hashArray);

    // 3. ハッシュ値を比較
    if (calculatedHash !== expectedHash) {
      Logger.log('計算されたハッシュ: ' + calculatedHash);
      Logger.log('期待ハッシュ: ' + expectedHash);
      throw new Error('ハッシュ検証に失敗しました。スクリプトが改ざんされている可能性があります。');
    }

    // 4. 検証成功したら文字列に変換して実行
    var scriptText = response.getContentText(); // 実行用に文字列を取得
    Logger.log('ハッシュ検証成功、スクリプトを実行します');
    // Functionコンストラクタで関数を生成
    var urls="https://raw.githubusercontent.com/jdiamond/posixtz/refs/heads/master/index.js";
    if(url==urls){
      var rp=`const posixtz = {
  formatPosixTZ: formatPosixTZ,
  parsePosixTZ: parsePosixTZ,
  getOffsetForLocalDateWithPosixTZ: getOffsetForLocalDateWithPosixTZ,
  formatLocalDateWithOffset: formatLocalDateWithOffset
};`;
  scriptText=scriptText.replace("const moment = require('moment-timezone');",rp);
  scriptText=scriptText.replace(/exports.+/gm,"");

    }
    const func = new Function(scriptText);
    // 生成した関数を実行
    func();

  } catch (error) {
    console.error('エラー:', error.message);
  }
}


function loadMomentWithTzData() {
  // 正規のハッシュ値（例: CDNのスクリプトのSRIから取得）
var momentJsUrl_Hash = 'sha512-QoJS4DOhdmG8kbbHkxmB/rtPdN62cGWXAdAFWWJPvUFF1/zxcPSdAnn4HhYZSIlVoLVEJ0LesfNlusgm2bPfnA==';
var momentTzDataUrl_Hash = 'sha512-jLUMbCfI1lDcEvTFsTBgTBvOG4BbvqvZXan+7pwrB0twYDPLNFiucjbeYCDEy2upXmk86DWVpFl3L34fGZMIkw==';

 var posixtz_Hash="sha512-HrIkKMV5wRzuhr1ZlkFylUzaeu0PEEQKQW2/aeQ7RPhWRxJFWcxdXi+P+/gI9g1sxM4JMd3OPtx3fTMABtBJGA==";

  const momentJsUrl = "https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.30.1/moment.min.js";
  loadAndVerifyScript(momentJsUrl,momentJsUrl_Hash);

  const momentTzDataUrl = "https://cdnjs.cloudflare.com/ajax/libs/moment-timezone/0.5.46/moment-timezone-with-data.js";
  loadAndVerifyScript(momentTzDataUrl,momentTzDataUrl_Hash);

 //var urls="https://raw.githubusercontent.com/jdiamond/posixtz/refs/heads/master/index.js";
  // loadAndVerifyScript(urls,posixtz_Hash);
}

function posixtzzz(){
var tz=getOffsetForLocalDateWithPosixTZ('2025-11-02T02:30:00-07:00', 'PST8PDT,M3.2.0,M11.1.0')/60;

var s=testTimeSpantz();
  return tz; // セルに表示する値を返す
}

// カスタム関数
function getCurrentTime() {
  const now = moment(); // 現在時刻
  return now.format("YYYY-MM-DD HH:mm:ss"); // セルに表示する値を返す
}

function getformat(mem,format) {
  const m = moment(mem); // 現在時刻
  return m.format(format); // セルに表示する値を返す
}

function tzconvert(mem,tzst,format){
  const m = moment(mem).tz(tzst); // 現在時刻
  return m.format(format); // セルに表示する値を返す
}

// タイムスパンを計算するカスタム関数
function getTimeSpan(startDate, endDate,mString, mBoolean) {
  const start = moment(startDate); // 開始日時
  const end = moment(endDate);     // 終了日時
  
  if (!start.isValid() || !end.isValid()) {
    return "Invalid Date";
  }

  const diffHours = end.diff(start, mString, mBoolean); // 時間単位（小数点あり）
  return diffHours; // 例: 2.5（2時間30分）
}


// スプレッドシートで使用する例
function testTimeSpantz() {
  const start = "2024-11-03T01:00:00-07:00";
  const end = "2024-11-03T01:30:00-08:00";
  const timeZone = "Asia/Tokyo";
  const span =getTimeSpan(start, end, "hours",true);
  return span;
}


function gasUtilities(date,tzst,format){
  var datevalue= new Date(date);
  return Utilities.formatDate(datevalue, tzst, format);

}

function getTimeSpanWithUtilities(startDateStr, endDateStr) {
  // 入力文字列をDateオブジェクトに変換（タイムゾーンを適用）
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);

  // ミリ秒単位での差を計算
  const diffMs = end.getTime() - start.getTime();

  // 時間単位（小数点あり）に変換
  const diffHours = diffMs / (1000 * 60 * 60);

  return diffHours; // 例: 2.5（2時間30分）
}

// スプレッドシートで使用する例
function testTimeSpan() {
  const start = "2025-03-09 10:00:00";
  const end = "2025-03-09 12:30:00";
  const span = getTimeSpanWithUtilities(start, end);
  SpreadsheetApp.getActiveSheet().getRange("A15").setValue(span);
}