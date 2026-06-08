import { createInstancedModel } from "./InstancedModels";
import { GLB } from "./GlbModel";

/**
 * The two GLBs that are placed many times across the floor, converted to
 * instanced rendering. Each is wrapped once near the scene root (see Scene.tsx),
 * and every placement below it shares a single set of InstancedMeshes.
 *
 *  - Plant: ~70 placements (2 per booth + reception + corners + aisles). 5 sub-
 *    meshes → 5 draw calls total instead of ~350. Never casts shadow (matches the
 *    old <Plant> which set castShadow={false}).
 *  - Room TV: 30 placements (one per booth).
 */
export const PlantModel = createInstancedModel(GLB.plant, { castShadow: false, receiveShadow: true });
export const TvRoomModel = createInstancedModel(GLB.tvRoom, { castShadow: true, receiveShadow: true });

// Start fetching both early (booth content now depends on them), in parallel
// with the essential textures — non-blocking.
PlantModel.preload();
TvRoomModel.preload();
