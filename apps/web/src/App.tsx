import { Suspense, useCallback, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { XR, createXRStore } from "@react-three/xr";
import { Scene } from "./scene/Scene";
import type { ViewMode } from "./scene/Scene";
import { BoothPanel } from "./ui/BoothPanel";
import { LoadingScreen } from "./ui/LoadingScreen";
import { PerfHud, PerfProbe } from "./ui/PerfHud";

// emulate: false → don't inject the dev XR button or pull the emulator bundle.
// On an XR-capable device/browser (Railway is HTTPS) the "Enter VR" button
// below starts a real WebXR session.
const xrStore = createXRStore({ emulate: false });

/**
 * Sits as a sibling of <Scene> inside the essential-asset <Suspense> boundary.
 * It suspends/commits in lockstep with the boundary, so its mount effect fires
 * exactly when the essential textures have resolved and the hall is revealed —
 * our signal to dismiss the loading screen and "enter" the experience. It never
 * waits on the lazily-streamed GLBs (those live in their own boundaries).
 */
function SceneReadySignal({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    onReady();
  }, [onReady]);
  return null;
}

export function App() {
  // null = no panel open. Clicking a booth toggles it; clicking another swaps.
  const [openDeveloper, setOpenDeveloper] = useState<string | null>(null);
  const [mode, setMode] = useState<ViewMode>("orbit");
  // false until the essential startup assets have loaded and the hall is shown.
  const [ready, setReady] = useState(false);
  const markReady = useCallback(() => setReady(true), []);

  // Stable identity so memoised <CurvedBooth>es don't all re-render on select.
  const handleSelectDeveloper = useCallback(
    (id: string) => setOpenDeveloper((current) => (current === id ? null : id)),
    [],
  );

  return (
    <div className="app">
      {/* Persistent, indexable description of the WebGL canvas (the canvas itself
          is opaque to crawlers/AT). Mirrors the static copy in index.html. */}
      <h1 className="sr-only">The Direct Expo — Immersive Virtual Exhibition</h1>
      <p className="sr-only">
        An interactive 3D exhibition hall. Switch between an overview and walking
        the floor, open developer booths, and start a Google Meet.
      </p>
      <div
        className="canvas-wrap"
        role="application"
        aria-label="Interactive 3D exhibition hall. Use the Overview and Walk the floor controls; click a booth to open its details."
      >
        <Canvas
          shadows
          // Cap the pixel ratio: retina screens otherwise render at 2–3× the
          // pixels (quadratic fill-rate cost) for little visible gain at this
          // scene scale. 1.5 keeps edges crisp while roughly halving GPU load.
          dpr={[1, 1.5]}
          camera={{ position: [0, 21, 26], fov: 44 }}
          gl={{ preserveDrawingBuffer: true, powerPreference: "high-performance" }}
        >
          <XR store={xrStore}>
            <PerfProbe />
            {/* This boundary awaits only the essential assets (PBR textures +
                logo). When it resolves, SceneReadySignal fires and the loading
                screen fades; heavy GLBs keep streaming into their own inner
                boundaries without ever blocking entry. */}
            <Suspense fallback={null}>
              <SceneReadySignal onReady={markReady} />
              <Scene
                activeDeveloper={openDeveloper}
                onSelectDeveloper={handleSelectDeveloper}
                mode={mode}
              />
            </Suspense>
          </XR>
        </Canvas>

        <div className="view-controls">
          <button
            className={`mode-btn ${mode === "orbit" ? "is-active" : ""}`}
            onClick={() => setMode("orbit")}
          >
            Overview
          </button>
          <button
            className={`mode-btn ${mode === "walk" ? "is-active" : ""}`}
            onClick={() => setMode("walk")}
          >
            Walk the floor
          </button>
        </div>

        {mode === "walk" && (
          <div className="walk-hint">
            Click to look around · <strong>WASD</strong> to move · <strong>Shift</strong> to run ·
            <strong> Esc</strong> to release the cursor
          </div>
        )}

        <button className="xr-btn" onClick={() => xrStore.enterVR()}>
          Enter VR
        </button>

        {/* Floating, non-blocking developer details — slides over the scene
            on the right without dimming or covering it. */}
        <BoothPanel developerId={openDeveloper} onClose={() => setOpenDeveloper(null)} />
      </div>

      {/* Full-screen entry overlay; fades out the moment essential assets load. */}
      <LoadingScreen ready={ready} />

      {/* Perf HUD (draw calls / triangles / FPS / frame ms) — only with ?perf */}
      <PerfHud />
    </div>
  );
}
