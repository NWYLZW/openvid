import type { MockupMotionFragment } from './mockup-motion';
import type { VideoTrackClip } from '../types/video-track.types';

/** Preserve the original curve by shifting its knots, including knots outside a trimmed fragment. */
export function remapCameraFragment(fragment: MockupMotionFragment, oldClips: VideoTrackClip[], newClips: VideoTrackClip[]): MockupMotionFragment[] {
  const result: MockupMotionFragment[] = [];
  for (const next of newClips) {
    const old = oldClips.find(c => c.id === next.id) ?? oldClips.find(c => c.libraryVideoId === next.libraryVideoId && c.trimEnd > next.trimStart && c.trimStart < next.trimEnd && Math.abs(c.startTime + next.trimStart - c.trimStart - next.startTime) < 1e-6);
    if (!old || old.libraryVideoId !== next.libraryVideoId) continue;
    const sourceStart = Math.max(old.trimStart, next.trimStart, old.trimStart + fragment.startTime - old.startTime);
    const sourceEnd = Math.min(old.trimEnd, next.trimEnd, old.trimStart + fragment.endTime - old.startTime);
    if (sourceEnd - sourceStart <= .01) continue;
    const startTime = next.startTime + sourceStart - next.trimStart;
    const oldLocalStart = old.startTime + sourceStart - old.trimStart - fragment.startTime;
    result.push({ ...fragment, id: `${fragment.id}:${next.id}`, startTime, endTime: startTime + sourceEnd - sourceStart,
      keyframes: fragment.keyframes?.map(frame => ({ ...frame, time: frame.time - oldLocalStart })) });
  }
  return result;
}
