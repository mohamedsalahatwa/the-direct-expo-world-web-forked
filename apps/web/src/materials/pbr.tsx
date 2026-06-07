import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import {
  Color,
  FrontSide,
  MeshStandardMaterial,
  NoColorSpace,
  RepeatWrapping,
  SRGBColorSpace,
  type Side,
  type Texture,
} from "three";
import logoUrl from "../assets/images/TDE_header.png";

/**
 * PBR material library for the exhibition.
 *
 * Four Poly Haven 4K texture sets — marble, wood, carpet, metal — are loaded
 * once and turned into reusable MeshStandardMaterials. Poly Haven ships an
 * "ARM" map that packs Ambient-Occlusion (R), Roughness (G) and Metalness (B)
 * into one image, so a single ARM texture drives aoMap + roughnessMap +
 * metalnessMap (all sampling UV channel 0, which is the default in three 0.172).
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
  /** Normal map strength. */
  normalScale?: number;
}

const BASE = "/models";
const SETS: Record<PbrKind, { diff: string; nor: string; arm: string }> = {
  marble: {
    diff: `${BASE}/marble_cliff_05_4k.gltf/textures/marble_cliff_05_diff_4k.jpg`,
    nor: `${BASE}/marble_cliff_05_4k.gltf/textures/marble_cliff_05_nor_gl_4k.jpg`,
    arm: `${BASE}/marble_cliff_05_4k.gltf/textures/marble_cliff_05_arm_4k.jpg`,
  },
  wood: {
    diff: `${BASE}/wooden_panels_4k.gltf/textures/wooden_panels_diff_4k.jpg`,
    nor: `${BASE}/wooden_panels_4k.gltf/textures/wooden_panels_nor_gl_4k.jpg`,
    arm: `${BASE}/wooden_panels_4k.gltf/textures/wooden_panels_arm_4k.jpg`,
  },
  carpet: {
    diff: `${BASE}/dirty_carpet_4k.gltf/textures/dirty_carpet_diff_4k.jpg`,
    nor: `${BASE}/dirty_carpet_4k.gltf/textures/dirty_carpet_nor_gl_4k.jpg`,
    arm: `${BASE}/dirty_carpet_4k.gltf/textures/dirty_carpet_arm_4k.jpg`,
  },
  metal: {
    diff: `${BASE}/corrugated_iron_4k.gltf/textures/corrugated_iron_diff_4k.jpg`,
    nor: `${BASE}/corrugated_iron_4k.gltf/textures/corrugated_iron_nor_gl_4k.jpg`,
    arm: `${BASE}/corrugated_iron_4k.gltf/textures/corrugated_iron_arm_4k.jpg`,
  },
  // Oriented strand board — used for the developer booth room walls.
  osb: {
    diff: `${BASE}/oriented_strand_board_4k.gltf/textures/oriented_strand_board_diff_4k.jpg`,
    nor: `${BASE}/oriented_strand_board_4k.gltf/textures/oriented_strand_board_nor_gl_4k.jpg`,
    arm: `${BASE}/oriented_strand_board_4k.gltf/textures/oriented_strand_board_arm_4k.jpg`,
  },
};

// Flat URL map for a single useTexture() call (keeps load/suspense in one place).
const URL_MAP = {
  marbleDiff: SETS.marble.diff, marbleNor: SETS.marble.nor, marbleArm: SETS.marble.arm,
  woodDiff: SETS.wood.diff, woodNor: SETS.wood.nor, woodArm: SETS.wood.arm,
  carpetDiff: SETS.carpet.diff, carpetNor: SETS.carpet.nor, carpetArm: SETS.carpet.arm,
  metalDiff: SETS.metal.diff, metalNor: SETS.metal.nor, metalArm: SETS.metal.arm,
  osbDiff: SETS.osb.diff, osbNor: SETS.osb.nor, osbArm: SETS.osb.arm,
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

    // Configure each base texture once; clones inherit these settings.
    const prep = (t: Texture, srgb: boolean) => {
      t.colorSpace = srgb ? SRGBColorSpace : NoColorSpace;
      t.wrapS = t.wrapT = RepeatWrapping;
      t.anisotropy = anisotropy;
      return t;
    };

    const bases: Record<PbrKind, { diff: Texture; nor: Texture; arm: Texture }> = {
      marble: { diff: prep(tex.marbleDiff, true), nor: prep(tex.marbleNor, false), arm: prep(tex.marbleArm, false) },
      wood: { diff: prep(tex.woodDiff, true), nor: prep(tex.woodNor, false), arm: prep(tex.woodArm, false) },
      carpet: { diff: prep(tex.carpetDiff, true), nor: prep(tex.carpetNor, false), arm: prep(tex.carpetArm, false) },
      metal: { diff: prep(tex.metalDiff, true), nor: prep(tex.metalNor, false), arm: prep(tex.metalArm, false) },
      osb: { diff: prep(tex.osbDiff, true), nor: prep(tex.osbNor, false), arm: prep(tex.osbArm, false) },
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
        options.normalScale ?? 1,
      ].join("|");

      const cached = cache.get(key);
      if (cached) return cached;

      const b = bases[kind];
      const arm = cloneTiled(b.arm, rx, ry);
      const material = new MeshStandardMaterial({
        map: cloneTiled(b.diff, rx, ry),
        normalMap: cloneTiled(b.nor, rx, ry),
        // One ARM texture → AO (R) + Roughness (G) + Metalness (B).
        aoMap: arm,
        roughnessMap: arm,
        metalnessMap: arm,
        roughness: options.roughness ?? 1,
        metalness: options.metalness ?? 1,
        envMapIntensity: options.envMapIntensity ?? 0.85,
        side: options.side ?? FrontSide,
        transparent: options.transparent ?? false,
        opacity: options.opacity ?? 1,
        color: new Color(options.color ?? "#ffffff"),
      });
      const ns = options.normalScale ?? 1;
      material.normalScale.set(ns, ns);

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
 * 15 PBR maps + the signage logo) before the Canvas mounts and the WebGL
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
