import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import {
  Color,
  FrontSide,
  MeshStandardMaterial,
  RepeatWrapping,
  SRGBColorSpace,
  type Side,
  type Texture,
} from "three";
import logoUrl from "../assets/images/TDE_header.png";
import { MODELS_BASE_URL } from "../assetBase";

/**
 * PBR material library for the exhibition.
 *
 * Five 1K diffuse texture sets — marble, wood, carpet, metal, OSB — are loaded
 * once and turned into reusable MeshStandardMaterials. Only the diffuse (colour)
 * map is used; normal and ARM maps are intentionally omitted to cut payload and
 * GPU uploads, so surfaces are shaded as plain matte materials (metalness 0,
 * roughness 0.9 by default) tinted by the per-call colour.
 *
 * Performance: a material is built once per (kind, tiling, …options) key and
 * memoised, so the 30 identical booths all share the *same* wood/carpet/metal
 * instances. Per-tiling clones share their GPU upload via the texture Source,
 * so extra tilings cost almost no VRAM.
 */

export type PbrKind = "marble" | "wood" | "carpet" | "metal" | "osb";

export interface PbrOptions {
  /** Texture repeat (UV tiling). Pick so one tile ≈ 1–3 m of real surface. */
  repeat?: [number, number];
  /** Optional tint multiplied over the base colour. */
  color?: string;
  /** Roughness multiplier over the map (default 1 = use map as-is). */
  roughness?: number;
  /** Metalness multiplier over the map (default 1 = use map as-is). */
  metalness?: number;
  /** Render side (e.g. double-sided for open curved walls). */
  side?: Side;
  transparent?: boolean;
  opacity?: number;
  /** Strength of IBL reflections from the scene environment. */
  envMapIntensity?: number;
  /** @deprecated No-op since materials are diffuse-only (no normal map). Kept
   *  for call-site compatibility. */
  normalScale?: number;
}

// Texture sets resolve from the shared asset base (remote CDN when configured,
// else /public/models). NB: unlike the lazy GLBs, these are *essential* startup
// textures that gate the loading screen — pointing them at a remote CDN means
// first paint now waits on those fetches, so a fast/edge-cached CDN matters here.
const BASE = MODELS_BASE_URL;
// Diffuse-only 1K sets: we load just the colour map for each kind (no normal /
// ARM maps). Smaller payload + fewer GPU uploads; surfaces are shaded as plain
// matte materials driven by the diffuse colour (see metalness/roughness defaults
// in getMaterial below).
const SETS: Record<PbrKind, { diff: string }> = {
  marble: { diff: `${BASE}/marble_cliff_05_diff_1k.jpg` },
  wood: { diff: `${BASE}/wooden_panels_diff_1k.jpg` },
  carpet: { diff: `${BASE}/dirty_carpet_diff_1k.jpg` },
  metal: { diff: `${BASE}/corrugated_iron_diff_1k.jpg` },
  // Oriented strand board — used for the developer booth room walls.
  osb: { diff: `${BASE}/oriented_strand_board_diff_1k.jpg` },
};

// Flat URL map for a single useTexture() call (keeps load/suspense in one place).
const URL_MAP = {
  marbleDiff: SETS.marble.diff,
  woodDiff: SETS.wood.diff,
  carpetDiff: SETS.carpet.diff,
  metalDiff: SETS.metal.diff,
  osbDiff: SETS.osb.diff,
} as const;

interface PbrLibrary {
  getMaterial: (kind: PbrKind, options?: PbrOptions) => MeshStandardMaterial;
}

const PbrContext = createContext<PbrLibrary | null>(null);

/**
 * Loads the four texture sets (suspends until ready) and provides the material
 * factory to descendants. Must sit inside <Canvas> and a <Suspense> boundary.
 */
export function PbrProvider({ children }: { children: ReactNode }) {
  const gl = useThree((s) => s.gl);
  const tex = useTexture(URL_MAP as unknown as Record<string, string>) as unknown as Record<
    keyof typeof URL_MAP,
    Texture
  >;

  const library = useMemo<PbrLibrary>(() => {
    const anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());

    // Configure each diffuse base texture once; clones inherit these settings.
    const prep = (t: Texture) => {
      t.colorSpace = SRGBColorSpace; // diffuse/colour maps are sRGB
      t.wrapS = t.wrapT = RepeatWrapping;
      t.anisotropy = anisotropy;
      return t;
    };

    const bases: Record<PbrKind, { diff: Texture }> = {
      marble: { diff: prep(tex.marbleDiff) },
      wood: { diff: prep(tex.woodDiff) },
      carpet: { diff: prep(tex.carpetDiff) },
      metal: { diff: prep(tex.metalDiff) },
      osb: { diff: prep(tex.osbDiff) },
    };

    const cache = new Map<string, MeshStandardMaterial>();

    const cloneTiled = (base: Texture, rx: number, ry: number) => {
      const t = base.clone(); // shares Source → no extra GPU upload
      t.repeat.set(rx, ry);
      t.needsUpdate = true;
      return t;
    };

    const getMaterial = (kind: PbrKind, options: PbrOptions = {}) => {
      const [rx, ry] = options.repeat ?? [1, 1];
      const key = [
        kind, rx, ry,
        options.color ?? "",
        options.roughness ?? "",
        options.metalness ?? "",
        options.side ?? FrontSide,
        options.transparent ? 1 : 0,
        options.opacity ?? 1,
        options.envMapIntensity ?? 0.85,
      ].join("|");

      const cached = cache.get(key);
      if (cached) return cached;

      const b = bases[kind];
      const material = new MeshStandardMaterial({
        map: cloneTiled(b.diff, rx, ry),
        // Diffuse-only: no normal/ARM maps, so metalness/roughness are plain
        // scalars. Default to a matte non-metal so colour maps read correctly
        // (the old metalness:1 default only worked because the ARM map zeroed it).
        roughness: options.roughness ?? 0.9,
        metalness: options.metalness ?? 0,
        envMapIntensity: options.envMapIntensity ?? 0.85,
        side: options.side ?? FrontSide,
        transparent: options.transparent ?? false,
        opacity: options.opacity ?? 1,
        color: new Color(options.color ?? "#ffffff"),
      });

      cache.set(key, material);
      return material;
    };

    return { getMaterial };
  }, [tex, gl]);

  return <PbrContext.Provider value={library}>{children}</PbrContext.Provider>;
}

/** Returns a shared, memoised PBR material. Stable identity per option set. */
export function usePbrMaterial(kind: PbrKind, options?: PbrOptions): MeshStandardMaterial {
  const lib = useContext(PbrContext);
  if (!lib) throw new Error("usePbrMaterial must be used within <PbrProvider>");
  return lib.getMaterial(kind, options);
}

/**
 * Eagerly warm drei's loader cache with the *essential* startup textures (the
 * 5 diffuse maps + the signage logo) before the Canvas mounts and the WebGL
 * context is built, so the network fetch overlaps context creation and the hall
 * paints sooner. Safe to call once at boot — PbrProvider/useTexture reuse these
 * cached results instead of re-fetching.
 *
 * Heavy GLB furniture is intentionally excluded: it streams in lazily after
 * entry (see GlbModel.tsx) so it never delays first interaction.
 */
export function preloadEssentialTextures() {
  useTexture.preload([...Object.values(URL_MAP), logoUrl]);
}
