import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { readFileSync } from 'node:fs';
import { parseLocalEdit } from '../lib/local-edit.ts';
import { planeDepth } from '../lib/depth-of-field.ts';
import { parseCameraDepthOfField, mapCameraDepthOfField, cameraDepthSupportError } from '../lib/camera-depth-of-field.ts';
import { remapCameraFragment } from '../lib/remap-camera.ts';
const config = { focus: {x:.44,y:.42}, protectRect:{x:.32,y:.38,width:.36,height:.075}, maxBlurPx:3.5 };
const near = (a,b) => assert.ok(Math.abs(a-b)<1e-10, `${a} != ${b}`);
const recipe = () => JSON.parse(readFileSync(new URL('../recipes/chrome-google-search/camera-edit.json', import.meta.url),'utf8'));

test('depth matches actual THREE XYZ rotation in both tilt directions',()=>{
  for (const pitch of [-60,0,60]) for (const yaw of [-40,0,40]) for (const [x,y] of [[0,0],[.44,.42],[1,1]]) {
    const point=new THREE.Vector3((x-.5)*2*16/9,(.5-y)*2,0).applyEuler(new THREE.Euler(-pitch*Math.PI/180,yaw*Math.PI/180,0));
    near(planeDepth(x,y,16/9,pitch,yaw),point.z);
  }
});
test('source rectangle maps through contain and bleed independently of output size',()=>{
  const a=mapCameraDepthOfField(config,{containerX:240,containerY:270,containerWidth:1440,containerHeight:540},1920,1080,1.5,0);
  near(a.focus.x,(240+.44*1440+480)/2880);
  near(a.focus.y,(270+.42*540+270)/1620);
  const b=mapCameraDepthOfField(config,{containerX:480,containerY:540,containerWidth:2880,containerHeight:1080},3840,2160,1.5,0);
  assert.deepEqual(a,b);
  near(a.maxBlurPx*1620/1080,3.5); // 1.5 bleed must not amplify blur radius.
  const c=mapCameraDepthOfField(config,{containerX:240,containerY:270,containerWidth:1440,containerHeight:540},1920,1080,1.5,90);
  near(c.focus.x,(960-(.42-.5)*540+480)/2880);
  near(c.focus.y,(540+(.44-.5)*1440+270)/1620);
});
test('all protected rectangle corners are on or in front of the focus depth, including roll',()=>{
  for(const roll of [-25,0,25]) for(const pitch of [-55,0,55]) for(const yaw of [-30,0,30]) {
    const d=mapCameraDepthOfField(config,{containerX:120,containerY:67.5,containerWidth:1680,containerHeight:945},1920,1080,1.5,roll);
    const depths=[d.focus,...d.protectedPoints].map(p=>planeDepth(p.x,p.y,16/9,pitch,yaw));
    const focalDepth=Math.min(...depths);
    for(const z of depths) assert.equal(Math.max(0,focalDepth-z-d.sharpBand),0);
    if(!pitch&&!yaw) assert.ok(depths.every(z=>z===0));
  }
});
test('API normalizes mild settings, rejects malformed/unsupported requests, and absence removes opt-in',()=>{
  const e=recipe(); e.mockup='none'; e.depthOfField={...config};
  assert.deepEqual(parseLocalEdit(e,31).depthOfField,config);
  assert.equal(parseCameraDepthOfField({focus:config.focus}).maxBlurPx,3.5);
  for(const invalid of [{...config,maxBlurPx:5},{...config,maxBlurPx:NaN},{...config,focus:{x:2,y:.5}},{...config,protectRect:{x:.9,y:0,width:.2,height:.1}},{...config,enabled:true}])
    assert.throws(()=>parseLocalEdit({...e,depthOfField:invalid},31),/depthOfField/);
  assert.throws(()=>parseLocalEdit({...e,mockup:'chrome'},31),/depthOfField/);
  assert.throws(()=>parseLocalEdit({...e,camera:undefined},31),/depthOfField/);
  delete e.depthOfField;
  assert.equal(parseLocalEdit(e,31).depthOfField,undefined);
});
test('runtime accepts default zero transforms and rejects later incompatible UI changes',()=>{
  const state={mediaType:'video',mockupId:'none',clipCount:1,cameraOnly:true,cropped:false,transformed:false,zoomed:false,masked:false,cameraOverlay:false,phone:false};
  assert.equal(cameraDepthSupportError(state),null);
  for(const key of ['cropped','transformed','zoomed','masked','cameraOverlay','phone']) assert.ok(cameraDepthSupportError({...state,[key]:true}));
  for(const change of [{mockupId:'chrome'},{clipCount:2},{mediaType:'image'},{cameraOnly:false}]) assert.ok(cameraDepthSupportError({...state,...change}));
});
test('project JSON round trip and trimmed camera remap preserve the opt-in field',()=>{
  const e=recipe(),clip={id:'a',libraryVideoId:'media',startTime:0,trimStart:0,trimEnd:31};
  const fragment=JSON.parse(JSON.stringify({id:'camera',presetId:'none',startTime:0,endTime:31,keyframes:e.camera,depthOfField:config}));
  const [mapped]=remapCameraFragment(fragment,[clip],[{...clip,trimStart:4}]);
  assert.deepEqual(mapped.depthOfField,config);
  assert.equal(mapped.keyframes[0].time,e.camera[0].time-4);
});
