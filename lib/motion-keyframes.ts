/** Camera poses in source-video seconds; positions are percentages of the media plane. */
export interface MotionKeyframe {
  time: number;
  scale: number;
  x: number;
  y: number;
  pitch: number;
  yaw: number;
  roll: number;
  perspective: number;
}

export function sampleMotionKeyframes(frames: MotionKeyframe[], time: number) {
  if (!frames.length) throw new Error('Camera keyframes required');
  let a = frames[0], b = frames[0];
  if (time >= frames.at(-1)!.time) a = b = frames.at(-1)!;
  else for (let i = 1; i < frames.length; i++) {
    if (time <= frames[i].time) { a = frames[i - 1]; b = frames[i]; break; }
  }
  const u = a === b ? 0 : Math.max(0, Math.min(1, (time - a.time) / (b.time - a.time)));
  const eased = u * u * (3 - 2 * u);
  const mix = (key: keyof MotionKeyframe) => a[key] + (b[key] - a[key]) * eased;
  return { scale: mix('scale'), translateXPct: mix('x'), translateYPct: mix('y'), rotateX: mix('pitch'), rotateY: mix('yaw'), rotateZ: mix('roll'), perspectivePx: mix('perspective') };
}

/** Camera pieces sharing a cut have a single owner at that frame; ordinary motion layers remain additive. */
export function activeMotionFragments<T extends { startTime: number; endTime: number; keyframes?: MotionKeyframe[] }>(fragments: T[], time: number): T[] {
  return fragments.filter(f => time >= f.startTime && time <= f.endTime &&
    !(f.keyframes?.length && time === f.endTime && fragments.some(next => next !== f && next.keyframes?.length && next.startTime === time)));
}
