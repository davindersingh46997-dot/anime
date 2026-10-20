import * as THREE from 'three';
import type { VRM } from '@pixiv/three-vrm';
import type { CompanionAction, CompanionEmotion } from '../companion/types';
import {
  applyDance,
  applyIdleMotion,
  applyLook,
  applyNod,
  applyRelaxedPose,
  applyRun,
  applySit,
  applyTurn,
  applyWalk,
  applyWave,
  smoothStep,
} from './proceduralAnimations';

const WALK_DURATION = 1.5;
const WALK_DISTANCE = 0.55;
const RUN_DURATION = 2;
const RUN_DISTANCE = 1.2;
const ACTION_FADE = 0.2;
const EXPRESSIONS: CompanionEmotion[] = ['happy', 'sad', 'angry', 'surprised', 'neutral'];

const getActionDuration = (action: CompanionAction) => {
  switch (action) {
    case 'wave':
      return 1.8;
    case 'nod':
      return 1.1;
    case 'walk':
      return WALK_DURATION;
    case 'run':
      return RUN_DURATION;
    case 'stand':
      return 0.9;
    case 'turn-left':
    case 'turn-right':
      return 1.3;
    case 'turn-around':
      return 1.7;
    case 'look':
      return 1.4;
    default:
      return null;
  }
};

export class AnimationController {
  private vrm: VRM | null = null;
  private action: CompanionAction = 'idle';
  private emotion: CompanionEmotion = 'neutral';
  private elapsed = 0;
  private onActionComplete: (() => void) | undefined;
  private baseState = new Map<
    THREE.Object3D,
    { position: THREE.Vector3; rotation: THREE.Euler; scale: THREE.Vector3 }
  >();
  private movementOffset = new THREE.Vector3();
  private expressionWeights = new Map<CompanionEmotion, number>();

  bindModel(vrm: VRM) {
    this.vrm = vrm;
    this.movementOffset.set(0, 0, 0);
    this.captureBasePose(vrm.scene);
    this.resetToNeutralPose();

    for (const expression of EXPRESSIONS) {
      if (vrm.expressionManager?.getExpression(expression)) {
        this.expressionWeights.set(expression, vrm.expressionManager.getValue(expression) ?? 0);
      }
    }
  }

  setOnActionComplete(callback: (() => void) | undefined) {
    this.onActionComplete = callback;
  }

  setAction(action: CompanionAction) {
    if ((this.action === 'walk' || this.action === 'run') && action !== this.action) {
      const distance = this.action === 'run' ? RUN_DISTANCE : WALK_DISTANCE;
      const duration = this.action === 'run' ? RUN_DURATION : WALK_DURATION;
      this.movementOffset.z += distance * smoothStep(this.elapsed / duration);
    }

    this.action = action;
    this.elapsed = 0;
  }

  setEmotion(emotion: CompanionEmotion) {
    this.emotion = emotion;
  }

  update(delta: number) {
    if (!this.vrm) return;

    const frameDelta = Math.min(delta, 0.1);
    this.elapsed += frameDelta;
    if (this.action === 'stop') {
      this.action = 'idle';
      this.elapsed = 0;
    }
    const duration = getActionDuration(this.action);

    if (duration !== null && this.elapsed >= duration) {
      if (this.action === 'walk') {
        this.movementOffset.z += WALK_DISTANCE;
      } else if (this.action === 'run') {
        this.movementOffset.z += RUN_DISTANCE;
      }
      this.action = 'idle';
      this.elapsed = 0;
      this.onActionComplete?.();
    }

    this.resetToNeutralPose();
    const root = this.vrm.scene;
    const getBone = (name: Parameters<VRM['humanoid']['getNormalizedBoneNode']>[0]) =>
      this.vrm?.humanoid.getNormalizedBoneNode(name) ?? null;
    applyRelaxedPose(getBone);
    const currentDuration = getActionDuration(this.action);
    const weight = currentDuration === null
      ? 1
      : Math.min(
          smoothStep(this.elapsed / ACTION_FADE),
          smoothStep((currentDuration - this.elapsed) / ACTION_FADE),
        );

    switch (this.action) {
      case 'idle':
        applyIdleMotion(getBone, this.elapsed);
        break;
      case 'wave':
        applyWave(getBone, this.elapsed, weight);
        break;
      case 'nod':
        applyNod(getBone, this.elapsed, weight);
        break;
      case 'dance':
        applyDance(root, getBone, this.elapsed, weight);
        break;
      case 'walk':
        applyWalk(
          root,
          getBone,
          this.elapsed,
          WALK_DISTANCE * smoothStep(this.elapsed / WALK_DURATION),
          weight,
        );
        break;
      case 'run':
        applyRun(
          root,
          getBone,
          this.elapsed,
          RUN_DISTANCE * smoothStep(this.elapsed / RUN_DURATION),
          weight,
        );
        break;
      case 'sit':
        applySit(getBone, smoothStep(this.elapsed / ACTION_FADE));
        break;
      case 'stand':
        applySit(getBone, 1 - smoothStep(this.elapsed / 0.9));
        break;
      case 'turn-left':
        applyTurn(root, this.elapsed, 'left', weight);
        break;
      case 'turn-right':
        applyTurn(root, this.elapsed, 'right', weight);
        break;
      case 'turn-around':
        applyTurn(root, this.elapsed, 'around', weight);
        break;
      case 'look':
        applyLook(getBone, weight);
        break;
    }

    this.applyEmotion(frameDelta);
  }

  private captureBasePose(root: THREE.Object3D) {
    this.baseState.clear();
    root.traverse((object) => {
      this.baseState.set(object, {
        position: object.position.clone(),
        rotation: object.rotation.clone(),
        scale: object.scale.clone(),
      });
    });
  }

  private resetToNeutralPose() {
    if (!this.vrm) return;

    this.vrm.scene.traverse((object) => {
      const state = this.baseState.get(object);
      if (!state) return;

      object.position.copy(state.position);
      object.rotation.copy(state.rotation);
      object.scale.copy(state.scale);
    });

    this.vrm.scene.position.add(this.movementOffset);
  }

  private applyEmotion(delta: number) {
    const manager = this.vrm?.expressionManager;
    if (!manager) return;

    const blend = 1 - Math.exp(-delta / 0.18);
    for (const [expression, currentWeight] of this.expressionWeights) {
      const targetWeight = expression === this.emotion ? 1 : 0;
      const nextWeight = THREE.MathUtils.lerp(currentWeight, targetWeight, blend);
      this.expressionWeights.set(expression, nextWeight);
      manager.setValue(expression, nextWeight);
    }
  }
}
