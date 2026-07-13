export type KeyMap = {
  left: boolean;
  right: boolean;
  fire: boolean;
  start: boolean;
  retry: boolean;
};

const state: KeyMap = {
  left: false,
  right: false,
  fire: false,
  start: false,
  retry: false,
};

const justPressed = {
  start: false,
  retry: false,
  fire: false,
};

function setKey(code: string, down: boolean): void {
  switch (code) {
    case "ArrowLeft":
    case "KeyA":
      state.left = down;
      break;
    case "ArrowRight":
    case "KeyD":
      state.right = down;
      break;
    case "Space":
    case "KeyZ":
      if (down && !state.fire) justPressed.fire = true;
      state.fire = down;
      if (code === "Space" && down) justPressed.start = true;
      break;
    case "KeyR":
      if (down && !state.retry) justPressed.retry = true;
      state.retry = down;
      break;
    default:
      break;
  }
}

export function initInput(): void {
  window.addEventListener("keydown", (e) => {
    if (["ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
      e.preventDefault();
    }
    setKey(e.code, true);
  });
  window.addEventListener("keyup", (e) => {
    setKey(e.code, false);
  });
}

export function getKeys(): Readonly<KeyMap> {
  return state;
}

export function consumeStart(): boolean {
  const v = justPressed.start;
  justPressed.start = false;
  return v;
}

export function consumeRetry(): boolean {
  const v = justPressed.retry;
  justPressed.retry = false;
  return v;
}

export function consumeFire(): boolean {
  const v = justPressed.fire;
  justPressed.fire = false;
  return v || state.fire;
}
