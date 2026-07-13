import Phaser from 'phaser';
import { Bullet } from '../bullets/Bullet';
import { BulletPool } from '../bullets/BulletPool';
import {
  BULLET_POOL_SIZE,
  BULLET_RADIUS,
  BULLET_TEXTURE_SIZE,
  DEFAULT_BULLET_EMOJI,
  DEPTH_HUD,
  GAME_HEIGHT,
  GAME_WIDTH,
  HIT_FLASH_COLOR,
  HIT_FLASH_MS,
  HP_BAR_BG_COLOR,
  HP_BAR_COLOR,
  HP_BAR_HEIGHT,
  HP_BAR_WIDTH,
  HP_BAR_Y,
  HUD_MARGIN,
  INVINCIBLE_MS,
  LIVES_START,
  PATTERN_ROTATE_MS,
  PLAYER_SHOT_DAMAGE,
  PLAYER_SHOT_EMOJI,
  PLAYER_SHOT_POOL_SIZE,
  PLAYER_SHOT_RADIUS,
  PLAYER_SHOT_TEXTURE_SIZE,
  SCORE_CLEAR_BONUS,
  SCORE_PER_HIT,
  SHAKE_INTENSITY,
  SHAKE_MS,
} from '../config';
import { PatternRunner } from '../danmaku/PatternRunner';
import { parsePatternDef, type PatternDef } from '../danmaku/types';
import aimedJson from '../danmaku/patterns/aimed.json';
import radialJson from '../danmaku/patterns/radial.json';
import scatterJson from '../danmaku/patterns/scatter.json';
import stressJson from '../danmaku/patterns/stress.json';
import { Effects } from '../effects/Effects';
import { Boss } from '../entities/Boss';
import { Player } from '../entities/Player';
import { FpsMonitor } from '../ui/FpsMonitor';
import { ensureEmojiTexture } from '../utils/emojiTexture';

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

const CENTER_TEXT_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'monospace',
  fontSize: '36px',
  color: '#ffffff',
  align: 'center',
};

const HELP_TEXT =
  '移動:矢印/WASD  ショット:Z/Space  低速:Shift  リスタート:R  負荷テスト:T';

/**
 * HUDに表示するパターン名(弾の絵文字つき)を組み立てる
 * @param pattern 対象のパターン定義
 * @returns 表示用ラベル
 */
const patternLabel = (pattern: PatternDef): string =>
  `${pattern.bulletEmoji ?? DEFAULT_BULLET_EMOJI} ${pattern.name}`;

/** 1プレイの決着状態 */
type Outcome = 'playing' | 'gameover' | 'clear';

/** 1プレイぶんのゲーム状態(シーンrestartのたびに作り直す) */
type WorldState = {
  /** 自機 */
  player: Player;
  /** ボス(発射源) */
  boss: Boss;
  /** 敵弾プール */
  bulletPool: BulletPool;
  /** 自機ショットのプール */
  shotPool: BulletPool;
  /** 弾幕パターンの実行器 */
  runner: PatternRunner;
  /** fps・弾数の常時表示 */
  fpsMonitor: FpsMonitor;
  /** パーティクル演出 */
  effects: Effects;
  /** スコア・残機の表示 */
  statusText: Phaser.GameObjects.Text;
  /** 現在のパターン名の表示 */
  patternNameText: Phaser.GameObjects.Text;
  /** ボスHPバー */
  hpBar: Phaser.GameObjects.Graphics;
  /** クリア・ゲームオーバーの中央表示 */
  centerText: Phaser.GameObjects.Text;
  /** スコア */
  score: number;
  /** 残機 */
  lives: number;
  /** 無敵が切れる時刻(scene time基準, ms) */
  invincibleUntil: number;
  /** ローテーション中のパターンindex */
  patternIndex: number;
  /** 負荷テストモード中か */
  stressMode: boolean;
  /** 決着状態 */
  outcome: Outcome;
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
    const bulletPool = new BulletPool(this, {
      emoji: DEFAULT_BULLET_EMOJI,
      textureSize: BULLET_TEXTURE_SIZE,
      bodyRadius: BULLET_RADIUS,
      poolSize: BULLET_POOL_SIZE,
    });
    const shotPool = new BulletPool(this, {
      emoji: PLAYER_SHOT_EMOJI,
      textureSize: PLAYER_SHOT_TEXTURE_SIZE,
      bodyRadius: PLAYER_SHOT_RADIUS,
      poolSize: PLAYER_SHOT_POOL_SIZE,
    });
    const boss = new Boss(this);
    const player = new Player(this, shotPool);
    const statusText = this.add
      .text(HUD_MARGIN, HUD_MARGIN, '', HUD_TEXT_STYLE)
      .setDepth(DEPTH_HUD);
    const patternNameText = this.add
      .text(GAME_WIDTH / 2, HUD_MARGIN, '', HUD_TEXT_STYLE)
      .setOrigin(0.5, 0)
      .setDepth(DEPTH_HUD);
    const centerText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, '', CENTER_TEXT_STYLE)
      .setOrigin(0.5)
      .setDepth(DEPTH_HUD)
      .setVisible(false);
    this.add
      .text(HUD_MARGIN, GAME_HEIGHT - HUD_MARGIN, HELP_TEXT, HELP_TEXT_STYLE)
      .setOrigin(0, 1)
      .setDepth(DEPTH_HUD);

    this.world = {
      player,
      boss,
      bulletPool,
      shotPool,
      runner: new PatternRunner(bulletPool),
      fpsMonitor: new FpsMonitor(this),
      effects: new Effects(this),
      statusText,
      patternNameText,
      hpBar: this.add.graphics().setDepth(DEPTH_HUD),
      centerText,
      score: 0,
      lives: LIVES_START,
      invincibleUntil: 0,
      patternIndex: 0,
      stressMode: false,
      outcome: 'playing',
    };
    this.applyPattern(0);
    this.updateStatusText();
    this.updateHpBar();

    this.physics.add.overlap(player, bulletPool, () => this.onPlayerHit());
    this.physics.add.overlap(boss, shotPool, (a, b) => {
      const shot = a instanceof Bullet ? a : b instanceof Bullet ? b : null;
      if (shot) {
        this.onBossHit(shot);
      }
    });
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
    world.fpsMonitor.update(delta, this.game.loop.actualFps, world.bulletPool.activeCount());
    if (world.outcome !== 'playing') {
      return;
    }
    const invincibleRemainingMs = Math.max(0, world.invincibleUntil - time);
    world.player.update(delta, invincibleRemainingMs);
    world.boss.update(delta);
    world.runner.update(delta, world.boss, world.player);
  }

  /** 被弾処理。無敵中は何もしない。残機が尽きたらゲームオーバー */
  private onPlayerHit(): void {
    const world = this.world;
    if (!world || world.outcome !== 'playing') {
      return;
    }
    const now = this.time.now;
    if (now < world.invincibleUntil) {
      return;
    }
    world.invincibleUntil = now + INVINCIBLE_MS;
    world.lives -= 1;
    this.cameras.main.flash(HIT_FLASH_MS, ...HIT_FLASH_COLOR);
    this.cameras.main.shake(SHAKE_MS, SHAKE_INTENSITY);
    world.effects.playerHit(world.player.x, world.player.y);
    world.bulletPool.despawnAll();
    this.updateStatusText();
    if (world.lives < 0) {
      world.outcome = 'gameover';
      world.player.hide();
      world.centerText
        .setText(`おなかいっぱい…\nスコア ${world.score}\nR でリスタート`)
        .setVisible(true);
    }
  }

  /**
   * 自機ショットがボスに当たったときの処理
   * @param shot 命中したショット
   */
  private onBossHit(shot: Bullet): void {
    const world = this.world;
    if (!world || world.outcome !== 'playing') {
      return;
    }
    shot.despawn();
    world.score += SCORE_PER_HIT;
    world.effects.bossHit(shot.x, shot.y);
    const defeated = world.boss.takeDamage(PLAYER_SHOT_DAMAGE);
    this.updateHpBar();
    if (defeated) {
      world.outcome = 'clear';
      world.score += SCORE_CLEAR_BONUS;
      world.bulletPool.despawnAll();
      world.effects.clearBurst(world.boss.x, world.boss.y);
      world.boss.defeat();
      world.centerText
        .setText(`完食!!\nスコア ${world.score}\nR でリスタート`)
        .setVisible(true);
    }
    this.updateStatusText();
  }

  /** スコアと残機の表示を更新する */
  private updateStatusText(): void {
    const world = this.world;
    if (!world) {
      return;
    }
    world.statusText.setText(`スコア ${world.score}\n残機 ${Math.max(0, world.lives)}`);
  }

  /** ボスHPバーを描き直す */
  private updateHpBar(): void {
    const world = this.world;
    if (!world) {
      return;
    }
    const barX = GAME_WIDTH / 2 - HP_BAR_WIDTH / 2;
    world.hpBar.clear();
    world.hpBar.fillStyle(HP_BAR_BG_COLOR, 1);
    world.hpBar.fillRect(barX, HP_BAR_Y, HP_BAR_WIDTH, HP_BAR_HEIGHT);
    world.hpBar.fillStyle(HP_BAR_COLOR, 1);
    world.hpBar.fillRect(barX, HP_BAR_Y, HP_BAR_WIDTH * world.boss.hpRatio, HP_BAR_HEIGHT);
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

  /** 次のパターンへ切り替える(負荷テスト中と決着後はローテーションを止める) */
  private rotatePattern(): void {
    const world = this.world;
    if (!world || world.stressMode || world.outcome !== 'playing') {
      return;
    }
    this.applyPattern((world.patternIndex + 1) % ROTATION_PATTERNS.length);
  }

  /** 負荷テストモード(同時約800発)を切り替える */
  private toggleStressMode(): void {
    const world = this.world;
    if (!world || world.outcome !== 'playing') {
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
