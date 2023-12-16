// https://codesandbox.io/p/sandbox/thunder-clouds-in-a-glas-box-fg9g4r?file=%2Fsrc%2FApp.js%3A19%2C7-19%2C113
import { Canvas, extend } from "@react-three/fiber";
import { Experience } from "./components/Experience";
import { getProject } from "@theatre/core";
import { SheetProvider } from "@theatre/r3f";
import { ScrollControls } from "@react-three/drei";
import { TransitionMaterial } from "./components/TransitionMaterial";
// import studio from "@theatre/studio";
// import extension from "@theatre/r3f/dist/extension";

// export const isProd = import.meta.env.MODE === "production";

// if (!isProd) {
//   studio.initialize();
//   studio.extend(extension);
// }

// const project = getProject("EvertonRoad");
// const mainSheet = project.sheet("Main");

extend({
  TransitionMaterial,
});

function App() {
  return (
    <Canvas gl={{ antialias: false }}
      // camera={{ position: [0, 0, 5], fov: 30 }}
    >
      <ScrollControls pages={5}>
        {/* FIXME: Need fog? */}
        {/* <fog attach="fog" args={["white", 27.5, 75]} /> */}
        {/* <SheetProvider sheet={mainSheet}> */}
        <Experience />
        {/* </SheetProvider> */}
      </ScrollControls>
    </Canvas>
  );
}

export default App;
