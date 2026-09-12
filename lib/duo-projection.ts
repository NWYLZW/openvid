import * as THREE from 'three';
/** Projected screen pixels and geometry must use the same eye, in device-local coordinates. */
export function updateDuoProjectionEye(camera:THREE.Camera,device:THREE.Object3D,out:THREE.Vector3):THREE.Vector3 {
  camera.updateWorldMatrix(true,false);
  device.updateWorldMatrix(true,false);
  camera.getWorldPosition(out);
  return device.worldToLocal(out);
}
