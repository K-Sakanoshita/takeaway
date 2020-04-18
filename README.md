# みんなでテイクアウトMAP

## 概要と目的
* OverPass APIでOpenStreetMapのテイクアウト/デリバリー施設を抽出して地図に表示するツール
* 他のテイクアウトMAPとの相違点は、OpenStreetMapの活用によるマッピング活動の促進が狙い
* OpenStreetMapにデータを集約させることで、データの分断を防ぎ将来に伝えていくことも狙い
* ITに詳しくない方向けに使い勝手を良くし、マッパーと一般ユーザーの垣根を低くすることも狙い

## システム環境
* HTML/CSS/JavasSriptによるフロントエンド系のWebアプリケーション
* 利用するサーバーは以下の3種類
  * Webサーバー: 「みんなでテイクアウトMAP」のプログラムとデータを設置(GitHub Pages可)
  * OverPass APIサーバー: OpenStreetMapのデーター抽出用(台湾/ロシア無償サーバーを利用)
  * タイルサーバー: MapTiler.org を利用(地域版の規模なら無料アカウントの範囲で問題無し)

## 構築方法
1. [本リポジトリ](https://github.com/K-Sakanoshita/takeaway)を任意の所へとforkする
2. forkしたリポジトリの設定(Settings)を開き、「GitHub Pages」を有効にする
  - 標準のURL(～.github.io/takeaway)でも、カスタムドメインのどちらでも動作する
3. 公開したGitHub Pagesを開き、「みんなでテイクアウトMAP」が表示されることを確認する
  - 「404 ERROR」が出ている場合、ご利用のWebブラウザキャッシュをクリアすると解消する
4. [MapTiler](https://www.maptiler.com/)を開き、無料アカウントを作成する
  - アクセス数が非常に多いサイトを構築するつもりであれば、有償プランの選択を検討する
  - OverPassサーバーはボランティア運営。常に高い負荷を与えるなら独自構築も検討する
  - 「アクセス数の多さ」の判断が難しいが、個人・地域コミュニティの通常利用程度は大丈夫
5. Maptilerにログインし、「Maps」から好みのマップを探す or 新しいマップを作成する
6. 探した or 作ったマップを開き、「Use vector style」欄のアドレスをコピーする
7. 手順"1."でforkさせたリポジトリ内にある「data/local.json」ファイルを開く
8. 「"style":」から始める行を探し、手順"6."でコピーした内容に置き換えて保存する
9. 手順"3."のGitHub Pagesを再読み込みし、自分が設定した地図が表示されると構築完了

## カスタマイズ方法
### 主なカスタマイズ対象ファイルは以下のとおり
* index.html: TITLE、OGP(og:から始まるサイトのメタ情報)、canonicalを自サイト版へ
* data/glot.json: 各言語翻訳ファイル。titleとownerを自サイト版へ
* data/local.json: "SplashImage"はWebサイトを開いた直後に表示する画像ファイルを指定
* data/local.json: "DefaultCenter"はWebサイトを開いた時に表示する緯度経度を指定
* data/local.json: "MinZoomLevel"はWebサイトを開いた時のズームレベルを指定(1～20)
* image/thumbnail.png: OGPで指定するサムネイル画像(og:imageで指定したファイル)
* image/splash.png: スプラッシュスクリーン画像を指定

### 注意点
* index.htmlのcanonical、OGPの各項目は必ずシェア前に自サイトの情報に書き換えること
  * facebookでシェアするとOGPがfacebookに記憶され、更新しても反映されないことがある
  * この場合、og:image のURLを変えた上で、facebookデバッガーの再読み込みが必要となる 
* GitHub Pagesでの公開後、強力にキャッシュが残る可能性がある
  * 各ブラウザのスーパーリロードを使って確実にキャッシュをクリアさせること
  * スーパーリロードでも改善しない場合、index.htmlを更新(何でもOK)して再チャレンジする
  
## 謝辞
* マニュアル作成からパッチ提供、[東京版サーバー](https://maripo.org/takeaway_tokyo/)を構築された maripo(Maripo GODA)氏
* パッチ提供、[尼崎版サーバー](https://codeforamagasaki.github.io/takeaway/)を構築された  tadanet3(Masayuki Tada)氏
* [草津版サーバー](https://kusatsu.5374.jp/takeaway/)を構築された Code for Kusatsuのみなさま
* [播磨版サーバー](https://codeforharima.github.io/takeaway/)を構築された Code for Harimaのみなさま
* [高槻版サーバー](https://coderdojotakatsuki.github.io/takeaway/)を構築された CoderDojo高槻のみなさま
* お弁当のアイコン(image/bentou.svg)を作ってくれたうちの妻
* OpenStreetMap Japanのみなさま
* 感想やフィードバックを頂いたみなさま

## 連絡先
* K.Sakanoshita (http://www.netfort.gr.jp/~saka/)
* E-mail: saka@netfort.gr.jp / twitter: @K_Sakanoshita / facebook: K.Sakanoshita
