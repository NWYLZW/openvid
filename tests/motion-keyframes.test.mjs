import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleMotionKeyframes } from '../lib/motion-keyframes.ts';
import { parseLocalEdit } from '../lib/local-edit.ts';
import { readFileSync } from 'node:fs';
const recipe = () => JSON.parse(readFileSync(new URL('../recipes/chrome-google-search/camera-edit.json',import.meta.url),'utf8'));
test('camera arrives at the search pose before clicking and holds through typing',()=>{
 const frames=recipe().camera;
 assert.ok(sampleMotionKeyframes(frames,0).rotateX > 30);
 assert.deepEqual(sampleMotionKeyframes(frames,4.9), sampleMotionKeyframes(frames,5.14));
 assert.equal(sampleMotionKeyframes(frames,20).rotateX,0);
 assert.equal(sampleMotionKeyframes(frames,20).rotateY,0);
});
test('poses interpolate continuously and hold the final pose',()=>{
 const a={time:0,scale:1,x:0,y:0,pitch:60,yaw:0,roll:0,perspective:1800};
 const b={...a,time:2,pitch:0,scale:2};
 assert.equal(sampleMotionKeyframes([a,b],1).rotateX,30);
 assert.equal(sampleMotionKeyframes([a,b],3).scale,2);
 assert.equal(sampleMotionKeyframes([a,b],-1).rotateX,60);
});
test('camera configuration rejects duplicate times and conflicting zooms',()=>{
 const e=recipe(); parseLocalEdit(e,31);
 e.camera[1].time=0;
 assert.throws(()=>parseLocalEdit(e,31),/strictly increase/);
 const other=recipe();other.zooms=[{start:1,end:2,level:1,speed:5,x:50,y:50,tiltX:0,tiltY:0}];
 assert.throws(()=>parseLocalEdit(other,31),/not both/);
});

test('trimming and splitting preserve camera source time rather than replaying the intro',async()=>{
 const {remapCameraFragment}=await import('../lib/remap-camera.ts');
 const old={id:'a',libraryVideoId:'media',startTime:0,trimStart:0,trimEnd:31};
 const f={id:'camera',presetId:'none',intensity:50,speed:50,startTime:0,endTime:31,keyframes:recipe().camera};
 const trimmed=remapCameraFragment(f,[old],[{...old,trimStart:4}]);
 assert.equal(sampleMotionKeyframes(trimmed[0].keyframes,0).rotateX,sampleMotionKeyframes(f.keyframes,4).rotateX);
 const split=remapCameraFragment(f,[old],[{...old,trimEnd:5},{...old,id:'b',startTime:5,trimStart:5}]);
 assert.equal(split.length,2);
 assert.equal(sampleMotionKeyframes(split[1].keyframes,2).rotateY,sampleMotionKeyframes(f.keyframes,7).rotateY);
});

test('split boundary has one camera owner; repeated source chooses its actual timeline occurrence',async()=>{
 const {remapCameraFragment}=await import('../lib/remap-camera.ts');
 const {activeMotionFragments}=await import('../lib/motion-keyframes.ts');
 const a={id:'a',libraryVideoId:'media',startTime:0,trimStart:0,trimEnd:10};
 const b={...a,id:'b',startTime:10};
 const f={id:'camera-b',presetId:'none',intensity:50,speed:50,startTime:10,endTime:20,keyframes:recipe().camera};
 const parts=remapCameraFragment(f,[a,b],[a,{...b,trimEnd:5},{...b,id:'b-right',startTime:15,trimStart:5}]);
 assert.equal(parts.length,2);
 const active=activeMotionFragments(parts,15);
 assert.equal(active.length,1);
 assert.equal(sampleMotionKeyframes(active[0].keyframes,15-active[0].startTime).rotateY,sampleMotionKeyframes(f.keyframes,5).rotateY);
});
