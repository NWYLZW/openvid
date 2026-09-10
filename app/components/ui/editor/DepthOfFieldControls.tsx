'use client';

import type { MockupMotionFragment } from '@/lib/mockup-motion';
import type { CameraDepthOfField } from '@/lib/camera-depth-of-field';

const DEFAULT_DEPTH: CameraDepthOfField = { focus: { x: .5, y: .5 }, maxBlurPx: 3.5 };
const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value));

/** Edits the camera fragment itself, so AI edits, UI edits and saved projects agree. */
export function DepthOfFieldControls({ fragment, onUpdate }: {
  fragment: MockupMotionFragment;
  onUpdate: (updates: Partial<MockupMotionFragment>) => void;
}) {
  const depth = fragment.depthOfField ?? DEFAULT_DEPTH;
  const enabled = !!fragment.depthOfField && depth.enabled !== false;
  const update = (patch: Partial<CameraDepthOfField>) => onUpdate({ depthOfField: { ...depth, ...patch } });
  const setFocus = (x: number, y: number) => update({ focus: { x: clamp(x), y: clamp(y) } });
  const rect = depth.protectRect;
  const updateRect = (key: 'x' | 'y' | 'width' | 'height', value: number) => {
    if (!rect) return;
    const next = { ...rect };
    const max = key === 'x' ? 1 - rect.width : key === 'y' ? 1 - rect.height : key === 'width' ? 1 - rect.x : 1 - rect.y;
    next[key] = clamp(value, key === 'width' || key === 'height' ? .001 : 0, max);
    update({ protectRect: next });
  };
  const percent = (label: string, value: number, change: (value: number) => void) => (
    <label className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
      {label}
      <span className="flex items-center gap-1">
        <input type="number" aria-label={label} min={0} max={100} step={.1}
          value={Number((value * 100).toFixed(2))}
          onChange={e => { if (Number.isFinite(e.target.valueAsNumber)) change(e.target.valueAsNumber / 100); }}
          className="w-20 rounded border border-border bg-background px-2 py-1 text-foreground" />%
      </span>
    </label>
  );
  return (
    <section data-depth-controls className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
      <label className="flex items-center justify-between gap-2 text-sm font-medium">
        Depth of field
        <input type="checkbox" checked={enabled} onChange={e => update({ enabled: e.target.checked })} className="accent-primary" />
      </label>
      <p className="text-xs text-muted-foreground">Keep a target sharp while the far side softens. Settings are saved in this camera fragment.</p>
      {enabled && <>
        <label className="flex items-center justify-between gap-2 text-xs">
          Blur strength <output>{depth.maxBlurPx.toFixed(1)} px</output>
        </label>
        <input aria-label="Blur strength" className="w-full accent-primary" type="range" min={0} max={4} step={.1}
          value={depth.maxBlurPx} onChange={e => update({ maxBlurPx: e.target.valueAsNumber })} />
        <div role="button" tabIndex={0} aria-label="Focus position" title="Click or drag to move focus; arrow keys move by 1%"
          className="relative aspect-video w-full cursor-crosshair touch-none overflow-hidden rounded border border-border bg-background focus-visible:outline-2 focus-visible:outline-primary"
          onPointerDown={e => {
            e.currentTarget.setPointerCapture(e.pointerId);
            const box = e.currentTarget.getBoundingClientRect();
            setFocus((e.clientX - box.left) / box.width, (e.clientY - box.top) / box.height);
          }}
          onPointerMove={e => {
            if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
            const box = e.currentTarget.getBoundingClientRect();
            setFocus((e.clientX - box.left) / box.width, (e.clientY - box.top) / box.height);
          }}
          onKeyDown={e => {
            const delta: Record<string, [number, number]> = { ArrowLeft: [-.01, 0], ArrowRight: [.01, 0], ArrowUp: [0, -.01], ArrowDown: [0, .01] };
            if (delta[e.key]) { e.preventDefault(); setFocus(depth.focus.x + delta[e.key][0], depth.focus.y + delta[e.key][1]); }
          }}>
          <span className="absolute left-2 top-1 text-[10px] text-muted-foreground">Source frame</span>
          {rect && <div className="pointer-events-none absolute border border-primary bg-primary/10" style={{ left: `${rect.x * 100}%`, top: `${rect.y * 100}%`, width: `${rect.width * 100}%`, height: `${rect.height * 100}%` }} />}
          <div className="pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary bg-background" style={{ left: `${depth.focus.x * 100}%`, top: `${depth.focus.y * 100}%` }} />
        </div>
        {percent('Focus X', depth.focus.x, x => setFocus(x, depth.focus.y))}
        {percent('Focus Y', depth.focus.y, y => setFocus(depth.focus.x, y))}
        <label className="flex items-center justify-between text-xs">
          Protect an area
          <input type="checkbox" checked={!!rect} className="accent-primary" onChange={e => update({ protectRect: e.target.checked ? { x: .3, y: .35, width: .4, height: .1 } : undefined })} />
        </label>
        {rect && <div className="grid grid-cols-1 gap-2">
          {percent('Area X', rect.x, x => updateRect('x', x))}
          {percent('Area Y', rect.y, y => updateRect('y', y))}
          {percent('Area width', rect.width, width => updateRect('width', width))}
          {percent('Area height', rect.height, height => updateRect('height', height))}
        </div>}
        <p className="text-[11px] text-muted-foreground">Coordinates use the original video. The outlined area stays sharp through camera motion and Zoom.</p>
      </>}
    </section>
  );
}
