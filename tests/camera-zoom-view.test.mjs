import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {cameraZoomView} from '../lib/camera-zoom-view.ts';
const fragment=()=>({id:'camera',startTime:0,endTime:9.733333,presetId:'none',intensity:50,speed:50,keyframes:JSON.parse(readFileSync(new URL('../recipes/chrome-google-search/natural-typing-edit.json',import.meta.url))).camera});
test('Zoom view reads the actual camera curve without creating another transform',()=>{
 const f=fragment(),before=structuredClone(f),view=cameraZoomView(f);assert.equal(view.min,.95);assert.equal(view.max,1.85);assert.equal(view.id,f.id);assert.deepEqual(f,before);
 f.keyframes[2].scale=2.2;assert.equal(cameraZoomView(f).max,2.2);
});
test('reset zoom leaves no phantom zoom strip; inactive external trim knots do not create one',()=>{
 const f=fragment();f.keyframes=f.keyframes.map(k=>({...k,scale:1}));assert.equal(cameraZoomView(f),null);
 f.keyframes.unshift({...f.keyframes[0],time:-2,scale:2});f.keyframes[1].time=-1;assert.equal(cameraZoomView(f),null);
});
