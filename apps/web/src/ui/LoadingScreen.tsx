import { useEffect, useState } from "react";
import { useProgress } from "@react-three/drei";

/**
 * Full-screen branded loading overlay, shown until the *essential* startup
 * assets are ready — the floor/wall/booth PBR textures and the signage logo
 * (everything the `<Suspense>` boundary in App.tsx awaits before it reveals the
 * hall).
 *
 * The live percentage comes from drei's `useProgress`, which reads the global
 * THREE.DefaultLoadingManager, so it tracks real network progress. Heavy GLB
 * furniture (~120 MB combined) is deliberately NOT awaited here: those stream in
 * lazily afterwards inside their own Suspense boundaries (see GlbModel.tsx), so
 * visitors enter the hall the moment it's presentable rather than waiting for
 * every model to download.
 *
 * The overlay stays mounted through a short fade-out (so the transition into the
 * scene is smooth) and is then removed from the DOM entirely, so it never sits
 * on top of the live canvas intercepting pointer events.
 */
export function LoadingScreen({ ready }: { ready: boolean }) {
  const { progress } = useProgress();

  // While loading, mirror real progress but hold short of 100 so the bar only
  // "completes" once essential assets are genuinely ready. Once ready, snap to
  // 100 even if background GLBs are still downloading (they would drag progress
  // back down otherwise).
  const pct = ready ? 100 : Math.min(99, Math.round(progress));

  // Keep the overlay in the tree through the CSS fade, then unmount it.
  const [removed, setRemoved] = useState(false);
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => setRemoved(true), 750); // must outlast the fade
    return () => clearTimeout(t);
  }, [ready]);

  if (removed) return null;

  return (
    <div
      className={`loader ${ready ? "is-done" : ""}`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      aria-busy={!ready}
      aria-label="Loading the exhibition"
    >
      <div className="loader-inner">
        <div className="loader-brand">THE DIRECT EXPO</div>
        <div className="loader-sub">Immersive Developer Pavilion</div>

        <div className="loader-bar" aria-hidden="true">
          <div className="loader-fill" style={{ width: `${pct}%` }} />
        </div>

        <div className="loader-meta">
          <span className="loader-pct">{pct}%</span>
          <span className="loader-status">
            {ready ? "Entering the hall…" : "Preparing the exhibition…"}
          </span>
        </div>
      </div>
    </div>
  );
}
