/** Wall-clock pulse. A spike starts at full brightness and reaches 0 in this many ms. */
export const FLASH_DECAY_MS = 150;

/**
 * After the pulse, a cell that fired stays lit and fades over this many ms,
 * so the wave can be seen traveling. Shorter at full speed, where the wave
 * moves on sooner.
 */
export const AFTERGLOW_MS = 1500;
export const AFTERGLOW_FAST_MS = 600;
/** How bright the afterglow starts, as a share of a spike's flash. */
export const AFTERGLOW_SHARE = 0.4;
/** With reduced motion a fired cell keeps this steady tint until the next puff. */
export const FIRED_TINT = 0.3;

/**
 * Per-neuron brightness for the shader: a short flash on each spike, and the
 * afterglow behind it. `values` holds the flash alone, which is what the
 * activity meters and the compass read; `bytes` holds what is drawn.
 */
export class FlashField {
  readonly values: Float32Array;
  readonly glow: Float32Array;
  readonly bytes: Uint8Array;
  /** Wall ms an afterglow takes to fade. Null holds it still (reduced motion). */
  glowMs: number | null = AFTERGLOW_MS;
  private readonly hot: Uint8Array;
  private active: number[] = [];
  private glowing: number[] = [];
  private readonly lit: Uint8Array;

  constructor(count: number) {
    this.values = new Float32Array(count);
    this.glow = new Float32Array(count);
    this.bytes = new Uint8Array(count);
    this.hot = new Uint8Array(count);
    this.lit = new Uint8Array(count);
  }

  /** A spike is still flashing. The afterglow does not count: the brain is quiet under it. */
  get busy(): boolean {
    return this.active.length > 0;
  }

  /** Something is still fading, so the picture keeps changing. */
  get fading(): boolean {
    return this.glowMs !== null && this.glowing.length > 0;
  }

  clear() {
    this.values.fill(0);
    this.bytes.fill(0);
    this.hot.fill(0);
    this.active = [];
    this.clearGlow();
  }

  /** Puts out every afterglow, for a new puff. */
  clearGlow() {
    for (const index of this.glowing) {
      this.glow[index] = 0;
      this.lit[index] = 0;
      this.paint(index);
    }
    this.glowing = [];
  }

  decay(dtMs: number) {
    if (dtMs <= 0) return;
    if (this.active.length > 0) {
      const step = dtMs / FLASH_DECAY_MS;
      const next: number[] = [];
      for (const index of this.active) {
        const value = Math.max(0, (this.values[index] ?? 0) - step);
        this.values[index] = value;
        this.paint(index);
        if (value > 0) next.push(index);
        else this.hot[index] = 0;
      }
      this.active = next;
    }
    if (this.glowMs === null || this.glowing.length === 0) return;
    const step = (dtMs / this.glowMs) * AFTERGLOW_SHARE;
    const next: number[] = [];
    for (const index of this.glowing) {
      const value = Math.max(0, (this.glow[index] ?? 0) - step);
      this.glow[index] = value;
      this.paint(index);
      if (value > 0) next.push(index);
      else this.lit[index] = 0;
    }
    this.glowing = next;
  }

  mark(spikes: Uint8Array) {
    const count = Math.min(spikes.length, this.values.length);
    const glow = this.glowMs === null ? FIRED_TINT : AFTERGLOW_SHARE;
    for (let index = 0; index < count; index++) {
      if (!spikes[index]) continue;
      this.values[index] = 1;
      this.glow[index] = glow;
      this.bytes[index] = 255;
      if (this.hot[index] === 0) {
        this.hot[index] = 1;
        this.active.push(index);
      }
      if (this.lit[index] === 0) {
        this.lit[index] = 1;
        this.glowing.push(index);
      }
    }
  }

  private paint(index: number) {
    const value = Math.max(this.values[index] ?? 0, this.glow[index] ?? 0);
    this.bytes[index] = Math.round(value * 255);
  }
}

export function activityByGroup(
  values: Float32Array,
  groups: ReadonlyMap<string, Uint32Array>,
  threshold = 0.04,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [name, ids] of groups) {
    let hot = 0;
    for (let index = 0; index < ids.length; index++) {
      const id = ids[index] ?? 0;
      if ((values[id] ?? 0) > threshold) hot += 1;
    }
    out[name] = ids.length === 0 ? 0 : hot / ids.length;
  }
  return out;
}
