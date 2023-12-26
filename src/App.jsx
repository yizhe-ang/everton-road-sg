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
      <Leva collapsed hidden={true} />
      <Canvas gl={{ antialias: false }}>
        {/* <Perf position="top-left" /> */}
        <ScrollControls pages={15}>
          <Experience />
        </ScrollControls>
      </Canvas>
    </>
  );
}

export default App;
