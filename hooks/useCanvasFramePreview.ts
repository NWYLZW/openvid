'use client';
import { useEffect, useRef, useState, type RefObject } from 'react';

/** Present complete shared-renderer frames only when media or configuration changes. */
export function useCanvasFramePreview(options: {
  enabled: boolean;
  width: number;
  height: number;
  maxFps?: 30 | 60;
  renderKey: string;
  exportingRef?: RefObject<boolean>;
  /** null means the source is not decoded/ready for a new frame yet. */
  getFrameKey: () => string | null;
  render: (canvas: HTMLCanvasElement) => Promise<boolean>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const latest = useRef(options);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { latest.current = options; });
  useEffect(() => {
    if (!options.enabled) return;
    const buffer = document.createElement('canvas');
    let cancelled = false, raf = 0, last = -Infinity, presentedKey = '';
    const tick = async (now: number) => {
      if (cancelled) return;
      const current = latest.current;
      const mediaKey = current.getFrameKey();
      const key = `${current.renderKey}:${current.width}:${current.height}:${mediaKey}`;
      if (current.exportingRef?.current || mediaKey === null || key === presentedKey || now - last < 1000 / (current.maxFps ?? 30) - .5) {
        raf = requestAnimationFrame(tick); return;
      }
      last = now;
      try {
        if (buffer.width !== current.width || buffer.height !== current.height) {
          buffer.width = current.width; buffer.height = current.height;
        }
        const drawn = await current.render(buffer);
        if (cancelled) return;
        const canvas = canvasRef.current;
        if (drawn && canvas && !current.exportingRef?.current) {
          if (canvas.width !== buffer.width || canvas.height !== buffer.height) {
            canvas.width = buffer.width; canvas.height = buffer.height;
          }
          const ctx = canvas.getContext('2d')!;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(buffer, 0, 0);
          canvas.dataset.frameTime = buffer.dataset.frameTime;
          canvas.dataset.frameCount = String(Number(canvas.dataset.frameCount ?? 0) + 1);
          presentedKey = key;
          setError(null);
        }
      } catch (e) {
        presentedKey = key;
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
      if (!cancelled) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelled = true; cancelAnimationFrame(raf); };
  }, [options.enabled]);
  return { canvasRef, error };
}
