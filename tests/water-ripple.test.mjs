import test from 'node:test';
import assert from 'node:assert/strict';
import {waterRippleOffset} from '../lib/pointer-distortion.ts';
import {parsePointerTrack,samplePointerTrack} from '../lib/pointer-track.ts';
test('water packet travels outwards, restores the center and ends at rest',()=>{
 for(const r of [0,.2,.5,.8,1]) {assert.equal(waterRippleOffset(r,0),0);assert.equal(waterRippleOffset(r,1),0);}
 const peak=p=>{let best=0,max=0;for(let r=.001;r<1;r+=.001){const v=Math.abs(waterRippleOffset(r,p));if(v>max){max=v;best=r;}}return best;};
 assert.ok(peak(.7)>peak(.2)+.3);
 assert.ok(Math.abs(waterRippleOffset(.1,.7))<1e-10);
});
test('water is a selectable click override and shares the distortion concurrency limit',()=>{
 const t={enabled:true,size:28,radius:.2,strength:1,duration:.65,effect:'water',events:[{id:'a',time:0,x:.5,y:.5,kind:'click'}]};
 assert.equal(samplePointerTrack(parsePointerTrack(t,2),.2).clicks[0].effect,'water');
 assert.throws(()=>parsePointerTrack({...t,events:Array.from({length:33},(_,i)=>({...t.events[0],id:String(i)}))},2),/32/);
});

test('the water refraction at full strength does not fold the radial image',()=>{
 for(let p=.02;p<1;p+=.02){let previous=0;for(let r=.001;r<=1;r+=.001){const mapped=r+.045*waterRippleOffset(r,p);assert.ok(mapped>=previous,`fold at ${p}, ${r}`);previous=mapped;}}
});
