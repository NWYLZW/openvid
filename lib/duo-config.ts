/** Shared, serializable state for the Duo preview, export, editor and local API. */
export interface DuoScreen {
  source: 'video' | 'image';
  image?: string;
  crop: { x: number; y: number; width: number; height: number };
  fit: 'contain' | 'cover';
  background: string;
}
export interface DuoConfig {
  /** Missing fields retain the legacy independently configured panels. */
  contentMode?: 'continuous' | 'panels';
  content?: DuoScreen;
  referenceLighting?: boolean;
  angle: number;
  keyframes: Array<{ time: number; angle: number; easing?: [number, number, number, number] }>;
  blur: number;
  darkening: number;
  projection: boolean;
  transitionPower: number;
  hingeWidth: number;
  cameraDistance: number;
  cameraFov: number;
  exposure: number;
  finish: 'star-white' | 'night-sky';
  screenBrightness: number;
  left: DuoScreen;
  right: DuoScreen;
  coverMode: 'right' | 'custom';
  cover: DuoScreen;
}
export function defaultDuoConfig(): DuoConfig {
  const screen = (x: number, width: number): DuoScreen => ({source: 'video', crop: {x,y:0,width,height:1}, fit:'contain', background:'#111116'});
  return {contentMode:'continuous',content:screen(0,1),referenceLighting:true,angle:180,keyframes:[],blur:72,darkening:2,projection:true,transitionPower:1.35,hingeWidth:.35,cameraDistance:40,cameraFov:32,exposure:1.18,finish:'star-white',screenBrightness:1,left:screen(.04,.21),right:screen(.253,.747),coverMode:'right',cover:screen(.253,.747)};
}
function object(value: unknown, keys: string[], label: string): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`Invalid ${label}: expected object`);
  if (Object.keys(value).some(key=>!keys.includes(key))) throw new Error(`Unknown ${label} field`);
}
function number(value: unknown,min:number,max:number,label:string): asserts value is number {
  if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)throw new Error(`Invalid ${label}: expected ${min}..${max}`);
}
function screen(value: unknown): asserts value is DuoScreen {
  object(value,['source','image','crop','fit','background'],'Duo screen');
  if(!['video','image'].includes(String(value.source)))throw new Error('Invalid Duo screen source');
  if(!['contain','cover'].includes(String(value.fit)))throw new Error('Invalid Duo screen fit');
  if(typeof value.background!=='string'||!/^#[0-9a-f]{6}$/i.test(value.background))throw new Error('Invalid Duo screen background');
  if(value.image!==undefined&&(typeof value.image!=='string'||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value.image)||value.image.length>16_000_000))throw new Error('Duo image must be a PNG, JPEG or WebP data URL below 12 MB');
  if(value.source==='image'&&!value.image)throw new Error('Duo image source requires an image');
  object(value.crop,['x','y','width','height'],'Duo crop');
  number(value.crop.x,0,1,'crop x');number(value.crop.y,0,1,'crop y');
  number(value.crop.width,.001,1,'crop width');number(value.crop.height,.001,1,'crop height');
  if(value.crop.x+value.crop.width>1.000001||value.crop.y+value.crop.height>1.000001)throw new Error('Duo crop exceeds source bounds');
}
export function parseDuoConfig(value: unknown): DuoConfig {
  object(value,Object.keys(defaultDuoConfig()),'Duo config');
  if(value.referenceLighting!==undefined&&typeof value.referenceLighting!=='boolean')throw new Error('Invalid Duo reference lighting');
  if(value.contentMode!==undefined&&!['continuous','panels'].includes(String(value.contentMode)))throw new Error('Invalid Duo content mode');
  if(value.content!==undefined)screen(value.content);
  if(value.contentMode==='continuous'&&value.content===undefined)throw new Error('Continuous Duo mode requires content');
  const ranges:Record<string,[number,number]>={angle:[0,180],blur:[0,96],darkening:[0,3],transitionPower:[.5,3],hingeWidth:[.15,.7],cameraDistance:[24,65],cameraFov:[15,50],exposure:[.5,2],screenBrightness:[.5,2]};
  for(const [key,[min,max]] of Object.entries(ranges))number(value[key],min,max,key);
  if(typeof value.projection!=='boolean')throw new Error('Invalid Duo projection');
  if(!['star-white','night-sky'].includes(String(value.finish)))throw new Error('Invalid Duo finish');
  if(!['right','custom'].includes(String(value.coverMode)))throw new Error('Invalid Duo cover mode');
  screen(value.left);screen(value.right);screen(value.cover);
  if(!Array.isArray(value.keyframes)||value.keyframes.length>100)throw new Error('Expected at most 100 Duo keyframes');
  let previous=-1;
  for(const frame of value.keyframes){
    object(frame,['time','angle','easing'],'Duo keyframe');number(frame.time,0,86400,'Duo keyframe time');number(frame.angle,0,180,'Duo keyframe angle');
    if(frame.time<=previous)throw new Error('Duo keyframe times must strictly increase');previous=frame.time;
    if(frame.easing!==undefined){if(!Array.isArray(frame.easing)||frame.easing.length!==4)throw new Error('Expected four Duo easing values');for(const v of frame.easing)number(v,0,1,'Duo easing');}
  }
  return structuredClone(value) as unknown as DuoConfig;
}
export function updateDuoConfig(current: DuoConfig, changes: Partial<DuoConfig>, expected: DuoConfig): DuoConfig {
  if(JSON.stringify(current)!==JSON.stringify(expected))throw new Error('Duo config changed; read current state before retrying');
  return parseDuoConfig({...current,...changes});
}
function bezier(t:number,control:[number,number,number,number]) {
  const curve=(u:number,a:number,b:number)=>3*(1-u)*(1-u)*u*a+3*(1-u)*u*u*b+u*u*u;
  let low=0,high=1;
  for(let i=0;i<24;i++){const mid=(low+high)/2;if(curve(mid,control[0],control[2])<t)low=mid;else high=mid;}
  return curve((low+high)/2,control[1],control[3]);
}
export function sampleDuoAngle(config: DuoConfig,time:number):number {
  const frames=config.keyframes;
  if(!frames.length)return config.angle;
  if(time<=frames[0].time)return frames[0].angle;
  for(let i=1;i<frames.length;i++)if(time<frames[i].time){const a=frames[i-1],b=frames[i];const t=(time-a.time)/(b.time-a.time);return a.angle+(b.angle-a.angle)*bezier(t,b.easing??[.42,0,.58,1]);}
  return frames[frames.length-1].angle;
}
