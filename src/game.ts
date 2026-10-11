import type {
  Game,
  InitApi,
  PointerSample,
  RenderApi,
  UpdateApi,
} from "@clockwyrks/simple-2d";
import type { DeepReadonly } from "ts-essentials";
import {
  ACTIONS,
  AI_DEADZONE,
  AI_HOME_DEADZONE,
  AI_HOME_Y,
  AI_REACT,
  AI_SPEED,
  BALL_R,
  BINDINGS,
  CAROM_DEBUG_VERSION,
  CUES,
  FIELD_CX,
  FIELD_CY,
  FIELD_H,
  FIELD_W,
  HOLD_TIME,
  MATCHOVER_ITEMS,
  MAX_BOUNCE_ANGLE,
  MAX_SUBSTEP,
  NET_X,
  OBSTACLE_CENTERS,
  OBSTACLE_H,
  OBSTACLE_W,
  OBSTACLES,
  P1_X0,
  P1_X1,
  P2_X0,
  P2_X1,
  PADDLE_H,
  PADDLE_HALF,
  PADDLE_MAX_CY,
  PADDLE_MIN_CY,
  PADDLE_SPEED,
  PADDLE_W,
  PAUSE_ITEMS,
  SERVE_ANGLE,
  SERVE_SPEED,
  SPEED_CAP,
  SPEED_MULT,
  SPIN_CLAMP,
  SPIN_FROM_PADDLE,
  SPIN_HALFLIFE,
  TITLE_ITEMS,
  TITLE_TEXT,
  TRAIL_TIME,
  WIN_LEAD,
  WIN_SCORE,
} from "./constants";

export const BACKGROUND = "#071016";

export type Screen =
  "title" | "howto" | "countdown" | "playing" | "paused" | "matchover";

export type Mode = "solo" | "versus";

export type Side = "left" | "right";

export interface PaddleState {
  readonly cy: number;
  readonly vy: number;
  readonly driven: boolean;
  readonly drivenVy: number;
}

export interface AiState {
  readonly tracking: boolean;
  readonly movement: boolean;
}

export interface TrailSample {
  readonly x: number;
  readonly y: number;
  readonly t: number;
}

export interface BallState {
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  readonly spin: number;
  readonly held: boolean;
  readonly holdTimer: number;
  readonly serveSign: 1 | -1;
  readonly trail: readonly TrailSample[];
}

export interface ObstacleState {
  readonly index: number;
  readonly cx: number;
  readonly cy: number;
}

export interface CaromState {
  readonly screen: Screen;
  readonly mode: Mode;
  readonly menuIndex: number;
  readonly titleIndex: number;
  readonly resumeScreen: "countdown" | "playing";

  readonly score: { readonly p1: number; readonly p2: number };
  readonly winner: Side | null;

  readonly paddles: { readonly left: PaddleState; readonly right: PaddleState };
  readonly ai: AiState;

  readonly receiver: Side;
  readonly ball: BallState | null;
  readonly obstacles: readonly ObstacleState[];

  readonly simTime: number;
  readonly muted: boolean;
}

export interface MenuRect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface CaromSnapshot extends Omit<DeepReadonly<CaromState>, "ball"> {
  readonly version: typeof CAROM_DEBUG_VERSION;
  readonly ball: (DeepReadonly<BallState> & { readonly speed: number }) | null;
}

export interface CaromDebugApi {
  readonly version: typeof CAROM_DEBUG_VERSION;
  clearWorld(state: DeepReadonly<CaromState>): CaromState;
  spawnBall(state: DeepReadonly<CaromState>): CaromState;
  spawnObstacle(state: DeepReadonly<CaromState>, index: number): CaromState;
  reset(state: DeepReadonly<CaromState>): CaromState;
  reconcile(state: DeepReadonly<CaromState>): CaromState;
  setScreen(state: DeepReadonly<CaromState>, screen: Screen): CaromState;
  setMode(state: DeepReadonly<CaromState>, mode: Mode): CaromState;
  setMenuIndex(state: DeepReadonly<CaromState>, index: number): CaromState;
  setTitleIndex(state: DeepReadonly<CaromState>, index: number): CaromState;
  setResumeScreen(
    state: DeepReadonly<CaromState>,
    screen: "countdown" | "playing",
  ): CaromState;
  setScore(state: DeepReadonly<CaromState>, p1: number, p2: number): CaromState;
  setWinner(state: DeepReadonly<CaromState>, side: Side | null): CaromState;
  setReceiver(state: DeepReadonly<CaromState>, side: Side): CaromState;
  setPaddleCy(
    state: DeepReadonly<CaromState>,
    side: Side,
    cy: number,
  ): CaromState;
  setPaddleVy(
    state: DeepReadonly<CaromState>,
    side: Side,
    vy: number,
  ): CaromState;
  setPaddleDriven(
    state: DeepReadonly<CaromState>,
    side: Side,
    driven: boolean,
  ): CaromState;
  setBallPosition(
    state: DeepReadonly<CaromState>,
    x: number,
    y: number,
  ): CaromState;
  setBallVelocity(
    state: DeepReadonly<CaromState>,
    vx: number,
    vy: number,
  ): CaromState;
  setBallSpin(state: DeepReadonly<CaromState>, spin: number): CaromState;
  setBallHeld(state: DeepReadonly<CaromState>, held: boolean): CaromState;
  setBallHoldTimer(
    state: DeepReadonly<CaromState>,
    seconds: number,
  ): CaromState;
  setBallServeSign(state: DeepReadonly<CaromState>, sign: 1 | -1): CaromState;
  drawBallServeSign(state: DeepReadonly<CaromState>): CaromState;
  setAiTracking(state: DeepReadonly<CaromState>, enabled: boolean): CaromState;
  setAiMovement(state: DeepReadonly<CaromState>, enabled: boolean): CaromState;
  setMuted(state: DeepReadonly<CaromState>, muted: boolean): CaromState;
  snapshot(state: DeepReadonly<CaromState>): CaromSnapshot;
  menuItemRect(state: DeepReadonly<CaromState>, index: number): MenuRect | null;
}

interface Rect {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
}

interface FrameEvents {
  paddleHit: boolean;
  wallBounce: boolean;
  obstacleBounce: boolean;
  score: boolean;
}

const TWO_PI = Math.PI * 2;
const MENU_W = 360;
const MENU_H = 58;
const MENU_GAP = 16;
const MAIN_FONT = "Inter, ui-sans-serif, system-ui, Arial";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function signDraw(): 1 | -1 {
  return Math.random() < 0.5 ? -1 : 1;
}

function speedOf(ball: Pick<BallState, "vx" | "vy">): number {
  return Math.hypot(ball.vx, ball.vy);
}

function copyState(state: DeepReadonly<CaromState>): CaromState {
  return {
    screen: state.screen,
    mode: state.mode,
    menuIndex: state.menuIndex,
    titleIndex: state.titleIndex,
    resumeScreen: state.resumeScreen,
    score: { p1: state.score.p1, p2: state.score.p2 },
    winner: state.winner,
    paddles: {
      left: { ...state.paddles.left },
      right: { ...state.paddles.right },
    },
    ai: { ...state.ai },
    receiver: state.receiver,
    ball: state.ball
      ? { ...state.ball, trail: state.ball.trail.map((s) => ({ ...s })) }
      : null,
    obstacles: state.obstacles.map((o) => ({ ...o })),
    simTime: state.simTime,
    muted: state.muted,
  };
}

function parkedBall(): BallState {
  return {
    x: FIELD_CX,
    y: FIELD_CY,
    vx: 0,
    vy: 0,
    spin: 0,
    held: true,
    holdTimer: HOLD_TIME,
    serveSign: signDraw(),
    trail: [],
  };
}

function obstacle(index: number): ObstacleState {
  const center = OBSTACLE_CENTERS[index];
  if (!center) throw new RangeError(`Carom: no obstacle ${index}`);
  return { index, cx: center.x, cy: center.y };
}

function titleState(muted: boolean): CaromState {
  return {
    screen: "title",
    mode: "solo",
    menuIndex: 0,
    titleIndex: 0,
    resumeScreen: "playing",
    score: { p1: 0, p2: 0 },
    winner: null,
    paddles: {
      left: { cy: FIELD_CY, vy: 0, driven: false, drivenVy: 0 },
      right: { cy: FIELD_CY, vy: 0, driven: false, drivenVy: 0 },
    },
    ai: { tracking: true, movement: true },
    receiver: "left",
    ball: parkedBall(),
    obstacles: [obstacle(0), obstacle(1)],
    simTime: 0,
    muted,
  };
}

function startMatch(state: CaromState, mode: Mode): CaromState {
  return {
    ...state,
    screen: "countdown",
    mode,
    menuIndex: 0,
    resumeScreen: "playing",
    score: { p1: 0, p2: 0 },
    winner: null,
    receiver: "left",
    ball: parkedBall(),
    paddles: {
      left: { ...state.paddles.left, cy: FIELD_CY, vy: 0 },
      right: { ...state.paddles.right, cy: FIELD_CY, vy: 0 },
    },
  };
}

function returnToTitle(state: CaromState): CaromState {
  return {
    ...titleState(state.muted),
    simTime: state.simTime,
    titleIndex: state.titleIndex,
    menuIndex: state.titleIndex,
  };
}

function paddleRect(side: Side, cy: number): Rect {
  return side === "left"
    ? { x0: P1_X0, x1: P1_X1, y0: cy - PADDLE_HALF, y1: cy + PADDLE_HALF }
    : { x0: P2_X0, x1: P2_X1, y0: cy - PADDLE_HALF, y1: cy + PADDLE_HALF };
}

function obstacleRect(o: ObstacleState): Rect {
  const fixed = OBSTACLES[o.index];
  if (
    fixed &&
    fixed.x0 === o.cx - OBSTACLE_W / 2 &&
    fixed.y0 === o.cy - OBSTACLE_H / 2
  ) {
    return fixed;
  }
  return {
    x0: o.cx - OBSTACLE_W / 2,
    x1: o.cx + OBSTACLE_W / 2,
    y0: o.cy - OBSTACLE_H / 2,
    y1: o.cy + OBSTACLE_H / 2,
  };
}

function integratePaddle(
  paddle: PaddleState,
  vy: number,
  dt: number,
): PaddleState {
  const next = clamp(paddle.cy + vy * dt, PADDLE_MIN_CY, PADDLE_MAX_CY);
  const actualVy = next !== paddle.cy && dt > 0 ? (next - paddle.cy) / dt : vy;
  return { ...paddle, cy: next, vy: next === paddle.cy ? 0 : actualVy };
}

function humanPaddleVelocity(up: number, down: number): number {
  return (down - up) * PADDLE_SPEED;
}

function movePaddles(
  state: CaromState,
  api: UpdateApi,
  dt: number,
): CaromState {
  let leftVy: number;
  let rightVy = 0;

  if (state.mode === "solo") {
    leftVy = humanPaddleVelocity(
      Math.max(api.input.value("p1-up"), api.input.value("p2-up")),
      Math.max(api.input.value("p1-down"), api.input.value("p2-down")),
    );

    if (state.ai.movement) {
      const defending =
        state.ai.tracking &&
        state.screen === "playing" &&
        state.ball !== null &&
        state.ball.vx > 0;
      const target = defending
        ? state.ball!.y - state.ball!.vy * AI_REACT
        : AI_HOME_Y;
      const deadzone = defending ? AI_DEADZONE : AI_HOME_DEADZONE;
      const diff = target - state.paddles.right.cy;
      rightVy =
        Math.abs(diff) <= deadzone || dt <= 0
          ? 0
          : Math.sign(diff) * Math.min(AI_SPEED, Math.abs(diff) / dt);
    }
  } else {
    leftVy = humanPaddleVelocity(
      api.input.value("p1-up"),
      api.input.value("p1-down"),
    );
    rightVy = humanPaddleVelocity(
      api.input.value("p2-up"),
      api.input.value("p2-down"),
    );
  }

  const left = state.paddles.left.driven
    ? integratePaddle(state.paddles.left, state.paddles.left.drivenVy, dt)
    : integratePaddle(state.paddles.left, leftVy, dt);
  const right = state.paddles.right.driven
    ? integratePaddle(state.paddles.right, state.paddles.right.drivenVy, dt)
    : integratePaddle(state.paddles.right, rightVy, dt);

  return { ...state, paddles: { left, right } };
}

type Face = "left" | "right" | "top" | "bottom";

function overlapFace(ball: BallState, rect: Rect): Face | null {
  if (
    ball.x <= rect.x0 - BALL_R ||
    ball.x >= rect.x1 + BALL_R ||
    ball.y <= rect.y0 - BALL_R ||
    ball.y >= rect.y1 + BALL_R
  ) {
    return null;
  }
  const depths: readonly [Face, number][] = [
    ["left", ball.x - (rect.x0 - BALL_R)],
    ["right", rect.x1 + BALL_R - ball.x],
    ["top", ball.y - (rect.y0 - BALL_R)],
    ["bottom", rect.y1 + BALL_R - ball.y],
  ];
  return depths.reduce((best, next) => (next[1] < best[1] ? next : best))[0];
}

function resolveRect(ball: BallState, rect: Rect): [BallState, Face | null] {
  const face = overlapFace(ball, rect);
  if (!face) return [ball, null];

  if (face === "left") {
    return [
      { ...ball, x: rect.x0 - BALL_R, vx: ball.vx > 0 ? -ball.vx : ball.vx },
      face,
    ];
  } else if (face === "right") {
    return [
      { ...ball, x: rect.x1 + BALL_R, vx: ball.vx < 0 ? -ball.vx : ball.vx },
      face,
    ];
  } else if (face === "top") {
    return [
      { ...ball, y: rect.y0 - BALL_R, vy: ball.vy > 0 ? -ball.vy : ball.vy },
      face,
    ];
  }
  return [
    { ...ball, y: rect.y1 + BALL_R, vy: ball.vy < 0 ? -ball.vy : ball.vy },
    face,
  ];
}

function paddleBounce(
  ball: BallState,
  side: Side,
  paddle: PaddleState,
): BallState {
  const offset = clamp((ball.y - paddle.cy) / PADDLE_HALF, -1, 1);
  const theta = offset * MAX_BOUNCE_ANGLE;
  const speed = Math.min(speedOf(ball) * SPEED_MULT, SPEED_CAP);
  const dir = side === "left" ? 1 : -1;
  return {
    ...ball,
    x: side === "left" ? P1_X1 + BALL_R : P2_X0 - BALL_R,
    vx: dir * speed * Math.cos(theta),
    vy: speed * Math.sin(theta),
    spin: clamp(
      ball.spin + paddle.vy * SPIN_FROM_PADDLE,
      -SPIN_CLAMP,
      SPIN_CLAMP,
    ),
  };
}

function stepBall(
  ball: BallState,
  state: CaromState,
  dt: number,
): [BallState, FrameEvents] {
  const events: FrameEvents = {
    paddleHit: false,
    wallBounce: false,
    obstacleBounce: false,
    score: false,
  };
  const initialSpeed = speedOf(ball);
  const steps = Math.max(1, Math.ceil((initialSpeed * dt) / MAX_SUBSTEP));
  const h = dt / steps;
  let next = ball;

  for (let i = 0; i < steps; i += 1) {
    const speed = speedOf(next);
    if (speed > 0) {
      const angle = (next.spin / speed) * h;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      next = {
        ...next,
        vx: next.vx * cos - next.vy * sin,
        vy: next.vx * sin + next.vy * cos,
      };
    }
    next = {
      ...next,
      spin: next.spin * Math.pow(0.5, h / SPIN_HALFLIFE),
      x: next.x + next.vx * h,
      y: next.y + next.vy * h,
    };

    if (next.y - BALL_R < 0 && next.vy < 0) {
      next = { ...next, y: BALL_R, vy: -next.vy };
      events.wallBounce = true;
    } else if (next.y + BALL_R > FIELD_H && next.vy > 0) {
      next = { ...next, y: FIELD_H - BALL_R, vy: -next.vy };
      events.wallBounce = true;
    }

    for (const side of ["left", "right"] as const) {
      const paddle = state.paddles[side];
      const [resolved, face] = resolveRect(next, paddleRect(side, paddle.cy));
      if (face === "left" || face === "right") {
        next = paddleBounce(resolved, side, paddle);
        events.paddleHit = true;
      } else if (face === "top" || face === "bottom") {
        next = resolved;
        events.wallBounce = true;
      } else {
        next = resolved;
      }
    }

    for (const current of state.obstacles) {
      const [resolved, face] = resolveRect(next, obstacleRect(current));
      next = resolved;
      if (face) events.obstacleBounce = true;
    }
  }

  return [next, events];
}

function appendTrail(ball: BallState, simTime: number): BallState {
  const trail = [...ball.trail, { x: ball.x, y: ball.y, t: simTime }].filter(
    (sample) => simTime - sample.t <= TRAIL_TIME,
  );
  return { ...ball, trail };
}

function scoreWinner(score: {
  readonly p1: number;
  readonly p2: number;
}): Side | null {
  if (score.p1 >= WIN_SCORE && score.p1 - score.p2 >= WIN_LEAD) return "left";
  if (score.p2 >= WIN_SCORE && score.p2 - score.p1 >= WIN_LEAD) return "right";
  return null;
}

function serveBall(ball: BallState, receiver: Side): BallState {
  const dir = receiver === "left" ? -1 : 1;
  return {
    ...ball,
    held: false,
    holdTimer: 0,
    trail: [],
    vx: dir * SERVE_SPEED * Math.cos(SERVE_ANGLE),
    vy: ball.serveSign * SERVE_SPEED * Math.sin(SERVE_ANGLE),
  };
}

function advanceRound(
  state: CaromState,
  dt: number,
  api: UpdateApi,
): CaromState {
  if (state.screen !== "countdown" && state.screen !== "playing") return state;

  let next = movePaddles(state, api, dt);
  let ball = next.ball;
  const events: FrameEvents = {
    paddleHit: false,
    wallBounce: false,
    obstacleBounce: false,
    score: false,
  };

  if (ball && next.screen === "countdown") {
    ball = { ...ball, x: FIELD_CX, y: FIELD_CY, vx: 0, vy: 0 };
    const holdTimer = Math.max(0, ball.holdTimer - dt);
    ball = { ...ball, holdTimer };
    if (holdTimer <= 0) {
      ball = serveBall(ball, next.receiver);
      next = { ...next, screen: "playing" };
    }
  } else if (ball && next.screen === "playing" && !ball.held) {
    const stepped = stepBall(ball, next, dt);
    ball = stepped[0];
    events.paddleHit = stepped[1].paddleHit;
    events.wallBounce = stepped[1].wallBounce;
    events.obstacleBounce = stepped[1].obstacleBounce;
  }

  if (ball && (next.screen === "countdown" || next.screen === "playing")) {
    ball = appendTrail(ball, next.simTime);
  }

  if (ball && next.screen === "playing") {
    let scorer: Side | null = null;
    if (ball.x - BALL_R > FIELD_W) scorer = "left";
    if (ball.x + BALL_R < 0) scorer = "right";

    if (scorer) {
      events.score = true;
      const score =
        scorer === "left"
          ? { p1: next.score.p1 + 1, p2: next.score.p2 }
          : { p1: next.score.p1, p2: next.score.p2 + 1 };
      const winner = scoreWinner(score);
      if (winner) {
        next = {
          ...next,
          score,
          winner,
          screen: "matchover",
          menuIndex: 0,
          ball,
        };
      } else {
        next = {
          ...next,
          score,
          receiver: scorer === "left" ? "right" : "left",
          screen: "countdown",
          ball: parkedBall(),
        };
        ball = next.ball;
      }
    }
  }

  if (events.paddleHit) api.audio.play(CUES.paddleHit);
  if (events.wallBounce) api.audio.play(CUES.wallBounce);
  if (events.obstacleBounce) api.audio.play(CUES.obstacleBounce);
  if (events.score) api.audio.play(CUES.score);

  return { ...next, ball };
}

function menuLength(screen: Screen): number {
  if (screen === "title") return TITLE_ITEMS.length;
  if (screen === "howto") return 1;
  if (screen === "paused") return PAUSE_ITEMS.length;
  if (screen === "matchover") return MATCHOVER_ITEMS.length;
  return 0;
}

function menuRectFor(screen: Screen, index: number): MenuRect | null {
  const count = menuLength(screen);
  if (index < 0 || index >= count) return null;
  const startY =
    screen === "title"
      ? 314
      : screen === "howto"
        ? 560
        : screen === "paused"
          ? 292
          : 380;
  return {
    x: FIELD_CX - MENU_W / 2,
    y: startY + index * (MENU_H + MENU_GAP),
    w: MENU_W,
    h: MENU_H,
  };
}

function pointInRect(x: number, y: number, rect: MenuRect): boolean {
  return (
    x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h
  );
}

function itemAt(screen: Screen, x: number, y: number): number | null {
  for (let i = 0; i < menuLength(screen); i += 1) {
    const rect = menuRectFor(screen, i);
    if (rect && pointInRect(x, y, rect)) return i;
  }
  return null;
}

function moveMenu(index: number, count: number, direction: -1 | 1): number {
  return (index + direction + count) % count;
}

function confirmMenu(state: CaromState): CaromState {
  if (state.screen === "title") {
    const titleIndex = state.menuIndex;
    if (state.menuIndex === 0)
      return startMatch({ ...state, titleIndex }, "solo");
    if (state.menuIndex === 1)
      return startMatch({ ...state, titleIndex }, "versus");
    return { ...state, titleIndex, screen: "howto", menuIndex: 0 };
  }
  if (state.screen === "howto") return returnToTitle(state);
  if (state.screen === "paused") {
    if (state.menuIndex === 0) return { ...state, screen: state.resumeScreen };
    if (state.menuIndex === 1) return startMatch(state, state.mode);
    return returnToTitle(state);
  }
  if (state.screen === "matchover") {
    if (state.menuIndex === 0) return startMatch(state, state.mode);
    return returnToTitle(state);
  }
  return state;
}

function handlePointerMenu(
  state: CaromState,
  samples: readonly PointerSample[],
): CaromState {
  if (menuLength(state.screen) === 0) return state;
  let next = state;
  let downIndex: number | null = null;
  for (const sample of samples) {
    if (sample.device !== "touch" && !sample.primary) continue;
    const index = itemAt(next.screen, sample.x, sample.y);
    if (index !== null) next = { ...next, menuIndex: index };
    if (sample.type === "down") downIndex = index;
    if (
      sample.type === "up" &&
      index !== null &&
      (downIndex === null || downIndex === index)
    ) {
      next = { ...next, menuIndex: index };
      if (next.screen === "title") next = { ...next, titleIndex: index };
      next = confirmMenu(next);
    }
  }
  return next;
}

function handleInput(state: CaromState, api: UpdateApi): CaromState {
  let next = state;
  const up = api.input.pressed("p1-up") || api.input.pressed("p2-up");
  const down = api.input.pressed("p1-down") || api.input.pressed("p2-down");
  const confirm = api.input.pressed("confirm");
  const back = api.input.pressed("back");
  const pause = api.input.pressed("pause");
  const mute = api.input.pressed("mute");

  if (mute) {
    api.audio.setMuted(!api.audio.muted());
    next = { ...next, muted: api.audio.muted() };
  }

  if (state.screen === "title") {
    if (up)
      next = {
        ...next,
        menuIndex: moveMenu(next.menuIndex, TITLE_ITEMS.length, -1),
      };
    else if (down)
      next = {
        ...next,
        menuIndex: moveMenu(next.menuIndex, TITLE_ITEMS.length, 1),
      };
    else if (confirm) next = confirmMenu(next);
  } else if (state.screen === "howto") {
    if (confirm || back) next = returnToTitle(next);
  } else if (state.screen === "countdown" || state.screen === "playing") {
    if (pause)
      next = {
        ...next,
        resumeScreen: state.screen,
        screen: "paused",
        menuIndex: 0,
      };
  } else if (state.screen === "paused") {
    if (pause || back) return { ...next, screen: next.resumeScreen };
    if (up)
      next = {
        ...next,
        menuIndex: moveMenu(next.menuIndex, PAUSE_ITEMS.length, -1),
      };
    else if (down)
      next = {
        ...next,
        menuIndex: moveMenu(next.menuIndex, PAUSE_ITEMS.length, 1),
      };
    else if (confirm) next = confirmMenu(next);
  } else if (state.screen === "matchover") {
    if (up)
      next = {
        ...next,
        menuIndex: moveMenu(next.menuIndex, MATCHOVER_ITEMS.length, -1),
      };
    else if (down)
      next = {
        ...next,
        menuIndex: moveMenu(next.menuIndex, MATCHOVER_ITEMS.length, 1),
      };
    else if (confirm) next = confirmMenu(next);
    else if (back) next = returnToTitle(next);
  }

  if (!confirm) next = handlePointerMenu(next, api.input.pointerSamples());
  return next;
}

function requireBall(state: DeepReadonly<CaromState>): BallState {
  if (!state.ball) throw new Error("Carom: no ball is present");
  return { ...state.ball, trail: state.ball.trail.map((s) => ({ ...s })) };
}

function withBall(
  state: DeepReadonly<CaromState>,
  edit: (ball: BallState) => BallState,
): CaromState {
  return { ...copyState(state), ball: edit(requireBall(state)) };
}

function withPaddle(
  state: DeepReadonly<CaromState>,
  side: Side,
  paddle: PaddleState,
): CaromState {
  const next = copyState(state);
  return { ...next, paddles: { ...next.paddles, [side]: paddle } };
}

function buildDebug(): CaromDebugApi {
  return {
    version: CAROM_DEBUG_VERSION,
    clearWorld: (s) => ({ ...copyState(s), ball: null, obstacles: [] }),
    spawnBall: (s) => ({ ...copyState(s), ball: parkedBall() }),
    spawnObstacle: (s, index) => {
      const next = copyState(s);
      return {
        ...next,
        obstacles: [
          ...next.obstacles.filter((o) => o.index !== index),
          obstacle(index),
        ].sort((a, b) => a.index - b.index),
      };
    },
    reset: (s) => titleState(s.muted),
    reconcile: (s) => copyState(s),
    setScreen: (s, screen) => ({ ...copyState(s), screen }),
    setMode: (s, mode) => ({ ...copyState(s), mode }),
    setMenuIndex: (s, menuIndex) => ({ ...copyState(s), menuIndex }),
    setTitleIndex: (s, titleIndex) => ({ ...copyState(s), titleIndex }),
    setResumeScreen: (s, resumeScreen) => ({ ...copyState(s), resumeScreen }),
    setScore: (s, p1, p2) => ({ ...copyState(s), score: { p1, p2 } }),
    setWinner: (s, winner) => ({ ...copyState(s), winner }),
    setReceiver: (s, receiver) => ({ ...copyState(s), receiver }),
    setPaddleCy: (s, side, cy) =>
      withPaddle(s, side, { ...s.paddles[side], cy }),
    setPaddleVy: (s, side, drivenVy) =>
      withPaddle(s, side, { ...s.paddles[side], drivenVy }),
    setPaddleDriven: (s, side, driven) =>
      withPaddle(s, side, { ...s.paddles[side], driven }),
    setBallPosition: (s, x, y) => withBall(s, (ball) => ({ ...ball, x, y })),
    setBallVelocity: (s, vx, vy) =>
      withBall(s, (ball) => ({ ...ball, vx, vy })),
    setBallSpin: (s, spin) => withBall(s, (ball) => ({ ...ball, spin })),
    setBallHeld: (s, held) => withBall(s, (ball) => ({ ...ball, held })),
    setBallHoldTimer: (s, holdTimer) =>
      withBall(s, (ball) => ({ ...ball, holdTimer })),
    setBallServeSign: (s, serveSign) =>
      withBall(s, (ball) => ({ ...ball, serveSign })),
    drawBallServeSign: (s) =>
      withBall(s, (ball) => ({ ...ball, serveSign: signDraw() })),
    setAiTracking: (s, tracking) => ({
      ...copyState(s),
      ai: { ...s.ai, tracking },
    }),
    setAiMovement: (s, movement) => ({
      ...copyState(s),
      ai: { ...s.ai, movement },
    }),
    setMuted: (s, muted) => ({ ...copyState(s), muted }),
    snapshot: (s) => ({
      ...copyState(s),
      version: CAROM_DEBUG_VERSION,
      ball: s.ball
        ? {
            ...s.ball,
            trail: s.ball.trail.map((sample) => ({ ...sample })),
            speed: speedOf(s.ball),
          }
        : null,
    }),
    menuItemRect: (s, index) => menuRectFor(s.screen, index),
  };
}

function registerDiagnostics(api: InitApi<CaromState>): void {
  api.diagnostics.register("screen", (s) => s.screen);
  api.diagnostics.register("mode", (s) => s.mode);
  api.diagnostics.register("score", (s) => `${s.score.p1}-${s.score.p2}`);
  api.diagnostics.register("ball", (s) =>
    s.ball ? `${s.ball.x.toFixed(1)}, ${s.ball.y.toFixed(1)}` : "none",
  );
  api.diagnostics.register("ball v", (s) =>
    s.ball ? `${s.ball.vx.toFixed(1)}, ${s.ball.vy.toFixed(1)}` : "none",
  );
  api.diagnostics.register("ball speed", (s) =>
    s.ball ? speedOf(s.ball).toFixed(1) : "none",
  );
  api.diagnostics.register("spin", (s) =>
    s.ball ? s.ball.spin.toFixed(1) : "none",
  );
  api.diagnostics.register(
    "left paddle",
    (s) => `${s.paddles.left.cy.toFixed(1)} / ${s.paddles.left.vy.toFixed(1)}`,
  );
  api.diagnostics.register(
    "right paddle",
    (s) =>
      `${s.paddles.right.cy.toFixed(1)} / ${s.paddles.right.vy.toFixed(1)}`,
  );
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

function drawField(
  ctx: CanvasRenderingContext2D,
  state: DeepReadonly<CaromState>,
): void {
  const gradient = ctx.createLinearGradient(0, 0, FIELD_W, FIELD_H);
  gradient.addColorStop(0, "#071016");
  gradient.addColorStop(1, "#10232b");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, FIELD_W, FIELD_H);

  ctx.save();
  ctx.strokeStyle = "rgba(146, 244, 255, 0.34)";
  ctx.lineWidth = 4;
  ctx.setLineDash([18, 18]);
  ctx.beginPath();
  ctx.moveTo(NET_X, 48);
  ctx.lineTo(NET_X, FIELD_H - 48);
  ctx.stroke();
  ctx.restore();

  for (const current of state.obstacles) {
    ctx.fillStyle = "#ffd166";
    ctx.shadowColor = "#ffd166";
    ctx.shadowBlur = 18;
    roundRect(
      ctx,
      current.cx - OBSTACLE_W / 2,
      current.cy - OBSTACLE_H / 2,
      OBSTACLE_W,
      OBSTACLE_H,
      10,
    );
  }
  ctx.shadowBlur = 0;

  ctx.fillStyle = "#41f5c6";
  roundRect(
    ctx,
    P1_X0,
    state.paddles.left.cy - PADDLE_HALF,
    PADDLE_W,
    PADDLE_H,
    8,
  );
  ctx.fillStyle = "#ff5d8f";
  roundRect(
    ctx,
    P2_X0,
    state.paddles.right.cy - PADDLE_HALF,
    PADDLE_W,
    PADDLE_H,
    8,
  );

  if (state.ball) {
    const trail = state.ball.trail;
    if (trail.length > 1) {
      for (let i = 1; i < trail.length; i += 1) {
        const alpha = i / trail.length;
        ctx.strokeStyle = `rgba(126, 217, 255, ${alpha * 0.52})`;
        ctx.lineWidth = 4 + alpha * 8;
        ctx.beginPath();
        ctx.moveTo(trail[i - 1]!.x, trail[i - 1]!.y);
        ctx.lineTo(trail[i]!.x, trail[i]!.y);
        ctx.stroke();
      }
    }
    ctx.fillStyle = "#eafcff";
    ctx.shadowColor = "#7ed9ff";
    ctx.shadowBlur = 24;
    ctx.beginPath();
    ctx.arc(state.ball.x, state.ball.y, BALL_R, 0, TWO_PI);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

function drawHud(
  ctx: CanvasRenderingContext2D,
  state: DeepReadonly<CaromState>,
): void {
  ctx.font = `700 52px ${MAIN_FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(234, 252, 255, 0.9)";
  ctx.fillText(String(state.score.p1), FIELD_CX - 150, 64);
  ctx.fillText(String(state.score.p2), FIELD_CX + 150, 64);
  ctx.font = `700 18px ${MAIN_FONT}`;
  ctx.fillStyle = "rgba(234, 252, 255, 0.58)";
  ctx.fillText(
    state.mode === "solo" ? "SOLO DUEL" : "VERSUS DUEL",
    FIELD_CX,
    36,
  );
}

function drawMenuItems(
  ctx: CanvasRenderingContext2D,
  state: DeepReadonly<CaromState>,
  items: readonly string[],
): void {
  for (let i = 0; i < items.length; i += 1) {
    const rect = menuRectFor(state.screen, i);
    if (!rect) continue;
    const active = i === state.menuIndex;
    ctx.fillStyle = active
      ? "rgba(126, 217, 255, 0.22)"
      : "rgba(234, 252, 255, 0.08)";
    ctx.strokeStyle = active ? "#7ed9ff" : "rgba(234, 252, 255, 0.24)";
    ctx.lineWidth = active ? 3 : 1.5;
    roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 7);
    ctx.strokeRect(rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2);
    ctx.font = `800 24px ${MAIN_FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = active ? "#eafcff" : "rgba(234, 252, 255, 0.72)";
    ctx.fillText(items[i]!, rect.x + rect.w / 2, rect.y + rect.h / 2);
  }
}

function drawOverlayPanel(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = "rgba(3, 8, 12, 0.68)";
  ctx.fillRect(0, 0, FIELD_W, FIELD_H);
}

function drawScreens(
  ctx: CanvasRenderingContext2D,
  state: DeepReadonly<CaromState>,
): void {
  if (state.screen === "title") {
    drawOverlayPanel(ctx);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `900 112px ${MAIN_FONT}`;
    ctx.fillStyle = "#eafcff";
    ctx.fillText(TITLE_TEXT, FIELD_CX, 178);
    ctx.font = `500 24px ${MAIN_FONT}`;
    ctx.fillStyle = "rgba(234, 252, 255, 0.68)";
    ctx.fillText("Curve the rally. Bank the point.", FIELD_CX, 246);
    drawMenuItems(ctx, state, TITLE_ITEMS);
  } else if (state.screen === "howto") {
    drawOverlayPanel(ctx);
    ctx.textAlign = "center";
    ctx.fillStyle = "#eafcff";
    ctx.font = `800 54px ${MAIN_FONT}`;
    ctx.fillText("HOW TO PLAY", FIELD_CX, 112);
    ctx.font = `500 25px ${MAIN_FONT}`;
    ctx.fillStyle = "rgba(234, 252, 255, 0.76)";
    const lines = [
      "W/S move the left paddle. Arrow keys move the right paddle in Versus.",
      "In Solo, either set of movement keys controls you while the right side reacts.",
      "Strike while moving to bend the ball after contact.",
      "Use the center obstacles for bank shots. First to 11, win by 2.",
      "P or Escape pauses. M toggles sound.",
    ];
    lines.forEach((line, index) =>
      ctx.fillText(line, FIELD_CX, 194 + index * 44),
    );
    drawMenuItems(ctx, state, ["BACK"]);
  } else if (state.screen === "paused") {
    drawOverlayPanel(ctx);
    ctx.textAlign = "center";
    ctx.font = `900 64px ${MAIN_FONT}`;
    ctx.fillStyle = "#eafcff";
    ctx.fillText("PAUSED", FIELD_CX, 206);
    drawMenuItems(ctx, state, PAUSE_ITEMS);
  } else if (state.screen === "matchover") {
    drawOverlayPanel(ctx);
    ctx.textAlign = "center";
    ctx.font = `900 62px ${MAIN_FONT}`;
    ctx.fillStyle = "#eafcff";
    const winner =
      state.winner === "left" ? "LEFT SIDE WINS" : "RIGHT SIDE WINS";
    ctx.fillText(winner, FIELD_CX, 190);
    ctx.font = `800 38px ${MAIN_FONT}`;
    ctx.fillStyle = "rgba(234, 252, 255, 0.82)";
    ctx.fillText(`${state.score.p1} - ${state.score.p2}`, FIELD_CX, 258);
    drawMenuItems(ctx, state, MATCHOVER_ITEMS);
  } else if (state.screen === "countdown") {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `900 88px ${MAIN_FONT}`;
    ctx.fillStyle = "rgba(234, 252, 255, 0.84)";
    ctx.fillText(
      state.ball ? Math.ceil(state.ball.holdTimer).toString() : "READY",
      FIELD_CX,
      FIELD_CY,
    );
  }
}

export const game: Game<CaromState, CaromDebugApi> = {
  initialize(api: InitApi<CaromState>): [CaromState, CaromDebugApi] {
    for (const action of ACTIONS) {
      api.input.register(action, { keys: [...BINDINGS[action]] });
    }
    api.audio.define(CUES.paddleHit, {
      wave: "triangle",
      freq: 540,
      freqTo: 780,
      gain: 0.18,
      durationMs: 58,
    });
    api.audio.define(CUES.wallBounce, {
      wave: "sine",
      freq: 300,
      freqTo: 210,
      gain: 0.16,
      durationMs: 54,
    });
    api.audio.define(CUES.obstacleBounce, {
      wave: "square",
      freq: 760,
      freqTo: 420,
      gain: 0.13,
      durationMs: 70,
    });
    api.audio.define(CUES.score, {
      wave: "sawtooth",
      freq: 220,
      freqTo: 880,
      gain: 0.16,
      durationMs: 180,
    });
    registerDiagnostics(api);
    return [titleState(false), buildDebug()];
  },

  update(
    state: DeepReadonly<CaromState>,
    api: UpdateApi,
    dt: number,
  ): CaromState {
    if (state.muted !== api.audio.muted()) {
      api.audio.setMuted(state.muted);
    }
    let next = copyState(state);
    next = { ...next, simTime: next.simTime + dt, muted: api.audio.muted() };
    next = handleInput(next, api);
    next = advanceRound(next, dt, api);
    return { ...next, muted: api.audio.muted() };
  },

  render(state: DeepReadonly<CaromState>, api: RenderApi): void {
    const ctx = api.ctx;
    ctx.save();
    drawField(ctx, state);
    if (
      state.screen === "playing" ||
      state.screen === "countdown" ||
      state.screen === "paused" ||
      state.screen === "matchover"
    ) {
      drawHud(ctx, state);
    }
    drawScreens(ctx, state);
    ctx.restore();
  },
};
