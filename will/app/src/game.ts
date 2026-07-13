import {
  BULLET_COOLDOWN,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  COLORS,
  ENEMY_SPAWN_INTERVAL,
  FX_DURATION,
  FX_FONT,
  FX_LINE_HEIGHT,
  FX_MAX_WIDTH,
  GAME_DURATION_SEC,
  HIT_SCORE,
  INITIAL_LIVES,
  PLAYER_SPEED,
} from "./constants";
import {
  aabb,
  createBullet,
  createEnemy,
  createPlayer,
  drawBackground,
  drawBullet,
  drawEnemy,
  drawPlayer,
  type Bullet,
  type Enemy,
  type Player,
} from "./entities";
import { consumeFire, getKeys } from "./input";

export type GameEvent = "shot" | "hit" | "miss" | "over";

export type GameSnapshot = {
  score: number;
  timeLeft: number;
  lives: number;
  over: boolean;
};

type Fx = {
  text: string;
  ttl: number;
  color: string;
};

/** 明示改行（\n）＋幅オーバー時の自動折り返し */
function wrapFxLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const paragraphs = text.replace(/\r\n/g, "\n").split("\n");
  const lines: string[] = [];

  for (const paragraph of paragraphs) {
    if (paragraph.length === 0) {
      lines.push("");
      continue;
    }
    let line = "";
    for (const ch of paragraph) {
      const next = line + ch;
      if (line && ctx.measureText(next).width > maxWidth) {
        lines.push(line);
        line = ch;
      } else {
        line = next;
      }
    }
    if (line) lines.push(line);
  }

  return lines.length > 0 ? lines : [text];
}

export class Game {
  private player: Player = createPlayer();
  private bullets: Bullet[] = [];
  private enemies: Enemy[] = [];
  private score = 0;
  private timeLeft = GAME_DURATION_SEC;
  private lives = INITIAL_LIVES;
  private spawnTimer = 0;
  private fireCooldown = 0;
  private over = false;
  private fx: Fx | null = null;

  reset(): void {
    this.player = createPlayer();
    this.bullets = [];
    this.enemies = [];
    this.score = 0;
    this.timeLeft = GAME_DURATION_SEC;
    this.lives = INITIAL_LIVES;
    this.spawnTimer = 0;
    this.fireCooldown = 0;
    this.over = false;
    this.fx = null;
  }

  getSnapshot(): GameSnapshot {
    return {
      score: this.score,
      timeLeft: this.timeLeft,
      lives: this.lives,
      over: this.over,
    };
  }

  showFx(text: string, color: string = COLORS.accent): void {
    this.fx = { text, ttl: FX_DURATION, color };
  }

  update(dt: number): GameEvent[] {
    const events: GameEvent[] = [];
    if (this.over) return events;

    if (this.fx) {
      this.fx.ttl -= dt;
      if (this.fx.ttl <= 0) this.fx = null;
    }

    this.timeLeft -= dt;
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.over = true;
      events.push("over");
      return events;
    }

    const keys = getKeys();
    let dx = 0;
    if (keys.left) dx -= 1;
    if (keys.right) dx += 1;
    this.player.x += dx * PLAYER_SPEED * dt;
    this.player.x = Math.max(
      0,
      Math.min(CANVAS_WIDTH - this.player.w, this.player.x),
    );

    this.fireCooldown -= dt;
    if (consumeFire() && this.fireCooldown <= 0) {
      this.bullets.push(createBullet(this.player));
      this.fireCooldown = BULLET_COOLDOWN;
      events.push("shot");
    }

    for (const b of this.bullets) {
      b.y += b.vy * dt;
    }
    this.bullets = this.bullets.filter((b) => b.y + b.h > 0);

    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.enemies.push(createEnemy());
      this.spawnTimer = ENEMY_SPAWN_INTERVAL;
    }

    for (const e of this.enemies) {
      e.y += e.vy * dt;
    }

    const reached: Enemy[] = [];
    const remaining: Enemy[] = [];
    for (const e of this.enemies) {
      if (e.y > CANVAS_HEIGHT) {
        reached.push(e);
      } else {
        remaining.push(e);
      }
    }
    this.enemies = remaining;
    if (reached.length > 0) {
      this.lives -= reached.length;
      events.push("miss");
      if (this.lives <= 0) {
        this.lives = 0;
        this.over = true;
        events.push("over");
        return events;
      }
    }

    const hitBullets = new Set<Bullet>();
    const hitEnemies = new Set<Enemy>();
    for (const b of this.bullets) {
      for (const e of this.enemies) {
        if (hitBullets.has(b) || hitEnemies.has(e)) continue;
        if (aabb(b, e)) {
          hitBullets.add(b);
          hitEnemies.add(e);
          this.score += HIT_SCORE;
        }
      }
    }
    this.bullets = this.bullets.filter((b) => !hitBullets.has(b));
    this.enemies = this.enemies.filter((e) => !hitEnemies.has(e));

    if (hitEnemies.size > 0) {
      events.push("hit");
    }

    return events;
  }

  render(ctx: CanvasRenderingContext2D): void {
    drawBackground(ctx);
    drawPlayer(ctx, this.player);
    for (const b of this.bullets) drawBullet(ctx, b);
    for (const e of this.enemies) drawEnemy(ctx, e);

    if (this.fx) {
      const alpha = Math.min(1, this.fx.ttl / (FX_DURATION * 0.35));
      ctx.save();
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.fillStyle = this.fx.color;
      ctx.font = FX_FONT;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const lines = wrapFxLines(ctx, this.fx.text, FX_MAX_WIDTH);
      const blockHeight = lines.length * FX_LINE_HEIGHT;
      const startY = CANVAS_HEIGHT * 0.38 - blockHeight / 2 + FX_LINE_HEIGHT / 2;
      const x = CANVAS_WIDTH / 2;

      ctx.strokeStyle = "rgba(42, 21, 16, 0.85)";
      ctx.lineWidth = 4;
      ctx.lineJoin = "round";
      for (let i = 0; i < lines.length; i++) {
        const y = startY + i * FX_LINE_HEIGHT;
        ctx.strokeText(lines[i], x, y);
        ctx.fillText(lines[i], x, y);
      }
      ctx.restore();
    }
  }
}
