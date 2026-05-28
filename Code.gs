// ==========================================
// 系統設定區 
// ==========================================
const TA_EMAILS = [
  'bagayellow.ai2025@gmail.com', // 替換成助教真實信箱，可新增多個
];

// 設定驗證碼最多允許錯誤的次數
const MAX_OTP_ATTEMPTS = 5; 

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
      .setTitle('社會思潮出缺席查詢系統')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// 根據學號或信箱尋找目標信箱，並發送 OTP
function sendOtp(keyword) {
  if (!keyword) return { success: false, message: "請輸入學號或信箱" };
  
  keyword = keyword.toString().toLowerCase().trim();
  var targetEmail = "";
  
  // 1. 先確認是否為助教信箱
  if (TA_EMAILS.indexOf(keyword) !== -1) {
    targetEmail = keyword;
  } 
  // 2. 若不是助教，則搜尋學生資料表
  else {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("統計資料");
    if (!sheet) return { success: false, message: "找不到資料表" };
    
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      var email = data[i][0].toString().toLowerCase();
      var id = data[i][2].toString().toLowerCase();
      
      if (email === keyword || id === keyword) {
        targetEmail = data[i][0];
        break;
      }
    }
  }
  
  if (!targetEmail) {
    return { success: false, message: "查無此學號或信箱，請確認輸入是否正確。" };
  }
  
  var otp = Math.floor(100000 + Math.random() * 900000).toString();
  var cache = CacheService.getScriptCache();
  
  // 每次重新發送時，寫入新驗證碼並重置錯誤次數
  cache.put(targetEmail, otp, 180); 
  cache.remove(targetEmail + "_attempts"); 
  
  var subject = "【社會思潮課程】您的專屬驗證碼";
  var body = "您好：\n\n您正在登入「社會思潮」出缺席查詢系統。\n您的驗證碼為： " + otp + " \n\n請在 3 分鐘內回到查詢系統輸入此驗證碼。\n若您未要求此代碼，請忽略這封信件。\n\n系統自動發送，請勿直接回覆。";
  
  try {
    MailApp.sendEmail(targetEmail, subject, body);
    var maskedEmail = targetEmail.substring(0, 3) + "****" + targetEmail.substring(targetEmail.indexOf("@"));
    return { success: true, email: maskedEmail };
  } catch (e) {
    return { success: false, message: "發送信件失敗，請稍後再試。" };
  }
}

// 驗證 OTP 並回傳查詢結果
function verifyOtpAndSearch(keyword, inputOtp) {
  if (!keyword || !inputOtp) return { success: false, message: "資料不完整" };
  
  keyword = keyword.toString().toLowerCase().trim();
  var targetEmail = "";
  var isTA = false;
  
  // 判斷身份
  if (TA_EMAILS.indexOf(keyword) !== -1) {
    targetEmail = keyword;
    isTA = true;
  } else {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("統計資料");
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      var email = data[i][0].toString().toLowerCase();
      var id = data[i][2].toString().toLowerCase();
      if (email === keyword || id === keyword) {
        targetEmail = data[i][0];
        break;
      }
    }
  }
  
  if (!targetEmail) return { success: false, message: "查無此帳號" };
  
  var cache = CacheService.getScriptCache();
  var cachedOtp = cache.get(targetEmail);
  var attemptKey = targetEmail + "_attempts";
  var attempts = parseInt(cache.get(attemptKey)) || 0;
  
  // 1. 檢查驗證碼是否存在 (過期或已被強制失效)
  if (!cachedOtp) {
    return { success: false, message: "驗證碼已過期或失效，請重新發送。" };
  }
  
  // 2. 檢查驗證碼是否正確
  if (cachedOtp !== inputOtp.trim()) {
    attempts++; // 錯誤次數 +1
    
    // 如果錯誤次數達到上限，強制清除驗證碼
    if (attempts >= MAX_OTP_ATTEMPTS) {
      cache.remove(targetEmail);
      cache.remove(attemptKey);
      return { success: false, message: "錯誤次數達 " + MAX_OTP_ATTEMPTS + " 次，為保護資料安全，驗證碼已強制失效，請重新發送。" };
    } else {
      // 記錄新的錯誤次數 (保持與驗證碼相同的存活時間即可)
      cache.put(attemptKey, attempts.toString(), 180);
      var leftAttempts = MAX_OTP_ATTEMPTS - attempts;
      return { success: false, message: "驗證碼錯誤，您還有 " + leftAttempts + " 次機會。" };
    }
  }
  
  // 3. 驗證成功，清除 Cache 中的驗證碼與錯誤紀錄
  cache.remove(targetEmail);
  cache.remove(attemptKey);
  
  // 讀取試算表資料
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("統計資料");
  var rawData = sheet.getDataRange().getValues();
  var results = [];
  
  // 如果是助教，回傳所有學生的資料 (跳過標題列)
  if (isTA) {
    for (var i = 1; i < rawData.length; i++) {
      if(rawData[i][0]) { // 確保不是空行
        results.push({
          email: rawData[i][0],
          name: rawData[i][1],
          id: rawData[i][2],
          course: rawData[i][3],
          present: rawData[i][4],
          absent: rawData[i][5],
          leave: rawData[i][6]
        });
      }
    }
    return { success: true, isTA: true, data: results };
  } 
  // 如果是學生，只回傳該學生的資料
  else {
    for (var i = 1; i < rawData.length; i++) {
      if (rawData[i][0] === targetEmail) {
        results.push({
          email: rawData[i][0],
          name: rawData[i][1],
          id: rawData[i][2],
          course: rawData[i][3],
          present: rawData[i][4],
          absent: rawData[i][5],
          leave: rawData[i][6]
        });
      }
    }
    return { success: true, isTA: false, data: results };
  }
}