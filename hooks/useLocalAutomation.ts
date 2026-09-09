'use client';
import { useEffect, useRef } from 'react';
import { isLocalOnly } from '@/lib/local-mode';
import type { LocalEdit } from '@/lib/local-edit';
import type { VideoProject } from '@/lib/video-project-cache';
import type { ExportProgress, ExportQuality } from '@/types';

interface AutomationState {
  ready: boolean;
  duration: number;
  currentTime: number;
  exportProgress: ExportProgress;
  project: Omit<VideoProject, 'id' | 'savedAt' | 'schemaVersion'>;
}
interface LocalAutomation {
  version: 1;
  state(): AutomationState;
  apply(edit: LocalEdit): Promise<AutomationState>;
  save(): Promise<void>;
  seek(time: number): void;
  export(quality: ExportQuality): void;
}
declare global { interface Window { openvid?: LocalAutomation } }

export function useLocalAutomation(handlers: Omit<LocalAutomation, 'version' | 'apply'> & { apply(edit: LocalEdit): void }) {
  const current = useRef(handlers);
  useEffect(() => { current.current = handlers; });
  useEffect(() => {
    if (!isLocalOnly) return;
    function ready() {
      if (!current.current.state().ready) throw new Error('Editor is restoring, exporting, or has no loaded video');
    }
    const api: LocalAutomation = {
      version: 1,
      state: () => structuredClone(current.current.state()),
      async apply(edit) {
        ready();
        current.current.apply(edit);
        await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
        const deadline = performance.now() + 10000;
        while (!api.state().ready) {
          if (performance.now() > deadline) throw new Error('Edit applied, but media did not become ready within 10 seconds');
          await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
        }
        return api.state();
      },
      async save() { ready(); await current.current.save(); },
      seek(time) {
        ready();
        if (!Number.isFinite(time) || time < 0 || time > current.current.state().duration) throw new Error('Invalid seek time');
        current.current.seek(time);
      },
      export(quality) {
        ready();
        if (!['4k','2k','1080p','720p','480p','gif','webm-alpha'].includes(quality)) throw new Error('Unknown export quality');
        current.current.export(quality);
      },
    };
    window.openvid = api;
    return () => { if (window.openvid === api) delete window.openvid; };
  }, []);
}
