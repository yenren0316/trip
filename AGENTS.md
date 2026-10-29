# 維護規範

這個 repo 放旅行行程網頁，透過 GitHub Pages 公開。修改任何內容前請先讀完這份文件。

## 結構

每個旅行一個資料夾，命名為 `地點-YYYY-MM`（出發年月）：

```
sw.js                         所有行程共用：離線快取
kit/trip-kit.js               所有行程共用：勾選、私人欄位、「這支手機」面板
kit/make-icons.py             產生主畫面圖示
karuizawa-2026-11/
  index.html                  行程頁面本體
  manifest.webmanifest        加到主畫面用
  icon-512.png                主畫面圖示
  apple-touch-icon.png        iPhone 主畫面圖示（180×180）
```

每個旅行獨立維護：改一個行程時不要動到其他行程的資料夾。`sw.js` 和 `kit/` 是共用的，改了會影響所有行程，只在真的需要時才改。

根目錄不放首頁或行程列表，`sw.js` 裡也不要列出有哪些行程。每個行程各自加到主畫面。

## 規則

1. **頁面上不可以有任何個人資訊。** 包含但不限於：真實姓名、電話、email、住址、生日、護照或證件號碼、訂房／訂票確認碼、會員編號、信用卡資訊、個人照片。飯店、景點等公開的聯絡方式可以放。確認碼這類資料改用私人欄位（見下方），由使用者自己在手機上填。
2. **每個行程頁都要接上共用小工具**，做法見下方「新增行程」。
3. **`data-todo` 和 `data-private` 的 id 一旦用了就不要改。** 手機上的勾選和私人欄位是用 id 對應的，改了 id 等於清掉使用者的資料。項目文字可以改。
4. 使用者說某件事已經完成（已訂、已購、已登錄），在對應的待辦項目加上 `data-done`，不要刪掉項目或把它改成純文字。

## 新增行程

`<head>` 裡、`<title>` 後面加上（短名放主畫面圖示下方，4 個字以內）：

```html
<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<meta name="theme-color" content="（報頭最上方的顏色）">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="（短名）">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
```

`</body>` 前面、頁面自己的 script 之後加上：

```html
<script src="../kit/trip-kit.js" defer></script>
```

頁面用 Google Fonts 的話，stylesheet 和 `fonts.googleapis.com` 的 preconnect 都要加 `crossorigin`（參考輕井澤頁）。沒加的話瀏覽器不會讓 kit 知道載入了哪些字型檔，第一次打開時字型可能存不到手機，離線就變成系統字型。

`black-translucent` 會讓頁面延伸到 iPhone 狀態列底下，所以頁面必須處理安全區域：viewport 要有 `viewport-fit=cover`，報頭頂端留 `env(safe-area-inset-top)` 的空間，置頂的導覽列在主畫面模式下改停在狀態列下方，並在狀態列底下補一條深色（參考輕井澤頁的 `@media (display-mode: standalone)`）。頁面若沒有處理安全區域，就不要加這一行 meta。

`manifest.webmanifest` 照現有行程的格式寫，`name`、`short_name`、`background_color`、`theme_color` 換成這趟的。圖示用腳本產生（需要 Pillow 和中文字型），配色取自報頭：

```
python3 kit/make-icons.py 資料夾名稱 字 --bg "#色1,#色2" [--fg "#字色"] [--accent "#線色"] [--lines "#紋路色"] [--serif]
```

## 共用小工具的寫法

勾選清單（整行都可以點）：

```html
<ul class="kit-list">
  <li data-todo="pack-gloves">手套</li>
  <li data-todo="qr-klook" data-done>Klook 截圖</li>   <!-- data-done：頁面預設為已完成 -->
</ul>
```

整張卡片當成一個待辦（勾選框放進標題）：

```html
<div class="note" data-todo="tsubasa-seats">
  <h4 data-todo-head>山形新幹線指定席</h4>
  <p>…</p>
</div>
```

私人欄位，放在每筆預訂旁邊（住宿卡片、航班、車票、雪具預約）。內容只存在使用者的手機，不會出現在 repo：

```html
<div data-private="lodge-apa-ueno" data-label="Agoda 訂單編號"></div>
<div data-private="notes" data-label="私人備註" data-multiline data-placeholder="保單號碼、緊急聯絡電話…"></div>
```

「這支手機」面板（離線狀態、加到主畫面說明、備份還原），放在總覽頁最後：

```html
<div data-kit-panel></div>
```

配色在頁面的 `:root` 設定，對應到這個行程自己的色票：

```css
--kit-accent  勾選完成的顏色
--kit-ink / --kit-ink-2 / --kit-muted   文字三層
--kit-line / --kit-line-soft / --kit-line-strong   線條與框線
--kit-card    按鈕與輸入框底色
--kit-ink-solid   主要按鈕底色
--kit-warn    離線狀態圓點
--kit-radius  面板圓角
```

小工具的樣式選擇器都很單純（例如 `.kit-check`、`li[data-todo]`），頁面需要調整時寫更具體的選擇器覆蓋即可，例如 `.note li[data-todo]{font-size:12.5px}`。

## 離線快取

`sw.js` 對行程頁採「網路優先」：有網路就拿最新版並存一份，網路 3.5 秒沒回應或斷線就用手機裡的版本。所以改完頁面推上去，使用者下次有網路打開時就會更新，不需要額外動作。

改了 `sw.js` 的快取邏輯，要把檔案開頭的 `VERSION` 加一。
