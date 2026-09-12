import test from 'node:test';
import assert from 'node:assert/strict';
import {waitForDecodedVideoFrame} from '../lib/video-frame-ready.ts';
class Video extends EventTarget {readyState=1;seeking=true;error=null;}
test('a seek cannot resolve on metadata or a stale frame callback',async()=>{
 const video=new Video();let settled=false;const pending=waitForDecodedVideoFrame(video,200).then(()=>{settled=true;});
 video.dispatchEvent(new Event('loadeddata'));await Promise.resolve();assert.equal(settled,false);
 video.readyState=2;video.dispatchEvent(new Event('canplay'));await Promise.resolve();assert.equal(settled,false);
 video.seeking=false;video.dispatchEvent(new Event('seeked'));await pending;assert.equal(settled,true);
});
test('same-time decoded frame is immediately reusable',async()=>{const v=new Video();v.readyState=4;v.seeking=false;await waitForDecodedVideoFrame(v,50);});
test('decoder timeout fails instead of exporting a blank frame',async()=>{await assert.rejects(waitForDecodedVideoFrame(new Video(),10),/timeout/);});
test('media errors fail promptly',async()=>{const v=new Video();const p=waitForDecodedVideoFrame(v,200);v.error={code:3,message:'invalid media'};v.dispatchEvent(new Event('error'));await assert.rejects(p,/invalid media/);});
