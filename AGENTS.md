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
  v2.html                     新格式的參考實作（見「頁面格式」），內容同一趟行程
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

## 頁面格式

2026 年 11 月輕井澤行程結束後，使用者的回饋是：旅途中真正用到的只有逐日行程，其他分頁資訊太多。原因有兩個：每次查到的資料（營業時間、備案、價格、注意事項）都被寫進頁面，而且同一件事在總覽、住宿、交通各寫一次，改一個班次要同步改七八處。

新行程照下面的格式做，參考實作是 `karuizawa-2026-11/v2.html`。既有行程不用回頭改，除非使用者要求。

1. **打開就是當天。** 第一個分頁是行程。旅途中依目的地的日期自動顯示當天；出發前顯示第一天和倒數天數；旅程結束後顯示第一天，當作紀錄。
2. **每一項只留一行：幾點、做什麼、在哪。** 營業時間、價格、注意事項這類補充最多一兩句，放進點開才展開的區塊。沒有補充就不要放展開區塊。
3. **頁面只放已決定的事。** 候選、比較、查到的背景資料在對話裡回答使用者，不要寫進頁面。真的要留備案，每一項最多一個，寫在展開區塊裡。使用者還沒決定的事，不要先寫成行程。
4. **同一件事只寫一個地方。** 分頁固定三個，不要另外開「總覽」「住宿」「交通」這類會重複內容的分頁：
   - **行程**：逐日時間軸。班次、時間、地點寫在這裡。
   - **訂位與票券**：航班、車票、住宿、活動、餐廳預約，每筆一張卡片，只寫這筆預訂怎麼用（哪幾天、在哪換票或報到）。私人欄位都放這裡。
   - **清單**：行李、採買、待辦（`data-todo`），最後放私人備註和「這支手機」面板。
5. **有地點的項目都加導航按鈕**，連到 Google 地圖搜尋：`https://www.google.com/maps/search/?api=1&query=…`。查詢字串用當地語言的店名或站名，容易找錯的再加上地址。
6. **旅途中，當天已經過去的項目自動變淡**，下一項標出來並捲到畫面上。最近開始的那一項可能還在進行，不變淡。旅程結束後都不變淡。
7. **使用者回報實際發生的事，就把行程改成實際的版本**：刪掉沒去的，時間改成實際的，不保留「原本計畫」。

行程分頁每一項的寫法（樣式和「現在」的判斷邏輯直接從參考實作複製）：

```html
<section class="day" data-day="1" data-date="2026-11-23">
  …
  <ol class="its">
    <!-- 有補充、有地點 -->
    <li class="it" data-t="09:38">
      <details>
        <summary>
          <span class="t">09:38</span>
          <span class="b"><span class="k k-move">新幹線</span><span class="h">はくたか 557 上野 → 輕井澤</span><span class="w">10:32 到</span></span>
          <span class="cv" aria-hidden="true"></span>
        </summary>
        <p class="more">補充一兩句。</p>
      </details>
      <a class="go" href="https://www.google.com/maps/search/?api=1&amp;query=JR+%E8%BB%BD%E4%BA%95%E6%B2%A2%E9%A7%85" target="_blank" rel="noopener" aria-label="導航到 JR 軽井沢駅">（圖示）</a>
    </li>
    <!-- 沒有補充：details 換成 div.row；沒有地點：不放 a.go -->
    <li class="it" data-t="19:00"><div class="row"><span class="t">晚上</span><span class="b"><span class="k k-eat">晚餐</span><span class="h">明治亭</span></span></div></li>
  </ol>
</section>
```

- `data-t` 是 24 小時制的時間，用來判斷這一項過了沒；畫面上顯示的時間可以寫「~09:40」「晚上」「之後」。項目照時間先後排。
- 發生在當天日期之前的項目（例如前一晚出發去機場）加 `data-o="-1"`。
- 標籤顏色：`k-move` 移動、`k-eat` 吃、`k-see` 逛和玩、`k-ski` 這趟的主題活動、`k-stay` 住宿和其他。
- 想看旅途中的樣子，網址加上 `?now=2026-11-25T14:00`（目的地時間）。

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

「這支手機」面板（離線狀態、加到主畫面說明、備份還原），新格式放在「清單」分頁最後，舊格式放在總覽頁最後：

```html
<div data-kit-panel></div>
```

手機上的資料是照資料夾名稱存的。同一趟行程有第二個頁面時（例如 `v2.html`），在 script 標籤加上 `data-slug`，兩個頁面就共用同一份勾選和私人欄位：

```html
<script src="../kit/trip-kit.js" data-slug="karuizawa-2026-11" defer></script>
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
