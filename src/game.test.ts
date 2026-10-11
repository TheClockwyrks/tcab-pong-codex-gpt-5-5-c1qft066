import { createCanvas } from "@napi-rs/canvas";
import { ConstantClock, createEngine } from "@clockwyrks/simple-2d";
import { describe, expect, it } from "vitest";
import {
  BALL_R,
  FIELD_CX,
  FIELD_CY,
  FIELD_H,
  FIELD_W,
  HOLD_TIME,
  P2_X0,
  SPEED_MULT,
} from "./constants";
import { game } from "./game";
import type { CaromDebugApi, CaromState } from "./game";

function makeEngine(stepMs = 1000 / 60) {
  const canvas = createCanvas(FIELD_W, FIELD_H) as unknown as HTMLCanvasElement;
  const target = new EventTarget();
  return createEngine<CaromState, CaromDebugApi>({
    canvas,
    width: FIELD_W,
    height: FIELD_H,
    game,
    clock: new ConstantClock(stepMs),
    background: "#071016",
    surface: {
      cssWidth: () => FIELD_W,
      cssHeight: () => FIELD_H,
      dpr: () => 1,
      events: () => target,
    },
  });
}

describe("Carom simulation", () => {
  it("initializes the title state and debug snapshot", async () => {
    const engine = makeEngine();
    await engine.initialize();

    const snapshot = engine.debug.snapshot(engine.state);

    expect(snapshot.version).toBe(1);
    expect(snapshot.screen).toBe("title");
    expect(snapshot.ball?.x).toBe(FIELD_CX);
    expect(snapshot.ball?.y).toBe(FIELD_CY);
    expect(snapshot.obstacles).toHaveLength(2);
    expect(engine.debug.menuItemRect(engine.state, 0)).toMatchObject({
      w: 360,
      h: 58,
    });
  });

  it("serves toward the receiver after the countdown hold", async () => {
    const engine = makeEngine(250);
    await engine.initialize();
    engine.apply((state) => engine.debug.setScreen(state, "countdown"));
    engine.apply((state) => engine.debug.setReceiver(state, "left"));
    engine.apply((state) => engine.debug.setBallServeSign(state, 1));

    await engine.advance(Math.ceil((HOLD_TIME * 1000) / 250));
    const ball = engine.debug.snapshot(engine.state).ball;

    expect(engine.state.screen).toBe("playing");
    expect(ball?.held).toBe(false);
    expect(ball?.vx).toBeLessThan(0);
    expect(ball?.vy).toBeGreaterThan(0);
  });

  it("scores a point and parks the next serve for the scored-on side", async () => {
    const engine = makeEngine();
    await engine.initialize();
    engine.apply((state) => engine.debug.setScreen(state, "playing"));
    engine.apply((state) =>
      engine.debug.setBallPosition(state, FIELD_W + BALL_R + 2, FIELD_CY),
    );
    engine.apply((state) => engine.debug.setBallVelocity(state, 120, 0));
    engine.apply((state) => engine.debug.setBallHeld(state, false));

    await engine.advance(1);
    const snapshot = engine.debug.snapshot(engine.state);

    expect(snapshot.score).toEqual({ p1: 1, p2: 0 });
    expect(snapshot.receiver).toBe("right");
    expect(snapshot.screen).toBe("countdown");
    expect(snapshot.ball?.held).toBe(true);
    expect(snapshot.ball?.x).toBe(FIELD_CX);
  });

  it("adds paddle spin and speed on a paddle face hit", async () => {
    const engine = makeEngine(1000 / 120);
    await engine.initialize();
    engine.apply((state) => engine.debug.setScreen(state, "playing"));
    engine.apply((state) => engine.debug.setPaddleDriven(state, "right", true));
    engine.apply((state) => engine.debug.setPaddleVy(state, "right", 480));
    engine.apply((state) =>
      engine.debug.setBallPosition(state, P2_X0 - BALL_R - 1, FIELD_CY),
    );
    engine.apply((state) => engine.debug.setBallVelocity(state, 520, 0));
    engine.apply((state) => engine.debug.setBallHeld(state, false));

    await engine.advance(2);
    const ball = engine.debug.snapshot(engine.state).ball;

    expect(ball?.vx).toBeLessThan(0);
    expect(ball?.speed).toBeCloseTo(520 * SPEED_MULT, 0);
    expect(ball?.spin).toBeGreaterThan(0);
  });
});
