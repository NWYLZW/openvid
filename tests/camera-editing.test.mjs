import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {updateCameraFragment,commitMotionState} from '../lib/camera-editing.ts';
const fixture=()=>({id:'camera',startTime:0,endTime:7.5,presetId:'none',intensity:50,speed:50,keyframes:JSON.parse(readFileSync(new URL('../recipes/chrome-google-search/search-only-edit.json',import.meta.url))).camera,depthOfField:{focus:{x:.44,y:.42},maxBlurPx:3.5}});
test('incremental edits preserve human changes outside selected fields',()=>{
 const current=fixture();current.keyframes[1].pitch=13;
 const next=updateCameraFragment(current,{depthOfField:{focus:{x:.5,y:.4},maxBlurPx:2}},structuredClone(current));
 assert.equal(next.keyframes[1].pitch,13);assert.equal(next.id,current.id);assert.equal(current.depthOfField.maxBlurPx,3.5);
});
test('stale AI snapshot cannot overwrite a subsequent UI change',()=>{
 const old=fixture(),current=structuredClone(old);current.keyframes[1].scale=.9;
 assert.throws(()=>updateCameraFragment(current,{keyframes:old.keyframes},old),/changed since/);
});
test('invalid ordering and scale reject updates; disabling depth preserves poses',()=>{
 const current=fixture(),frames=structuredClone(current.keyframes);frames[1].time=0;
 assert.throws(()=>updateCameraFragment(current,{keyframes:frames},current),/strictly/);
 frames[1].time=.6;frames[1].scale=-1;
 assert.throws(()=>updateCameraFragment(current,{keyframes:frames},current),/scale/);
 assert.deepEqual(updateCameraFragment(current,{depthOfField:null},current).keyframes,current.keyframes);
});

test('CDP property ordering does not invalidate an otherwise identical snapshot',()=>{
 const current=fixture();const expected=Object.fromEntries(Object.entries(structuredClone(current)).reverse());
 assert.equal(updateCameraFragment(current,{depthOfField:null},expected).depthOfField,undefined);
});

test('same-tick API calls and UI edits publish before the next stale check', async()=>{
 const initial=fixture(), ref={current:[initial]};
 const patch=(changes,expected)=>{
   const next=updateCameraFragment(ref.current[0],changes,expected);
   commitMotionState(ref,prev=>prev.map(f=>({...f,...next})),()=>{});
 };
 const result=await Promise.allSettled([
   Promise.resolve().then(()=>patch({depthOfField:null},initial)),
   Promise.resolve().then(()=>patch({keyframes:initial.keyframes},initial)),
 ]);
 assert.equal(result[0].status,'fulfilled');assert.equal(result[1].status,'rejected');
 assert.equal(ref.current[0].depthOfField,undefined);
 const snapshot=structuredClone(ref.current[0]);
 commitMotionState(ref,prev=>prev.map(f=>({...f,keyframes:f.keyframes.map((k,i)=>i===1?{...k,pitch:14}:k)})),()=>{});
 assert.throws(()=>patch({depthOfField:initial.depthOfField},snapshot),/changed since/);
 assert.equal(ref.current[0].keyframes[1].pitch,14);
});
