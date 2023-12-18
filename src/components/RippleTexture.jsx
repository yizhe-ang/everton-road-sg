// FIXME: Extract the texture from this

// https://www.youtube.com/watch?v=vWAci72MtME
import { OrthographicCamera, useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

const geometry = new THREE.PlaneGeometry(64, 64, 1, 1);

export const RippleTexture = ({ pointer, numWaves = 100 }) => {
  const [prevMouse, setPrevMouse] = useState({ x: 0, y: 0 });
  const [currentWave, setCurrentWave] = useState(0);

  // LOAD TEXTURES
  const brushTexture = useTexture("textures/brush.png");

  const meshesRef = useRef([]);

  useEffect(() => {
    // Set rotation for each mesh
    meshesRef.current.forEach((mesh) => {
      mesh.rotation.z = 2 * Math.PI * Math.random();
    });
  }, []);

  useFrame(({ size }, delta) => {
    const mouseX = (pointer.x * size.width) / 2;
    const mouseY = (pointer.y * size.height) / 2;

    // Check if mouse is moving
    if (
      Math.abs(mouseX - prevMouse.x) < 4 &&
      Math.abs(mouseY - prevMouse.y) < 4
    ) {
      // do nothing
    } else {
      // Set new wave
      setCurrentWave((currentWave + 1) % numWaves);

      const mesh = meshesRef.current[currentWave];
      mesh.visible = true;
      mesh.position.x = mouseX;
      mesh.position.y = mouseY;
      mesh.scale.x = mesh.scale.y = 0.2;
      mesh.material.opacity = 0.5;
    }

    // Position meshes
    meshesRef.current.forEach((mesh) => {
      if (mesh.visible) {
        // mesh.position.x = mouseX;
        // mesh.position.y = mouseY;
        // FIXME: Scale based on time delta
        mesh.rotation.z += 0.02;
        mesh.material.opacity *= 0.96;

        mesh.scale.x = 0.982 * mesh.scale.x + 0.108;
        mesh.scale.y = mesh.scale.x;

        if (mesh.material.opacity < 0.002) mesh.visible = false;
      }
    });

    setPrevMouse((value) => {
      value.x = mouseX;
      value.y = mouseY;

      return value;
    });
  });

  return (
    <>
      {/* <OrthographicCamera makeDefault position={[0, 0, 10]} /> */}

      <color args={["black"]} attach="background" />

      {[...Array(numWaves)].map((_, i) => {
        return (
          <mesh
            key={i}
            visible={false}
            ref={(el) => {
              meshesRef.current[i] = el;
            }}
          >
            <primitive object={geometry} />
            {/* FIXME: Can we reuse material too? */}
            <meshBasicMaterial
              transparent
              map={brushTexture}
              blending={THREE.AdditiveBlending}
              depthTest={false}
              depthWrite={false}
            />
          </mesh>
        );
      })}
    </>
  );
};
