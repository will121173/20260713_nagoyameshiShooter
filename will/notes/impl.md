# 実装メモ

- 配置: `will/app/`（リポジトリ直下ではなく will 内）
- MVP Must 完了（2026-07-13）
- 制限時間 60 秒 + ライフ 3 の両方を採用
- 弾は味噌カツ固定
- SE: `src/audio.ts`（Web Audio）
- ボイス部品: `src/voice/`（`createJokeVoice`）。セリフ JSON は `public/voice/lines.json`
- 撃破・ミス時に Canvas 短命テキスト（ボイスと同文言）
- 未着手 Should: 弾種切替、ハイスコア
