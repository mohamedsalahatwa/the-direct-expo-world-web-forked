import { createRoot } from "react-dom/client";
import { App } from "./App";
import { preloadEssentialTextures } from "./materials/pbr";
import "./styles.css";

// Start fetching the essential startup textures immediately, in parallel with
// React mounting and WebGL context creation, to shorten time-to-first-paint.
preloadEssentialTextures();

createRoot(document.getElementById("root")!).render(<App />);
