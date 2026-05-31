# 🎓 社會思潮課程 - 出缺席查詢系統 (Attendance Management System)

這是一個基於 **Google Apps Script (GAS)** 與 **Google 試算表** 打造的輕量化、無伺服器 (Serverless) 出缺席查詢 Web App。
本專案採用 Bottom-up 開發策略，結合 AI (LLM) 輔助，從底層資料結構建立到前端 UI 渲染，實現了具備權限分流、OTP 驗證與自動防呆的安全查詢系統。

## 💡 專案背景與解決痛點
傳統的課程出缺席查詢常依賴助教人工核對，或使用公開表單，容易造成**行政負擔**與**個資外洩風險**。
本系統旨在零開發/伺服器成本的前提下，利用 Google 生態系打造一個高安全性、低摩擦力（無須註記密碼）的專屬查詢入口。

---

## 🌟 核心功能 (Key Features)

- **🔐 無密碼驗證 (Passwordless Login)：** 透過信箱發送 6 位數一次性密碼 (OTP)，免除使用者記憶密碼的負擔。
- **👥 角色權限分流 (Role-Based Access Control)：**
  - **🧑‍🏫 助教視角：** 顯示全體學生名單，並自動抓取「曠課前 5 名」建立高風險儀表板，賦能班級管理。
  - **👨‍🎓 學生視角：** 僅能查閱個人出缺席紀錄，並結合「社會學」課程主題，依據出席狀況觸發名言鼓勵或風險警告。
- **⏳ 安全登出機制 (Auto-Logout)：** 考量公用電腦使用情境，設定 60 秒閒置自動登出並清除畫面，防止個資遭窺視。
- **🛡️ 錯誤次數限制 (Rate Limiting)：** OTP 連續輸入錯誤達 5 次即強制失效，防止惡意腳本暴力破解。

---

## 🛠️ 技術堆疊 (Tech Stack)

- **Database:** Google 試算表 (搭配 `Query` 函式進行資料聚合與自動化品質測試)
- **Backend:** Google Apps Script (GAS)
- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Caching:** Google Apps Script `CacheService` (處理 OTP 暫存，設定 180 秒生命週期)

---

## 📊 系統架構 (System Architecture)

本系統將「原始點名紀錄」與「統計資料」解耦，前端僅與驗證邏輯及快取層互動。以下為 OTP 驗證與登入流程圖：

```mermaid
graph TD
    Start([使用者輸入學號/信箱]) --> CheckRole{系統判別身分}
    CheckRole -->|助教白名單| Gen_OTP[生成 6 位數 OTP]
    CheckRole -->|非白名單| Stu_Auth{搜尋學生資料表}
    Stu_Auth -->|比對成功| Gen_OTP
    
    Gen_OTP --> Cache[(存入 CacheService 限時 180 秒)]
    Cache --> Send_Mail[發送驗證信件]
    Send_Mail --> Input_OTP([使用者輸入 OTP])
    
    Input_OTP --> Verify_OTP{驗證 OTP}
    Verify_OTP -->|錯誤 < 5次| Fail_Add[錯誤次數 +1]
    Verify_OTP -->|錯誤 >= 5次| Lockout[鎖定機制：強制銷毀 OTP]
    
    Verify_OTP -->|正確| Success[驗證成功，清除 Cache]
    Success --> Load_UI{依身分載入介面}
    Load_UI -->|助教| UI_TA[助教管理儀表板]
    Load_UI -->|學生| UI_Stu[學生專屬視角與關懷彈窗]

🚀 部署指南 (Deployment)
如果你想要在自己的 Google 帳號中部署此系統，請依照以下步驟：
1. 建立資料庫： - 建立一個 Google 試算表，並新增兩個工作表：「原始資料」與「統計資料」。
依照欄位設計輸入資料。

2.匯入程式碼： - 在試算表選單點擊 擴充功能 -> Apps Script。
將本專案的 Code.gs 與 Index.html 貼入對應的檔案中。

3.環境變數設定：
在 Code.gs 中，將 TA_EMAILS 陣列替換為你實際的助教信箱。

4.發佈 Web App：
點擊右上角 部署 -> 新增部署作業。
類型選擇 網頁應用程式。
執行身分選擇 我 (你的帳號)。
誰可以存取選擇 所有人。
點擊部署並授權相關權限，即可獲得專屬的 Web App 網址！
