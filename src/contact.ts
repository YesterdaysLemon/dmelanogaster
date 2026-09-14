import type { FlyEngine } from "./engine";
import type { MjModel } from "@mujoco/mujoco";

/** MuJoCo's compiled contact hull, not a separately approximated display hull.
 * Record layout: https://mujoco.readthedocs.io/en/stable/APIreference/APItypes.html#convex-hulls
 */
export function convexMesh(model: MjModel, mesh: number) {
  const graph = model.mesh_graph,
    a = model.mesh_graphadr[mesh];
  if (a < 0) throw Error("Contact mesh has no compiled convex hull");
  const nv = graph[a],
    nf = graph[a + 1],
    start = a + 2 + nv,
    faces = a + 2 + 3 * nv + 3 * nf;
  return {
    vertexIds: Array.from(graph.slice(start, start + nv)) as number[],
    faceIds: Array.from(graph.slice(faces, faces + 3 * nf)) as number[],
  };
}
const hullCache = new WeakMap<MjModel, Map<number, number[]>>();

/** Inspect the actual transformed anatomical surface, not a thorax/foot proxy. */
export function surfaceBounds(engine: FlyEngine) {
  const { model: m, data: d } = engine;
  const vertices = m.mesh_vert,
    rotations = d.geom_xmat,
    positions = d.geom_xpos;
  let cache = hullCache.get(m);
  if (!cache) {
    cache = new Map();
    hullCache.set(m, cache);
  }
  const minimum = [Infinity, Infinity, Infinity],
    maximum = [-Infinity, -Infinity, -Infinity];
  for (let g = 0; g < m.ngeom; g++) {
    if (m.geom_type[g] !== 7 || m.geom_group[g] === 3) continue;
    const mesh = m.geom_dataid[g],
      start = m.mesh_vertadr[mesh] * 3;
    if (!cache.has(mesh))
      cache.set(
        mesh,
        convexMesh(m, mesh).vertexIds.map((i) => start + i * 3),
      );
    const r = g * 9,
      p = g * 3;
    for (const v of cache.get(mesh)!) {
      for (let axis = 0; axis < 3; axis++) {
        const a = r + axis * 3;
        const value =
          positions[p + axis] +
          rotations[a] * vertices[v] +
          rotations[a + 1] * vertices[v + 1] +
          rotations[a + 2] * vertices[v + 2];
        minimum[axis] = Math.min(minimum[axis], value);
        maximum[axis] = Math.max(maximum[axis], value);
      }
    }
  }
  return {
    minimum,
    maximum,
    floorClearanceMM: minimum[2],
    wallClearanceMM: Math.min(
      11.9 - maximum[0],
      11.9 - maximum[1],
      minimum[0] + 11.9,
      minimum[1] + 11.9,
    ),
  };
}

/** Solver contact distances, including the small compliant penetration, in mm. */
export function contactMetrics(engine: FlyEngine) {
  const { model: m, data: d } = engine;
  let maxPenetrationMM = 0,
    environmentContacts = 0,
    bananaContacts = 0;
  const feet = Array(6).fill(false) as boolean[];
  for (let i = 0; i < d.ncon; i++) {
    const c = d.contact.get(i)!;
    const a = c.geom1,
      b = c.geom2;
    if (m.geom_group[a] !== 3 && m.geom_group[b] !== 3) continue;
    if (c.efc_address < 0) continue;
    environmentContacts++;
    maxPenetrationMM = Math.max(maxPenetrationMM, -c.dist);
    const fly = m.geom_group[a] === 3 ? b : a;
    const name =
      engine.mujoco.mj_id2name(m, engine.mujoco.mjtObj.mjOBJ_GEOM.value, fly) ||
      "";
    const leg = ["LF", "LM", "LH", "RF", "RM", "RH"].indexOf(name.slice(0, 2));
    if (leg >= 0 && /Tarsus/.test(name)) feet[leg] = true;
    const other = fly === a ? b : a;
    const otherName =
      engine.mujoco.mj_id2name(
        m,
        engine.mujoco.mjtObj.mjOBJ_GEOM.value,
        other,
      ) || "";
    if (otherName.startsWith("prop_banana_")) bananaContacts++;
  }
  return { feet, environmentContacts, bananaContacts, maxPenetrationMM };
}
