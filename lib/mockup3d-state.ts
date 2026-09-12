import { defaultDuoConfig, parseDuoConfig, type DuoConfig } from './duo-config.ts';
import type { EnvironmentPreset } from './viewer-controls3d';
export type Device3D = 'phone' | 'iphone' | 'iphone-13-pro-max' | 'iphone-17-pro-max' | 'double_iphone_13_pro' | 'laptop' | 'ipad_mini_6_2021' | 'iphone-duo';
export interface Mockup3DPersistedState {
  imagePhoneActive:boolean; imagePhoneX:number; imagePhoneY:number; imagePhoneScale:number;
  imagePhoneRotX:number; imagePhoneRotY:number; imagePhoneRotZ:number; imagePhonePerspective:number;
  imagePhoneDevice:Device3D; imagePhonePresetId:string; imagePhoneOpening:number;
  imagePhoneShadow:number; imagePhoneShadowColor:string; imagePhoneRefWidth:number;
  viewer3DAutoRotate:boolean; viewer3DRotationSpeed:number; viewer3DGlow:number; viewer3DEnvironment:EnvironmentPreset;
  duoConfig:DuoConfig;
}
export function defaultMockup3DState():Mockup3DPersistedState {
  return {imagePhoneActive:false,imagePhoneX:0,imagePhoneY:0,imagePhoneScale:1,imagePhoneRotX:0,imagePhoneRotY:0,imagePhoneRotZ:0,imagePhonePerspective:600,imagePhoneDevice:'phone',imagePhonePresetId:'front',imagePhoneOpening:1,imagePhoneShadow:.6,imagePhoneShadowColor:'#000000',imagePhoneRefWidth:0,viewer3DAutoRotate:false,viewer3DRotationSpeed:3.5,viewer3DGlow:1,viewer3DEnvironment:'studio',duoConfig:defaultDuoConfig()};
}
/** Old projects omitted 3D fields; restore their defaults without copying unrelated state. */
export function restoreMockup3DState(input:Partial<Mockup3DPersistedState>):Mockup3DPersistedState {
  const result=defaultMockup3DState();
  for(const key of Object.keys(result) as Array<keyof Mockup3DPersistedState>){
    if(input[key]!==undefined)Object.assign(result,{[key]:input[key]});
  }
  result.duoConfig=input.duoConfig?parseDuoConfig(input.duoConfig):defaultDuoConfig();
  return result;
}
