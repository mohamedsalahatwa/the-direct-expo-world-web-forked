import { createContext, useContext, useMemo, type ReactNode } from "react";
import { Merged, useGLTF } from "@react-three/drei";
import { Box3, Quaternion, Vector3, type Mesh } from "three";
import type { FitAxis } from "./GlbModel";

/**
 * Instanced GLB system.
 *
 * `GlbModel` clones a GLB per placement — fine for one-offs, but the room TV
 * (×30) and house plant (×70+) each have several sub-meshes, so they explode the
 * draw-call count (e.g. plant = 5 meshes → 350 draw calls). This factory turns a
 * repeated GLB into a single set of `InstancedMesh`es (one per sub-mesh), so N
 * placements cost only "number of sub-meshes" draw calls total, regardless of N.
 *
 * It uses drei's <Merged>, which builds one instanced buffer per sub-mesh and
 * exposes instance components via React context. Because of that, placements MUST
 * be rendered inside the model's <Provider> subtree (see Scene.tsx).
 *
 * Visual parity with GlbModel is preserved by:
 *  - baking each sub-mesh's transform within the GLB (so multi-mesh models
 *    reassemble correctly), and
 *  - replicating GlbModel's fit math (bounding-box → uniform scale + floor/centre
 *    offset) per placement, so sizes/positions match exactly.
 */

interface SubTransform {
  position: [number, number, number];
  quaternion: [number, number, number, number];
  scale: [number, number, number];
}

interface ModelData {
  /** Instance components from <Merged>, in the same order as `subs`. */
  comps: React.ComponentType<Record<string, unknown>>[];
  subs: SubTransform[];
  size: [number, number, number];
  center: [number, number, number];
  minY: number;
}

export interface InstancePlacementProps {
  position?: [number, number, number];
  rotationY?: number;
  /** Scale so this axis spans `size` metres (same semantics as GlbModel). */
  fit?: { axis?: FitAxis; size: number };
  /** Explicit uniform scale (ignored when `fit` is given). */
  scale?: number;
  /** Sit the model's base on the floor (default) vs. centre it vertically. */
  onFloor?: boolean;
}

function fitTransform(d: ModelData, p: InstancePlacementProps) {
  const [sx, sy, sz] = d.size;
  let factor = p.scale ?? 1;
  if (p.fit) {
    const axis = p.fit.axis ?? "y";
    const span =
      axis === "x" ? sx : axis === "z" ? sz : axis === "max" ? Math.max(sx, sy, sz) : sy;
    factor = span > 0 ? p.fit.size / span : 1;
  }
  const onFloor = p.onFloor ?? true;
  const offset: [number, number, number] = [
    -d.center[0] * factor,
    onFloor ? -d.minY * factor : -d.center[1] * factor,
    -d.center[2] * factor,
  ];
  return { factor, offset };
}

export interface InstancedModel {
  Provider: (props: { children: ReactNode }) => JSX.Element;
  Placement: (props: InstancePlacementProps) => JSX.Element | null;
  preload: () => void;
}

export function createInstancedModel(
  url: string,
  opts: { castShadow?: boolean; receiveShadow?: boolean } = {},
): InstancedModel {
  const Ctx = createContext<ModelData | null>(null);

  function Provider({ children }: { children: ReactNode }) {
    const { scene } = useGLTF(url);

    const { meshes, base } = useMemo(() => {
      scene.updateMatrixWorld(true);
      const meshes: Mesh[] = [];
      const subs: SubTransform[] = [];
      const p = new Vector3();
      const q = new Quaternion();
      const s = new Vector3();
      scene.traverse((o) => {
        const m = o as Mesh;
        if ((m as unknown as { isMesh?: boolean }).isMesh) {
          m.matrixWorld.decompose(p, q, s);
          meshes.push(m);
          subs.push({
            position: [p.x, p.y, p.z],
            quaternion: [q.x, q.y, q.z, q.w],
            scale: [s.x, s.y, s.z],
          });
        }
      });
      const box = new Box3().setFromObject(scene);
      const size = new Vector3();
      const center = new Vector3();
      box.getSize(size);
      box.getCenter(center);
      return {
        meshes,
        base: {
          subs,
          size: [size.x, size.y, size.z] as [number, number, number],
          center: [center.x, center.y, center.z] as [number, number, number],
          minY: box.min.y,
        },
      };
    }, [scene]);

    return (
      <Merged
        meshes={meshes}
        castShadow={opts.castShadow ?? true}
        receiveShadow={opts.receiveShadow ?? true}
        // One draw call covering the whole floor: don't frustum-cull the batch
        // (its bounds span everything anyway), which also avoids mis-culling.
        frustumCulled={false}
      >
        {(...comps: React.ComponentType<Record<string, unknown>>[]) => (
          <Ctx.Provider value={{ ...base, comps }}>{children}</Ctx.Provider>
        )}
      </Merged>
    );
  }

  function Placement(props: InstancePlacementProps) {
    const d = useContext(Ctx);
    if (!d) throw new Error(`Instanced placement for ${url} must be inside its <Provider>.`);
    const { factor, offset } = fitTransform(d, props);
    return (
      <group position={props.position ?? [0, 0, 0]} rotation={[0, props.rotationY ?? 0, 0]}>
        <group scale={factor} position={offset}>
          {d.comps.map((C, i) => (
            <C
              key={i}
              position={d.subs[i].position}
              quaternion={d.subs[i].quaternion}
              scale={d.subs[i].scale}
            />
          ))}
        </group>
      </group>
    );
  }

  return { Provider, Placement, preload: () => useGLTF.preload(url) };
}
