import wasmUrl from "@mujoco/mujoco/mujoco.wasm?url";
import { createEngine, type FlyEngine, type Manifest } from "./engine";
import { Terrarium, legs } from "./terrarium";
import { FlyViewer } from "./viewer";
import type { Wiring } from "./circuit";

export const terrariumMarkup = `
<section id="terrarium" class="page" hidden>
 <div class="page-heading"><div><div class="eyebrow"><span class="status-dot"></span> V0.2 / FIRST CIRCUIT → BODY EXPERIMENT</div><h1>Small steps. Open questions.</h1><p>A living experiment in rebuilding a fly, one evidenced connection at a time.</p></div><div class="specimen-stamp">DROSOPHILA MELANOGASTER<br><b>Six legs · muscle-driven physics</b></div></div>
 <div class="habitat-layout"><div class="viewport-panel habitat-panel">
  <div class="viewport-top"><span class="tiny-label">01 / THE TERRARIUM</span><span id="world-clock" class="quiet">Preparing…</span></div>
  <div id="habitat-view"><div id="world-loading" role="status"><span class="loader"></span><b>Connecting the specimen</b><span>Anatomy, MANC wiring, muscle mechanics…</span></div><div class="habitat-legend"><span><i class="food-dot"></i> Yeast / food</span><span><i class="odor-dot"></i> Geosmin / repellent</span><span><i class="water-dot"></i> Water</span></div></div>
  <div class="view-tools"><button id="world-focus" class="chip" disabled>Find the fly</button><button id="world-follow" class="chip" aria-pressed="false" disabled>Follow fly</button><button id="world-xray" class="chip" aria-pressed="false" disabled>See through cuticle</button><span class="quiet">Drag to orbit · scroll to zoom</span></div>
  <div class="scope-note"><span class="scope-icon">↳</span><div><b>Observed wiring. Experimental walking bridge.</b> The circuit supplies rhythm; assumed coordination and recruitment rules bridge the missing biology. Wings and organs are not simulated.</div><a href="#wiring">Inspect every layer ↗</a></div>
 </div><aside class="inspector habitat-inspector"><div class="tiny-label">02 / LIVE EXPERIMENT</div><h2>Let the circuit move.</h2><p class="inspector-description">No learned policy. Native muscle activation and force act on a free body.</p>
 <div class="action-row"><button id="world-play" class="primary" disabled>Start walking <span>↗</span></button><button id="world-reset" class="secondary" disabled>Reset</button></div>
 <div class="world-values"><div><span>Travel</span><b id="world-travel">0.00 mm</b></div><div><span>Neural cycles</span><b id="world-cycles">0</b></div></div>
 <div class="leg-grid" id="leg-grid">${legs.map((l) => `<div><span>${l}</span><i id="foot-${l}"></i><b id="rate-${l}">0.0</b></div>`).join("")}</div><p class="microcopy">Foot contact proxy · E2 model rate in Hz. Contact feedback is not yet reconstructed.</p>
 <div class="section-rule"></div><label class="experiment-toggle"><input id="bridge-toggle" type="checkbox" checked disabled><span>Experimental walking bridge<small>Assumed timing, posture and motor recruitment</small></span></label>
 <label class="experiment-toggle"><input id="ablate-toggle" type="checkbox" disabled><span>Silence candidate CPG<small>Suppress all six IN17A001 cells</small></span></label>
 <label class="experiment-toggle"><input id="sensory-toggle" type="checkbox" checked disabled><span>Experimental sensory steering<small>Idealized antenna signals → stride asymmetry</small></span></label>
 <label class="experiment-toggle"><input id="passive-toggle" type="checkbox" disabled><span>All muscles passive<small>Remove excitation; keep gravity and contact</small></span></label>
 <p id="world-mode" class="mode-note">Bridge enabled · hypothesis layer visible</p>
 <label class="speed-label">Simulation speed <select id="world-speed"><option value=".1">0.1×</option><option value=".25" selected>0.25×</option><option value=".5">0.5×</option></select></label>
 </aside></div>
 <div class="habitat-bottom"><section class="habitat-stimuli"><div class="tiny-label">03 / CHANGE THE WORLD</div><h3>Something sweet. Something suspicious.</h3><p>Move the food, switch off the repellent, and compare the two antenna signals. Odor fields and concentrations are uncalibrated model proxies.</p><div class="action-row"><button id="food-ahead" class="secondary" disabled>Place food ahead</button><button id="repellent-toggle" class="secondary" aria-pressed="true" disabled>Repellent: on</button><button id="world-export" class="text-button" disabled>Export state & evidence ↓</button></div><p id="odor-reading" class="microcopy">Antenna signals will appear here.</p><p class="microcopy">The half-open banana peel is original procedural scenery. Water is an environment object; drinking and digestion remain open.</p></section><section class="neural-chart"><div class="tiny-label">04 / A RHYTHM FROM CONNECTIVITY</div><h3>INXXX466 · left foreleg</h3><canvas id="neural-trace" aria-label="Model firing-rate trace for MANC neuron 11751"></canvas><p class="microcopy">MANC body ID 11751 · model Hz · last 3 simulated seconds<br><a href="#literature/walking-cpg">Candidate CPG source & limitations ↗</a></p></section></div>
</section>
<section id="wiring" class="page" hidden><div class="page-heading"><div><div class="eyebrow">THE WIRING LEDGER</div><h1>What connects to what?</h1><p>Keep the measurements. Name the assumptions. Make both inspectable.</p></div></div>
 <div class="wiring-levels"><article><span class="evidence-tag observed">OBSERVED</span><h3 id="wiring-count">MANC graph slice</h3><p>Identified cells and EM synapse counts. An anatomical subset of one adult male nerve cord.</p></article><article><span class="evidence-tag inferred">INFERRED</span><h3>Rates, signs, dynamics</h3><p>Predicted transmitters and assumed electrical gains. Muscle module assignments include homology-based matches.</p></article><article><span class="evidence-tag experimental">EXPERIMENTAL</span><h3>The walking bridge</h3><p>Shared timing, ideal proprioception, recruitment, muscle moment arms and odor steering. Switchable in the terrarium.</p></article></div>
 <div class="circuit-strip"><span>DNg100<small>Descending drive</small></span><b>→</b><span>IN17A001 ↔ INXXX466<small>IN16B036 inhibitory feedback</small></span><b>→</b><span>Leg motor pools<small>Observed partial pathways</small></span><b>⇢</b><span class="hypothesis-node">H-posture / H-coordination<small>Experimental bridge</small></span><b>⇢</b><span>36 muscle groups<small>Inferred reduced mechanics</small></span></div>
 <p class="atlas-note">This is a selected network, not the whole VNC or brain. The bridge still supplies most motor recruitment. Disabling it exposes the missing motor circuitry. Anatomical counts are unchanged; model weights use a separately declared gain.</p>
 <div class="wiring-browser"><aside><label class="input-label" for="neuron-search">FIND A CELL</label><input id="neuron-search" type="search" placeholder="Name, body ID, leg, muscle module…"><select id="neuron-list" size="12" aria-label="Matching neurons"></select></aside><article id="neuron-detail"><p>Loading the public wiring dataset…</p></article></div>
 <details class="wiring-assumptions" open><summary>Hypotheses currently in the control path</summary><table><thead><tr><th>Stable ID</th><th>Connection / parameter</th><th>Evidence boundary</th></tr></thead><tbody>
 <tr><td>H-coordination</td><td>LF E2 peaks → shared six-leg timing; two neural cycles per stride</td><td>Designed hypothesis. No claim that this cell coordinates all legs in vivo.</td></tr>
 <tr><td>H-posture</td><td>Ideal joint feedback → antagonistic recruitment</td><td>Engineering closure of the missing reflex/NMJ pathways. No identified sensory neuron mapping.</td></tr>
 <tr><td>H-muscle</td><td>36 groups, constant 0.05 mm moment arms; Hill dynamics</td><td>Reduced mechanics; attachments, strengths and time constants are not reconstructed measurements.</td></tr>
 <tr><td>H-odor</td><td>Bilateral scalar fields → stride asymmetry</td><td>Behavior-inspired steering; receptor and descending pathways remain unimplemented.</td></tr>
 <tr><td>U-navigation</td><td>hΔ synaptic path-integration hypothesis</td><td>Tracked from the supplied reference. Not implemented or treated as proven plasticity.</td></tr>
 </tbody></table></details><p class="atlas-note"><a href="/data/manc-walking.json" target="_blank" rel="noopener">Download the complete node/edge ledger ↗</a> · <a href="/model/walking-manifest.json" target="_blank" rel="noopener">Derived body manifest ↗</a> · <a href="https://github.com/YesterdaysLemon/dmelanogaster/blob/main/docs/wiring.md" target="_blank" rel="noopener">Methods, assumptions and assays ↗</a></p>
</section>`;

export function initTerrarium() {
  const $ = <T extends HTMLElement = HTMLElement>(id: string) =>
    document.getElementById(id) as T;
  let e: FlyEngine | undefined,
    world: Terrarium | undefined,
    viewer: FlyViewer | undefined,
    wiring: Wiring | undefined,
    started = false;
  const history: { t: number; r: number }[] = [];
  const renderDetail = () => {
    if (!wiring) return;
    const i = Number($<HTMLSelectElement>("neuron-list").value),
      n = wiring.nodes[i];
    if (!n) return;
    const escape = (s: unknown) =>
      String(s ?? "Unassigned")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll('"', "&quot;");
    const edges = wiring.edges
      .filter((edge) => edge.pre === i || edge.post === i)
      .sort((a, b) => b.count - a.count);
    $("neuron-detail").innerHTML =
      `<span class="tiny-label">MANC · BODY ID ${escape(n.id)}</span><h2>${escape(n.name)}</h2><p>${escape(n.role)} · ${escape(n.leg)} · ${escape(n.module)}</p><p><b>Transmitter prediction:</b> ${escape(n.nt)} (${n.ntProbability === null ? "confidence not reported" : (n.ntProbability * 100).toFixed(1) + "%"}). Its model sign is an inference; synapse count is an observation.</p><p class="microcopy">${edges.length} retained incident connections. Muscle-module identity is a published annotation, not a verified one-to-one assignment to our derived actuators.</p><div class="edge-scroll"><table><thead><tr><th>Pre → post</th><th>Synapses</th><th>Model sign</th></tr></thead><tbody>${edges.map((edge) => `<tr><td>${escape(wiring!.nodes[edge.pre].name)} <small>${escape(wiring!.nodes[edge.pre].id)}</small> → ${escape(wiring!.nodes[edge.post].name)} <small>${escape(wiring!.nodes[edge.post].id)}</small></td><td>${edge.count}</td><td>${edge.sign > 0 ? "+ excitatory" : "− inhibitory"} <small>inferred</small></td></tr>`).join("")}</tbody></table></div><p><a href="#literature/manc-pathways">Motor annotations & matching method ↗</a> · <a href="#literature/walking-cpg">Circuit model & data ↗</a></p>`;
  };
  const renderList = () => {
    if (!wiring) return;
    const term = $<HTMLInputElement>("neuron-search").value.toLowerCase();
    const found = wiring.nodes
      .map((n, i) => ({ n, i }))
      .filter(({ n }) =>
        [n.name, n.id, n.leg, n.module].join(" ").toLowerCase().includes(term),
      );
    const select = $<HTMLSelectElement>("neuron-list");
    select.replaceChildren(
      ...found.map(({ n, i }) => {
        const o = document.createElement("option");
        o.value = String(i);
        o.textContent = `${n.name} · ${n.id} · ${n.leg || "DN"}`;
        return o;
      }),
    );
    if (found.length) {
      select.selectedIndex = 0;
      renderDetail();
    } else $("neuron-detail").textContent = "No cells match this search.";
  };
  $("neuron-search").addEventListener("input", renderList);
  $("neuron-list").addEventListener("change", renderDetail);
  const sync = () => {
    if (!e || !world) return;
    $("world-clock").textContent = `${e.data.time.toFixed(2)} s simulated`;
    $("world-travel").textContent = world.travel.toFixed(2) + " mm";
    $("world-cycles").textContent = String(world.cycles);
    $("world-play").textContent = e.running ? "Ⅱ Pause" : "▶ Run";
    $("world-mode").textContent = world.passive
      ? "Passive control · all excitation removed"
      : !world.bridge
        ? "Observed network only · missing recruitment remains visible"
        : world.circuit.silenced.size
          ? "Candidate CPG silenced · posture bridge remains active"
          : "Walking bridge enabled · hypotheses remain explicit";
    legs.forEach((l, i) => {
      const idx = wiring!.nodes.findIndex(
        (n) => n.name === "INXXX466" && n.leg === l,
      );
      $("rate-" + l).textContent = (
        idx >= 0 ? world!.circuit.rates[idx] : 0
      ).toFixed(1);
      $("foot-" + l).classList.toggle("contact", world!.contacts[i]);
    });
    $("odor-reading").textContent =
      `Food L/R ${world.odor.map((v) => v.toFixed(3)).join(" / ")} · Repellent L/R ${world.aversion.map((v) => v.toFixed(3)).join(" / ")} · Food contact ${world.foodContact ? "yes" : "no"} · Energy proxy ${(world.energy * 100).toFixed(0)}%`;
    const idx = wiring!.nodes.findIndex((n) => n.id === "11751");
    if (!history.length || e.data.time > history.at(-1)!.t) {
      history.push({ t: e.data.time, r: world.circuit.rates[idx] });
      while (history.length && history[0].t < e.data.time - 3) history.shift();
    }
    const canvas = $<HTMLCanvasElement>("neural-trace"),
      box = canvas.getBoundingClientRect(),
      ratio = Math.min(devicePixelRatio, 2);
    if (box.width) {
      canvas.width = box.width * ratio;
      canvas.height = box.height * ratio;
      const ctx = canvas.getContext("2d")!,
        max = Math.max(10, ...history.map((h) => h.r));
      ctx.strokeStyle = "#d6dccd";
      for (let j = 1; j < 4; j++) {
        ctx.beginPath();
        ctx.moveTo(0, (canvas.height * j) / 4);
        ctx.lineTo(canvas.width, (canvas.height * j) / 4);
        ctx.stroke();
      }
      ctx.strokeStyle = "#ad512e";
      ctx.lineWidth = 2 * ratio;
      ctx.beginPath();
      history.forEach((h, i) => {
        const x = ((h.t - Math.max(0, e!.data.time - 3)) / 3) * canvas.width,
          y = canvas.height - 8 - (h.r / max) * (canvas.height - 16);
        if (i) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      });
      ctx.stroke();
    }
  };
  const reset = () => {
    world?.reset();
    history.length = 0;
    sync();
    viewer?.focus("body");
    viewer?.update();
  };
  $("world-play").onclick = () => {
    if (e) e.running = !e.running;
    sync();
  };
  $("world-reset").onclick = reset;
  $("bridge-toggle").onchange = () => {
    if (world) world.bridge = $<HTMLInputElement>("bridge-toggle").checked;
    sync();
  };
  $("ablate-toggle").onchange = () => {
    world?.ablate($<HTMLInputElement>("ablate-toggle").checked);
    sync();
  };
  $("passive-toggle").onchange = () => {
    if (world) world.passive = $<HTMLInputElement>("passive-toggle").checked;
    sync();
  };
  $("sensory-toggle").onchange = () => {
    if (world) world.sensory = $<HTMLInputElement>("sensory-toggle").checked;
  };
  $("world-speed").onchange = () => {
    if (e) e.speed = Number($<HTMLSelectElement>("world-speed").value);
  };
  $("world-focus").onclick = () => viewer?.focus("body");
  $("world-follow").onclick = () => {
    if (viewer) {
      viewer.follow = !viewer.follow;
      $("world-follow").classList.toggle("active", viewer.follow);
      $("world-follow").setAttribute("aria-pressed", String(viewer.follow));
    }
  };
  $("world-xray").onclick = () => {
    const active = viewer?.toggleXray() || false;
    $("world-xray").classList.toggle("active", active);
    $("world-xray").setAttribute("aria-pressed", String(active));
  };
  $("food-ahead").onclick = () => {
    if (e && world) {
      const q = e.data.qpos;
      const dx = 1 - 2 * (q[5] * q[5] + q[6] * q[6]),
        dy = 2 * (q[4] * q[5] + q[3] * q[6]);
      world.setSource("yeast", {
        x: q[0] + 2 * dx - 0.5 * dy,
        y: q[1] + 2 * dy + 0.5 * dx,
      });
      viewer?.update();
      sync();
    }
  };
  $("repellent-toggle").onclick = () => {
    if (world) {
      const s = world.sources.find((s) => s.id === "geosmin")!;
      world.setSource(s.id, { enabled: !s.enabled });
      $("repellent-toggle").textContent =
        "Repellent: " + (s.enabled ? "on" : "off");
      $("repellent-toggle").setAttribute("aria-pressed", String(s.enabled));
      viewer?.update();
    }
  };
  $("world-export").onclick = () => {
    if (world) {
      const a = document.createElement("a"),
        url = URL.createObjectURL(
          new Blob([JSON.stringify(world.export(), null, 2)], {
            type: "application/json",
          }),
        );
      a.href = url;
      a.download = "dmelanogaster-state-evidence.json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    }
  };
  const boot = async () => {
    if (started) return;
    started = true;
    try {
      const [manifest, w, wasm] = await Promise.all([
        fetch("/model/walking-manifest.json").then((r) => {
          if (!r.ok) throw Error("Body manifest unavailable");
          return r.json() as Promise<Manifest>;
        }),
        fetch("/data/manc-walking.json").then((r) => {
          if (!r.ok) throw Error("Wiring unavailable");
          return r.json() as Promise<Wiring>;
        }),
        fetch(wasmUrl).then(async (r) => {
          if (!r.ok) throw Error("Physics engine unavailable");
          return new Uint8Array(await r.arrayBuffer());
        }),
      ]);
      wiring = w;
      $("wiring-count").textContent =
        `${w.nodes.length} cells · ${w.edges.length.toLocaleString()} edges`;
      renderList();
      e = await createEngine(
        manifest,
        async (path) => {
          const r = await fetch("/model/" + path);
          if (!r.ok) throw Error("Anatomy unavailable: " + path);
          return new Uint8Array(await r.arrayBuffer());
        },
        wasm,
      );
      world = new Terrarium(e, w);
      viewer = new FlyViewer($("habitat-view"), e, world);
      $("world-loading").remove();
      document
        .querySelectorAll<HTMLButtonElement | HTMLInputElement>(
          "#terrarium [disabled]",
        )
        .forEach((el) => (el.disabled = false));
      // Environment actions manipulate stimuli, never a trained motor policy.
      (window as unknown as { flyLab: unknown }).flyLab = {
        version: 2,
        observe: () => world!.observation(),
        reset: () => {
          reset();
          return world!.observation();
        },
        step: (steps = 1) => {
          if (!Number.isInteger(steps) || steps < 1 || steps > 5000)
            throw Error("steps must be 1–5000");
          e!.running = false;
          e!.step(steps);
          sync();
          viewer!.update();
          return world!.observation();
        },
        setStimulus: (
          id: string,
          patch: Parameters<Terrarium["setSource"]>[1],
        ) => {
          world!.setSource(id, patch);
          viewer!.update();
        },
        export: () => world!.export(),
      };
      let previous = performance.now(),
        lastUI = 0;
      const frame = (now: number) => {
        try {
          if (!$("terrarium").hidden) {
            e!.advance((now - previous) / 1000);
            viewer!.update();
            if (now - lastUI > 90) {
              sync();
              lastUI = now;
            }
          }
          previous = now;
          requestAnimationFrame(frame);
        } catch (error) {
          e!.running = false;
          console.error(error);
          $("world-mode").textContent =
            "Physics stopped after an error. Reset or reload to recover.";
        }
      };
      sync();
      requestAnimationFrame(frame);
    } catch (error) {
      console.error(error);
      $("world-loading").textContent =
        "Unable to load this experiment. Reload to retry; literature remains available.";
    }
  };
  const route = () => {
    if (
      ["", "terrarium", "wiring"].includes(location.hash.slice(1).split("/")[0])
    )
      void boot();
  };
  window.addEventListener("hashchange", route);
  route();
}
