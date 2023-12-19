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
  useTexture,
  RenderTexture,
} from "@react-three/drei";
import { LumaSplatsThree } from "@lumaai/luma-web";
import { createPortal, extend, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { button, useControls } from "leva";
import { Perf } from "r3f-perf";
import * as THREE from "three";
import { gsap } from "gsap";
import { MathUtils } from "three";
import {
  DepthOfField,
  EffectComposer,
  Noise,
  ToneMapping,
  Vignette,
} from "@react-three/postprocessing";
import Displacement from "./Displacement";
import { RippleTexture } from "./RippleTexture";

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

const splatProps = [
  {
    source: "https://lumalabs.ai/capture/87a96011-9ae7-4a2d-bbd0-be3e49c9362f",
  },
  {
    source: "https://lumalabs.ai/capture/419f25df-ec39-45c3-8e87-7eee6dbc24da",
  },
  {
    source: "https://lumalabs.ai/capture/b8eec778-d960-48d3-8d5f-be5d57173827",
  },
];

export const Experience = () => {
  const { pointer, scene, size } = useThree();
  const scrollData = useScroll();

  // REFS
  const cameraControls = useRef();
  const tl = useRef();
  const cameraData = useRef({
    position: cameraPositions.intro,
  });
  const splats = useRef([]);
  const transmissionMesh = useRef();
  const text = useRef()

  const mainScene = useRef();
  const mainCamera = useRef()

  const transmissionTexture = useFBO();

  const rippleTexture = useRef();

  const screenMesh = useRef()

  // LIGHT HELPERS
  const spotLight1 = useRef();
  const spotLight2 = useRef();
  const spotLight3 = useRef();
  // useHelper(spotLight1, THREE.SpotLightHelper)
  // useHelper(spotLight2, THREE.SpotLightHelper)
  // useHelper(spotLight3, THREE.SpotLightHelper)

  // SETUP FBOS
  // const renderedScene = new THREE.Scene();
  // const renderedScene = useRef();

  const renderTarget1 = useFBO();
  const renderTarget2 = useFBO();
  // const renderMaterial = useRef();
  // const renderCamera = useRef();
  // const screenCamera = useRef()

  // UNIFORMS
  const uniforms = useMemo(() => {
    return {
      uTime: {
        value: 0,
      },
    };
  }, []);

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
    resolution: { value: 1024, min: 256, max: 2048, step: 256 },
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
  //     value: 0,
  //     min: 0,
  //     max: 1,
  //   },
  //   // transition: {
  //   //   value: 0,
  //   //   options: {
  //   //     Horizontal: 0,
  //   //     Vertical: 1,
  //   //   },
  //   //   onChange: (value) => {
  //   //     renderMaterial.current.transition = value;
  //   //   },
  //   // },
  // });

  const transitionControls = useControls("Transition", {
    uProgress: {
      value: 0,
      min: 0,
      max: 1,
    },
  });

  const animateProps = useRef({
    thickness: 0.24,
  });

  // INIT
  useEffect(() => {
    // INIT CAMERA
    // cameraControls.current.camera = mainCamera.current;
    // cameraControls.current.setLookAt(...cameraPositions.intro, false);

    // FIXME: useMemo makes it slow for some reason
    // INIT SPLATS
    splats.current = splatProps.map((s) => {
      const splat = new LumaSplatsThree({
        source: s.source,
        loadingAnimationEnabled: false,
        onBeforeRender: (renderer) => {
          const renderTarget = renderer.getRenderTarget();
          disableMSAA(renderTarget);

          // Disable rendering to canvas
          // splats.current.preventDraw = renderTarget == null;

          // Disable rendering to transmission
          // splats.current.preventDraw = renderTarget != null
        },
      });

      splat.material.transparent = false;
      splat.visible = false;

      // TODO: Each splat has its own scene?

      scene.add(splat);

      return splat;
    });

    // INIT ANIMATIONS
    tl.current = gsap
      .timeline({ paused: true })
      // Zoom into splats
      .to(cameraData.current.position, {
        endArray: cameraPositions.first,
        duration: 1,
        // onUpdate: () => {
        //   cameraControls.current.setLookAt(
        //     ...cameraData.current.position,
        //     false
        //   );
        // },
      })
      // Fade out transmission material
      .to(transmissionMesh.current.material.uniforms.distortion, {
        value: 0,
        duration: 1,
      })
      // FIXME: What's up with this
      .to(
        animateProps.current,
        {
          thickness: 0,
          duration: 1,
        },
        "<"
      )
      // .to(
      //   transmissionMesh.current.material.uniforms.thickness,
      //   {
      //     value: 0.01,
      //     duration: 1,
      //   },
      //   "<"
      // )
      .to(
        transmissionMesh.current.material,
        {
          envMapIntensity: 0,
          duration: 1,
        },
        "<"
      )
      .to(
        transmissionMesh.current.scale,
        {
          x: 30,
          // y: 30,
          z: 30,
          duration: 1,
        },
        "<"
      )
      // Bring text out of view
      .to(
        text.current.position,
        {
          y: 30,
        },
        "<"
      );
  }, []);

  // UPDATE SPLATS
  useEffect(() => {
    splats.current[0].position.set(
      splatsControls.position.x,
      splatsControls.position.y,
      splatsControls.position.z
    );
    splats.current[0].scale.setScalar(splatsControls.scale);
    splats.current[0].rotation.set(
      splatsControls.rotation.x,
      splatsControls.rotation.y,
      splatsControls.rotation.z
    );
  }, [splatsControls]);

  const cameraRotate = new THREE.Vector2();
  const cameraRotateTo = new THREE.Vector2();

  useFrame(({ gl, pointer, camera, scene }, delta) => {
    // UPDATE SCROLL ANIMATIONS
    if (tl.current) {
      tl.current.progress(scrollData.offset);

      // Update camera
      // cameraControls.current.setLookAt(...cameraData.current.position, false);
    }

    // MOVE CAMERA ON MOUSE MOVE
    cameraRotateTo.set(-pointer.x * 0.3, pointer.y * 0.2);
    cameraRotate.lerp(cameraRotateTo, delta * 1);
    // cameraControls.current.rotate(cameraRotate.x, cameraRotate.y, false);

    // FIXME: Why does it keep getting reset?
    transmissionMesh.current.material.uniforms.thickness.value =
      animateProps.current.thickness;

    // Only render splat in transmission mesh
    screenMesh.current.visible = false
    splats.current[0].visible = true;
    splats.current[1].visible = false;
    mainScene.current.visible = false;
    gl.setRenderTarget(transmissionTexture);
    gl.render(scene, mainCamera.current);

    // Capture 1st scene
    splats.current[0].visible = false;
    mainScene.current.visible = true;
    gl.setRenderTarget(renderTarget1)
    gl.render(scene, mainCamera.current);

    // Capture 2nd scene
    splats.current[0].visible = false;
    mainScene.current.visible = false;
    splats.current[1].visible = true;
    gl.setRenderTarget(renderTarget2)
    gl.render(scene, mainCamera.current);

    // Render to screen
    screenMesh.current.visible = true
    splats.current[1].visible = false;
    gl.setRenderTarget(null);
  });

  return (
    <>
      {/* RIPPLE TEXTURE */}
      <RenderTexture ref={rippleTexture}>
        <OrthographicCamera makeDefault position={[0, 0, 10]} />
        <RippleTexture pointer={pointer} />
      </RenderTexture>

      {/* POSTPROCESSING */}
      <EffectComposer disableNormalPass multisampling={0}>
        {/* <Vignette /> */}
        {/* <Noise
          premultiply
          blendFunction={BlendFunction}
        /> */}
        {/* <DepthOfField /> */}
        {/* <Ripple uDisplacement={rippleRenderTarget.texture} /> */}
        <Displacement uDisplacement={rippleTexture.current} />
        <ToneMapping />
      </EffectComposer>

      {/* CONTROLS */}
      <PerspectiveCamera ref={mainCamera} />
      {/* FIXME: Which camera is this controlling? */}
      <CameraControls
        ref={cameraControls}
        mouseButtons={{
          left: 0,
          middle: 0,
          right: 0,
          wheel: 0,
        }}
        touches={{
          one: 0,
          two: 0,
          three: 0,
        }}
      />

      {/* SCREEN */}
      <OrthographicCamera
        makeDefault
      />
      {/* <PerspectiveCamera
        makeDefault
        position={[0, 0, 10]}
      /> */}
      <mesh ref={screenMesh}>
        <planeGeometry args={[size.width, size.height]} />
        {/* <transitionMaterial
          uTexture1={renderTarget1.texture}
          uTexture2={renderTarget2.texture}
          {...transitionControls}
          toneMapped={false}
        /> */}
        <meshBasicMaterial color={"red"} />
      </mesh>
      {/* <mesh position-z={-5}>
        <planeGeometry args={[viewport.width, viewport.height]} />
        <transitionMaterial
          ref={renderMaterial}
          tex={renderTarget1.texture}
          tex2={renderTarget2.texture}
          toneMapped={false}
        />
      </mesh> */}


      {/* SCENE */}
      <group ref={mainScene}>
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
        {/* <spotLight
        ref={spotLight3}
        color="red"
        position={[15, 0, 20]}
        angle={0.1}
        decay={1}
        distance={35}
        penumbra={-1}
        intensity={100}
      /> */}

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
          {/* TODO: Low samples and low resolution to make it faster */}
          <MeshTransmissionMaterial
            buffer={transmissionTexture.texture}
            // buffer={rippleRenderTarget.texture}
            backsideResolution={128}
            backsideThickness={-0.25}
            backsideRoughness={0.3}
            clearcoatRoughness={0.1}
            // thickness={0.24}
            {...transmissionControls}
            {...envControls}
            // transparent
            // opacity={0.1}
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
        <Billboard position-y={20} ref={text}>
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
      </group>
    </>
  );
};
