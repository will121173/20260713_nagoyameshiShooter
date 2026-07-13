import Phaser from 'phaser';
import { BulletPool } from '../bullets/BulletPool';
import {
  BULLET_TEXTURE_SIZE,
  DEFAULT_BULLET_EMOJI,
  DEPTH_HUD,
  GAME_HEIGHT,
  GAME_WIDTH,
  HIT_FLASH_COLOR,
  HIT_FLASH_MS,
  HUD_MARGIN,
  INVINCIBLE_MS,
  PATTERN_ROTATE_MS,
} from '../config';
import { ensureEmojiTexture } from '../utils/emojiTexture';
import { PatternRunner } from '../danmaku/PatternRunner';
import { parsePatternDef, type PatternDef } from '../danmaku/types';
import aimedJson from '../danmaku/patterns/aimed.json';
import radialJson from '../danmaku/patterns/radial.json';
import scatterJson from '../danmaku/patterns/scatter.json';
import stressJson from '../danmaku/patterns/stress.json';
import { Boss } from '../entities/Boss';
import { Player } from '../entities/Player';
import { FpsMonitor } from '../ui/FpsMonitor';

const ROTATION_PATTERNS: PatternDef[] = [aimedJson, radialJson, scatterJson].map(parsePatternDef);
const STRESS_PATTERN: PatternDef = parsePatternDef(stressJson);

const HUD_TEXT_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'monospace',
  fontSize: '16px',
  color: '#ffffff',
};

const HELP_TEXT_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'monospace',
  fontSize: '13px',
  color: '#888888',
};

const HELP_TEXT = '移動:矢印/WASD  低速:Shift  リスタート:R  負荷テスト:T';

/**
 * HUDに表示するパターン名(弾の絵文字つき)を組み立てる
 * @param pattern 対象のパターン定義
 * @returns 表示用ラベル
 */
const patternLabel = (pattern: PatternDef): string =>
  `${pattern.bulletEmoji ?? DEFAULT_BULLET_EMOJI} ${pattern.name}`;

/** 1プレイぶんのゲーム状態(シーンrestartのたびに作り直す) */
type WorldState = {
  /** 自機 */
  player: Player;
  /** ボス(発射源) */
  boss: Boss;
  /** 弾プール */
  bulletPool: BulletPool;
  /** 弾幕パターンの実行器 */
  runner: PatternRunner;
  /** fps・弾数の常時表示 */
  fpsMonitor: FpsMonitor;
  /** 被弾回数の表示 */
  hitCountText: Phaser.GameObjects.Text;
  /** 現在のパターン名の表示 */
  patternNameText: Phaser.GameObjects.Text;
  /** 被弾回数 */
  hitCount: number;
  /** 無敵が切れる時刻(scene time基準, ms) */
  invincibleUntil: number;
  /** ローテーション中のパターンindex */
  patternIndex: number;
  /** 負荷テストモード中か */
  stressMode: boolean;
};

export class GameScene extends Phaser.Scene {
  private world?: WorldState;

  constructor() {
    super('game');
  }

  create(): void {
    // パターン切替時のテクスチャ生成による引っかかりを避けるため先に全部作る
    for (const pattern of [...ROTATION_PATTERNS, STRESS_PATTERN]) {
      ensureEmojiTexture(this, pattern.bulletEmoji ?? DEFAULT_BULLET_EMOJI, BULLET_TEXTURE_SIZE);
    }
    const bulletPool = new BulletPool(this);
    const boss = new Boss(this);
    const player = new Player(this);
    const hitCountText = this.add
      .text(HUD_MARGIN, HUD_MARGIN, '被弾 0', HUD_TEXT_STYLE)
      .setDepth(DEPTH_HUD);
    const patternNameText = this.add
      .text(GAME_WIDTH / 2, HUD_MARGIN, '', HUD_TEXT_STYLE)
      .setOrigin(0.5, 0)
      .setDepth(DEPTH_HUD);
    this.add
      .text(HUD_MARGIN, GAME_HEIGHT - HUD_MARGIN, HELP_TEXT, HELP_TEXT_STYLE)
      .setOrigin(0, 1)
      .setDepth(DEPTH_HUD);

    this.world = {
      player,
      boss,
      bulletPool,
      runner: new PatternRunner(bulletPool),
      fpsMonitor: new FpsMonitor(this),
      hitCountText,
      patternNameText,
      hitCount: 0,
      invincibleUntil: 0,
      patternIndex: 0,
      stressMode: false,
    };
    this.applyPattern(0);

    this.physics.add.overlap(player, bulletPool, () => this.onPlayerHit());
    this.time.addEvent({
      delay: PATTERN_ROTATE_MS,
      loop: true,
      callback: () => this.rotatePattern(),
    });

    const keyboard = this.input.keyboard;
    if (keyboard) {
      keyboard.on('keydown-R', () => this.scene.restart());
      keyboard.on('keydown-T', () => this.toggleStressMode());
    }
  }

  update(time: number, delta: number): void {
    const world = this.world;
    if (!world) {
      return;
    }
    const invincibleRemainingMs = Math.max(0, world.invincibleUntil - time);
    world.player.update(delta, invincibleRemainingMs);
    world.runner.update(delta, world.boss, world.player);
    world.fpsMonitor.update(delta, this.game.loop.actualFps, world.bulletPool.activeCount());
  }

  /** 被弾処理。無敵中は何もしない */
  private onPlayerHit(): void {
    const world = this.world;
    if (!world) {
      return;
    }
    const now = this.time.now;
    if (now < world.invincibleUntil) {
      return;
    }
    world.invincibleUntil = now + INVINCIBLE_MS;
    world.hitCount += 1;
    world.hitCountText.setText(`被弾 ${world.hitCount}`);
    this.cameras.main.flash(HIT_FLASH_MS, ...HIT_FLASH_COLOR);
    world.bulletPool.despawnAll();
  }

  /**
   * ローテーション対象のパターンを適用する
   * @param index ROTATION_PATTERNS のindex
   */
  private applyPattern(index: number): void {
    const world = this.world;
    if (!world) {
      return;
    }
    world.patternIndex = index;
    const pattern = ROTATION_PATTERNS[index];
    world.runner.setPattern(pattern);
    world.patternNameText.setText(patternLabel(pattern));
  }

  /** 次のパターンへ切り替える(負荷テスト中はローテーションを止める) */
  private rotatePattern(): void {
    const world = this.world;
    if (!world || world.stressMode) {
      return;
    }
    this.applyPattern((world.patternIndex + 1) % ROTATION_PATTERNS.length);
  }

  /** 負荷テストモード(同時約800発)を切り替える */
  private toggleStressMode(): void {
    const world = this.world;
    if (!world) {
      return;
    }
    world.stressMode = !world.stressMode;
    if (world.stressMode) {
      world.runner.setPattern(STRESS_PATTERN);
      world.patternNameText.setText(patternLabel(STRESS_PATTERN));
    } else {
      this.applyPattern(world.patternIndex);
    }
  }
}
