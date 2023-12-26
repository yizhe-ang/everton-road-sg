import {
  MeshTransmissionMaterial,
  RoundedBox,
  Environment,
  CameraControls,
  PerspectiveCamera,
  Text,
  useScroll,
  useFBO,
  OrthographicCamera,
  RenderTexture,
  GradientTexture,
  GradientType,
} from "@react-three/drei";
import { LumaSplatsThree } from "@lumaai/luma-web";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { button, useControls } from "leva";
import * as THREE from "three";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
gsap.registerPlugin(ScrollTrigger);
import { RippleTexture } from "./RippleTexture";

// FIXME: useMemo?
const cameraRotate = new THREE.Vector2();
const cameraRotateBy = new THREE.Vector2();

function disableMSAA(target) {
  // disable MSAA on render targets (in this case the transmission render target)
  // this improves splatting performance
  if (target) {
    target.samples = 0;
  }
}

const cameraPositions = {
  intro: [
    31.0814054001045, 27.640180250935998, 44.23091641713191,
    -1.6386727794294618, 6.698697102037511, -1.8794713142127077,
  ],
  first: [
    0.03290476337967078, 5.076205399137682, 18.35918306555744,
    0.059181256326662754, 4.79112616756302, -1.858920041560228,
  ],
  second: [
    13.158933526860993, 5.903435092595209, 17.050581293867282,
    13.183015351089564, 5.642161597038238, -1.4792102528298048,
  ],
  third: [
    15.098788347310514, 6.3082217978470965, -0.4444576751603997,
    15.098788575511467, 6.308221449416248, -1.4444613428454642,
  ],
  fourth: [
    -7.633544592239733, 5.550605045436712, -1.3419344591902385,
    -7.633544489691525, 5.550604942888504, -1.4444829746514958,
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
  const { pointer, scene, viewport } = useThree();
  const scrollData = useScroll();

  // REFS
  const cameraControls = useRef();
  const tl = useRef();
  const splats = useRef([]);
  const transmissionMesh = useRef();
  const text = useRef();

  const renderTarget1 = useFBO();
  const renderTarget2 = useFBO();

  const transmissionBuffer = useFBO();

  const mainGroup = useRef();

  const renderCamera = useRef();

  const rippleTexture = useRef();

  const screenMesh = useRef();

  // LIGHT HELPERS
  const spotLight1 = useRef();
  const spotLight2 = useRef();
  const spotLight3 = useRef();
  // useHelper(spotLight1, THREE.SpotLightHelper)
  // useHelper(spotLight2, THREE.SpotLightHelper)
  // useHelper(spotLight3, THREE.SpotLightHelper)

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
    samples: { value: 4, min: 1, max: 32, step: 1 },
    resolution: { value: 1024, min: 256, max: 2048, step: 256 },
    transmission: { value: 1, min: 0, max: 1 },
    roughness: { value: 0.0, min: 0, max: 1, step: 0.01 },
    thickness: { value: 0.24, min: 0, max: 10, step: 0.01 },
    ior: { value: 5, min: 1, max: 5, step: 0.01 },
    chromaticAberration: { value: 0.1, min: 0, max: 1 },
    anisotropy: { value: 0.1, min: 0, max: 1, step: 0.01 },
    distortion: { value: 0.04, min: 0, max: 1, step: 0.01 },
    distortionScale: { value: 0.36, min: 0.01, max: 1, step: 0.01 },
    temporalDistortion: { value: 0.6, min: 0, max: 1, step: 0.01 },
    clearcoat: { value: 0.35, min: 0, max: 1 },
    attenuationDistance: { value: 1.05, min: 0, max: 10, step: 0.01 },
  });

  const splat1Controls = useControls("Splat 1", {
    position: {
      value: { x: -4.1, y: -0.8, z: -10.0 },
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

  const splat2Controls = useControls("Splat 2", {
    position: {
      value: { x: 14.8, y: 6.7, z: 1.7 },
      step: 0.1,
    },
    rotation: {
      value: { x: 0.05, y: -1.7, z: 0.05 },
      step: 0.05,
    },
    scale: {
      value: 5,
    },
  });

  const splat3Controls = useControls("Splat 3", {
    position: {
      value: { x: 3.6, y: 4.7, z: -12.9 },
      step: 0.1,
    },
    rotation: {
      value: { x: 0.05, y: -6.35, z: 0.05 },
      step: 0.05,
    },
    scale: {
      value: 5,
    },
  });

  // const shadowsControls = useControls("Shadows", {
  //   color: "black",
  //   opacity: { value: 0.7, min: 0, max: 1 },
  //   blur: { value: 2.5, min: 0, max: 10 },
  // });

  const skyControls = useControls("Sky", {
    sunPosition: { value: [1, 2, 3] },
  });

  const envControls = useControls("Environment", {
    envMapIntensity: { value: 0.25, min: 0, max: 12 },
  });

  const { blur } = useControls("Env Blur", {
    blur: { value: 0.4, min: 0, max: 1 },
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

  const shadowsControls = useControls("Shadows", {
    // color: "#BBBBFF",
    color: "#31314e",
  });

  const cameraData = useRef({
    position: cameraPositions.intro,
  });

  const animateProps = useRef({
    thickness: 0.24,
    sceneI: 0,
  });

  useEffect(() => {
    // INIT BACKGROUND
    // scene.background = bg

    // INIT CAMERA
    cameraControls.current.camera = renderCamera.current;
    cameraControls.current.setLookAt(...cameraPositions.intro, false);

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

      scene.add(splat);

      return splat;
    });

    // INIT ANIMATIONS
    tl.current = gsap
      .timeline({
        paused: true,
      })
      // Zoom into splats
      .to(cameraData.current.position, {
        endArray: cameraPositions.first,
        duration: 1,
        onUpdate: () => {
          cameraControls.current.setLookAt(
            ...cameraData.current.position,
            false
          );
        },
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
          x: 50,
          y: 30,
          // z: 40,
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
      )
      // Adjust splat position
      .to(
        splats.current[0].position,
        {
          x: -5,
          y: 5.2,
          z: -15.6,
        },
        "<"
      )
      // Turn up displacement
      .to(
        screenMesh.current.material.uniforms.uDisplacementStrength,
        {
          value: 1,
          duration: 1,
        },
        "<"
      )
      // Turn off spotlight
      .to(
        spotLight3.current,
        {
          intensity: 0,
          duration: 1,
        },
        "<"
      )
      // Pan over first splat
      .to(cameraData.current.position, {
        endArray: cameraPositions.second,
        duration: 1,
        onUpdate: updateCamera,
      })
      // Transition to second splat
      .to(screenMesh.current.material.uniforms.uProgress, {
        value: 1,
        duration: 1,
      })
      // Pan over second splat
      .to(cameraData.current.position, {
        endArray: cameraPositions.third,
        duration: 1,
        onUpdate: updateCamera,
      })
      // Update scene index
      .to(
        animateProps.current,
        {
          sceneI: 1,
          duration: 1,
        },
        "<"
      )
      .to(
        screenMesh.current.material.uniforms.uProgress,
        {
          value: 1,
          duration: 1,
        },
        "<"
      )
      // Transition to third splat
      .fromTo(
        screenMesh.current.material.uniforms.uProgress,
        {
          value: 0,
        },
        {
          value: 1,
          duration: 1,
        }
      )
      // Pan over third splat
      .to(cameraData.current.position, {
        endArray: cameraPositions.fourth,
        duration: 1,
        onUpdate: updateCamera,
      });
  }, []);

  function updateCamera() {
    cameraControls.current.lerpLookAt(
      ...cameraControls.current.getPosition(),
      ...cameraControls.current.getTarget(),
      ...cameraData.current.position,
      0.1,
      false
    );
  }

  // UPDATE SPLATS
  useEffect(() => {
    splats.current[0].position.set(
      splat1Controls.position.x,
      splat1Controls.position.y,
      splat1Controls.position.z
    );
    splats.current[0].scale.setScalar(splat1Controls.scale);
    splats.current[0].rotation.set(
      splat1Controls.rotation.x,
      splat1Controls.rotation.y,
      splat1Controls.rotation.z
    );
  }, [splat1Controls]);

  useEffect(() => {
    splats.current[1].position.set(
      splat2Controls.position.x,
      splat2Controls.position.y,
      splat2Controls.position.z
    );
    splats.current[1].scale.setScalar(splat2Controls.scale);
    splats.current[1].rotation.set(
      splat2Controls.rotation.x,
      splat2Controls.rotation.y,
      splat2Controls.rotation.z
    );
  }, [splat2Controls]);

  useEffect(() => {
    splats.current[2].position.set(
      splat3Controls.position.x,
      splat3Controls.position.y,
      splat3Controls.position.z
    );
    splats.current[2].scale.setScalar(splat3Controls.scale);
    splats.current[2].rotation.set(
      splat3Controls.rotation.x,
      splat3Controls.rotation.y,
      splat3Controls.rotation.z
    );
  }, [splat3Controls]);

  useFrame(({ scene, gl, clock }, delta) => {
    // Update time
    screenMesh.current.material.uniforms.uTime.value = clock.getElapsedTime();

    // Make text always look at camera
    text.current.lookAt(renderCamera.current.position);

    // FIXME: Why does it keep getting reset?
    transmissionMesh.current.material.uniforms.thickness.value =
      animateProps.current.thickness;

    // ROTATE CAMERA ON MOUSE MOVE
    // cameraGroup.current.rotation.y = THREE.MathUtils.lerp(
    //   cameraGroup.current.rotation.y,
    //   (pointer.x * Math.PI) / 10,
    //   0.05
    // );
    // cameraGroup.current.rotation.x = THREE.MathUtils.lerp(
    //   cameraGroup.current.rotation.x,
    //   (pointer.y * Math.PI) / 10,
    //   0.05
    // );

    cameraRotateBy.set(pointer.x * 0.007, pointer.y * 0.007);
    cameraRotate.lerp(cameraRotateBy, delta * 2);
    cameraControls.current.rotate(
      cameraRotateBy.x - cameraRotate.x,
      cameraRotateBy.y - cameraRotate.y,
      false
    );

    // UPDATE SCROLL ANIMATIONS
    if (tl.current) {
      tl.current.progress(scrollData.offset);
    }

    screenMesh.current.visible = false;

    // Render first scene
    setupRenderTarget1(animateProps.current.sceneI, gl);

    gl.setRenderTarget(renderTarget1);
    gl.render(scene, renderCamera.current);

    // Render second scene
    setupRenderTarget2(animateProps.current.sceneI, gl);

    gl.setRenderTarget(renderTarget2);
    gl.render(scene, renderCamera.current);

    // Render to screen
    splats.current[0].visible = false;
    splats.current[1].visible = false;
    splats.current[2].visible = false;
    mainGroup.current.visible = false;

    screenMesh.current.visible = true;

    gl.setRenderTarget(null);
    screenMesh.current.material.map = renderTarget1.texture;
  });

  function setupRenderTarget1(i, gl) {
    if (i < 1) {
      // Capture transmission texture
      gl.setRenderTarget(transmissionBuffer);

      splats.current[0].visible = true;
      splats.current[1].visible = false;
      splats.current[2].visible = false;
      mainGroup.current.visible = false;

      gl.render(scene, renderCamera.current);

      splats.current[0].visible = false;
      splats.current[1].visible = false;
      splats.current[2].visible = false;
      mainGroup.current.visible = true;
    } else {
      splats.current[0].visible = false;
      splats.current[1].visible = true;
      splats.current[2].visible = false;
      mainGroup.current.visible = false;
    }
  }

  function setupRenderTarget2(i, gl) {
    if (i < 1) {
      splats.current[0].visible = false;
      splats.current[1].visible = true;
      splats.current[2].visible = false;
      mainGroup.current.visible = false;
    } else {
      splats.current[0].visible = false;
      splats.current[1].visible = false;
      splats.current[2].visible = true;
      mainGroup.current.visible = false;
    }
  }

  return (
    <>
      {/* SCREEN */}
      <mesh ref={screenMesh}>
        <planeGeometry args={[viewport.width, viewport.height]} />
        <transitionMaterial
          // uTexture1={rippleTexture.current}
          uTexture1={renderTarget1.texture}
          uTexture2={renderTarget2.texture}
          {...transitionControls}
          toneMapped={false}
        >
          {/* RIPPLE TEXTURE */}
          <RenderTexture ref={rippleTexture} attach={"uDisplacement"}>
            <OrthographicCamera makeDefault position={[0, 0, 10]} />
            <RippleTexture pointer={pointer} />
          </RenderTexture>
        </transitionMaterial>
      </mesh>

      <PerspectiveCamera near={0.5} ref={renderCamera} />
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

      {/* MAIN SCENE */}
      <group ref={mainGroup}>
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
        <RoundedBox
          ref={transmissionMesh}
          args={[1.15, 1, 1]}
          radius={0.05}
          scale={17}
          position-y={5}
        >
          {/* TODO: Low samples and low resolution to make it faster */}
          <MeshTransmissionMaterial
            buffer={transmissionBuffer.texture}
            backsideResolution={128}
            backsideThickness={-0.25}
            backsideRoughness={0.3}
            clearcoatRoughness={0.1}
            iridescence={1}
            iridescenceIOR={1}
            iridescenceThicknessRange={[0, 1400]}
            // thickness={0.24}
            {...transmissionControls}
            {...envControls}
          >
            {/* <RenderTexture attach={"buffer"}>
              {splats.current[0] && <primitive object={splats.current[0]} />}
            </RenderTexture> */}
          </MeshTransmissionMaterial>
        </RoundedBox>

        {/* FAKE SHADOW */}
        {/* FIXME: Really looks cmi */}
        <mesh scale={150} rotation-x={-Math.PI / 2} position-y={-10}>
          <planeGeometry />
          <meshBasicMaterial color={shadowsControls.color} transparent>
            <GradientTexture
              attach="alphaMap"
              stops={[0, 0.8, 1]} // As many stops as you want
              colors={["white", "black", "black"]} // Colors need to match the number of stops
              size={1024} // Size (height) is optional, default = 1024
              width={1024} // Width of the canvas producing the texture, default = 16
              type={GradientType.Radial} // The type of the gradient, default = GradientType.Linear
              innerCircleRadius={0} // Optional, the radius of the inner circle of the gradient, default = 0
              outerCircleRadius={"auto"} // Optional, the radius of the outer circle of the gradient, default = auto
            />
          </meshBasicMaterial>
        </mesh>

        {/* FIXME: ContactShadows is gone */}
        {/* FIXME: How to render / init this again? */}
        {/* https://threejs.org/examples/#webgl_shadow_contact */}
        {/* May require a custom solution */}
        {/* <ContactShadows
          ref={contactShadows}
          frames={1}
          position={[0, -10, 0]}
          scale={50}
          far={40}
          {...shadowsControls}
        /> */}

        {/* ENVIRONMENT */}
        <Environment preset="dawn" background blur={blur}></Environment>

        {/* TEXT */}
        <group position-y={20} ref={text}>
          <Text
            fontSize={5}
            color={"#5eead4"}
            anchorY="bottom"
            textAlign="center"
            font="fonts/Gloock-Regular.ttf"
          >
            Everton Road
            <meshStandardMaterial />
          </Text>
          <Text
            fontSize={2}
            color="#c2410c"
            anchorY="top"
            textAlign="center"
            font="fonts/Agbalumo-Regular.ttf"
            position={[8, 0.5, 0]}
          >
            Singapore
            <meshStandardMaterial />
          </Text>
        </group>
      </group>
    </>
  );
};
