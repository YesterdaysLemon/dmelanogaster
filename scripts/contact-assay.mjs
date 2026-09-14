import { surfaceBounds } from "../src/contact.ts";

/** Finite stress protocols. No pose corrections during integration. */
export function contactAssays(engine, world) {
  const { model: m, data: d, mujoco: mj } = engine;
  const names = Array.from(
    { length: m.ngeom },
    (_, i) => mj.mj_id2name(m, mj.mjtObj.mjOBJ_GEOM.value, i) || "",
  );
  const results = [];
  for (const mode of [
    "floor-drop",
    "side-drop",
    "banana-drop",
    "wall-impact",
  ]) {
    world.passive = true;
    world.reset();
    if (mode === "floor-drop") d.qpos[2] += 2;
    if (mode === "side-drop") {
      d.qpos[2] = 3;
      d.qpos.set([Math.SQRT1_2, Math.SQRT1_2, 0, 0], 3);
    }
    if (mode === "banana-drop") d.qpos.set([-3.5, -4, 4], 0);
    if (mode === "wall-impact") {
      const initial = surfaceBounds(engine);
      d.qpos[0] = 11.9 - initial.maximum[0] - 0.2;
      d.qpos[2] += 0.5;
      d.qvel[0] = 100;
    }
    mj.mj_forward(m, d);
    let floor = Infinity,
      wall = Infinity,
      penetration = 0,
      banana = 0,
      wallContacts = 0;
    for (let i = 0; i < Math.round(1 / m.opt.timestep); i++) {
      engine.step();
      // Inspect every solver step, including short impact transients.
      const contacts = d.contact,
        groups = m.geom_group;
      for (let c = 0; c < d.ncon; c++) {
        const contact = contacts.get(c);
        if (groups[contact.geom1] !== 3 && groups[contact.geom2] !== 3)
          continue;
        penetration = Math.max(penetration, -contact.dist);
        if (
          names[contact.geom1].startsWith("prop_banana_") ||
          names[contact.geom2].startsWith("prop_banana_")
        )
          banana++;
        if (
          names[contact.geom1].startsWith("wall_") ||
          names[contact.geom2].startsWith("wall_")
        )
          wallContacts++;
      }
      if (i % 50 === 0) {
        const bounds = surfaceBounds(engine);
        floor = Math.min(floor, bounds.floorClearanceMM);
        wall = Math.min(wall, bounds.wallClearanceMM);
      }
    }
    results.push({
      mode,
      duration: 1,
      timestep: m.opt.timestep,
      minFloorClearanceMM: floor,
      minWallClearanceMM: wall,
      maxPenetrationMM: penetration,
      bananaContactSamples: banana,
      wallContactSamples: wallContacts,
      finalPosition: Array.from(d.qpos.slice(0, 3)),
      finite: Array.from(d.qpos).every(Number.isFinite),
      allCommandsZero: Array.from(d.ctrl).every((v) => v === 0),
    });
  }
  world.reset();
  return results;
}
