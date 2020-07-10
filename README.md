# みんなでテイクアウトMAP <開発版>

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
    * 標準のURL(～.github.io/takeaway)でも、カスタムドメインのどちらでも動作する
3. 公開したGitHub Pagesを開き、「みんなでテイクアウトMAP」が表示されることを確認する
    * 404 ERRORが出ている場合、ご利用のWebブラウザキャッシュをクリアすると解消する
4. [MapTiler](https://www.maptiler.com/)を開き、無料アカウントを作成する
    * アクセス数が非常に多いサイトを構築するつもりであれば、有償プランの選択を検討する
    * OverPassサーバーはボランティア運営。常に高い負荷を与えるなら独自構築も検討する
    * アクセス数の多さの判断は難しいが、個人・地域コミュニティの通常利用程度は大丈夫
5. Maptilerにログインし、「Maps」から好みのマップを探す or 新しいマップを作成する
6. 探した or 作ったマップを開き、「Use vector style」欄のアドレスをコピーする
7. 手順"1."でforkさせたリポジトリ内にある「data/local.json」ファイルを開く
8. 「"style":」から始める行を探し、手順"6."でコピーした内容に置き換えて保存する
9. 「"GoogleAnalytics"」から始める行を探し、"UA-～～"の文字を消して "" とする
10. 手順"3."のGitHub Pagesを再読み込みし、自分が設定した地図が表示されると構築完了

## カスタマイズ方法
### 主なカスタマイズ対象ファイルは以下のとおり
* index.html: TITLE、OGP(og:から始まるサイトのメタ情報)、canonicalを自サイト版へ
* data/glot.json: 各言語翻訳ファイル。titleとownerを自サイト版へ
* data/local.json
    * "SplashImage": Webサイトを開いた時の画像ファイルを指定
    * "DefaultCenter": 初期座標(緯度経度)を指定
    * "DefaultZoom": 初期ズームレベルを指定(1:世界全体 ～20:路地)
    * "IconViewZoom": アイコンを表示し始めるズームレベルを指定(1～20)
        * 都心部(店舗が大量にある所)で14以下を指定するとサーバー負荷が高いため禁止
    * "TextViewZoom": 施設名を表示し始めるズームレベルを指定(1～20)
        * IconViewZoomと同じか大きい数字を指定すること
      "EnableBookmark": trueにするとブックマーク機能 (施設に「★」をつける) がオンになる
    * "menu": メニュー(右上)を押した時のリンク先一覧を設定  
        * "glot-model": "glot.json"ファイル内の同項目名から表示する文字列を指定
        * "lonkto": リンク先のURLを指定
        * "divider": メニューに横線（ディバイダー）を追加する場合は true
* data/icon.json: OpenStreetMapのタグ毎にアイコンファイルを指定
* image/thumbnail.png: OGPで指定するサムネイル画像(og:imageで指定したファイル)
    * サイトをSNSなどでシェアする時に表示されるサムネイル画像として利用
* image/splash.png: スプラッシュスクリーン画像のファイル
    * data/local.jsonの"SplashImage"で指定したファイル

### 注意点
* index.htmlのcanonical、OGPの各項目は必ずシェア前に自サイトの情報に書き換えること
    * facebookでシェアするとOGPがfacebookに記憶され、更新しても反映されないことがある
    * この際、og:image のURLを変えた上で、facebookシェアデバッガーでの再読み込みが必要 
    * facebookシェアデバッガー https://developers.facebook.com/tools/debug/
* GitHub Pagesでの公開後、強力にキャッシュが残る可能性がある
    * 各ブラウザのスーパーリロードを使って確実にキャッシュをクリアさせること
    * スーパーリロードでも改善しない場合、index.htmlを更新(何でもOK)して再チャレンジする
  
## 謝辞
* マニュアル作成からパッチ提供、[東京版サーバー](https://maripo.org/takeaway_tokyo/)を構築された maripo(Maripo GODA)氏
* パッチ提供、[尼崎版サーバー](https://codeforamagasaki.github.io/takeaway/)を構築された  tadanet3(Masayuki Tada)氏
* [草津版サーバー](https://kusatsu.5374.jp/takeaway/)を構築された Code for Kusatsuのみなさま
* [播磨版サーバー](https://codeforharima.github.io/takeaway/)を構築された Code for Harimaのみなさま
* [高槻版サーバー](https://coderdojotakatsuki.github.io/takeaway/)を構築された CoderDojo高槻のみなさま
* 作州版、淀川3区版、大阪キタエリア版、泉州版、名古屋版、苅田町版に関わられたみなさま
* お弁当のアイコン(image/bentou.svg)を作ってくれたうちの妻
* OpenStreetMap Japanのみなさま
* 感想やフィードバックを頂いたみなさま

## 連絡先
* K.Sakanoshita (http://www.netfort.gr.jp/~saka/)
* E-mail: saka@netfort.gr.jp / twitter: @K_Sakanoshita / facebook: K.Sakanoshita
