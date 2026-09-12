"use client";

import { useState, useEffect } from 'react';
import { useMockup3dContext } from '@/app/contexts/Mockup3dContext';
import { SliderControl } from '@/components/ui/SliderControl';
import { Toggle } from '@/components/ui/toggle';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { defaultDuoSystemUI, type DuoSystemUI, defaultDuoConfig, parseDuoConfig, type DuoConfig, type DuoScreen } from '@/lib/duo-config';

import {getLibraryVideoInfoList} from '@/lib/videos-library';
const inputClass='w-full rounded-md border border-border bg-muted/50 px-2 py-1.5 text-xs text-foreground';
function Choice({label,value,options,onChange}:{label:string;value:string;options: Array<[string,string]>;onChange:(value:string)=>void}) {
  return <label className="flex flex-col gap-1.5 text-[11px] text-muted-foreground">{label}<Select value={value} onValueChange={onChange}><SelectTrigger className="w-full bg-muted/50 border-border h-9" textSize="xs"><SelectValue /></SelectTrigger><SelectContent>{options.map(([id,title])=><SelectItem key={id} value={id} textSize="xs">{title}</SelectItem>)}</SelectContent></Select></label>;
}
function ScreenControls({label,value,onChange}:{label:string;value:DuoScreen;onChange:(value:DuoScreen)=>void}) {
  const [error,setError]=useState('');
  const [videos,setVideos]=useState<Array<{id:string;fileName:string}>>([]);
  useEffect(()=>{let active=true;void getLibraryVideoInfoList().then(v=>{if(active)setVideos(v);}).catch(()=>setError('Could not load media library'));return()=>{active=false;};},[]);
  async function upload(file?:File){
    if(!file)return;
    if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>12_000_000){setError('Choose a PNG, JPEG or WebP under 12 MB.');return;}
    const reader=new FileReader();reader.onerror=()=>setError('Could not read image.');reader.onload=()=>{onChange({...value,source:'image',image:String(reader.result)});setError('');};reader.readAsDataURL(file);
  }
  function crop(key:keyof DuoScreen['crop'],percent:number){
    const next={...value.crop,[key]:percent/100};
    next.x=Math.min(next.x,.999);next.y=Math.min(next.y,.999);
    if(key==='x')next.width=Math.min(next.width,1-next.x);else if(key==='width')next.width=Math.min(next.width,1-next.x);
    if(key==='y')next.height=Math.min(next.height,1-next.y);else if(key==='height')next.height=Math.min(next.height,1-next.y);
    onChange({...value,crop:next});
  }
  return <details className="rounded-lg border border-border p-3"><summary className="cursor-pointer text-xs font-medium text-muted-foreground">{label}</summary><div className="mt-3 space-y-3">
    <Choice label="Content source" value={value.source} options={[['video','Project video / photo'],...(value.image?[['image','Uploaded image'] as [string,string]]:[])]} onChange={source=>onChange({...value,source:source as DuoScreen['source']})}/>
    {value.source==='video'&&<>
      <Choice label="Video source" value={value.videoId??'project'} options={ [['project','Main project video'],...videos.map(v=>[v.id,v.fileName] as [string,string])] } onChange={id=>onChange({...value,videoId:id==='project'?undefined:id})}/>
      <Button variant="outline" size="sm" onClick={()=>void getLibraryVideoInfoList().then(setVideos)}>Refresh media library</Button>
      {value.videoId&&<>{(['videoStart','videoSpeed'] as const).map(key=><label key={key} className="block text-xs">{key==='videoStart'?'Source offset (seconds)':'Source playback multiplier'}<input className={inputClass} type="number" min={key==='videoStart'?0:.1} max={key==='videoStart'?86400:8} step={.1} value={value[key]??(key==='videoStart'?0:1)} onChange={e=>onChange({...value,[key]:Number(e.target.value)})}/></label>)}<p className="text-xs text-muted-foreground">Uses the project clock. Last frame holds after the source ends. Panel audio is muted.</p></>}
    </>}
    <label className="flex flex-col gap-1.5 text-[11px] text-muted-foreground">Upload image<input aria-label={`${label} upload image`} type="file" accept="image/png,image/jpeg,image/webp" className="text-xs max-w-full" onChange={e=>void upload(e.target.files?.[0])}/></label>
    {error&&<p role="alert" className="text-xs text-destructive">{error}</p>}
    <Choice label="Image fit" value={value.fit} options={ [['contain','Contain'],['cover','Cover']] } onChange={fit=>onChange({...value,fit:fit as DuoScreen['fit']})}/>
    {(['x','y','width','height'] as const).map(key=><SliderControl key={key} label={`Crop ${key}`} value={Number((value.crop[key]*100).toFixed(1))} min={key==='width'||key==='height'?.1:0} max={100} step={.1} suffix="%" onChange={n=>crop(key,n)}/>)}
    <label className="flex items-center justify-between text-[11px] text-muted-foreground">Letterbox color<input aria-label={`${label} letterbox color`} type="color" value={value.background} onChange={e=>onChange({...value,background:e.target.value})}/></label>
  </div></details>;
}
export function DuoControls({section}:{section:'model'|'lighting'|'animation'}) {
  const {duoConfig:config,setDuoConfig,setViewer3DGlow}=useMockup3dContext();
  const [error,setError]=useState('');
  function patch(changes:Partial<DuoConfig>){try{parseDuoConfig({...config,...changes});setDuoConfig(current=>({...current,...changes}));setError('');}catch(e){setError(e instanceof Error?e.message:String(e));}}
  function slider(key:'angle'|'blur'|'darkening'|'transitionPower'|'hingeWidth'|'cameraDistance'|'cameraFov'|'exposure'|'screenBrightness',label:string,min:number,max:number,multiplier=1,suffix=''){
    return <SliderControl key={key} label={label} value={Number((config[key]*multiplier).toFixed(1))} min={min*multiplier} max={max*multiplier} step={1} suffix={suffix} onChange={n=>patch({[key]:n/multiplier})}/>;
  }
  const systemUI=config.systemUI??defaultDuoSystemUI();
  const uiPatch=(changes:Partial<DuoSystemUI>)=>patch({systemUI:{...systemUI,...changes}});
  function frame(index:number,changes:Partial<DuoConfig['keyframes'][number]>){patch({keyframes:config.keyframes.map((f,i)=>i===index?{...f,...changes}:f)});}
  return <>
    {section==='model'&&<>
      <Choice label="Finish" value={config.finish} options={ [['star-white','Star White'],['night-sky','Night Sky']] } onChange={finish=>patch({finish:finish as DuoConfig['finish']})}/>
      {slider('hingeWidth','Hinge width',.15,.7,100,'%')}
      {slider('cameraDistance','Camera distance',24,65)}
      {slider('cameraFov','Camera field of view',15,50,1,'°')}
      <Choice label="Screen layout" value={config.contentMode??'panels'} options={ [['continuous','One continuous video / image'],['panels','Separate panels']] } onChange={mode=>patch({contentMode:mode as DuoConfig['contentMode'],...(mode==='continuous'&&!config.content?{content:defaultDuoConfig().content}:{})})}/>
      {config.contentMode==='continuous'?<ScreenControls label="Full unfolded screen" value={config.content!} onChange={content=>patch({content})}/>:<>
      <ScreenControls label="Inner left · Conversation list" value={config.left} onChange={left=>patch({left})}/>
      <ScreenControls label="Inner right · Chat details" value={config.right} onChange={right=>patch({right})}/>
      </>}
      <details className="rounded-lg border border-border p-3"><summary className="cursor-pointer text-xs font-medium">System UI strip</summary><div className="mt-3 space-y-3">
        <label className="flex items-center justify-between text-xs">Show system UI<Toggle checked={systemUI.enabled} onChange={enabled=>uiPatch({enabled})}/></label>
        {systemUI.enabled&&<>
          <Choice label="Sidebar layout" value={systemUI.layout??'overlay'} options={ [['overlay','Overlay video'],['reserve','Reserve space']] } onChange={value=>uiPatch({layout:value as DuoSystemUI['layout']})}/>
          <p className="text-[11px] text-muted-foreground">Reserve space fits the video beside the strip without stretching. Dimensions are relative to screen height.</p>
          {(['background','iconColor','buttonColor'] as const).map((key,i)=><label key={key} className="flex items-center justify-between text-xs">{['Strip color','Icon color','Button color'][i]}<input aria-label={['Strip color','Icon color','Button color'][i]} type="color" value={systemUI[key]} onChange={e=>uiPatch({[key]:e.target.value})}/></label>)}
          {([['width','Strip width',12,25],['inset','Vertical inset',0,10],['opacity','Strip opacity',0,100],['buttonOpacity','Button opacity',0,100],['buttonSize','Button size',2.5,10],['gap','Button gap',.5,8]] as const).map(([key,label,min,max])=><SliderControl key={key} label={label} value={Number(((key==='width'?Math.max(.12,systemUI[key]):systemUI[key])*100).toFixed(1))} min={min} max={max} step={.1} suffix="%" onChange={n=>uiPatch({[key]:n/100})}/>)}
          <SliderControl label="Left padding" value={(systemUI.paddingLeft??.025)*100} min={0} max={12} step={.5} suffix="%" onChange={n=>uiPatch({paddingLeft:n/100})}/>
          <Choice label="Button material" value={systemUI.buttonMaterial??'glass'} options={ [['glass','Glass'],['flat','Flat']] } onChange={value=>uiPatch({buttonMaterial:value as DuoSystemUI['buttonMaterial']})}/>
          {systemUI.buttonMaterial!=='flat'&&<>
            <SliderControl label="Glass refraction" value={(systemUI.glassRefraction??.7)*100} min={0} max={100} step={1} suffix="%" onChange={n=>uiPatch({glassRefraction:n/100})}/>
            <SliderControl label="Glass highlight" value={(systemUI.glassHighlight??.75)*100} min={0} max={100} step={1} suffix="%" onChange={n=>uiPatch({glassHighlight:n/100})}/>
            <SliderControl label="Glass shadow" value={(systemUI.glassShadow??.3)*100} min={0} max={100} step={1} suffix="%" onChange={n=>uiPatch({glassShadow:n/100})}/>
          </>}
          <label className="flex items-center justify-between text-xs">Divider<Toggle checked={systemUI.borderEnabled??false} onChange={borderEnabled=>uiPatch({borderEnabled})}/></label>
          {systemUI.borderEnabled&&<>
            <label className="flex items-center justify-between text-xs">Divider color<input aria-label="Divider color" type="color" value={systemUI.borderColor??'#d1d5db'} onChange={e=>uiPatch({borderColor:e.target.value})}/></label>
            <Choice label="Divider style" value={systemUI.borderStyle??'solid'} options={ [['solid','Solid'],['dashed','Dashed'],['dotted','Dotted']] } onChange={value=>uiPatch({borderStyle:value as DuoSystemUI['borderStyle']})}/>
            <SliderControl label="Divider width" value={systemUI.borderWidth??1} min={0} max={12} step={.5} suffix=" px" onChange={borderWidth=>uiPatch({borderWidth})}/>
            <SliderControl label="Divider opacity" value={(systemUI.borderOpacity??1)*100} min={0} max={100} step={1} suffix="%" onChange={n=>uiPatch({borderOpacity:n/100})}/>
          </>}
          <p className="text-[11px] text-muted-foreground">Status ring is anchored to the camera aperture.</p>
          <SliderControl label="Status ring size" value={Math.round((systemUI.statusScale??1)*100)} min={85} max={160} step={1} suffix="%" onChange={n=>uiPatch({statusScale:n/100})}/>
          <SliderControl label="Status ring stroke" value={Number(((systemUI.statusStroke??.0025)*1000).toFixed(1))} min={1} max={6} step={.1} onChange={n=>uiPatch({statusStroke:n/1000})}/>
          {(['status','flashlight','camera'] as const).map((key,i)=><label key={key} className="flex items-center justify-between text-xs">{['Status icon','Flashlight button','Camera button'][i]}<Toggle checked={systemUI[key]} onChange={value=>uiPatch({[key]:value})}/></label>)}
          <Button variant="outline" size="sm" onClick={()=>uiPatch({...defaultDuoSystemUI(),enabled:true})}>Reset system UI</Button>
        </>}
      </div></details>
      <Choice label="Cover screen" value={config.coverMode} options={ [['right','Follow right · Chat details'],['custom','Custom content']] } onChange={coverMode=>patch({coverMode:coverMode as DuoConfig['coverMode']})}/>
      {config.coverMode==='custom'&&<ScreenControls label="Outer cover" value={config.cover} onChange={cover=>patch({cover})}/>}
    </>}
    {section==='lighting'&&<>
      <Button variant="outline" size="sm" onClick={()=>{patch({blur:72,darkening:2,boundaryFill:1,transitionPower:1.35,hingeWidth:.35,exposure:1.18,screenBrightness:1,projection:true,referenceLighting:true});setViewer3DGlow(1.35);}}>Reference transition</Button>
      <label className="flex items-center justify-between text-xs text-muted-foreground">Reference room lighting<Toggle checked={config.referenceLighting??false} onChange={referenceLighting=>patch({referenceLighting})}/></label>
      {slider('exposure','Exposure',.5,2,100,'%')}
      {slider('screenBrightness','Screen brightness',.5,2,100,'%')}
      {slider('blur','Screen transition blur',0,96,1,' px')}
      {slider('darkening','Screen darkening',0,3,100,'%')}
      <SliderControl label="Boundary fill" value={Math.round((config.boundaryFill??1)*100)} min={0} max={100} step={1} suffix="%" onChange={n=>patch({boundaryFill:n/100})}/>
      <p className="text-[11px] text-muted-foreground">Fill outside the projected image with its average color. 0% keeps a black margin; 100% fills it without stretching the image.</p>
      <label className="flex items-center justify-between text-xs text-muted-foreground">Screen projection<Toggle checked={config.projection} onChange={projection=>patch({projection})}/></label>
      {slider('transitionPower','Transition power',.5,3,100,'%')}
    </>}
    {section==='animation'&&<>
      <label className="flex items-center justify-between text-xs">Accelerate reply wait<Toggle checked={!!config.waitSpeed} onChange={enabled=>patch({waitSpeed:enabled?{start:0,end:1,multiplier:2}:undefined})}/></label>
      {config.waitSpeed&&<div className="space-y-2 rounded-lg border p-2">{(['start','end','multiplier'] as const).map(key=><label key={key} className="block text-xs">{key==='multiplier'?'Wait speed multiplier (× global speed)':`Wait ${key} (source seconds)`}<input type="number" className={inputClass} min={key==='multiplier'?1:0} step={.1} value={config.waitSpeed![key]} onChange={e=>patch({waitSpeed:{...config.waitSpeed!,[key]:Number(e.target.value)}})}/></label>)}</div>}

      {slider('angle','Manual fold angle',0,180,1,'°')}
      <p className="text-[11px] text-muted-foreground">0° closed · 180° open. Timeline keyframes override the manual angle during playback and export.</p>
      <div className="flex items-center justify-between"><span className="text-xs font-medium text-muted-foreground">Fold timeline</span><Toggle checked={config.keyframes.length>0} onChange={enabled=>patch({keyframes:enabled?[{time:0,angle:0},{time:.6,angle:0},{time:2.6,angle:180}]:[]})}/></div>
      {config.keyframes.map((f,index)=><div key={index} className="space-y-2 rounded-lg border border-border p-2">
        <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
          <label className="text-[10px] text-muted-foreground">Time (s)<input aria-label={`Fold keyframe ${index+1} time`} className={inputClass} type="number" min={0} step={.1} value={f.time} onChange={e=>frame(index,{time:Number(e.target.value)})}/></label>
          <label className="text-[10px] text-muted-foreground">Angle (°)<input aria-label={`Fold keyframe ${index+1} angle`} className={inputClass} type="number" min={0} max={180} value={f.angle} onChange={e=>frame(index,{angle:Number(e.target.value)})}/></label>
          <Button variant="ghost" size="sm" aria-label={`Remove fold keyframe ${index+1}`} onClick={()=>patch({keyframes:config.keyframes.filter((_,i)=>i!==index)})}>×</Button>
        </div>
        {index>0&&<><Choice label="Arrival easing" value={JSON.stringify(f.easing??[.42,0,.58,1])} options={[[JSON.stringify([.42,0,.58,1]),'Ease in / out'],[JSON.stringify([0,0,1,1]),'Linear'],...(f.easing&&JSON.stringify(f.easing)!=='[0.42,0,0.58,1]'&&JSON.stringify(f.easing)!=='[0,0,1,1]'?[[JSON.stringify(f.easing),'Custom'] as [string,string]]:[])]} onChange={value=>frame(index,{easing:JSON.parse(value)})}/>
        <div className="grid grid-cols-4 gap-1">{(f.easing??[.42,0,.58,1]).map((v,i)=><label key={i} className="text-[10px] text-muted-foreground">{['x1','y1','x2','y2'][i]}<input aria-label={`Fold keyframe ${index+1} easing ${i+1}`} type="number" className={inputClass} min={0} max={1} step={.01} value={v} onChange={e=>{const easing=[...(f.easing??[.42,0,.58,1])] as [number,number,number,number];easing[i]=Number(e.target.value);frame(index,{easing});}}/></label>)}</div></>}
      </div>)}
      {config.keyframes.length>0&&<Button variant="outline" size="sm" onClick={()=>patch({keyframes:[...config.keyframes,{time:config.keyframes.at(-1)!.time+1,angle:config.keyframes.at(-1)!.angle}]})}>Add fold keyframe</Button>}
    </>}
    {error&&<p role="alert" className="text-xs text-destructive">{error}</p>}
  </>;
}
