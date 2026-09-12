import test from 'node:test';
import assert from 'node:assert/strict';
import {speedMap,waitSpeedAt} from '../lib/wait-speed.ts';
test('2x action and 4x wait share a continuous preview/export clock',()=>{
 const wait={start:5.5,end:8.5,multiplier:2};const map=speedMap(0,12.255,2,wait);
 assert.equal(waitSpeedAt(5.49,2,wait),2);assert.equal(waitSpeedAt(5.5,2,wait),4);assert.equal(waitSpeedAt(8.5,2,wait),2);
 assert.equal(map.sourceOffset(2.75),5.5);assert.equal(map.sourceOffset(3.5),8.5);assert.equal(map.outputDuration,5.3775);
 assert.equal(map.sourceOffset(100),12.255);
});
test('trim within waiting range retains the same mapping',()=>{const map=speedMap(6,1,2,{start:5.5,end:8.5,multiplier:2});assert.equal(map.outputDuration,.25);assert.equal(map.sourceOffset(.125),.5);});
