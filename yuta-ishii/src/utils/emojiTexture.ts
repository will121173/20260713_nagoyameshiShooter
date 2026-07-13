import Phaser from 'phaser';
import { EMOJI_FONT_RATIO } from '../config';

/**
 * 絵文字テクスチャのキーを組み立てる
 * @param emoji 対象の絵文字
 * @param size テクスチャの一辺(px)
 * @returns テクスチャキー
 */
export const emojiTextureKey = (emoji: string, size: number): string => `emoji:${emoji}:${size}`;

/**
 * 絵文字をCanvasに描いてテクスチャ登録する
 * (画像ファイルを使わずにリアル寄りの見た目を出すため。Spriteとして
 *  WebGLバッチに乗るので大量描画でも60fpsを維持できる)
 * @param scene テクスチャを登録するシーン
 * @param emoji 描画する絵文字
 * @param size テクスチャの一辺(px)
 * @returns 登録済みテクスチャのキー
 */
export const ensureEmojiTexture = (scene: Phaser.Scene, emoji: string, size: number): string => {
  const key = emojiTextureKey(emoji, size);
  if (scene.textures.exists(key)) {
    return key;
  }
  const texture = scene.textures.createCanvas(key, size, size);
  if (!texture) {
    throw new Error(`絵文字テクスチャの生成に失敗: ${emoji}`);
  }
  const context = texture.getContext();
  context.font = `${Math.floor(size * EMOJI_FONT_RATIO)}px sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(emoji, size / 2, size / 2);
  texture.refresh();
  return key;
};
