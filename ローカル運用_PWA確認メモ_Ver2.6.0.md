# 商談価格ナビ Ver2.6.0 ローカル運用・PWA確認メモ

## 対応内容

- 外部CDNを使わず、必要ライブラリはローカルファイルで読み込む構成を確認
- `vendor/jszip.min.js` を同梱したまま、Excel読込機能を維持
- `index.html` のCSS/JS参照バージョンと `service-worker.js` のキャッシュ対象を統一
- HTML/CSS/JS/画像/manifest/JSZipを service worker の事前キャッシュ対象に追加
- URLのクエリ違いがあってもキャッシュから返せるよう `ignoreSearch` を有効化
- PWA登録は iPad Safari でも通るよう `window.isSecureContext` で判定

## 運用上の注意

- Macで `index.html` を直接開く場合、画面表示とExcel読込は可能です。
- ブラウザ仕様により `file://` 直開きでは service worker は登録されません。
- iPadでホーム画面PWAとしてオフライン起動するには、最初の追加時だけ service worker を登録できるURLで開く必要があります。
- `localhost` または HTTPS のURLで一度開き、ホーム画面に追加してください。
- ホーム画面追加後は、キャッシュ済みのアプリ本体をオフラインで起動できます。
- 夏価格表・冬価格表はアプリに固定埋め込みしていません。従来通り端末内のExcelを選択して読み込みます。

## 確認結果

- 外部CDN参照なし
- キャッシュ対象ファイルの存在確認OK
- HTMLから参照している主要ファイルのキャッシュ漏れなし
- MacローカルHTTP起動OK
- Excelファイル選択UIあり
- 夏／冬切替ボタンあり
- 印刷・比較印刷ボタンあり
