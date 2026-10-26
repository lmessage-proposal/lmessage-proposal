# L Message 改善提案サイト

株式会社ミショナ ITエンジニア職 適性テストの提出物。
L Message の改善提案 3 件をまとめた静的サイトです。

## 構成

```
public/            公開されるファイル（Vercel の出力ディレクトリ）
  index.html       概要・優先順位・推奨案
  proposal-1.html  提案1 配信前の確認画面の強化（推奨）
  proposal-2.html  提案2 設定のつながりの見える化
  proposal-3.html  提案3 業種別のひな形
  scope.html       前提と調査範囲・工数の数え方
  robots.txt
  assets/style.css
middleware.js      全ページへの Basic 認証（Vercel Routing Middleware）
vercel.json        noindex 等のレスポンスヘッダー
```

ビルドは不要です。フレームワークも外部フォントも外部 JS も使っていません。
`@vercel/functions` は middleware が `next()` を呼ぶためだけの依存です。

## 公開設定

### 検索避け（二重でかけています）

1. 各 HTML の `<meta name="robots" content="noindex, nofollow, ...">`
2. `vercel.json` の `headers` による `X-Robots-Tag: noindex, nofollow, ...`（全パス）

加えて `public/robots.txt` で全パスを `Disallow` にしています。

### Basic 認証

`middleware.js` が全リクエストに Basic 認証を要求します（`matcher` を設定していないため、
HTML・CSS・robots.txt を含むすべてのパスが対象）。

**ユーザー名とパスワードはソースに書いていません。** Vercel の環境変数から読みます。

| 環境変数 | 用途 |
|---|---|
| `BASIC_AUTH_USER` | ユーザー名 |
| `BASIC_AUTH_PASSWORD` | パスワード |

どちらかが未設定の場合、middleware は**すべてのリクエストを 401 で拒否**します（fail closed）。
設定ミスでサイトが無防備に公開される事故を防ぐためです。

設定方法:

```bash
vercel env add BASIC_AUTH_USER production
vercel env add BASIC_AUTH_PASSWORD production
# preview / development にも同様に追加
```

## 公開後の確認手順

```bash
# 1. 認証なしでは 401 になること
curl -sI https://<deployment-url>/ | head -1          # → HTTP/2 401
curl -sI https://<deployment-url>/proposal-1 | head -1 # → HTTP/2 401

# 2. 認証ありで 200 になり、noindex が付いていること
curl -sI -u "$BASIC_AUTH_USER:$BASIC_AUTH_PASSWORD" https://<deployment-url>/ \
  | grep -iE '^(HTTP|x-robots-tag)'

# 3. 本文に meta robots が入っていること
curl -s -u "$BASIC_AUTH_USER:$BASIC_AUTH_PASSWORD" https://<deployment-url>/ \
  | grep -i '<meta name="robots"'
```

## 素材について

外部フォント・アイコンセット・画像素材は使用していません。
文字は閲覧端末の OS フォント、図はすべて手書きのインライン SVG です。
したがってライセンス表記が必要な第三者素材はありません。
