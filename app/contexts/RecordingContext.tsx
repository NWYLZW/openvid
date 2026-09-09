"use client";

import { createContext, useContext, ReactNode, useEffect } from "react";
import { useScreenRecording } from "../../hooks/useScreenRecording";
import { isLocalOnly } from "@/lib/local-mode";
import type { RecordingState, RecordingContextType } from "@/types";

export type { RecordingState, RecordingContextType };

declare global {
  interface Window {
    openvidRecording?: {
      clock(): { state: RecordingState; startedAtMs: number; surface: string | null };
      stop(): void;
    };
  }
}

const RecordingContext = createContext<RecordingContextType | null>(null);

export function RecordingProvider({ children }: { children: ReactNode }) {
  const recording = useScreenRecording();
  useEffect(() => {
    if (!isLocalOnly) return;
    const api = { clock: recording.getRecordingClock, stop: recording.stopRecording };
    window.openvidRecording = api;
    return () => { if (window.openvidRecording === api) delete window.openvidRecording; };
  }, [recording.getRecordingClock, recording.stopRecording]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (recording.isIdle) {
          recording.startCountdown();
        }
      }

      if (e.altKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        if (recording.isRecording) {
          recording.stopRecording();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [recording.isIdle, recording.isRecording, recording.startCountdown, recording.stopRecording]);

  return (
    <RecordingContext.Provider value={recording}>
      {children}
    </RecordingContext.Provider>
  );
}

export function useRecording() {
  const context = useContext(RecordingContext);
  if (!context) {
    throw new Error("useRecording must be used within a RecordingProvider");
  }
  return context;
}