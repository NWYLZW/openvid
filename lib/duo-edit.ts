import { parseDuoConfig, type DuoConfig } from './duo-config.ts';
import type { EnvironmentPreset } from './viewer-controls3d';
export interface DuoEdit {
  config:DuoConfig;
  transform?:{x?:number;y?:number;scale?:number;rotateX?:number;rotateY?:number;rotateZ?:number};
  environment?:EnvironmentPreset;glow?:number;autoRotate?:boolean;rotationSpeed?:number;
}
export function parseDuoEdit(value:unknown,duration:number):DuoEdit {
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Expected Duo device config');
  const v=value as Record<string,unknown>;
  if(Object.keys(v).some(k=>!['config','transform','environment','glow','autoRotate','rotationSpeed'].includes(k)))throw new Error('Unknown Duo device field');
  const config=parseDuoConfig(v.config);
  if(config.keyframes.some(f=>f.time>duration))throw new Error('Duo keyframe exceeds video duration');
  const number=(v:unknown,min:number,max:number,label:string)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw new Error(`Invalid Duo ${label}: expected ${min}..${max}`);};
  if(v.transform!==undefined){
    if(!v.transform||typeof v.transform!=='object'||Array.isArray(v.transform))throw new Error('Invalid Duo transform');
    const ranges:Record<string,[number,number]>={x:[-500,500],y:[-500,500],scale:[.3,3],rotateX:[-180,180],rotateY:[-180,180],rotateZ:[-180,180]};
    for(const [key,entry]of Object.entries(v.transform)){if(!ranges[key])throw new Error('Unknown Duo transform field');number(entry,...ranges[key],key);}
  }
  if(v.environment!==undefined&&!['studio','city','sunset','dawn','night','forest','apartment','park','lobby','warehouse'].includes(String(v.environment)))throw new Error('Invalid Duo environment');
  if(v.glow!==undefined)number(v.glow,0,5,'glow');
  if(v.autoRotate!==undefined&&typeof v.autoRotate!=='boolean')throw new Error('Invalid Duo autoRotate');
  if(v.rotationSpeed!==undefined)number(v.rotationSpeed,.1,10,'rotationSpeed');
  return structuredClone({...v,config}) as unknown as DuoEdit;
}
