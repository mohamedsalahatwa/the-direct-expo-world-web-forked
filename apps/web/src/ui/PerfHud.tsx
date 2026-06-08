import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";

/**
 * Lightweight performance HUD for verifying the instancing work. Enabled only
 * when the URL has a `?perf` query param, so it never ships cost to normal users.
 *
 * Reports the three numbers that matter for this optimisation:
 *  - draw calls  (gl.info.render.calls)  — the metric instancing collapses
 *  - triangles   (gl.info.render.triangles)
 *  - FPS + frame time (ms, CPU)          — the felt smoothness
 *
 * <PerfProbe> lives INSIDE the <Canvas> (it needs the renderer + render loop) and
 * writes straight into the DOM nodes rendered by <PerfHud> via getElementById —
 * no React state, so it adds zero re-renders.
 */

export const PERF_ENABLED =
  typeof window !== "undefined" && new URLSearchParams(window.location.search).has("perf");

const IDS = {
  calls: "perf-calls",
  tris: "perf-tris",
  fps: "perf-fps",
  ms: "perf-ms",
} as const;

/** DOM overlay — render once in App, outside the Canvas. */
export function PerfHud() {
  if (!PERF_ENABLED) return null;
  return (
    <div className="perf-hud" role="status" aria-live="off">
      <div>
        draw calls: <b id={IDS.calls}>–</b>
      </div>
      <div>
        triangles: <b id={IDS.tris}>–</b>
      </div>
      <div>
        fps: <b id={IDS.fps}>–</b>
      </div>
      <div>
        frame: <b id={IDS.ms}>–</b> ms
      </div>
    </div>
  );
}

/** Sampler — render once inside the Canvas. */
export function PerfProbe() {
  const gl = useThree((s) => s.gl);
  const frames = useRef(0);
  const last = useRef(0);

  useFrame((state) => {
    if (!PERF_ENABLED) return;
    frames.current++;
    const t = state.clock.elapsedTime;
    if (last.current === 0) last.current = t;
    const dt = t - last.current;
    if (dt < 0.5) return; // sample ~2×/sec

    const fps = frames.current / dt;
    const info = gl.info.render;
    const set = (id: string, v: string) => {
      const el = document.getElementById(id);
      if (el) el.textContent = v;
    };
    set(IDS.calls, String(info.calls));
    set(IDS.tris, info.triangles.toLocaleString());
    set(IDS.fps, fps.toFixed(0));
    set(IDS.ms, (1000 / fps).toFixed(1));

    frames.current = 0;
    last.current = t;
  });

  return null;
}
