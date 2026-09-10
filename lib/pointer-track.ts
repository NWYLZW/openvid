import { applyPointerDistortion } from './pointer-distortion.ts';

export const CLICK_EFFECTS = ['none', 'press', 'ripple', 'halo', 'distort'] as const;
export type ClickEffect = typeof CLICK_EFFECTS[number];
export type PointerEffect = ClickEffect;
export interface PointerEvent {
  id: string;
  /** Fragment-local seconds. Negative knots may be retained by trim/split. */
  time: number;
  x: number;
  y: number;
  kind: 'move' | 'click';
  /** Arrival duration, clamped to the interval from the preceding event. */
  travel?: number;
  effect?: ClickEffect;
}
export interface PointerTrack {
  enabled: boolean;
  size: number;
  effect: ClickEffect;
  radius: number;
  strength: number;
  duration: number;
  fps?: 30 | 60;
  events: PointerEvent[];
}
export interface PointerClick {
  x: number; y: number; progress: number; effect: ClickEffect; pressure: number;
}
export interface PointerSample {
  position: { x: number; y: number } | null;
  clicks: PointerClick[];
  cursorScale: number;
}

/** With duration, validate a new source-local track; omit it for retained trim knots. */
export function parsePointerTrack(value: unknown, duration?: number): PointerTrack {
  const object = (v: unknown): Record<string, unknown> => {
    if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error('pointerTrack: expected object');
    return v as Record<string, unknown>;
  };
  const number = (v: unknown, min: number, max: number, field: string): number => {
    if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max) throw new Error(`pointerTrack: invalid ${field} (${min}..${max})`);
    return v;
  };
  const keys = (v: Record<string, unknown>, allowed: string[]) => {
    if (Object.keys(v).some(k => !allowed.includes(k))) throw new Error('pointerTrack: unknown field');
  };
  const effect = (v: unknown): ClickEffect => {
    if (!CLICK_EFFECTS.includes(v as ClickEffect)) throw new Error('pointerTrack: unsupported click effect');
    return v as ClickEffect;
  };
  if (duration !== undefined) number(duration, 0, Infinity, 'source duration');
  const v = object(value); keys(v, ['enabled', 'size', 'effect', 'radius', 'strength', 'duration', 'fps', 'events']);
  if (typeof v.enabled !== 'boolean') throw new Error('pointerTrack: enabled must be boolean');
  if (v.fps !== undefined && v.fps !== 30 && v.fps !== 60) throw new Error('pointerTrack: fps must be 30 or 60');
  const track: PointerTrack = { enabled: v.enabled, size: number(v.size, 1, 256, 'size'), effect: effect(v.effect),
    radius: number(v.radius, 0, 1, 'radius'), strength: number(v.strength, 0, 1, 'strength'),
    duration: number(v.duration, .01, 10, 'effect duration'), ...(v.fps === undefined ? {} : { fps: v.fps as 30 | 60 }), events: [] };
  if (!Array.isArray(v.events) || v.events.length > 2000) throw new Error('pointerTrack: expected at most 2000 events');
  let previous = -Infinity;
  const ids = new Set<string>();
  for (const input of v.events) {
    const e = object(input); keys(e, ['id', 'time', 'x', 'y', 'kind', 'travel', 'effect']);
    if (typeof e.id !== 'string' || !e.id || e.id.length > 200 || ids.has(e.id)) throw new Error('pointerTrack: event ids must be unique');
    ids.add(e.id);
    const time = number(e.time, duration === undefined ? -Infinity : 0, duration ?? Infinity, 'event time');
    if (time < previous) throw new Error('pointerTrack: events must be sorted by time');
    previous = time;
    if (e.kind !== 'move' && e.kind !== 'click') throw new Error('pointerTrack: invalid event kind');
    track.events.push({ id: e.id, time, kind: e.kind, x: number(e.x, 0, 1, 'x'), y: number(e.y, 0, 1, 'y'),
      ...(e.travel === undefined ? {} : { travel: number(e.travel, 0, 3600, 'travel') }),
      ...(e.effect === undefined ? {} : { effect: effect(e.effect) }) });
  }
  const distortTimes: number[] = [];
  for (const event of track.events) {
    if (event.kind !== 'click' || (event.effect ?? track.effect) !== 'distort') continue;
    while (distortTimes.length && distortTimes[0] + track.duration <= event.time) distortTimes.shift();
    distortTimes.push(event.time);
    if (distortTimes.length > 32) throw new Error('pointerTrack: at most 32 simultaneous distort clicks');
  }
  return track;
}

/** Smooth press followed by a small rebound, exactly at rest at both boundaries. */
export function pointerPressure(progress: number): number {
  if (progress <= 0 || progress >= 1) return 0;
  return Math.sin(2 * Math.PI * progress) * Math.exp(-4 * progress) * (1 - progress);
}
export function samplePointerTrack(track: PointerTrack, time: number): PointerSample {
  const rest: PointerSample = { position: null, clicks: [], cursorScale: 1 };
  if (!track.enabled || !Number.isFinite(time) || !track.events.length || time < track.events[0].time) return rest;
  let index = 0;
  while (index + 1 < track.events.length && track.events[index + 1].time <= time) index++;
  const a = track.events[index], b = track.events[index + 1];
  let x = a.x, y = a.y;
  if (b) {
    const travel = Math.min(b.time - a.time, b.travel ?? b.time - a.time);
    const p = travel > 0 ? Math.max(0, Math.min(1, (time - (b.time - travel)) / travel)) : 0;
    const u = p * p * (3 - 2 * p);
    x += (b.x - a.x) * u; y += (b.y - a.y) * u;
  }
  const clicks = track.events.filter(e => e.kind === 'click' && e.time <= time && time < e.time + track.duration)
    .map(e => { const progress = (time - e.time) / track.duration; return { x: e.x, y: e.y, progress, effect: e.effect ?? track.effect, pressure: pointerPressure(progress) }; });
  const press = clicks.filter(c => c.effect === 'press' || c.effect === 'distort').at(-1)?.pressure ?? 0;
  return { position: { x, y }, clicks, cursorScale: 1 - .35 * track.strength * press };
}

/** Reference inverse warp, in pixels; the GPU uses the identical radial kernel. */
export function pointerWarpPoint(x: number, y: number, cx: number, cy: number, radius: number, amplitude: number) {
  if (radius <= 0) return { x, y };
  const dx = x - cx, dy = y - cy, r2 = (dx * dx + dy * dy) / (radius * radius);
  const weight = r2 < 1 ? (1 - r2) ** 2 : 0;
  return { x: x + dx * amplitude * weight, y: y + dy * amplitude * weight };
}

/** ctx already contains the original video plane. Warp pixels first, then draw an undistorted cursor. */
export function renderPointerTrack(ctx: CanvasRenderingContext2D, track: PointerTrack, time: number, width: number, height: number, referenceHeight = height): void {
  const sample = samplePointerTrack(track, time);
  if (!sample.position) return;
  const distortions = sample.clicks.filter(c => c.effect === 'distort' && Math.abs(c.pressure) > 1e-6);
  if (distortions.length && track.radius > 0 && track.strength > 0) {
    applyPointerDistortion(ctx.canvas, distortions.map(c => ({ x: c.x * width, y: c.y * height, radius: track.radius * width, amplitude: .35 * track.strength * c.pressure })));
  }
  const size = track.size * referenceHeight / 1080;
  ctx.save();
  for (const click of sample.clicks) {
    const radius = track.radius * width;
    if (radius <= 0 || track.strength <= 0) continue;
    if (click.effect === 'ripple') {
      ctx.beginPath(); ctx.arc(click.x * width, click.y * height, radius * (.15 + .85 * click.progress), 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(80,160,255,${(1 - click.progress) * track.strength * .7})`;
      ctx.lineWidth = Math.max(1, size * .08); ctx.stroke();
    } else if (click.effect === 'halo') {
      const gradient = ctx.createRadialGradient(click.x * width, click.y * height, 0, click.x * width, click.y * height, radius);
      gradient.addColorStop(0, `rgba(255,210,70,${Math.sin(Math.PI * click.progress) * track.strength * .4})`);
      gradient.addColorStop(1, 'rgba(255,210,70,0)');
      ctx.fillStyle = gradient; ctx.fillRect(click.x * width - radius, click.y * height - radius, radius * 2, radius * 2);
    }
  }
  ctx.translate(sample.position.x * width, sample.position.y * height);
  ctx.scale(size * sample.cursorScale, size * sample.cursorScale);
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(.07, .93); ctx.lineTo(.30, .69); ctx.lineTo(.48, 1.06);
  ctx.lineTo(.66, .97); ctx.lineTo(.48, .61); ctx.lineTo(.82, .59); ctx.closePath();
  ctx.fillStyle = '#17191e'; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = .055; ctx.lineJoin = 'round'; ctx.stroke(); ctx.fill();
  ctx.restore();
}
