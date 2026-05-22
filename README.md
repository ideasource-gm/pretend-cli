# PretendCLI.js

CLIのふりをするVanilla JSライブラリ。`<script>`タグ1行追加するだけで、既存のHTMLページがターミナル風UIに早変わりします。

---

## こんなサイトに向いています

- **ポートフォリオ** — 自己紹介やスキル一覧をコマンド風に演出
- **プロダクトのLPや特設ページ** — 印象的な第一印象を作りたいとき
- **イベントや作品の紹介ページ** — 世界観を統一した演出として

> **ポイント:** 最初からCLI演出を意識して設計されたページで本領を発揮します。文章量の多いブログや読ませるコンテンツには不向きです。既存サイトに導入する場合は `defaultMode: 'gui'` で通常表示をデフォルトにして、興味ある訪問者だけがCLIモードに切り替えられる使い方がおすすめです。

---

## インストール

**npm:**
```bash
npm install pretend-cli
```

**CDN（jsDelivr）:**
```html
<!-- 開発用 -->
<script src="https://cdn.jsdelivr.net/npm/pretend-cli/pretend-cli.js"></script>

<!-- 本番用（minified） -->
<script src="https://cdn.jsdelivr.net/npm/pretend-cli/pretend-cli.min.js"></script>
```

**CDN（unpkg）:**
```html
<script src="https://unpkg.com/pretend-cli/pretend-cli.min.js"></script>
```

---

## クイックスタート

```html
<div id="terminal-zone">
  <h1>My Portfolio</h1>
  <p>フロントエンドエンジニアです。</p>
  <ul>
    <li><a href="works.html">works</a></li>
    <li><a href="about.html">about</a></li>
  </ul>
</div>

<script src="pretend-cli.js"></script>
<script>
  PretendCLI.init({ target: '#terminal-zone' });
</script>
```

---

## 特徴

- **依存ライブラリなし** — Vanilla JSのみ
- **ゼロコンフィグ** — `init()` 1行で動く
- **GUI / CLI トグル** — ボタンで双方向に切り替え可能
- **プログレッシブ・エンハンスメント** — JS無効時は通常のHTMLとして表示
- **CSS完全カプセル化** — 既存サイトのCSSに干渉されない
- **4テーマ** — dark / light / green / amber
- **タイピングアニメーション** — テキストノードを安全に走査
- **ASCIIアートタイトル** — カスタムテキスト、またはfiglet.js（外部ライブラリ・任意）と連携
- **画像のASCIIアート変換** — Canvas APIで自動変換
- **テーブルのASCII罫線変換** — 日本語などの全角文字も正確に整列
- **動画の枠付き表示** — ターミナル風ボーダーで表示
- **背景動画** — ページ全体に動画を敷いてCLI演出を強化
- **インラインナビゲーション** — ページ遷移せずに続きとして表示
- **キーボード操作** — ↑↓キーでリンク選択、Enterで実行
- **アクセシビリティ対応** — スクリーンリーダーで正常に読み上げ可能

---

## セマンティック変換ルール

| HTML要素 | ターミナル表示 |
|---|---|
| `h1` 〜 `h6` | `$ コマンド` として表示 |
| `p` / `ul` / `ol` / `pre` | コマンドの出力結果として表示 |
| `table` | ASCII罫線テーブルに変換 |
| `img` | ASCIIアートまたは枠付き通常表示 |
| `video` | `▶ video` ラベル付き枠で表示 |
| `div` / `span` | テキストとして出力 |
| `a` / `button` | キーボードで選択・実行できるメニュー項目 |

---

## オプション

```js
PretendCLI.init({
  // 基本
  target: '#terminal-zone',   // 対象セレクタ（必須）
  defaultMode: 'cli',         // 'cli' | 'gui' — 初回表示モード

  // テーマ
  theme: 'dark',   // 'dark' | 'light' | 'green' | 'amber'

  // 画像
  image: 'ascii',            // 'ascii': ASCIIアートに変換 | 'normal': 通常表示
  imageWidth: 60,            // ASCIIアート変換時の横幅（文字数）
  imageDisplayWidth: '100%', // 通常表示時の最大幅（数値でpx、文字列でそのままCSS）

  // ロゴ（最初のh1のみ適用）
  logo: {
    type: 'figlet',      // 'figlet': figlet.js（外部ライブラリ）でASCIIアートフォントに変換
    font: 'Standard',    // figletフォント名
  },
  // または（figlet.js 不要）
  logo: {
    type: 'custom',      // 'custom': 自分でASCIIアートを指定（外部ライブラリ不要）
    text: `
 ____            _                 _
|  _ \ _ __ ___| |_ ___ _ __   __| |
| |_) | '__/ _ \ __/ _ \ '_ \ / _  |
|  __/| | |  __/ ||  __/ | | | (_| |
|_|   |_|  \___|\__\___|_| |_|\__,_|
    `,
  },

  // ナビゲーション
  navigation: 'inline',  // 'inline': その場で続きとして表示 | 'default': 通常遷移

  // 背景動画
  backgroundVideo: ['demo.webm', 'demo.mp4'], // 文字列でも配列でも可
  backgroundVideoOpacity: 0.3,                // 動画の透明度（0〜1）
  backgroundVideoOverlay: 0.5,                // 暗いオーバーレイの濃さ（0〜1）
});
```

### オプション一覧

| オプション | デフォルト | 説明 |
|---|---|---|
| `target` | `'#terminal-zone'` | 適用対象のセレクタ（必須） |
| `defaultMode` | `'cli'` | 初回表示モード（`'cli'` / `'gui'`） |
| `theme` | `'dark'` | カラーテーマ |
| `image` | `'ascii'` | 画像の表示方法 |
| `imageWidth` | `60` | ASCIIアートの横幅（文字数） |
| `imageDisplayWidth` | `'100%'` | 通常表示時の最大幅 |
| `logo.type` | — | `'figlet'`（要figlet.js）または `'custom'` |
| `logo.font` | `'Standard'` | figlet使用時のフォント名 |
| `logo.text` | — | custom使用時のASCIIアート文字列 |
| `navigation` | `'inline'` | リンククリック時の挙動 |
| `backgroundVideo` | `null` | 背景動画のURL（文字列 or 配列） |
| `backgroundVideoOpacity` | `0.3` | 背景動画の透明度（0〜1） |
| `backgroundVideoOverlay` | `0.5` | 暗いオーバーレイの濃さ（0〜1） |

---

## テーマ

| テーマ名 | 背景 | 文字 | 雰囲気 |
|---|---|---|---|
| `dark` | 黒 | 白 | クラシックターミナル |
| `light` | 白 | 黒 | モダンターミナル |
| `green` | 黒 | 緑 | レトロハッカー風 |
| `amber` | 黒 | 琥珀色 | ビンテージ端末風 |

---

## GUI / CLI トグル

右下に常に `GUI` / `CLI` ボタンが表示され、いつでも切り替えられます。

- **CLIモード** → タイピングアニメーション付きターミナル表示
- **GUIモード** → 元のHTMLに戻す

`defaultMode: 'gui'` にすると最初からGUI表示で始まります。

---

## 背景動画

```js
PretendCLI.init({
  backgroundVideo: ['demo.webm', 'demo.mp4'], // WebM優先・MP4フォールバック
  backgroundVideoOpacity: 0.7,               // 動画をはっきり見せる
  backgroundVideoOverlay: 0.2,               // 暗い動画ならオーバーレイは薄めに
});
```

- 動画は `autoplay` + `muted` + `loop` で自動再生
- 複数形式を配列で指定するとブラウザが対応形式を自動選択
- ターミナル背景は半透明になり動画が透けて見える

---

## ナビゲーション（`navigation: 'inline'`）

| リンク種別 | 挙動 |
|---|---|
| 同一ページアンカー（`#section`） | 対象要素をその場でタイピング表示 |
| 同一サイトの別ページ | `fetch()` で取得し、区切り線の後に続きとして表示 |
| 外部リンク | `[opening external link...]` を表示してから新しいタブで開く |

---

## キーボード操作

アニメーション完了後に有効になります。

| キー | 動作 |
|---|---|
| `↓` / `Tab` | 次のリンクを選択 |
| `↑` / `Shift+Tab` | 前のリンクを選択 |
| `Enter` | 選択中のリンクを実行 |
| クリック | アニメーションをスキップして即時表示 |

---

## 公開メソッド

```js
// ターミナルモードを起動
PretendCLI.init(options);

// すべてを解除して元のHTMLに戻す
PretendCLI.destroy();
```

---

## ASCIIアートタイトル（ロゴ）

ロゴには **2つの方法** があります。

### 方法1: カスタムテキスト（外部ライブラリ不要）

自分でASCIIアートを用意して `logo.type: 'custom'` に渡すだけです。figlet.jsは不要です。

```js
PretendCLI.init({
  logo: {
    type: 'custom',
    text: `
 ____            _                 _
|  _ \ _ __ ___| |_ ___ _ __   __| |
| |_) | '__/ _ \ __/ _ \ '_ \ / _  |
|  __/| | |  __/ ||  __/ | | | (_| |
|_|   |_|  \___|\__\___|_| |_|\__,_|
    `,
  },
});
```

> ASCIIアートの生成は [patorjk.com/software/taag](https://patorjk.com/software/taag/) などのオンラインツールが便利です。

---

### 方法2: figlet.js連携（外部ライブラリ必要）

> ⚠️ **figlet.jsはPretendCLI.jsに含まれていません。** 別途読み込みが必要な外部ライブラリです。

figletを使うには、pretend-cli.jsより前に読み込み、フォントをプリロードしてから`init()`を呼んでください。

```html
<script src="https://cdn.jsdelivr.net/npm/figlet/lib/figlet.js"></script>
<script src="pretend-cli.js"></script>
<script>
  figlet.defaults({ fontPath: '' }); // フォントファイルの置き場所を指定
  figlet.preloadFonts(['Standard'], function () {
    PretendCLI.init({
      target: '#terminal-zone',
      logo: { type: 'figlet', font: 'Standard' },
    });
  });
</script>
```

---

## ライセンス

MIT
