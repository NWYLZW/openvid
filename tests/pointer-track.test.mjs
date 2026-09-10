import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePointerTrack, samplePointerTrack, pointerPressure, pointerWarpPoint } from '../lib/pointer-track.ts';
import { remapCameraFragment } from '../lib/remap-camera.ts';
const track = () => ({enabled:true,size:28,effect:'distort',radius:.12,strength:.7,duration:.4,fps:60,events:[
  {id:'start',time:0,x:.1,y:.2,kind:'move'},
  {id:'click',time:2,x:.8,y:.6,kind:'click',travel:.5},
]});
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);
test('validates source coordinates, source bounds, fps, unique ids and sorted events',()=>{
  assert.deepEqual(parsePointerTrack(track(),7.5),track());
  for (const change of [{fps:24},{size:0},{radius:1.1},{duration:0},{strength:NaN},{effect:'unknown'}]) assert.throws(()=>parsePointerTrack({...track(),...change}),/pointerTrack/);
  const t=track();t.events[1].x=-.1;assert.throws(()=>parsePointerTrack(t),/x/);
  assert.throws(()=>parsePointerTrack(track(),1),/event time/);
  t.events[1]={...t.events[0]};assert.throws(()=>parsePointerTrack(t),/unique/);
  t.events[1]={...t.events[0],id:'second',time:-1};assert.throws(()=>parsePointerTrack(t),/sorted/);
});
test('arrival travel holds the prior point, eases, arrives exactly, then holds last point',()=>{
  const t=track();assert.equal(samplePointerTrack(t,-.01).position,null);
  assert.deepEqual(samplePointerTrack(t,1).position,{x:.1,y:.2});
  const mid=samplePointerTrack(t,1.75).position;near(mid.x,.45);near(mid.y,.4);
  assert.deepEqual(samplePointerTrack(t,2).position,{x:.8,y:.6});
  assert.deepEqual(samplePointerTrack(t,9).position,{x:.8,y:.6});
  t.events[1].travel=0;assert.deepEqual(samplePointerTrack(t,1.999).position,{x:.1,y:.2});
});
test('click styles inherit or override; none has no scale change; disabled yields no pointer',()=>{
  const t=track();assert.equal(samplePointerTrack(t,2.1).clicks[0].effect,'distort');
  t.events[1].effect='none';assert.equal(samplePointerTrack(t,2.1).cursorScale,1);
  t.events[1].effect='press';assert.ok(samplePointerTrack(t,2.1).cursorScale<1);
  t.enabled=false;assert.deepEqual(samplePointerTrack(t,2.1),{position:null,clicks:[],cursorScale:1});
});
test('pressure is zero at boundaries, rebounds, and the radial map never moves the center or outside',()=>{
  assert.equal(pointerPressure(0),0);assert.equal(pointerPressure(1),0);
  assert.ok(pointerPressure(.2)>0);assert.ok(pointerPressure(.7)<0);
  assert.deepEqual(pointerWarpPoint(50,50,50,50,20,.1),{x:50,y:50});
  assert.deepEqual(pointerWarpPoint(75,50,50,50,20,.1),{x:75,y:50});
  assert.deepEqual(pointerWarpPoint(60,50,50,50,0,.1),{x:60,y:50});
  assert.ok(pointerWarpPoint(60,50,50,50,20,.1).x>60);
  assert.ok(pointerWarpPoint(60,50,50,50,20,-.1).x<60);
});
test('distortion and radius scale proportionally with output resolution',()=>{
  const a=pointerWarpPoint(120,90,100,80,50,.1),b=pointerWarpPoint(240,180,200,160,100,.1);
  near(a.x*2,b.x);near(a.y*2,b.y);
});
test('trim/split shifts all event knots, preserving prior position, travel, clicks and fps',()=>{
  const t=track();t.events.push({id:'end',time:4,x:.9,y:.8,kind:'move'});
  const f={id:'camera',presetId:'none',intensity:50,speed:50,startTime:0,endTime:5,pointerTrack:t,keyframes:[{time:0},{time:5}]};
  const clip={id:'clip',libraryVideoId:'src',startTime:0,trimStart:0,trimEnd:5};
  const [trimmed]=remapCameraFragment(f,[clip],[{...clip,trimStart:2.1}]);
  const shifted=parsePointerTrack(trimmed.pointerTrack);
  assert.equal(shifted.fps,60);near(shifted.events[0].time,-2.1);
  for (const time of [0,.1,.5,1]) {
    const a=samplePointerTrack(shifted,time),b=samplePointerTrack(t,time+2.1);
    near(a.position.x,b.position.x);near(a.position.y,b.position.y);near(a.cursorScale,b.cursorScale);
    assert.equal(a.clicks.length,b.clicks.length);
    a.clicks.forEach((c,i)=>{near(c.progress,b.clicks[i].progress);near(c.pressure,b.clicks[i].pressure);assert.equal(c.effect,b.clicks[i].effect);});
  }
  const parts=remapCameraFragment(f,[clip],[{...clip,trimEnd:2},{...clip,id:'right',startTime:2,trimStart:2}]);
  assert.deepEqual(samplePointerTrack(parts[1].pointerTrack,0),samplePointerTrack(t,2));
});
test('equal-time move/click events have deterministic last-position ownership',()=>{
  const t=track();t.events.push({id:'same',time:2,x:.7,y:.6,kind:'move'});
  parsePointerTrack(t);assert.deepEqual(samplePointerTrack(t,2).position,{x:.7,y:.6});assert.equal(samplePointerTrack(t,2).clicks.length,1);
});
