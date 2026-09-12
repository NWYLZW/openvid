import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultDuoConfig,parseDuoConfig,sampleDuoAngle,updateDuoConfig} from '../lib/duo-config.ts';
import {defaultMockup3DState,restoreMockup3DState} from '../lib/mockup3d-state.ts';
import {parseLocalEdit} from '../lib/local-edit.ts';
const config=()=>defaultDuoConfig();
const recipe=()=>({version:1,speed:1,padding:10,roundedCorners:0,shadows:0,mockup:'iphone-duo',duo:{config:config()},background:{from:'#101010',to:'#202020'},zooms:[],titles:[]});
test('Duo settings round-trip with independent inner crops and following cover',()=>{
  const initial=config();assert.deepEqual(parseDuoConfig(JSON.parse(JSON.stringify(initial))),initial);assert.equal(initial.coverMode,'right');assert.notDeepEqual(initial.left.crop,initial.right.crop);
});
test('strict validation rejects ignored fields, invalid images and out-of-bounds crops',()=>{
  assert.throws(()=>parseDuoConfig({...config(),unknown:1}),/Unknown/);
  assert.throws(()=>parseDuoConfig({...config(),blur:NaN}),/blur/);
  assert.throws(()=>parseDuoConfig({...config(),left:{...config().left,source:'image',image:'https://example.com/x.png'}}),/data URL/);
  assert.throws(()=>parseDuoConfig({...config(),right:{...config().right,crop:{x:.5,y:0,width:1,height:1}}}),/bounds/);
});
test('fold timeline interpolates deterministically and holds endpoints',()=>{
  const value={...config(),keyframes:[{time:0,angle:0},{time:.6,angle:0},{time:2.6,angle:180,easing:[0,0,1,1]}]};
  assert.equal(sampleDuoAngle(value,0),0);assert.equal(sampleDuoAngle(value,.3),0);assert.ok(Math.abs(sampleDuoAngle(value,1.6)-90)<.001);assert.equal(sampleDuoAngle(value,8),180);
  assert.equal(sampleDuoAngle(config(),100),180);
  assert.throws(()=>parseDuoConfig({...value,keyframes:[{time:2,angle:0},{time:1,angle:180}]}),/increase/);
});
test('incremental update preserves other settings and rejects stale state',()=>{
  const a=config();const b=updateDuoConfig(a,{blur:0},structuredClone(a));assert.equal(b.blur,0);assert.deepEqual(b.left,a.left);assert.equal(a.blur,72);
  assert.throws(()=>updateDuoConfig(b,{angle:0},a),/changed/);
});
test('old projects restore defaults; full video/photo/history state retains every Duo control',()=>{
  assert.deepEqual(restoreMockup3DState({}),defaultMockup3DState());
  const saved={...defaultMockup3DState(),imagePhoneActive:true,imagePhoneDevice:'iphone-duo',imagePhoneX:123,viewer3DEnvironment:'night',viewer3DGlow:2,viewer3DAutoRotate:true,duoConfig:{...config(),finish:'night-sky',angle:32}};
  assert.deepEqual(restoreMockup3DState(JSON.parse(JSON.stringify(saved))),saved);
});
test('local recipe admits Duo settings and rejects unsupported pairings before mutation',()=>{
  assert.equal(parseLocalEdit(recipe(),10).duo.config.angle,180);
  const invalid=recipe();invalid.duo.config.keyframes=[{time:11,angle:0}];assert.throws(()=>parseLocalEdit(invalid,10),/duration/);
  assert.throws(()=>parseLocalEdit({...recipe(),mockup:'none'},10),/requires/);
  const camera={...recipe(),camera:[{time:0}]};assert.throws(()=>parseLocalEdit(camera,10),/camera/);
  const transform=recipe();transform.duo.transform={scale:100};assert.throws(()=>parseLocalEdit(transform,10),/scale/);
});

test('continuous mode validates its one source and round-trips; legacy panel configs remain legacy',()=>{
 const fresh=config();assert.equal(fresh.contentMode,'continuous');assert.deepEqual(fresh.content.crop,{x:0,y:0,width:1,height:1});
 assert.throws(()=>parseDuoConfig({...fresh,content:undefined}),/requires content/);
 assert.throws(()=>parseDuoConfig({...fresh,referenceLighting:'yes'}),/lighting/);
 const {contentMode,content,referenceLighting,...legacy}=fresh;assert.equal(parseDuoConfig(legacy).contentMode,undefined);
 assert.deepEqual(parseDuoConfig(fresh),fresh);
});


test('boundary fill persists through project and recipe state while old configs remain valid',()=>{
 const {boundaryFill,...legacy}=config();assert.equal(boundaryFill,1);
 assert.equal(parseDuoConfig(legacy).boundaryFill,undefined);
 assert.equal(restoreMockup3DState({duoConfig:legacy}).duoConfig.boundaryFill,undefined);
 for(const value of [0,.42,1]){
  const updated=updateDuoConfig(legacy,{boundaryFill:value},structuredClone(legacy));
  assert.equal(restoreMockup3DState(JSON.parse(JSON.stringify({duoConfig:updated}))).duoConfig.boundaryFill,value);
  const input=recipe();input.duo.config=updated;
  assert.equal(parseLocalEdit(input,10).duo.config.boundaryFill,value);
 }
 for(const value of [-.01,1.01,NaN,Infinity,null,'1'])assert.throws(()=>parseDuoConfig({...legacy,boundaryFill:value}),/boundary fill/);
});
test('system UI persists through recipe and rejects unsafe or out-of-range settings',()=>{
  const value=config();value.systemUI.enabled=true;value.systemUI.background='#faf4e8';
  const edit=recipe();edit.duo.config=value;
  assert.deepEqual(parseLocalEdit(JSON.parse(JSON.stringify(edit))).duo.config.systemUI,value.systemUI);
  for(const patch of [{width:0},{iconColor:'red'},{enabled:1},{extra:1},{buttonOpacity:NaN}])assert.throws(()=>parseDuoConfig({...value,systemUI:{...value.systemUI,...patch}}));
  const legacy=config();delete legacy.systemUI;assert.equal(parseDuoConfig(legacy).systemUI,undefined);
});
test('independent panel videos preserve offsets and reject invalid media settings',()=>{
 const c=config();c.contentMode='panels';c.left={...c.left,videoId:'uploaded-demo',videoStart:1,videoSpeed:2};
 assert.deepEqual(parseDuoConfig(JSON.parse(JSON.stringify(c))).left,c.left);
 assert.throws(()=>parseDuoConfig({...c,left:{...c.left,videoSpeed:0}}));
 assert.throws(()=>parseDuoConfig({...c,left:{...c.left,videoId:''}}));
});
