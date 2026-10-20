import * as THREE from 'three';
import type { VRMHumanBoneName } from '@pixiv/three-vrm';

export type GetVRMBone = (name: VRMHumanBoneName) => THREE.Object3D | null;

export const applyRelaxedPose = (getBone: GetVRMBone) => {
  rotateBone(getBone('leftUpperArm'), 0, 0, -0.72, 1);
  rotateBone(getBone('rightUpperArm'), 0, 0, 0.72, 1);
  rotateBone(getBone('leftLowerArm'), 0, 0, 0.08, 1);
  rotateBone(getBone('rightLowerArm'), 0, 0, -0.08, 1);
};

const rotateBone = (
  bone: THREE.Object3D | null,
  x: number,
  y: number,
  z: number,
  weight: number,
) => {
  if (!bone) return;
  bone.rotation.x += x * weight;
  bone.rotation.y += y * weight;
  bone.rotation.z += z * weight;
};

export const applyIdleMotion = (getBone: GetVRMBone, elapsed: number) => {
  rotateBone(getBone('spine') ?? getBone('chest'), 0, 0, Math.sin(elapsed * 1.1) * 0.035, 1);
  rotateBone(getBone('head'), 0, Math.sin(elapsed * 1.3) * 0.08, 0, 1);
};

export const applyWave = (getBone: GetVRMBone, elapsed: number, weight: number) => {
  rotateBone(getBone('leftUpperArm'), 0.45, 0.2, 1.05, weight);
  rotateBone(getBone('leftLowerArm'), 0, 0, 0.55 + Math.sin(elapsed * 8) * 0.28, weight);
  rotateBone(getBone('leftHand'), 0, Math.sin(elapsed * 8) * 0.2, 0, weight);
};

export const applyNod = (getBone: GetVRMBone, elapsed: number, weight: number) => {
  rotateBone(getBone('head'), Math.sin(elapsed * 8) * 0.32, 0, 0, weight);
};

export const applyDance = (
  root: THREE.Object3D,
  getBone: GetVRMBone,
  elapsed: number,
  weight: number,
) => {
  const swing = Math.sin(elapsed * 8);

  rotateBone(getBone('leftUpperArm'), 0.2, 0, -0.75 + swing * 0.5, weight);
  rotateBone(getBone('rightUpperArm'), -0.2, 0, 0.75 - swing * 0.5, weight);
  rotateBone(getBone('leftUpperLeg'), swing * 0.38, 0, 0, weight);
  rotateBone(getBone('rightUpperLeg'), -swing * 0.38, 0, 0, weight);
  rotateBone(getBone('spine') ?? getBone('chest'), 0, 0, swing * 0.12, weight);
  root.rotation.y += Math.sin(elapsed * 1.5) * 0.12 * weight;
};

export const applyWalk = (
  root: THREE.Object3D,
  getBone: GetVRMBone,
  elapsed: number,
  travel: number,
  weight: number,
) => {
  const stride = Math.sin(elapsed * 9);

  rotateBone(getBone('leftUpperLeg'), stride * 0.42, 0, 0, weight);
  rotateBone(getBone('rightUpperLeg'), -stride * 0.42, 0, 0, weight);
  rotateBone(getBone('leftUpperArm'), -stride * 0.24, 0, 0, weight);
  rotateBone(getBone('rightUpperArm'), stride * 0.24, 0, 0, weight);
  root.position.z += travel;
};

export const applyRun = (
  root: THREE.Object3D,
  getBone: GetVRMBone,
  elapsed: number,
  travel: number,
  weight: number,
) => {
  const stride = Math.sin(elapsed * 15);
  rotateBone(getBone('leftUpperLeg'), stride * 0.72, 0, 0, weight);
  rotateBone(getBone('rightUpperLeg'), -stride * 0.72, 0, 0, weight);
  rotateBone(getBone('leftLowerLeg'), Math.max(0, -stride) * 0.65, 0, 0, weight);
  rotateBone(getBone('rightLowerLeg'), Math.max(0, stride) * 0.65, 0, 0, weight);
  rotateBone(getBone('leftUpperArm'), -stride * 0.52, 0, 0, weight);
  rotateBone(getBone('rightUpperArm'), stride * 0.52, 0, 0, weight);
  rotateBone(getBone('spine') ?? getBone('chest'), -0.08, 0, 0, weight);
  root.position.z += travel;
};

export const applySit = (getBone: GetVRMBone, weight: number) => {
  const hips = getBone('hips');
  if (hips) hips.position.y -= 0.28 * weight;

  rotateBone(getBone('leftUpperLeg'), -1.3, 0, 0, weight);
  rotateBone(getBone('rightUpperLeg'), -1.3, 0, 0, weight);
  rotateBone(getBone('leftLowerLeg'), 1.4, 0, 0, weight);
  rotateBone(getBone('rightLowerLeg'), 1.4, 0, 0, weight);
  rotateBone(getBone('spine') ?? getBone('chest'), -0.1, 0, 0, weight);
  rotateBone(getBone('leftUpperArm'), -0.22, 0, 0, weight);
  rotateBone(getBone('rightUpperArm'), -0.22, 0, 0, weight);
  rotateBone(getBone('leftLowerArm'), -0.25, 0, 0, weight);
  rotateBone(getBone('rightLowerArm'), -0.25, 0, 0, weight);
};

export const applyTurn = (
  root: THREE.Object3D,
  elapsed: number,
  direction: 'left' | 'right' | 'around',
  weight: number,
) => {
  const angle = direction === 'left' ? Math.PI / 2 : direction === 'right' ? -Math.PI / 2 : Math.PI;
  const turnIn = Math.min(1, elapsed / 0.4);
  root.rotation.y += angle * turnIn * weight;
};

export const applyLook = (getBone: GetVRMBone, weight: number) => {
  rotateBone(getBone('head'), -0.08, 0.2, 0, weight);
};

export const smoothStep = (value: number) => {
  const clamped = THREE.MathUtils.clamp(value, 0, 1);
  return clamped * clamped * (3 - 2 * clamped);
};
