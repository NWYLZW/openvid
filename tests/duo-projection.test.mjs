import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {updateDuoProjectionEye} from '../lib/duo-projection.ts';
const planeZ=.24948,hingeZ=.275454;
// A screen feature at q must land at the same screen pixel on the folded face.
function foldSample(q,eye){
 const angle=135*Math.PI/180;
 const normal=new THREE.Vector3(Math.sin(angle),0,Math.cos(angle));
 const plane=new THREE.Plane(normal,-normal.z*hingeZ-(-.27463-hingeZ));
 return new THREE.Ray(eye,q.clone().sub(eye).normalize()).intersectPlane(plane,new THREE.Vector3());
}
function error(camera,device,eye){
 let worst=0;
 for(const x of [1,2,3])for(const y of [-3,0,3]){
  const q=new THREE.Vector3(x,y,planeZ),p=foldSample(q,eye);assert.ok(p);
  const actual=p.applyMatrix4(device.matrixWorld).project(camera);
  const expected=q.applyMatrix4(device.matrixWorld).project(camera);
  worst=Math.max(worst,Math.hypot(actual.x-expected.x,actual.y-expected.y));
 }
 return worst;
}
test('fold projection stays registered to the unfolded image under distance, rotation, translation and scale',()=>{
 for(const [distance,pitch,yaw,scale] of [[40,0,0,1],[46,3.317,.31,1],[30,15,-20,.8],[60,-10,25,1.3]]){
  const camera=new THREE.PerspectiveCamera(32,1.42,.1,250);camera.position.set(0,0,distance);camera.lookAt(0,0,hingeZ);
  const device=new THREE.Group();device.rotation.set(pitch*Math.PI/180,yaw*Math.PI/180,0);device.position.set(.2,.4,0);device.scale.setScalar(scale);
  const eye=updateDuoProjectionEye(camera,device,new THREE.Vector3());
  assert.ok(error(camera,device,eye)<1e-10);
 }
});
test('regression: fixed reference eye visibly shears clear pixels when actual camera is at 46',()=>{
 const camera=new THREE.PerspectiveCamera(32,1.42,.1,250);camera.position.set(0,0,46);camera.lookAt(0,0,hingeZ);
 const device=new THREE.Group();device.rotation.x=3.317*Math.PI/180;
 const eye=updateDuoProjectionEye(camera,device,new THREE.Vector3());
 const oldError=error(camera,device,new THREE.Vector3(0,0,40));
 assert.ok(oldError>.005,`old mismatch ${oldError}`);
 assert.ok(error(camera,device,eye)<1e-10);
});
test('reference default camera and unrotated device retain the original projection',()=>{
 const camera=new THREE.PerspectiveCamera(32,1.42,.1,250);camera.position.set(0,0,40);camera.lookAt(0,0,hingeZ);
 const device=new THREE.Group();const eye=updateDuoProjectionEye(camera,device,new THREE.Vector3());
 assert.deepEqual(eye.toArray(),[0,0,40]);assert.ok(error(camera,device,eye)<1e-10);
});
