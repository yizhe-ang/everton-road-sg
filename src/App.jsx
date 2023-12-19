// https://codesandbox.io/p/sandbox/thunder-clouds-in-a-glas-box-fg9g4r?file=%2Fsrc%2FApp.js%3A19%2C7-19%2C113
import { Canvas, extend } from "@react-three/fiber";
import { Experience } from "./components/Experience";
import { ScrollControls } from "@react-three/drei";
import { TransitionMaterial } from "./components/TransitionMaterial";
import { Perf } from "r3f-perf";
import { Leva } from "leva";

extend({
  TransitionMaterial,
});

function App() {
  return (
    <>
      <Leva collapsed />
      <Canvas
        gl={{ antialias: false }}
        // orthographic camera={{ position: [0, 0, 5], fov: 30 }}
      >
        <Perf position="top-left" />
        {/* FIXME: Just use ScrollTrigger? */}
        <ScrollControls pages={5}>
          {/* FIXME: Need fog? */}
          {/* <fog attach="fog" args={["white", 27.5, 75]} /> */}
          <Experience />
        </ScrollControls>
      </Canvas>
    </>
  );
}

export default App;
