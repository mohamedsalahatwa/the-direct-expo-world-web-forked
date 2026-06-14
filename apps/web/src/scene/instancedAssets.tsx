import { createInstancedModel } from "./InstancedModels";
import { GLB } from "./GlbModel";

/**
 * The GLB placed many times across the floor, converted to instanced rendering.
 * It's wrapped once near the scene root (see Scene.tsx), and every placement
 * below it shares a single set of InstancedMeshes.
 *
 *  - Plant: ~70 placements (2 per booth + reception + corners + aisles). 5 sub-
 *    meshes → 5 draw calls total instead of ~350. Never casts shadow (matches the
 *    old <Plant> which set castShadow={false}).
 */
export const PlantModel = createInstancedModel(GLB.plant, { castShadow: false, receiveShadow: true });

// Start fetching early (booth content depends on it), in parallel with the
// essential textures — non-blocking.
PlantModel.preload();
