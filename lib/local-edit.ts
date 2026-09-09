/** Small recipe format for the editing operations proven by the first real run. */
export interface LocalEdit {
  version: 1;
  speed: number;
  padding: number;
  roundedCorners: number;
  shadows: number;
  mockup: 'none' | 'chrome' | 'macos';
  background: { from: string; to: string };
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
  const allowed = ['version','speed','padding','roundedCorners','shadows','mockup','background','zooms','titles'];
  if (Object.keys(input).some(key => !allowed.includes(key))) throw new Error('Unknown edit field');
  if (input.version !== 1) throw new Error('Unsupported edit version');
  number(input.speed, .25, 4, 'speed');
  for (const key of ['padding','roundedCorners','shadows']) number(input[key], 0, 100, key);
  if (!['none','chrome','macos'].includes(String(input.mockup))) throw new Error('Unsupported mockup');
  object(input.background);
  color(input.background.from); color(input.background.to);
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
  return input as unknown as LocalEdit;
}
