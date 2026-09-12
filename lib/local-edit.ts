import { parseDuoEdit, type DuoEdit } from "./duo-edit.ts";
import { parseCameraDepthOfField, type CameraDepthOfField } from "./camera-depth-of-field.ts";
import { parseDockLaunch } from "./dock-launch.ts";
import { parsePointerTrack, type PointerTrack } from "./pointer-track.ts";
import type { MotionKeyframe } from "./motion-keyframes";
/** Small recipe format for the editing operations proven by the first real run. */
export interface LocalEdit {
  dockLaunch?: import("./dock-launch").DockLaunch;
  version: 1;
  duo?: DuoEdit;
  pointerTrack?: PointerTrack;
  camera?: MotionKeyframe[];
  depthOfField?: CameraDepthOfField;
  speed: number;
  padding: number;
  roundedCorners: number;
  shadows: number;
  mockup: 'none' | 'chrome' | 'macos' | 'iphone-duo';
  background: { from: string; to: string } | { wallpaper: string };
  zooms: Array<{ start: number; end: number; level: number; speed: number; x: number; y: number; tiltX: number; tiltY: number }>;
  titles: Array<{ text: string; start: number; end: number; y: number; fontSize: number; color: string }>;
}

export function parseLocalEdit(input: unknown, duration: number): LocalEdit {
  function object(value: unknown): asserts value is Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected an object');
  }
  function number(value: unknown, min: number, max: number, field: string) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw new Error(`Invalid ${field}: expected ${min}..${max}`);
  }
  function color(value: unknown) {
    if (typeof value !== 'string' || !/^#[0-9a-f]{6}$/i.test(value)) throw new Error('Expected #RRGGBB color');
  }
  function interval(value: Record<string, unknown>) {
    number(value.start, 0, duration, 'start');
    number(value.end, 0, duration, 'end');
    if ((value.end as number) <= (value.start as number)) throw new Error('end must follow start');
  }
  object(input);
  const allowed = ['version','duo','dockLaunch','pointerTrack','camera','depthOfField','speed','padding','roundedCorners','shadows','mockup','background','zooms','titles'];
  if (Object.keys(input).some(key => !allowed.includes(key))) throw new Error('Unknown edit field');
  if (input.version !== 1) throw new Error('Unsupported edit version');
  number(input.speed, .25, 4, 'speed');
  for (const key of ['padding','roundedCorners','shadows']) number(input[key], 0, 100, key);
  if (!['none','chrome','macos','iphone-duo'].includes(String(input.mockup))) throw new Error('Unsupported mockup');
  if (input.mockup === 'iphone-duo') {
    if(input.camera) throw new Error('Duo cannot use a 2D camera track');
    input.duo = parseDuoEdit(input.duo, duration);
  } else if (input.duo !== undefined) throw new Error('duo requires mockup iphone-duo');
  object(input.background);
  if ('wallpaper' in input.background) {
    if (typeof input.background.wallpaper !== 'string' || !/^(desktop|gradient|pattern|minimal)-\d{2}$/.test(input.background.wallpaper)) throw new Error('Invalid wallpaper name');
  } else {
    color(input.background.from); color(input.background.to);
  }
  if (!Array.isArray(input.zooms) || !Array.isArray(input.titles)) throw new Error('zooms and titles must be arrays');
  if (input.zooms.length > 100 || input.titles.length > 100) throw new Error('Too many elements');
  let end = 0;
  for (const zoom of input.zooms) {
    object(zoom); interval(zoom);
    if ((zoom.start as number) < end) throw new Error('Zooms must be sorted and non-overlapping');
    end = zoom.end as number;
    number(zoom.level, 1, 10, 'level'); number(zoom.speed, 1, 10, 'zoom speed');
    number(zoom.x, 0, 100, 'x'); number(zoom.y, 0, 100, 'y');
    number(zoom.tiltX, -45, 45, 'tiltX'); number(zoom.tiltY, -45, 45, 'tiltY');
  }
  for (const title of input.titles) {
    object(title); interval(title); color(title.color);
    if (typeof title.text !== 'string' || !title.text.trim() || title.text.length > 300) throw new Error('Invalid title text');
    number(title.y, 0, 100, 'title y'); number(title.fontSize, 8, 150, 'fontSize');
  }
  if (input.camera !== undefined) {
    if (!Array.isArray(input.camera) || input.camera.length < 2 || input.camera.length > 100) throw new Error('Expected 2..100 camera keyframes');
    let previous = -1;
    for (const frame of input.camera) {
      object(frame);
      number(frame.time, 0, duration, 'camera time');
      if ((frame.time as number) <= previous) throw new Error('Camera times must strictly increase');
      previous = frame.time as number;
      if (frame.easing !== undefined) {
        if (!Array.isArray(frame.easing) || frame.easing.length !== 4) throw new Error('Expected four cubic-bezier values');
        for (const value of frame.easing) number(value, 0, 1, 'easing');
      }
      number(frame.scale, .2, 4, 'camera scale');
      number(frame.x, -100, 100, 'camera x'); number(frame.y, -100, 100, 'camera y');
      number(frame.pitch, -80, 80, 'pitch'); number(frame.yaw, -65, 65, 'yaw');
      number(frame.roll, -45, 45, 'roll'); number(frame.perspective, 1200, 4000, 'perspective');
    }
    if (input.camera[0].time !== 0) throw new Error('First camera keyframe must start at zero');
  }
  if(input.dockLaunch!==undefined){if(!input.camera || input.mockup!=='none')throw new Error("Dock requires camera and mockup none");input.dockLaunch=parseDockLaunch(input.dockLaunch);}
  if (input.pointerTrack !== undefined) {
    if(!input.camera || input.mockup!=='none') throw new Error("pointerTrack requires camera keyframes and mockup none");
    input.pointerTrack=parsePointerTrack(input.pointerTrack,duration);
  }
  if (input.depthOfField !== undefined) {
    if (input.mockup !== 'none' || !input.camera) throw new Error('depthOfField requires mockup none and camera keyframes');
    return { ...input, depthOfField: parseCameraDepthOfField(input.depthOfField) } as unknown as LocalEdit;
  }
  return input as unknown as LocalEdit;
}
