import Phaser from 'phaser';
import type { BulletPool } from '../bullets/BulletPool';
import {
  DEPTH_HITBOX,
  DEPTH_PLAYER,
  GAME_HEIGHT,
  GAME_WIDTH,
  HITBOX_COLOR,
  PLAYER_BLINK_ALPHA,
  PLAYER_BLINK_INTERVAL_MS,
  PLAYER_EMOJI,
  PLAYER_HITBOX_RADIUS,
  PLAYER_SHOT_ANGLE_RAD,
  PLAYER_SHOT_INTERVAL_MS,
  PLAYER_SHOT_OFFSET_X,
  PLAYER_SHOT_SPEED,
  PLAYER_SLOW_BODY_ALPHA,
  PLAYER_SLOW_FACTOR,
  PLAYER_SPEED,
  PLAYER_START_X,
  PLAYER_START_Y,
  PLAYER_TEXTURE_SIZE,
} from '../config';
import { ensureEmojiTexture } from '../utils/emojiTexture';

type Direction = 'up' | 'down' | 'left' | 'right';

/** 方向ごとの入力キー(矢印とWASDの2系統) */
type MoveKeys = Record<Direction, Phaser.Input.Keyboard.Key[]>;

/** 画面端で自機グラフィックが見切れないようにするための余白 */
const CLAMP_MARGIN = PLAYER_TEXTURE_SIZE / 2;

export class Player extends Phaser.GameObjects.Image {
  private readonly hitboxIndicator: Phaser.GameObjects.Arc;
  private readonly moveKeys: MoveKeys;
  private readonly slowKey: Phaser.Input.Keyboard.Key;
  private readonly shotKeys: Phaser.Input.Keyboard.Key[];
  private readonly shotPool: BulletPool;
  private shotCooldownMs = 0;

  constructor(scene: Phaser.Scene, shotPool: BulletPool) {
    super(
      scene,
      PLAYER_START_X,
      PLAYER_START_Y,
      ensureEmojiTexture(scene, PLAYER_EMOJI, PLAYER_TEXTURE_SIZE),
    );
    this.shotPool = shotPool;
    this.setDepth(DEPTH_PLAYER);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    if (this.body instanceof Phaser.Physics.Arcade.Body) {
      // 判定円(グラフィックの約35%)を自機グラフィックの中心に合わせる
      const offset = PLAYER_TEXTURE_SIZE / 2 - PLAYER_HITBOX_RADIUS;
      this.body.setCircle(PLAYER_HITBOX_RADIUS, offset, offset);
    }

    this.hitboxIndicator = scene.add
      .arc(this.x, this.y, PLAYER_HITBOX_RADIUS, 0, 360, false, HITBOX_COLOR, 1)
      .setDepth(DEPTH_HITBOX)
      .setVisible(false);

    const keyboard = scene.input.keyboard;
    if (!keyboard) {
      throw new Error('キーボード入力が利用できない環境では動作しない');
    }
    const codes = Phaser.Input.Keyboard.KeyCodes;
    this.moveKeys = {
      up: [keyboard.addKey(codes.UP), keyboard.addKey(codes.W)],
      down: [keyboard.addKey(codes.DOWN), keyboard.addKey(codes.S)],
      left: [keyboard.addKey(codes.LEFT), keyboard.addKey(codes.A)],
      right: [keyboard.addKey(codes.RIGHT), keyboard.addKey(codes.D)],
    };
    this.slowKey = keyboard.addKey(codes.SHIFT);
    this.shotKeys = [keyboard.addKey(codes.Z), keyboard.addKey(codes.SPACE)];
  }

  /**
   * 入力を読んでdeltaベースで移動・射撃し、低速中は判定円を表示する
   * @param deltaMs 前フレームからの経過時間(ms)
   * @param invincibleRemainingMs 無敵の残り時間(ms)。0以下なら通常状態
   */
  update(deltaMs: number, invincibleRemainingMs: number): void {
    const slow = this.slowKey.isDown;
    const speed = PLAYER_SPEED * (slow ? PLAYER_SLOW_FACTOR : 1);
    const distance = (speed * deltaMs) / 1000;

    let moveX = (this.isDirectionDown('right') ? 1 : 0) - (this.isDirectionDown('left') ? 1 : 0);
    let moveY = (this.isDirectionDown('down') ? 1 : 0) - (this.isDirectionDown('up') ? 1 : 0);
    if (moveX !== 0 && moveY !== 0) {
      // 斜め移動が速くならないよう正規化する
      moveX *= Math.SQRT1_2;
      moveY *= Math.SQRT1_2;
    }
    this.x = Phaser.Math.Clamp(this.x + moveX * distance, CLAMP_MARGIN, GAME_WIDTH - CLAMP_MARGIN);
    this.y = Phaser.Math.Clamp(this.y + moveY * distance, CLAMP_MARGIN, GAME_HEIGHT - CLAMP_MARGIN);

    this.hitboxIndicator.setPosition(this.x, this.y);
    this.hitboxIndicator.setVisible(slow);

    const blinkOn =
      invincibleRemainingMs > 0 &&
      Math.floor(invincibleRemainingMs / PLAYER_BLINK_INTERVAL_MS) % 2 === 0;
    this.setAlpha((blinkOn ? PLAYER_BLINK_ALPHA : 1) * (slow ? PLAYER_SLOW_BODY_ALPHA : 1));

    this.shotCooldownMs = Math.max(0, this.shotCooldownMs - deltaMs);
    const shooting = this.shotKeys.some((key) => key.isDown);
    if (shooting && this.shotCooldownMs === 0) {
      this.shotCooldownMs = PLAYER_SHOT_INTERVAL_MS;
      this.shotPool.spawn(
        this.x - PLAYER_SHOT_OFFSET_X,
        this.y,
        PLAYER_SHOT_ANGLE_RAD,
        PLAYER_SHOT_SPEED,
      );
      this.shotPool.spawn(
        this.x + PLAYER_SHOT_OFFSET_X,
        this.y,
        PLAYER_SHOT_ANGLE_RAD,
        PLAYER_SHOT_SPEED,
      );
    }
  }

  /** ゲームオーバー時に自機と判定円を隠す */
  hide(): void {
    this.setVisible(false);
    this.hitboxIndicator.setVisible(false);
  }

  /**
   * 指定方向のキーがいずれか押されているか
   * @param direction 判定する方向
   * @returns 押されていれば true
   */
  private isDirectionDown(direction: Direction): boolean {
    return this.moveKeys[direction].some((key) => key.isDown);
  }
}
