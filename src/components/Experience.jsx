import {
  MeshTransmissionMaterial,
  RoundedBox,
  ContactShadows,
  Environment,
  Float,
  CameraControls,
  PerspectiveCamera,
  useHelper,
  Sky,
  Text,
  Billboard,
  useScroll,
  useFBO,
  OrthographicCamera,
} from "@react-three/drei";
import { LumaSplatsThree } from "@lumaai/luma-web";
import { createPortal, extend, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { button, useControls } from "leva";
import { Perf } from "r3f-perf";
import * as THREE from "three";
import { gsap } from "gsap";
import { MathUtils } from "three";
import getFullscreenTriangle from "../getFullscreenTriangle.js";

const fragmentShader = /* glsl */ `
varying vec2 vUv;

uniform sampler2D textureA;
uniform sampler2D textureB;
uniform float uProgress;

vec4 mod289(vec4 x)
{
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 permute(vec4 x)
{
  return mod289(((x*34.0)+1.0)*x);
}

vec4 taylorInvSqrt(vec4 r)
{
  return 1.79284291400159 - 0.85373472095314 * r;
}

vec2 fade(vec2 t) {
  return t*t*t*(t*(t*6.0-15.0)+10.0);
}

// Classic Perlin noise
float cnoise(vec2 P)
{
  vec4 Pi = floor(P.xyxy) + vec4(0.0, 0.0, 1.0, 1.0);
  vec4 Pf = fract(P.xyxy) - vec4(0.0, 0.0, 1.0, 1.0);
  Pi = mod289(Pi); // To avoid truncation effects in permutation
  vec4 ix = Pi.xzxz;
  vec4 iy = Pi.yyww;
  vec4 fx = Pf.xzxz;
  vec4 fy = Pf.yyww;

  vec4 i = permute(permute(ix) + iy);

  vec4 gx = fract(i * (1.0 / 41.0)) * 2.0 - 1.0 ;
  vec4 gy = abs(gx) - 0.5 ;
  vec4 tx = floor(gx + 0.5);
  gx = gx - tx;

  vec2 g00 = vec2(gx.x,gy.x);
  vec2 g10 = vec2(gx.y,gy.y);
  vec2 g01 = vec2(gx.z,gy.z);
  vec2 g11 = vec2(gx.w,gy.w);

  vec4 norm = taylorInvSqrt(vec4(dot(g00, g00), dot(g01, g01), dot(g10, g10), dot(g11, g11)));
  g00 *= norm.x;
  g01 *= norm.y;
  g10 *= norm.z;
  g11 *= norm.w;

  float n00 = dot(g00, vec2(fx.x, fy.x));
  float n10 = dot(g10, vec2(fx.y, fy.y));
  float n01 = dot(g01, vec2(fx.z, fy.z));
  float n11 = dot(g11, vec2(fx.w, fy.w));

  vec2 fade_xy = fade(Pf.xy);
  vec2 n_x = mix(vec2(n00, n01), vec2(n10, n11), fade_xy.x);
  float n_xy = mix(n_x.x, n_x.y, fade_xy.y);
  return 2.3 * n_xy;
}

void main() {
  vec2 uv = vUv;

    vec4 colorA = texture2D(textureA, uv);
    vec4 colorB = texture2D(textureB, uv);

    // clamp the value between 0 and 1 to make sure the colors don't get messed up
    float noise = clamp(cnoise(vUv * 2.5) + uProgress * 2.0, 0.0, 1.0);

    vec4 color = mix(colorA, colorB, noise);
    gl_FragColor = color;
}
`;

const vertexShader = /* glsl */ `
varying vec2 vUv;

void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
}
`;

function disableMSAA(target) {
  // disable MSAA on render targets (in this case the transmission render target)
  // this improves splatting performance
  if (target) {
    target.samples = 0;
  }
}

const cameraPositions = {
  // intro: [21.707168377678304, 13.893007782474893, 30.59057331563459, 0, 0, 0],
  intro: [
    20.06849559824884, 20.591704884512403, 28.711102001421885,
    -1.6386727794294618, 6.698697102037511, -1.8794713142127077,
  ],
  first: [
    0.03290476337967078, 5.076205399137682, 18.35918306555744,
    0.059181256326662754, 4.79112616756302, -1.858920041560228,
  ],
};

export const Experience = () => {
  const { viewport } = useThree();
  const scrollData = useScroll();

  // REFS
  const cameraControls = useRef();
  const tl = useRef();
  const cameraData = useRef({
    position: cameraPositions.intro,
  });
  const splats = useRef();
  const transmissionMesh = useRef();

  // LIGHT HELPERS
  const spotLight1 = useRef();
  const spotLight2 = useRef();
  const spotLight3 = useRef();
  // useHelper(spotLight1, THREE.SpotLightHelper)
  // useHelper(spotLight2, THREE.SpotLightHelper)
  // useHelper(spotLight3, THREE.SpotLightHelper)

  // SETUP FBOS
  const renderTargetA = useFBO();
  const renderTargetB = useFBO();
  const scene = new THREE.Scene();
  const screenCamera = useRef();
  const screenMesh = useRef();

  // CONTROLS
  useControls("Camera", {
    getLookAt: button(() => {
      const position = cameraControls.current.getPosition();
      const target = cameraControls.current.getTarget();
      console.log([...position, ...target]);
    }),
  });

  const transmissionControls = useControls("Transmission", {
    transmissionSampler: false,
    backside: false,
    samples: { value: 10, min: 1, max: 32, step: 1 },
    resolution: { value: 2048, min: 256, max: 2048, step: 256 },
    transmission: { value: 1, min: 0, max: 1 },
    roughness: { value: 0.0, min: 0, max: 1, step: 0.01 },
    thickness: { value: 0.24, min: 0, max: 10, step: 0.01 },
    ior: { value: 5, min: 1, max: 5, step: 0.01 },
    chromaticAberration: { value: 0.1, min: 0, max: 1 },
    anisotropy: { value: 0.07, min: 0, max: 1, step: 0.01 },
    distortion: { value: 0.04, min: 0, max: 1, step: 0.01 },
    distortionScale: { value: 0.36, min: 0.01, max: 1, step: 0.01 },
    temporalDistortion: { value: 0.6, min: 0, max: 1, step: 0.01 },
    clearcoat: { value: 0.35, min: 0, max: 1 },
    attenuationDistance: { value: 1.05, min: 0, max: 10, step: 0.01 },
  });

  const splatsControls = useControls("Splats", {
    position: {
      value: { x: -0.2, y: -1.3, z: -3.0 },
      step: 0.1,
    },
    rotation: {
      value: { x: 0.2, y: 0.3, z: 0 },
      step: 0.05,
    },
    scale: {
      value: 5,
    },
  });

  const shadowsControls = useControls("Shadows", {
    color: "black",
    opacity: { value: 0.7, min: 0, max: 1 },
    blur: { value: 2.5, min: 0, max: 10 },
  });

  const skyControls = useControls("Sky", {
    sunPosition: { value: [1, 2, 3] },
  });

  const envControls = useControls("Environment", {
    envMapIntensity: { value: 0.25, min: 0, max: 12 },
  });

  // const transitionControls = useControls("Transition", {
  //   transitionSpeed: {
  //     value: 2,
  //     min: 0.3,
  //     max: 10,
  //   },
  //   progressionTarget: {
  //     value: 1,
  //   },
  //   transition: {
  //     value: 0,
  //     options: {
  //       Horizontal: 0,
  //       Vertical: 1,
  //     },
  //     onChange: (value) => {
  //       renderMaterial.current.transition = value;
  //     },
  //   },
  // });

  const transitionControls = useControls({
    progress: {
      value: -1.0,
      min: -1,
      max: 1,
    },
  });

  // INIT
  useEffect(() => {
    // INIT CAMERA
    cameraControls.current.setLookAt(...cameraPositions.intro, false);

    // INIT SPLATS
    splats.current = new LumaSplatsThree({
      source:
        "https://lumalabs.ai/capture/87a96011-9ae7-4a2d-bbd0-be3e49c9362f",
      loadingAnimationEnabled: false,
      onBeforeRender: (renderer) => {
        const renderTarget = renderer.getRenderTarget();
        disableMSAA(renderTarget);

        // Disable rendering to canvas
        splats.current.preventDraw = renderTarget == null;

        // Disable rendering to transmission
        // splats.current.preventDraw = renderTarget != null
      },
    });

    splats.current.material.transparent = false;
    // scene.add(splats.current);

    // INIT ANIMATIONS
    tl.current = gsap.timeline({ paused: true });
    tl.current.to(cameraData.current.position, {
      endArray: cameraPositions.first,
      duration: 1,
    });
  }, []);

  // UPDATE SPLATS
  useEffect(() => {
    splats.current.position.set(
      splatsControls.position.x,
      splatsControls.position.y,
      splatsControls.position.z
    );
    splats.current.scale.setScalar(splatsControls.scale);
    splats.current.rotation.set(
      splatsControls.rotation.x,
      splatsControls.rotation.y,
      splatsControls.rotation.z
    );
  }, [splatsControls]);

  const cameraRotate = new THREE.Vector2();
  const cameraRotateTo = new THREE.Vector2();

  useFrame(({ gl, pointer, camera }, delta) => {
    // UPDATE SCROLL ANIMATIONS
    if (tl.current) {
      tl.current.progress(scrollData.offset);
      cameraControls.current.setLookAt(...cameraData.current.position, false);
    }

    // MOVE CAMERA ON MOUSE MOVE
    // cameraRotateTo.set(-pointer.x * 0.3, pointer.y * 0.2);
    // cameraRotate.lerp(cameraRotateTo, delta * 1);
    // cameraControls.current.rotate(cameraRotate.x, cameraRotate.y, false);

    // RENDER SWITCHEROO

    transmissionMesh.current.visible = true;

    gl.setRenderTarget(renderTargetA);
    gl.render(scene, camera);

    transmissionMesh.current.visible = true;

    gl.setRenderTarget(renderTargetB);
    gl.render(scene, camera);

    screenMesh.current.material.uniforms.textureA.value = renderTargetA.texture;
    screenMesh.current.material.uniforms.textureB.value = renderTargetB.texture;
    screenMesh.current.material.uniforms.uProgress.value =
      transitionControls.progress;

    gl.setRenderTarget(null);

    // Render onto first target
    // gl.setRenderTarget(renderTarget);

    // transmissionMesh.current.visible = true;

    // // Transition animation
    // renderMaterial.current.progression = MathUtils.lerp(
    //   renderMaterial.current.progression,
    //   transitionControls.progressionTarget,
    //   delta * transitionControls.transitionSpeed
    // );

    // gl.render(scene, renderCamera.current);

    // // Render onto second target
    // gl.setRenderTarget(renderTarget2);

    // transmissionMesh.current.visible = false;

    // gl.render(scene, renderCamera.current);

    // renderedScene.current.visible = false;

    // // Render back to scene
    // gl.setRenderTarget(null);
    // renderMaterial.current.map = renderTarget.texture;
  });

  return (
    <>
      <Perf position="top-left" />

      {/* CONTROLS */}
      <CameraControls
        ref={cameraControls}
        // disable all mouse buttons
        mouseButtons={{
          left: 0,
          middle: 0,
          right: 0,
          wheel: 0,
        }}
        // disable all touch gestures
        touches={{
          one: 0,
          two: 0,
          three: 0,
        }}
      />

      {/* SCREEN */}
      <OrthographicCamera ref={screenCamera} args={[-1, 1, 1, -1, 0, 1]} />
      <mesh
        ref={screenMesh}
        geometry={getFullscreenTriangle()}
        frustumCulled={false}
      >
        <shaderMaterial
          uniforms={{
            textureA: {
              value: null,
            },
            textureB: {
              value: null,
            },
            uTime: {
              value: 0.0,
            },
            uProgress: {
              progress: 0.0,
            },
          }}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
        />
      </mesh>

      {/* SCENE */}
      {createPortal(
        <>
          {/* LIGHTING */}
          <ambientLight intensity={Math.PI / 4} />
          <spotLight
            ref={spotLight1}
            position={[0, 40, 26]}
            angle={0.5}
            decay={0.7}
            distance={48}
            penumbra={1}
            intensity={1750}
          />
          <spotLight
            ref={spotLight2}
            color="white"
            position={[20, -40, 26]}
            angle={0.5}
            decay={1}
            distance={53}
            penumbra={1}
            intensity={2000}
          />
          <spotLight
            ref={spotLight3}
            color="red"
            position={[15, 0, 20]}
            angle={0.1}
            decay={1}
            distance={35}
            penumbra={-1}
            intensity={100}
          />

          {/* TRANSMISSION MESH */}
          {/* <Float> */}
          {/* TODO: Use MeshPortalMaterial? */}
          {/* FIXME: Can't do transition effects with transmission material? */}
          {/* TODO: Can use a different model? Like a toy box */}
          <RoundedBox
            ref={transmissionMesh}
            args={[1.15, 1, 1]}
            radius={0.05}
            scale={17}
            position-y={5}
          >
            <MeshTransmissionMaterial
              backsideResolution={128}
              backsideThickness={-0.25}
              backsideRoughness={0.3}
              clearcoatRoughness={0.1}
              {...transmissionControls}
              {...envControls}
            />
          </RoundedBox>

          {/* </Float> */}
          <ContactShadows
            frames={1}
            position={[0, -10, 0]}
            scale={50}
            far={40}
            {...shadowsControls}
          />

          {/* ENVIRONMENT */}
          {/* <Sky {...skyControls} /> */}
          <Environment
            files="./environmentMaps/the_sky_is_on_fire_2k.hdr"
            // preset="sunset"
            background
            // ground={{
            //   height: 7,
            //   radius: 28,
            //   scale: 100
            // }}
            blur={1}
          ></Environment>

          {/* TEXT */}
          {/* TODO: Explore some cool typography effects */}
          <Billboard position-y={20}>
            <Text
              fontSize={5}
              anchorY="bottom"
              textAlign="center"
              font="fonts/Gloock-Regular.ttf"
            >
              Everton Road
              <meshStandardMaterial color="white" />
            </Text>
            <Text
              fontSize={2}
              anchorY="top"
              textAlign="center"
              font="fonts/Agbalumo-Regular.ttf"
            >
              Singapore
              <meshStandardMaterial color="grey" />
            </Text>
          </Billboard>
        </>,
        scene
      )}
    </>
  );
};
