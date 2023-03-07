import {
	AdaptiveDpr,
	BakeShadows,
	Environment,
	OrbitControls,
	PerformanceMonitor,
	Plane,
	Stage,
} from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import {
	Instances as SubwayInstances,
	Model as SubwayModel,
} from '@site/src/components/Subway-bake';
import React, { Suspense, useCallback, useRef } from 'react';
import { animated, useSpring } from '@react-spring/three';
import { Lightmap } from '@react-three/lightmap';
import { useControls } from 'leva';
import {
	Vignette,
	Bloom,
	DepthOfField,
	EffectComposer,
	Noise,
	DotScreen,
	Outline,
	Selection,
	Select,
	Grid,
	Pixelation,
	Scanline,
	ChromaticAberration,
	HueSaturation,
} from '@react-three/postprocessing';
import { Vector2 } from 'three';

const CAR_COUNT = 5;

const onComplete = () => {
	console.log('lightmapping complete');
};

export function SubwayScene() {
	return (
		<Suspense>
			<Canvas
				camera={{
					position: [0, 0, 2],
				}}
				shadows={false}
			>
				<Selection>
					<EffectComposer autoClear={false} multisampling={0}>
						{/* <DepthOfField
							focusDistance={0}
							focalLength={0.02}
							bokehScale={2}
							height={480}
						/> */}
						{/* <HueSaturation hue={Math.random() * 255} /> */}
						<Bloom luminanceThreshold={0} luminanceSmoothing={3} height={800} />
						{/* <Noise opacity={0.02} /> */}
						{/* <Pixelation granularity={8} /> */}
						{/* <DotScreen scale={4} /> */}
						<Aberration />
						{/* <Scanline density={2} /> */}
						{/* <Vignette eskil={false} offset={0.1} darkness={0.6} /> */}
						{/* <Grid /> */}
					</EffectComposer>
					{/* <Select enabled> */}
					<Scene />
					{/* </Select> */}
					{/* <OrbitControls /> */}
					<color attach="background" args={[0xffffff]} />
					{/* <PerformanceMonitor /> */}
					<AdaptiveDpr pixelated />
				</Selection>
			</Canvas>
		</Suspense>
	);
}

function Aberration() {
	const ref = useRef();
	useFrame(() => {
		const ab = ref.current!;
		ab.offset.x = Math.sin(Date.now() / 5000) / 500;
	});
	return (
		<ChromaticAberration
			ref={ref}
			// offset={new Vector2(Math.random(), 0)}
			// radialModulation
			modulationOffset={0.1}
		/>
	);
}

function Scene() {
	return (
		<>
			{/* <pointLight position={[0, 2, 0]} castShadow intensity={0.5} /> */}
			<ambientLight intensity={0.45} color={0xffe0b2} />
			<directionalLight
				position={[0, 2, 0]}
				castShadow
				intensity={0.15}
				color={0xffb300}
			/>
			<Select enabled>
				<SubwayInstances>
					{new Array(CAR_COUNT).fill(null).map((_, i) => (
						<Car key={i} index={i} />
					))}
				</SubwayInstances>
			</Select>
			{/* <BakeShadows /> */}
			<Environment preset="city" />
			<RunnerLights />
			{/* walls */}
			<Plane
				args={[100, 100]}
				rotation={[0, Math.PI / 2, 0]}
				position={[-2, 0, 0]}
			>
				<meshBasicMaterial color={0xeeb030} attach="material" />
			</Plane>
			<Plane
				args={[100, 100]}
				rotation={[0, -Math.PI / 2, 0]}
				position={[2, 0, 0]}
			>
				<meshBasicMaterial color={0xeeb030} attach="material" />
			</Plane>
		</>
	);
}

function Car({ index }: { index: number }) {
	const [{ position }, api] = useSpring(() => ({
		position: [0, 0, index * -8.9],
		config: { mass: 5, tension: 500, friction: 200 },
	}));

	useFrame((state) => {
		// train cars move in a sinusoidal pattern
		const t = state.clock.getElapsedTime();
		const x = Math.sin(t + index * 0.25) / (3 / index);
		const z = index * -8.9;
		api.start({ position: [x, 0, z] });
	});

	return (
		<animated.group position={position}>
			<SubwayModel />
		</animated.group>
	);
}

const runnerLightIntensity = 0.25;
const runnerLightColor = 0xfff3af;
const runnerPosition = 4;
function RunnerLights() {
	const ref = useRef<any>(null);
	const modeRef = useRef(1);
	const lightRef1 = useRef<any>(null);
	const lightRef2 = useRef<any>(null);
	const lightRef3 = useRef<any>(null);
	const lightRef4 = useRef<any>(null);

	const lightIntensityRef = useRef(runnerLightIntensity);
	const setLightIntensity = useCallback((intensity: number) => {
		lightRef1.current.intensity = intensity;
		lightRef2.current.intensity = intensity;
		lightRef3.current.intensity = intensity;
		lightRef4.current.intensity = intensity;
		lightIntensityRef.current = intensity;
	}, []);

	useFrame(() => {
		if (modeRef.current === 1) {
			ref.current.position.z += 0.5;
			if (ref.current.position.z > 50) modeRef.current = 2;
		}
		if (modeRef.current === 2) {
			ref.current.position.y += 1;
			if (ref.current.position.y > 30) modeRef.current = 3;
		}
		if (modeRef.current === 3) {
			setLightIntensity(lightIntensityRef.current - 0.001);
			if (lightIntensityRef.current <= 0) modeRef.current = 4;
		}
		if (modeRef.current === 4) {
			ref.current.position.z -= 0.5;
			if (ref.current.position.z < -50) modeRef.current = 5;
		}
		if (modeRef.current === 5) {
			ref.current.position.y -= 1;
			if (ref.current.position.y < 0) modeRef.current = 6;
		} else if (modeRef.current === 6) {
			setLightIntensity(lightIntensityRef.current + 0.001);
			if (lightIntensityRef.current >= runnerLightIntensity)
				modeRef.current = 1;
		}

		// if (
		// 	modeRef.current > 1 && modeRef.current < 6
		// ) {
		// 	if (lightIntensityRef.current > 0) {
		// 		setLightIntensity(lightIntensityRef.current - 0.005);
		// 	}
		// }
	});
	return (
		<group ref={ref}>
			<pointLight
				ref={lightRef1}
				position={[-runnerPosition, 0, 0]}
				intensity={runnerLightIntensity}
				color={runnerLightColor}
			/>
			<pointLight
				ref={lightRef2}
				position={[runnerPosition, 0, 0]}
				intensity={runnerLightIntensity}
				color={runnerLightColor}
			/>
			<pointLight
				ref={lightRef3}
				position={[-runnerPosition, 0, -10]}
				intensity={runnerLightIntensity}
				color={runnerLightColor}
			/>
			<pointLight
				ref={lightRef4}
				position={[runnerPosition, 0, -10]}
				intensity={runnerLightIntensity}
				color={runnerLightColor}
			/>
		</group>
	);
}
