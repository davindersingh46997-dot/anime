import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMHumanBoneName } from '@pixiv/three-vrm';
import type { VRM } from '@pixiv/three-vrm';
import { AnimationController } from '../animation/AnimationController';
import type { CompanionAction, CompanionEmotion } from '../companion/types';

type AvatarSceneProps = {
  action: CompanionAction;
  emotion: CompanionEmotion;
  onActionComplete?: () => void;
  thought: string | null;
  isSpeaking: boolean;
};

function ModelRig({
  vrm,
  action,
  emotion,
  onActionComplete,
}: {
  vrm: VRM;
  action: CompanionAction;
  emotion: CompanionEmotion;
  onActionComplete?: () => void;
}) {
  const controller = useMemo(() => new AnimationController(), []);
  const completeRef = useRef(onActionComplete);

  useEffect(() => {
    completeRef.current = onActionComplete;
    controller.setOnActionComplete(() => completeRef.current?.());
  }, [controller, onActionComplete]);

  useEffect(() => {
    controller.bindModel(vrm);
  }, [controller, vrm]);

  useEffect(() => {
    controller.setAction(action);
    controller.setEmotion(emotion);
  }, [action, controller, emotion]);

  useFrame((_, delta) => {
    controller.update(delta);
    vrm.update(Math.min(delta, 0.1));
  });

  return <primitive object={vrm.scene} />;
}

function ChairProp() {
  const wood = <meshStandardMaterial color="#493a35" roughness={0.8} />;

  return (
    <group position={[0, 0, -0.08]}>
      <mesh position={[0, 0.65, 0]}>
        <boxGeometry args={[0.72, 0.1, 0.58]} />
        <meshStandardMaterial color="#76513d" roughness={0.78} />
      </mesh>
      {[-1, 1].flatMap((x) =>
        [-1, 1].map((z) => (
          <mesh key={`${x}-${z}`} position={[x * 0.28, 0.32, z * 0.22]}>
            <boxGeometry args={[0.055, 0.64, 0.055]} />
            {wood}
          </mesh>
        )),
      )}
      <group position={[0, 0.98, -0.29]} rotation={[-0.08, 0, 0]}>
        <mesh>
          <boxGeometry args={[0.72, 0.58, 0.08]} />
          <meshStandardMaterial color="#654838" roughness={0.82} />
        </mesh>
        <mesh position={[0, 0, 0.046]}>
          <boxGeometry args={[0.54, 0.4, 0.018]} />
          <meshStandardMaterial color="#85604a" roughness={0.86} />
        </mesh>
      </group>
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * 0.37, 0.91, -0.02]}>
            <boxGeometry args={[0.075, 0.075, 0.46]} />
            {wood}
          </mesh>
          <mesh position={[side * 0.37, 0.79, 0.15]}>
            <boxGeometry args={[0.055, 0.24, 0.055]} />
            {wood}
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function AvatarScene({ action, emotion, onActionComplete, thought, isSpeaking }: AvatarSceneProps) {
  const [vrm, setVrm] = useState<VRM | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));
    let cancelled = false;

    loader.load(
      '/models/AvatarSample_Y.vrm',
      (gltf) => {
        if (cancelled) return;

        const loadedVRM = gltf.userData.vrm as VRM | undefined;
        if (!loadedVRM) {
          setError(
            'The file at /models/AvatarSample_Y.vrm loaded, but it does not contain a valid VRM character.',
          );
          setLoading(false);
          return;
        }

        loadedVRM.scene.rotation.y = 0;
        loadedVRM.scene.updateMatrixWorld(true);
        const initialBounds = new THREE.Box3().setFromObject(loadedVRM.scene);
        const initialSize = initialBounds.getSize(new THREE.Vector3());
        if (!Number.isFinite(initialSize.y) || initialSize.y <= 0) {
          setError('The VRM character has invalid dimensions and cannot be displayed.');
          setLoading(false);
          return;
        }

        loadedVRM.scene.scale.setScalar(2.1 / initialSize.y);
        loadedVRM.scene.updateMatrixWorld(true);
        const fittedBounds = new THREE.Box3().setFromObject(loadedVRM.scene);
        const fittedCenter = fittedBounds.getCenter(new THREE.Vector3());
        loadedVRM.scene.position.set(-fittedCenter.x, -fittedBounds.min.y, -fittedCenter.z);

        const availableBones = Object.entries(VRMHumanBoneName)
          .filter(([, boneName]) => loadedVRM.humanoid.getNormalizedBoneNode(boneName) !== null)
          .map(([label]) => label);
        const availableExpressions =
          loadedVRM.expressionManager?.expressions.map((expression) => expression.expressionName) ?? [];
        console.info('[AvatarScene] VRM capabilities', {
          humanoidBones: availableBones,
          expressions: availableExpressions,
          animationClips: gltf.animations.map((clip) => clip.name),
        });

        setVrm(loadedVRM);
        setLoading(false);
      },
      (event) => {
        if (cancelled) return;
        if (event.total > 0) {
          setProgress(Math.round((event.loaded / event.total) * 100));
        }
      },
      (loadError) => {
        if (cancelled) return;
        const detail =
          loadError instanceof Error
            ? ` ${loadError.message}`
            : ' Check that the VRM exists in the public/models folder and is a valid VRM export.';
        setError(`Unable to load /models/AvatarSample_Y.vrm.${detail}`);
        setLoading(false);
      },
    );

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="avatar-scene">
      {thought && (
        <div className={`thought-cloud${isSpeaking ? ' speaking' : ''}`} role="status" aria-live="polite">
          <span className="thought-indicator" aria-hidden="true">
            {isSpeaking ? '♪' : '…'}
          </span>
          <span>{thought}</span>
        </div>
      )}
      {loading && (
        <div className="scene-loading">
          {progress > 0 ? `Loading character… ${progress}%` : 'Loading character…'}
        </div>
      )}
      {error && <div className="scene-error">{error}</div>}

      <Canvas camera={{ position: [0, 1.7, 4.2], fov: 35 }}>
        <color attach="background" args={['#101722']} />
        <fog attach="fog" args={['#101722', 5, 14]} />
        <ambientLight intensity={1.2} />
        <directionalLight position={[3, 5, 3]} intensity={1.4} />
        <directionalLight position={[-2, 2, 1]} intensity={0.55} />

        {vrm && (
          <ModelRig
            vrm={vrm}
            action={action}
            emotion={emotion}
            onActionComplete={onActionComplete}
          />
        )}

        {(action === 'sit' || action === 'stand') && <ChairProp />}

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.025, 0]} receiveShadow>
          <circleGeometry args={[6, 64]} />
          <meshStandardMaterial color="#182535" metalness={0.1} roughness={0.9} />
        </mesh>

        <OrbitControls
          enablePan={false}
          enableZoom={false}
          minPolarAngle={Math.PI / 2.7}
          maxPolarAngle={Math.PI / 1.9}
          target={[0, 1.2, 0]}
        />
      </Canvas>
    </div>
  );
}
