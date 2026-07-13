import Phaser from 'phaser';
import { BOSS_EMOJI, BOSS_TEXTURE_SIZE, BOSS_X, BOSS_Y, DEPTH_BOSS } from '../config';
import { ensureEmojiTexture } from '../utils/emojiTexture';

export class Boss extends Phaser.GameObjects.Image {
  constructor(scene: Phaser.Scene) {
    super(scene, BOSS_X, BOSS_Y, ensureEmojiTexture(scene, BOSS_EMOJI, BOSS_TEXTURE_SIZE));
    this.setDepth(DEPTH_BOSS);
    scene.add.existing(this);
  }
}
