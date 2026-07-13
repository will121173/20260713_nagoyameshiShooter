import { playSfx, unlockAudio } from "./audio";
import { COLORS } from "./constants";
import { Game, type GameEvent } from "./game";
import { consumeRetry, consumeStart, initInput } from "./input";
import { createJokeVoice } from "./voice";

type Screen = "title" | "playing" | "gameover";

const titleEl = document.getElementById("screen-title")!;
const playingEl = document.getElementById("screen-playing")!;
const gameoverEl = document.getElementById("screen-gameover")!;
const canvas = document.getElementById("game") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const hudScore = document.getElementById("hud-score")!;
const hudTime = document.getElementById("hud-time")!;
const hudLife = document.getElementById("hud-life")!;
const finalScore = document.getElementById("final-score")!;
const btnStart = document.getElementById("btn-start")!;
const btnRetry = document.getElementById("btn-retry")!;

const game = new Game();
const voice = createJokeVoice({ url: "/voice/lines.json" });

let screen: Screen = "title";
let last = 0;
let raf = 0;

function show(next: Screen): void {
  screen = next;
  titleEl.classList.toggle("hidden", next !== "title");
  playingEl.classList.toggle("hidden", next !== "playing");
  gameoverEl.classList.toggle("hidden", next !== "gameover");
}

function lifeHearts(n: number): string {
  return "❤️".repeat(Math.max(0, n));
}

function updateHud(): void {
  const s = game.getSnapshot();
  hudScore.textContent = `SCORE ${s.score}`;
  hudTime.textContent = `TIME ${Math.ceil(s.timeLeft)}`;
  hudLife.textContent = `LIFE ${lifeHearts(s.lives)}`;
}

function handleEvents(events: GameEvent[]): void {
  for (const ev of events) {
    if (ev === "shot") {
      playSfx("shot");
    } else if (ev === "hit") {
      playSfx("hit");
      game.showFx(voice.speak("hit"), COLORS.accent);
    } else if (ev === "miss") {
      playSfx("miss");
      game.showFx(voice.speak("miss"), COLORS.danger);
    } else if (ev === "over") {
      playSfx("over");
      voice.speak("over");
    }
  }
}

function startGame(): void {
  void (async () => {
    await unlockAudio();
    voice.warmUp();
    voice.speak("start");
  })();
  game.reset();
  show("playing");
  updateHud();
  last = performance.now();
}

function endGame(): void {
  const s = game.getSnapshot();
  finalScore.textContent = `SCORE ${s.score}`;
  show("gameover");
}

function loop(now: number): void {
  raf = requestAnimationFrame(loop);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  if (screen === "title") {
    if (consumeStart()) startGame();
    return;
  }

  if (screen === "gameover") {
    if (consumeRetry()) startGame();
    return;
  }

  const events = game.update(dt);
  handleEvents(events);
  game.render(ctx);
  updateHud();

  if (game.getSnapshot().over) {
    endGame();
  }
}

btnStart.addEventListener("click", () => startGame());
btnRetry.addEventListener("click", () => startGame());

initInput();
show("title");
void voice.load();
raf = requestAnimationFrame(loop);

void raf;
