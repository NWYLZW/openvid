"use client";

import { createContext, useContext, useState, useMemo, useCallback, type ReactNode } from "react";
import { DEVICE_VIEWER_DEFAULTS } from "@/lib/phone3d.utils";
import type { EnvironmentPreset } from "@/lib/viewer-controls3d";

import { defaultDuoConfig, type DuoConfig } from "@/lib/duo-config";
import { restoreMockup3DState, type Mockup3DPersistedState } from "@/lib/mockup3d-state";

interface Mockup3dState {
  duoConfig: DuoConfig;
  setDuoConfig: React.Dispatch<React.SetStateAction<DuoConfig>>;
  mockup3dSnapshot: Mockup3DPersistedState;
  restoreMockup3d: (state: Partial<Mockup3DPersistedState>) => void;
  selectedTemplateId: string | null;
  setSelectedTemplateId: (id: string | null) => void;

  motionImageUrl: string | null;
  setMotionImageUrl: (url: string | null) => void;

  motionIntensity: number;
  setMotionIntensity: (i: number) => void;
  /** Whether the phone mockup is active in image mode */
  imagePhoneActive: boolean;
  setImagePhoneActive: (v: boolean) => void;
  /** X offset (px) from canvas center */
  imagePhoneX: number;
  setImagePhoneX: (v: number | ((prev: number) => number)) => void;

  /** Y offset (px) from canvas center */
  imagePhoneY: number;
  setImagePhoneY: (v: number | ((prev: number) => number)) => void;
  /** Canvas-level scale of the phone mockup */
  imagePhoneScale: number;
  setImagePhoneScale: (v: number | ((prev: number) => number)) => void;
  /** Persisted 3D rotation offset (degrees) from user drag */
  imagePhoneRotX: number;
  setImagePhoneRotX: (v: number) => void;
  imagePhoneRotY: number;
  setImagePhoneRotY: (v: number) => void;
  /** Z-axis rotation (degrees) for the phone mockup */
  imagePhoneRotZ: number;
  setImagePhoneRotZ: (v: number) => void;
  /** Perspective (px) for the 3D transform on the phone mockup */
  imagePhonePerspective: number;
  setImagePhonePerspective: (v: number) => void;
  /** Which 3D device model is active: the default phone JSON, iPhone 15 Pro Max, or single macOS laptop */
  imagePhoneDevice: Mockup3DPersistedState['imagePhoneDevice'];
  setImagePhoneDevice: (d: Mockup3DPersistedState['imagePhoneDevice']) => void;
  imagePhonePresetId: string;
  setImagePhonePresetId: (id: string) => void;
  /** Laptop opening animation progress (0 = closed, 1 = fully open) */
  imagePhoneOpening: number;
  setImagePhoneOpening: (v: number) => void;
  /** Drop-shadow intensity for the active device mockup (0 = no shadow, 1 = full) */
  imagePhoneShadow: number;
  setImagePhoneShadow: (v: number) => void;
  /** Drop-shadow color (CSS color string) */
  imagePhoneShadowColor: string;
  setImagePhoneShadowColor: (v: string) => void;
  imagePhoneRefWidth: number;
  setImagePhoneRefWidth: (v: number) => void;
  viewer3DAutoRotate: boolean;
  setViewer3DAutoRotate: (v: boolean) => void;
  viewer3DRotationSpeed: number;
  setViewer3DRotationSpeed: (v: number) => void;
  viewer3DGlow: number;
  setViewer3DGlow: (v: number) => void;
  viewer3DEnvironment: EnvironmentPreset;
  setViewer3DEnvironment: (v: EnvironmentPreset) => void;
}

const Mockup3dContext = createContext<Mockup3dState | null>(null);

export function Mockup3dProvider({ children }: { children: ReactNode }) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [motionImageUrl, setMotionImageUrl] = useState<string | null>(null);
  const [motionIntensity, setMotionIntensity] = useState(70);

  const [imagePhoneActive, setImagePhoneActive] = useState(false);
  const [imagePhoneX, setImagePhoneX] = useState(0);
  const [imagePhoneY, setImagePhoneY] = useState(0);
  const [imagePhoneScale, setImagePhoneScale] = useState(1);
  const [imagePhoneRotX, setImagePhoneRotX] = useState(0);
  const [imagePhoneRotY, setImagePhoneRotY] = useState(0);
  const [imagePhoneRotZ, setImagePhoneRotZ] = useState(0);
  const [imagePhonePerspective, setImagePhonePerspective] = useState(600);
  const [imagePhoneDevice, setImagePhoneDeviceState] = useState<Mockup3DPersistedState['imagePhoneDevice']>('phone');
  const [imagePhonePresetId, setImagePhonePresetId] = useState('custom');
  const [imagePhoneOpening, setImagePhoneOpening] = useState(1);
  const [imagePhoneShadow, setImagePhoneShadow] = useState(0.6);
  const [imagePhoneShadowColor, setImagePhoneShadowColor] = useState("#000000");
  const [imagePhoneRefWidth, setImagePhoneRefWidth] = useState(0);
  const [viewer3DAutoRotate, setViewer3DAutoRotate] = useState(false);
  const [viewer3DRotationSpeed, setViewer3DRotationSpeed] = useState(3.5);
  const [viewer3DGlow, setViewer3DGlow] = useState(1.0);
  const [viewer3DEnvironment, setViewer3DEnvironment] = useState<EnvironmentPreset>("studio");

  const [duoConfig, setDuoConfig] = useState(defaultDuoConfig);
  const setImagePhoneDevice = useCallback((device: Mockup3DPersistedState['imagePhoneDevice']) => {
    if (device === imagePhoneDevice) return;
    setImagePhoneDeviceState(device);
    const defaults = DEVICE_VIEWER_DEFAULTS[device] ?? {environment: "studio" as EnvironmentPreset, glow: 1};
    setViewer3DGlow(defaults.glow); setViewer3DEnvironment(defaults.environment);
  }, [imagePhoneDevice]);
  const restoreMockup3d = useCallback((input: Partial<Mockup3DPersistedState>) => {
    const state = restoreMockup3DState(input);
    setImagePhoneActive(state.imagePhoneActive);
    setImagePhoneX(state.imagePhoneX);
    setImagePhoneY(state.imagePhoneY);
    setImagePhoneScale(state.imagePhoneScale);
    setImagePhoneRotX(state.imagePhoneRotX);
    setImagePhoneRotY(state.imagePhoneRotY);
    setImagePhoneRotZ(state.imagePhoneRotZ);
    setImagePhonePerspective(state.imagePhonePerspective);
    setImagePhoneDeviceState(state.imagePhoneDevice);
    setImagePhonePresetId(state.imagePhonePresetId);
    setImagePhoneOpening(state.imagePhoneOpening);
    setImagePhoneShadow(state.imagePhoneShadow);
    setImagePhoneShadowColor(state.imagePhoneShadowColor);
    setImagePhoneRefWidth(state.imagePhoneRefWidth);
    setViewer3DAutoRotate(state.viewer3DAutoRotate);
    setViewer3DRotationSpeed(state.viewer3DRotationSpeed);
    setViewer3DGlow(state.viewer3DGlow);
    setViewer3DEnvironment(state.viewer3DEnvironment);
    setDuoConfig(state.duoConfig);
  }, []);
  const mockup3dSnapshot = useMemo(() => ({
    imagePhoneActive, imagePhoneX, imagePhoneY, imagePhoneScale, imagePhoneRotX, imagePhoneRotY, imagePhoneRotZ, imagePhonePerspective, imagePhoneDevice, imagePhonePresetId, imagePhoneOpening, imagePhoneShadow, imagePhoneShadowColor, imagePhoneRefWidth, viewer3DAutoRotate, viewer3DRotationSpeed, viewer3DGlow, viewer3DEnvironment, duoConfig
  }), [imagePhoneActive, imagePhoneX, imagePhoneY, imagePhoneScale, imagePhoneRotX, imagePhoneRotY, imagePhoneRotZ, imagePhonePerspective, imagePhoneDevice, imagePhonePresetId, imagePhoneOpening, imagePhoneShadow, imagePhoneShadowColor, imagePhoneRefWidth, viewer3DAutoRotate, viewer3DRotationSpeed, viewer3DGlow, viewer3DEnvironment, duoConfig]);

  const value = useMemo(() => ({
    duoConfig, setDuoConfig, mockup3dSnapshot, restoreMockup3d,
    selectedTemplateId, setSelectedTemplateId,
    motionImageUrl, setMotionImageUrl,
    motionIntensity, setMotionIntensity,
    imagePhoneActive, setImagePhoneActive,
    imagePhoneX, setImagePhoneX,
    imagePhoneY, setImagePhoneY,
    imagePhoneScale, setImagePhoneScale,
    imagePhoneRotX, setImagePhoneRotX,
    imagePhoneRotY, setImagePhoneRotY,
    imagePhoneRotZ, setImagePhoneRotZ,
    imagePhonePerspective, setImagePhonePerspective,
    imagePhoneDevice, setImagePhoneDevice,
    imagePhonePresetId, setImagePhonePresetId,
    imagePhoneOpening, setImagePhoneOpening,
    imagePhoneShadow, setImagePhoneShadow,
    imagePhoneShadowColor, setImagePhoneShadowColor,
    imagePhoneRefWidth, setImagePhoneRefWidth,
    viewer3DAutoRotate, setViewer3DAutoRotate,
    viewer3DRotationSpeed, setViewer3DRotationSpeed,
    viewer3DGlow, setViewer3DGlow,
    viewer3DEnvironment, setViewer3DEnvironment,
  }), [
    duoConfig, mockup3dSnapshot, restoreMockup3d, setImagePhoneDevice,
    selectedTemplateId, motionImageUrl, motionIntensity,
    imagePhoneActive, imagePhoneX, imagePhoneY, imagePhoneScale,
    imagePhoneRotX, imagePhoneRotY, imagePhoneRotZ, imagePhonePerspective,
    imagePhoneDevice, imagePhonePresetId, imagePhoneOpening,
    imagePhoneShadow, imagePhoneShadowColor, imagePhoneRefWidth,
    viewer3DAutoRotate, viewer3DRotationSpeed, viewer3DGlow, viewer3DEnvironment,
  ]);

  return (
    <Mockup3dContext.Provider value={value}>
      {children}
    </Mockup3dContext.Provider>
  );
}

export function useMockup3dContext() {
  const ctx = useContext(Mockup3dContext);
  if (!ctx) throw new Error("useMockup3dContext must be used inside Mockup3dProvider");
  return ctx;
}
