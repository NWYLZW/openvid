import test from 'node:test';
import assert from 'node:assert/strict';
import { bezierProgress, sampleMotionKeyframes } from '../lib/motion-keyframes.ts';
import { surfaceShadowLayers, surfaceShadowCss } from '../lib/surface-shadow.ts';
import { parseLocalEdit } from '../lib/local-edit.ts';
import { readFileSync } from 'node:fs';

test('ease-out curve has a distinct deceleration and exact endpoints',()=>{
 const c=[.16,1,.3,1];
 assert.equal(bezierProgress(0,c),0); assert.equal(bezierProgress(1,c),1);
 assert.ok(bezierProgress(.25,c)>.7);
 let previous=0;
 for(let i=1;i<=100;i++){const value=bezierProgress(i/100,c);assert.ok(value>=previous && value<=1);previous=value;}
});
test('curve remains tied to the destination keyframe after a source-time shift',()=>{
 const a={time:0,scale:1,x:0,y:0,pitch:62,yaw:0,roll:0,perspective:1800};
 const b={...a,time:4,pitch:0,easing:[.42,0,.18,1]};
 const shifted=[a,b].map(k=>({...k,time:k.time-1}));
 assert.equal(sampleMotionKeyframes([a,b],2).rotateX,sampleMotionKeyframes(shifted,1).rotateX);
});
test('invalid easing is rejected before applying an edit',()=>{
 const e=JSON.parse(readFileSync(new URL('../recipes/chrome-google-search/camera-edit.json',import.meta.url),'utf8'));
 e.camera[2].easing=[-.1,0,1,1];assert.throws(()=>parseLocalEdit(e,31),/easing/);
});
test('soft shadows scale proportionally and disappear at zero',()=>{
 assert.deepEqual(surfaceShadowLayers(0),[]);assert.equal(surfaceShadowCss(0),'none');
 const a=surfaceShadowLayers(20),b=surfaceShadowLayers(40);
 assert.equal(a.length,3);
 a.forEach((layer,i)=>{assert.ok(layer.opacity<.25);assert.equal(b[i].blur,layer.blur*2);assert.equal(b[i].y,layer.y*2);});
});
