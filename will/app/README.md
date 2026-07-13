# 名古屋めしシューティング

味噌カツ弾でよそもんを撃ち落とすブラウザゲーム。

## 起動

```bash
cd app
npm install
npm run dev
```

ブラウザで表示された URL（通常 `http://localhost:5173`）を開く。

## 操作

| キー | 動作 |
|------|------|
| ← → / A D | 自機移動 |
| Space / Z | 味噌カツ弾を発射 |
| Space | タイトルでスタート |
| R | ゲームオーバー後リトライ |

## ルール

- 制限時間 60 秒
- ライフ 3（敵が下端に到達すると −1）
- 撃破 +100 点

## ボイス差し替え

セリフは [`public/voice/lines.json`](public/voice/lines.json) を編集する。

```json
{
  "start": ["いくで！"],
  "hit": ["うまい！", "どて焼き！"],
  "miss": ["よそもんにやられた"],
  "over": ["腹減った…"]
}
```

部品の呼び出し（[`src/voice/`](src/voice/)）:

```ts
import { createJokeVoice } from "./voice";

const voice = createJokeVoice({ url: "/voice/lines.json" });
await voice.load();
voice.speak("hit");           // 抽選して読み上げ、文言を返す
voice.setLines({ hit: ["新ネタ"] }); // 実行時差し替え
```

- 配列のどれかがランダムで再生される
- `npm run dev` 中はファイル保存後にブラウザをリロードすれば反映
