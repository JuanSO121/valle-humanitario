/**
 * arcAnimationEngine.test.ts
 * -----------------------------------------------------------------------
 * Prueba la máquina de estados con reloj inyectado — sin navegador, sin
 * MapLibre, sin requestAnimationFrame real. Cada test controla `now`
 * explícitamente y verifica lo que tick() devuelve en ese instante exacto.
 *
 * `staggerDelay` se importa directo (ver export agregado en
 * arcAnimationEngine.ts) para calcular el instante exacto en que cada
 * arco debería empezar a crecer, en vez de usar márgenes flojos que
 * podrían esconder un bug de timing real.
 * -----------------------------------------------------------------------
 */
import { describe, it, expect } from "vitest";
import { createArcAnimationEngine, staggerDelay } from "./arcAnimationEngine";
import { easeOutCubic } from "./arcGeometry";

const GROWTH_DURATION_MS = 900;
const PULSE_PERIOD_MS = 3200;

describe("createArcAnimationEngine", () => {
  it("sync() sin enter() no produce frames — un arco 'idle' no crece ni está asentado", () => {
    const engine = createArcAnimationEngine();
    engine.sync(["ORI-CALI::D001"], { "ORI-CALI::D001": 5 });

    const frame = engine.tick(0);

    expect(frame.growing).toEqual([]);
    expect(frame.settled).toEqual([]);
  });

  it("enter() antes de que pase el stagger delay no produce ningún frame de crecimiento", () => {
    const engine = createArcAnimationEngine();
    const key = "ORI-CALI::D001";
    const weight = 5;
    engine.sync([key], { [key]: weight });

    const enterNow = 0;
    engine.enter(key, enterNow);
    const delay = staggerDelay(key, weight);

    // Un instante ANTES de que se cumpla el delay: el arco sigue sin
    // aparecer en ningún frame (ni growing ni settled).
    if (delay > 0) {
      const frame = engine.tick(enterNow + delay - 1);
      expect(frame.growing).toEqual([]);
      expect(frame.settled).toEqual([]);
    }
  });

  it("un arco crece con sampleFraction siguiendo easeOutCubic durante GROWTH_DURATION_MS", () => {
    const engine = createArcAnimationEngine();
    const key = "ORI-CALI::D001";
    const weight = 5;
    engine.sync([key], { [key]: weight });

    const enterNow = 1000;
    engine.enter(key, enterNow);
    const delay = staggerDelay(key, weight);
    const growthStart = enterNow + delay;

    // A mitad de camino del crecimiento: sampleFraction debe coincidir
    // exactamente con easeOutCubic(0.5), no con un valor lineal.
    const midT = 0.5;
    const midFrame = engine.tick(growthStart + GROWTH_DURATION_MS * midT);

    expect(midFrame.growing).toHaveLength(1);
    expect(midFrame.growing[0]!.key).toBe(key);
    expect(midFrame.growing[0]!.phase).toBe("growing");
    expect(midFrame.growing[0]!.sampleFraction).toBeCloseTo(easeOutCubic(midT), 5);
    expect(midFrame.growing[0]!.weight).toBe(weight);
    expect(midFrame.settled).toEqual([]);
  });

  it("al completar GROWTH_DURATION_MS, el arco pasa a 'settled' con sampleFraction 1", () => {
    const engine = createArcAnimationEngine();
    const key = "ORI-CALI::D001";
    const weight = 5;
    engine.sync([key], { [key]: weight });

    const enterNow = 0;
    engine.enter(key, enterNow);
    const delay = staggerDelay(key, weight);
    const growthStart = enterNow + delay;

    const frame = engine.tick(growthStart + GROWTH_DURATION_MS);

    expect(frame.growing).toEqual([]);
    expect(frame.settled).toHaveLength(1);
    expect(frame.settled[0]).toMatchObject({ key, phase: "settled", sampleFraction: 1, weight });
  });

  it("una vez 'settled', el arco sigue apareciendo en settled en ticks posteriores", () => {
    const engine = createArcAnimationEngine();
    const key = "ORI-CALI::D001";
    engine.sync([key], { [key]: 5 });
    engine.enter(key, 0);
    const delay = staggerDelay(key, 5);

    engine.tick(delay + GROWTH_DURATION_MS); // dispara la transición a settled
    const laterFrame = engine.tick(delay + GROWTH_DURATION_MS + 5000);

    expect(laterFrame.settled).toHaveLength(1);
    expect(laterFrame.settled[0]!.key).toBe(key);
  });

  it("enter() en un arco que ya está creciendo o asentado es un no-op (no reinicia la animación)", () => {
    const engine = createArcAnimationEngine();
    const key = "ORI-CALI::D001";
    engine.sync([key], { [key]: 5 });

    engine.enter(key, 0);
    const delay = staggerDelay(key, 5);

    // Llamar enter() de nuevo a mitad de camino no debe alterar
    // enteredAt — si lo hiciera, el arco seguiría "growing" en vez de
    // llegar a "settled" en el instante ya calculado.
    engine.enter(key, delay + GROWTH_DURATION_MS * 0.5);

    const frame = engine.tick(delay + GROWTH_DURATION_MS);
    expect(frame.settled).toHaveLength(1);
    expect(frame.growing).toEqual([]);
  });

  it("sync() elimina del registro las claves que ya no están vivas", () => {
    const engine = createArcAnimationEngine();
    const keyA = "ORI-CALI::D001";
    const keyB = "ORI-CALI::D002";

    engine.sync([keyA, keyB], { [keyA]: 3, [keyB]: 3 });
    engine.snapTo([keyA, keyB], { [keyA]: 3, [keyB]: 3 }, 0);

    // keyB deja de estar "vivo": sync() debe purgarlo del registro.
    engine.sync([keyA], { [keyA]: 3 });

    const frame = engine.tick(1000);
    const keys = frame.settled.map((f) => f.key);
    expect(keys).toContain(keyA);
    expect(keys).not.toContain(keyB);
  });

  it("snapTo() pasa directo a 'settled' sin ningún frame de crecimiento intermedio", () => {
    const engine = createArcAnimationEngine();
    const key = "ORI-CALI::D001";

    engine.snapTo([key], { [key]: 8 }, 0);

    // Incluso en el mismísimo instante del snap, ya debe estar settled —
    // nunca pasa por "growing".
    const frame = engine.tick(0);
    expect(frame.growing).toEqual([]);
    expect(frame.settled).toHaveLength(1);
    expect(frame.settled[0]).toMatchObject({ key, phase: "settled", sampleFraction: 1, weight: 8 });
  });

  it("bumpWeight() actualiza el peso de un arco asentado sin reanimarlo", () => {
    const engine = createArcAnimationEngine();
    const key = "ORI-CALI::D001";
    engine.snapTo([key], { [key]: 5 }, 0);

    engine.bumpWeight(key, 12);
    const frame = engine.tick(100);

    expect(frame.growing).toEqual([]);
    expect(frame.settled).toHaveLength(1);
    expect(frame.settled[0]!.weight).toBe(12);
  });

  it("pulseLoopT recorre 0..1 con período PULSE_PERIOD_MS", () => {
    const engine = createArcAnimationEngine();

    expect(engine.tick(0).pulseLoopT).toBeCloseTo(0, 5);
    expect(engine.tick(PULSE_PERIOD_MS / 2).pulseLoopT).toBeCloseTo(0.5, 5);
    expect(engine.tick(PULSE_PERIOD_MS).pulseLoopT).toBeCloseTo(0, 5);
  });

  it("múltiples arcos con distinto peso pueden estar en fases distintas al mismo tiempo", () => {
    const engine = createArcAnimationEngine();
    const keyGrowing = "ORI-CALI::D001";
    const keySettled = "ORI-CARTAGO::D002";

    engine.snapTo([keySettled], { [keySettled]: 4 }, 0);
    engine.sync([keyGrowing, keySettled], { [keyGrowing]: 6, [keySettled]: 4 });
    engine.enter(keyGrowing, 0);

    const delay = staggerDelay(keyGrowing, 6);
    const frame = engine.tick(delay + GROWTH_DURATION_MS * 0.3);

    expect(frame.growing.map((f) => f.key)).toEqual([keyGrowing]);
    expect(frame.settled.map((f) => f.key)).toEqual([keySettled]);
  });
});