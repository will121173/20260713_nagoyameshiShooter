import Phaser from 'phaser';
import {
  BOSS_BODY_RADIUS,
  BOSS_EMOJI,
  BOSS_HIT_FLASH_COLOR,
  BOSS_HIT_FLASH_MS,
  BOSS_MAX_HP,
  BOSS_MOVE_AMPLITUDE,
  BOSS_MOVE_PERIOD_MS,
  BOSS_TEXTURE_SIZE,
  BOSS_X,
  BOSS_Y,
  DEPTH_BOSS,
} from '../config';
import { ensureEmojiTexture } from '../utils/emojiTexture';

export class Boss extends Phaser.GameObjects.Image {
  private hp = BOSS_MAX_HP;
  private elapsedMs = 0;

  constructor(scene: Phaser.Scene) {
    super(scene, BOSS_X, BOSS_Y, ensureEmojiTexture(scene, BOSS_EMOJI, BOSS_TEXTURE_SIZE));
    this.setDepth(DEPTH_BOSS);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    if (this.body instanceof Phaser.Physics.Arcade.Body) {
      const offset = BOSS_TEXTURE_SIZE / 2 - BOSS_BODY_RADIUS;
      this.body.setCircle(BOSS_BODY_RADIUS, offset, offset);
    }
  }

  /**
   * 左右にゆっくり往復する(ショットの狙いどころを作るため)
   * @param deltaMs 前フレームからの経過時間(ms)
   */
  update(deltaMs: number): void {
    this.elapsedMs += deltaMs;
    const phase = (this.elapsedMs / BOSS_MOVE_PERIOD_MS) * Math.PI * 2;
    this.x = BOSS_X + Math.sin(phase) * BOSS_MOVE_AMPLITUDE;
  }

  /**
   * ダメージを与え、被弾を白フラッシュで見せる
   * @param amount ダメージ量
   * @returns このダメージで撃破したら true
   */
  takeDamage(amount: number): boolean {
    if (this.hp <= 0) {
      return false;
    }
    this.hp -= amount;
    this.setTintFill(BOSS_HIT_FLASH_COLOR);
    this.scene.time.delayedCall(BOSS_HIT_FLASH_MS, () => this.clearTint());
    return this.hp <= 0;
  }

  /** 撃破時に非表示化して当たり判定を止める */
  defeat(): void {
    this.setVisible(false);
    if (this.body instanceof Phaser.Physics.Arcade.Body) {
      this.body.enable = false;
    }
  }

  /** 残りHPの割合(HPバー表示用、0〜1) */
  get hpRatio(): number {
    return Math.max(0, this.hp / BOSS_MAX_HP);
  }
}
