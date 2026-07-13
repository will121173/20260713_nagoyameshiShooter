import {
  BULLET_SIZE,
  BULLET_SPEED,
  BULLETS,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  COLORS,
  ENEMIES,
  ENEMY_SIZE,
  ENEMY_SPEED_MAX,
  ENEMY_SPEED_MIN,
  PLAYER_HEIGHT,
  PLAYER_WIDTH,
  PLAYER_Y,
  type EnemyDef,
} from "./constants";

export type Rect = { x: number; y: number; w: number; h: number };

export type Player = Rect & {
  emoji: string;
};

export type Bullet = Rect & {
  emoji: string;
  label: string;
  vy: number;
};

export type Enemy = Rect & {
  emoji: string;
  label: string;
  vy: number;
};

export function createPlayer(): Player {
  return {
    x: (CANVAS_WIDTH - PLAYER_WIDTH) / 2,
    y: PLAYER_Y,
    w: PLAYER_WIDTH,
    h: PLAYER_HEIGHT,
    emoji: "🍱",
  };
}

export function createBullet(player: Player): Bullet {
  const def = BULLETS[0];
  return {
    x: player.x + player.w / 2 - BULLET_SIZE / 2,
    y: player.y - BULLET_SIZE,
    w: BULLET_SIZE,
    h: BULLET_SIZE,
    emoji: def.emoji,
    label: def.label,
    vy: -BULLET_SPEED,
  };
}

export function createEnemy(): Enemy {
  const def: EnemyDef = ENEMIES[Math.floor(Math.random() * ENEMIES.length)];
  const speed =
    ENEMY_SPEED_MIN + Math.random() * (ENEMY_SPEED_MAX - ENEMY_SPEED_MIN);
  return {
    x: Math.random() * (CANVAS_WIDTH - ENEMY_SIZE),
    y: -ENEMY_SIZE,
    w: ENEMY_SIZE,
    h: ENEMY_SIZE,
    emoji: def.emoji,
    label: def.label,
    vy: speed,
  };
}

export function aabb(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
  );
}

export function drawBackground(ctx: CanvasRenderingContext2D): void {
  const g = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
  g.addColorStop(0, COLORS.bgTop);
  g.addColorStop(1, COLORS.bgBottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

export function drawPlayer(ctx: CanvasRenderingContext2D, p: Player): void {
  const cx = p.x + p.w / 2;
  const top = p.y;
  const bottom = p.y + p.h;

  ctx.fillStyle = COLORS.player;
  ctx.beginPath();
  ctx.moveTo(cx, top);
  ctx.lineTo(p.x, bottom);
  ctx.lineTo(p.x + p.w, bottom);
  ctx.closePath();
  ctx.fill();

  ctx.font = "20px Segoe UI Emoji, Apple Color Emoji, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(p.emoji, cx, p.y + p.h / 2 + 2);
}

export function drawBullet(ctx: CanvasRenderingContext2D, b: Bullet): void {
  ctx.font = "22px Segoe UI Emoji, Apple Color Emoji, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(b.emoji, b.x + b.w / 2, b.y + b.h / 2);
}

export function drawEnemy(ctx: CanvasRenderingContext2D, e: Enemy): void {
  ctx.font = "32px Segoe UI Emoji, Apple Color Emoji, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(e.emoji, e.x + e.w / 2, e.y + e.h / 2);
}
