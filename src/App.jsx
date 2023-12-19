// https://codesandbox.io/p/sandbox/thunder-clouds-in-a-glas-box-fg9g4r?file=%2Fsrc%2FApp.js%3A19%2C7-19%2C113
import { Canvas, extend } from "@react-three/fiber";
import { Experience } from "./components/Experience";
import { ScrollControls } from "@react-three/drei";
import { TransitionMaterial } from "./components/TransitionMaterial";

extend({
  TransitionMaterial,
});

function App() {
  return (
    <Canvas gl={{ antialias: false }}>
      {/* FIXME: Just use ScrollTrigger? */}
      <ScrollControls pages={5}>
        {/* FIXME: Need fog? */}
        {/* <fog attach="fog" args={["white", 27.5, 75]} /> */}
        <Experience />
      </ScrollControls>
    </Canvas>
  );
}

export default App;
