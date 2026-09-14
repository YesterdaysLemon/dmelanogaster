import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import wasmUrl from "@mujoco/mujoco/mujoco.wasm?url";
import { FlyViewer } from "./viewer";
import {
  createMotionBench,
  type MotionBench,
  type MotionRecording,
  type MotionManifest,
  type MotionTrace,
} from "./motion";

const colors = [
  "#b65d27",
  "#438572",
  "#8068a2",
  "#d39023",
  "#317c96",
  "#bf5878",
];
const legs = ["LF", "LM", "LH", "RF", "RM", "RH"];
export const motionMarkup = `
<section id="motion" class="page" hidden>
 <div class="motion-heading"><div><div class="eyebrow">V0.3 / MEASURED MOVEMENT</div><h1>Let the real fly lead.</h1><p>A recorded fly, its reconstructed landmarks, and the anatomy they must explain.</p></div><a class="text-link" href="#literature/nmf2-motion">NeuroMechFly v2 · source & method ↗</a></div>
 <div class="motion-toolbar"><div class="motion-transport"><button class="primary" id="motion-play" disabled>▶ Play recording</button><button class="secondary" id="motion-prev" disabled aria-label="Previous motion frame">←</button><button class="secondary" id="motion-next" disabled aria-label="Next motion frame">→</button><label>Playback <select id="motion-speed"><option value=".05">0.05×</option><option value=".1" selected>0.1×</option><option value=".25">0.25×</option><option value="1">1×</option></select></label></div><output id="motion-time">Preparing 37 source frames…</output></div>
 <label class="motion-scrub-label" for="motion-scrub">Shared frame scrubber <span>0.000 → 0.300 s · nominal annotation time</span></label><input id="motion-scrub" class="motion-scrub" type="range" min="0" max="36" value="0" step="1" disabled>
 <div class="motion-triptych">
  <article class="motion-pane"><div class="motion-pane-title"><span class="tiny-label">01 / ORIGINAL RECORDING</span><span class="evidence-pill">Published video</span></div><div class="motion-media"><canvas id="motion-video-canvas" aria-label="Original NeuroMechFly v2 recording, three prism views"></canvas><video id="motion-video" muted playsinline preload="auto" hidden src="/motion/source/recorded_steps.mp4"></video></div><div class="motion-pane-caption"><label>View <select id="motion-camera"><option value="all">All three views</option><option value="middle">Middle view</option><option value="top">Upper prism</option><option value="bottom">Lower prism</option></select></label><a href="/motion/source/recorded_steps.mp4" target="_blank" rel="noopener">Original file ↗</a></div><p class="microcopy">PR female · 4–5 days old · one straight-walking episode. Original pixels; no generated motion.</p></article>
  <article class="motion-pane"><div class="motion-pane-title"><span class="tiny-label">02 / THE VIRTUAL MOCAP SUIT</span><span class="evidence-pill">Measured + registered</span></div><div id="motion-skeleton" class="motion-stage" aria-label="Interactive 3D recorded leg landmarks"></div><div class="motion-pane-caption"><span>30 leg landmarks · drag to orbit</span><button id="motion-home" class="text-button" disabled>Reset views</button></div><p class="microcopy">Published manual annotations, triangulated by the authors. Whole-leg scale and proximal anchors registered to the model.</p></article>
  <article class="motion-pane"><div class="motion-pane-title"><span class="tiny-label">03 / ANATOMY UNDER TEST</span><span class="evidence-pill ochre" id="motion-mode-badge">Fitted pose</span></div><div id="motion-body" class="motion-stage"><div id="motion-loading" role="status">Loading anatomy and running the muscle controls…</div></div><div class="motion-pane-caption"><label>Mode <select id="motion-mode" disabled><option value="pose">7-DOF pose fit</option><option value="reduced">3-DOF capacity audit</option><option value="tracking">Muscles track recording</option><option value="passive">Muscles passive</option></select></label><button id="motion-xray" class="text-button" aria-pressed="false" disabled>X-ray</button></div><p class="microcopy" id="motion-mode-description">Pose replay sets fitted joint angles. It tests anatomy; it is not a muscle or neural simulation.</p></article>
 </div>
 <div class="motion-legend">${legs.map((l, i) => `<button class="motion-leg ${i === 0 ? "active" : ""}" data-motion-leg="${l}" aria-pressed="${i === 0}"><i style="background:${colors[i]}"></i>${l}</button>`).join("")}<span>Select a leg to inspect its movement</span><label><input type="checkbox" id="motion-ghost" checked> Landmark overlay</label></div>
 <div class="motion-readouts"><div><span>7-DOF registration residual</span><strong id="motion-fit-rms">—</strong><small>all landmarks · in-sample</small></div><div><span>3-DOF registration residual</span><strong id="motion-reduced-rms">—</strong><small>same anatomy, four axes fixed</small></div><div><span>Muscle tracking error</span><strong id="motion-track-rms">—</strong><small>against the fitted pose target</small></div><div><span>Passive control error</span><strong id="motion-passive-rms">—</strong><small>same initial state, no excitation</small></div></div>
 <div class="motion-plots"><article><div class="tiny-label" id="motion-angle-label">LF / FEMUR–TIBIA INCLUDED ANGLE</div><canvas id="motion-angle-plot" aria-label="Measured, fitted and muscle-driven femur tibia angles"></canvas><p class="microcopy"><i class="plot-key measured"></i>Recorded geometry <i class="plot-key fitted"></i>Pose fit <i class="plot-key driven"></i>Muscle result. Geometry-derived included angle, not an Euler joint coordinate.</p></article><article><div class="tiny-label" id="motion-error-label">LF / CLAW POSITION ERROR</div><canvas id="motion-error-plot" aria-label="Claw registration and muscle tracking errors"></canvas><p class="microcopy"><i class="plot-key fitted"></i>Registration to recorded points <i class="plot-key driven"></i>Muscle tracking to fitted pose · mm in registered model coordinates.</p></article></div>
 <div class="motion-scope"><b id="motion-status">Preparing the comparison.</b><p>The muscle experiment has a fixed thorax, gravity and 84 hypothetical Hill actuators. It supplies recorded targets to an explicit feedback controller. No neural circuit, trained policy, ground contact or adhesion controls this bench. The free-walking experiment remains in <a href="#terrarium">Terrarium</a>.</p></div>
 <details class="motion-methods"><summary>What the precedent implements—and what these data can establish</summary><div class="motion-method-grid"><div><h3>Follow the measurements</h3><p>NeuroMechFly v2 recorded at 360 Hz and reports annotating at 120 Hz. This release has 37 video frames and 37 CSV rows (29–65). We pair their order; the embedded clip is encoded at 36 fps. Its burned-in “0.1×” label is not used as a measurement clock. Exact original timestamps and camera calibration are absent.</p><p>The 3D suit is displayed separately because the release does not include the original 2D labels or projection matrices. We do not invent a pixel-perfect video overlay. World translation, absolute body height and ground-truth foot slip cannot be recovered from this thorax-centered CSV alone.</p></div><div><h3>Keep processing visible</h3><p>The authors’ reusable step template is time-normalized to 0.135 s, mirrored, forced closed and selected for simulated forward displacement. Our main view instead retains the original 37-frame episode, its left/right differences and endpoints. It stops at the end rather than inventing a seamless cycle.</p><p>SeqIKPy performs whole-leg registration and sequential inverse kinematics. We refine its angles against the actual NMF joint offsets and publish all residuals. The seven-axis and three-axis fits use the same anatomy and targets. These are fitting errors, not independent biological validation. Some fitted roll changes are abrupt (up to 71° per sample); annotation noise and IK ambiguity remain unresolved.</p></div></div><p><a href="#literature/nmf2-motion">NeuroMechFly v2</a> · <a href="#literature/seqik">SeqIKPy</a> · <a href="/motion/source/annotations.csv">Unmodified CSV</a> · <a href="/motion/recording.json">Derived poses & provenance</a> · <a href="/motion/manifest.json">Anatomy manifest</a> · <a href="/motion/assay.json">Reproducible assay</a> · <a href="https://github.com/YesterdaysLemon/dmelanogaster/blob/main/docs/motion.md" target="_blank" rel="noopener">Full methods ↗</a></p></details>
</section>`;

const $ = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
class Landmarks {
  readonly group = new THREE.Group();
  private lines: THREE.Line[] = [];
  private dots: THREE.Mesh[][] = [];
  constructor(opacity = 1) {
    for (let i = 0; i < 6; i++) {
      const line = new THREE.Line(
        new THREE.BufferGeometry().setAttribute(
          "position",
          new THREE.BufferAttribute(new Float32Array(15), 3),
        ),
        new THREE.LineBasicMaterial({
          color: colors[i],
          transparent: true,
          opacity,
          depthTest: false,
        }),
      );
      line.renderOrder = 20;
      this.lines.push(line);
      this.group.add(line);
      const dots = Array.from(
        { length: 5 },
        () =>
          new THREE.Mesh(
            new THREE.SphereGeometry(0.032, 10, 8),
            new THREE.MeshBasicMaterial({
              color: colors[i],
              transparent: true,
              opacity,
              depthTest: false,
            }),
          ),
      );
      dots.forEach((d) => {
        d.renderOrder = 21;
        this.group.add(d);
      });
      this.dots.push(dots);
    }
  }
  set(points: number[][], selected: number) {
    this.lines.forEach((line, l) => {
      const a = line.geometry.getAttribute("position");
      for (let j = 0; j < 5; j++) {
        const p = points[l * 5 + j];
        a.setXYZ(j, ...(p as [number, number, number]));
        this.dots[l][j].position.set(...(p as [number, number, number]));
      }
      a.needsUpdate = true;
      line.geometry.computeBoundingSphere();
      (line.material as THREE.LineBasicMaterial).opacity =
        l === selected ? 1 : 0.4;
      this.dots[l].forEach((d) => {
        (d.material as THREE.MeshBasicMaterial).opacity =
          l === selected ? 1 : 0.35;
      });
    });
  }
}
function included(p: number[][]) {
  const a = new THREE.Vector3()
    .fromArray(p[1])
    .sub(new THREE.Vector3().fromArray(p[2]));
  const b = new THREE.Vector3()
    .fromArray(p[3])
    .sub(new THREE.Vector3().fromArray(p[2]));
  return (a.angleTo(b) * 180) / Math.PI;
}
function distance(a: number[], b: number[]) {
  return Math.hypot(...a.map((v, i) => v - b[i]));
}
function plot(
  canvas: HTMLCanvasElement,
  series: { values: number[]; color: string }[],
  frame: number,
  unit: string,
) {
  const w = canvas.clientWidth,
    h = canvas.clientHeight;
  if (!w || !h) return;
  const ratio = Math.min(devicePixelRatio, 2);
  canvas.width = w * ratio;
  canvas.height = h * ratio;
  const c = canvas.getContext("2d")!;
  c.scale(ratio, ratio);
  const all = series.flatMap((s) => s.values),
    min =
      unit === "°" ? Math.max(0, Math.floor(Math.min(...all) / 20) * 20) : 0;
  const max =
    unit === "°"
      ? Math.ceil(Math.max(...all) / 20) * 20
      : Math.max(0.05, Math.ceil(Math.max(...all) * 20) / 20);
  const x = (i: number) => 42 + (i / (series[0].values.length - 1)) * (w - 56),
    y = (v: number) => h - 28 - ((v - min) / (max - min || 1)) * (h - 44);
  c.font = "11px sans-serif";
  c.lineWidth = 1;
  for (let i = 0; i <= 3; i++) {
    const v = min + ((max - min) * i) / 3;
    c.strokeStyle = "#dce1d4";
    c.beginPath();
    c.moveTo(42, y(v));
    c.lineTo(w - 14, y(v));
    c.stroke();
    c.fillStyle = "#748071";
    c.fillText(
      (unit === "°" ? v.toFixed(0) : v.toFixed(2)) + unit,
      0,
      y(v) + 4,
    );
  }
  series.forEach((s) => {
    c.strokeStyle = s.color;
    c.lineWidth = 1.8;
    c.beginPath();
    s.values.forEach((v, i) =>
      i ? c.lineTo(x(i), y(v)) : c.moveTo(x(i), y(v)),
    );
    c.stroke();
  });
  c.strokeStyle = "#b8a989";
  c.beginPath();
  c.moveTo(x(frame), 12);
  c.lineTo(x(frame), h - 28);
  c.stroke();
  c.fillStyle = "#748071";
  c.fillText("0.000 s", 42, h - 7);
  c.fillText("0.300 s", w - 60, h - 7);
}

export function initMotion() {
  let started = false;
  async function boot() {
    if (started) return;
    started = true;
    try {
      const fetchChecked = async (path: string) => {
        const r = await fetch(path);
        if (!r.ok) throw Error("Motion asset unavailable: " + path);
        return r;
      };
      const [manifest, recording, wasm] = await Promise.all([
        fetchChecked("/motion/manifest.json").then((r) =>
          r.json(),
        ) as Promise<MotionManifest>,
        fetchChecked("/motion/recording.json").then((r) =>
          r.json(),
        ) as Promise<MotionRecording>,
        fetchChecked(wasmUrl)
          .then((r) => r.arrayBuffer())
          .then((b) => new Uint8Array(b)),
      ]);
      const bench: MotionBench = await createMotionBench(
        manifest,
        recording,
        (p) =>
          fetchChecked("/motion/" + p)
            .then((r) => r.arrayBuffer())
            .then((b) => new Uint8Array(b)),
        wasm,
      );
      const traces = {
        tracking: bench.run("tracking"),
        passive: bench.run("passive"),
      };
      const body = new FlyViewer($("motion-body"), bench, undefined, true);
      $("motion-loading").remove();
      const bodyPoints = new Landmarks(0.7);
      body.scene.add(bodyPoints.group);
      const host = $("motion-skeleton"),
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
      host.append(renderer.domElement);
      const scene = new THREE.Scene(),
        camera = new THREE.PerspectiveCamera(32, 1, 0.01, 100);
      camera.up.set(0, 0, 1);
      const control = new OrbitControls(camera, renderer.domElement);
      control.enableDamping = true;
      control.minDistance = 2;
      control.maxDistance = 12;
      const suit = new Landmarks();
      scene.add(suit.group);
      const grid = new THREE.GridHelper(6, 12, 0x9ca990, 0xd0d8c8);
      grid.rotation.x = Math.PI / 2;
      scene.add(grid);
      function home() {
        camera.position.set(3.5, 5, 3.8);
        control.target.set(-0.35, 0, 0.95);
        control.update();
        body.focus("body");
      }
      home();
      const resize = () => {
        const w = host.clientWidth,
          h = host.clientHeight;
        if (w && h) {
          renderer.setSize(w, h);
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
        }
      };
      new ResizeObserver(resize).observe(host);
      resize();
      const video = $<HTMLVideoElement>("motion-video"),
        canvas = $<HTMLCanvasElement>("motion-video-canvas");
      let frame = 0,
        selected = 0,
        playing = false,
        accumulator = 0,
        mode = "pose",
        last = performance.now();
      function drawVideo() {
        if (video.readyState < 2 || !canvas.clientWidth || !canvas.clientHeight)
          return;
        const which = $<HTMLSelectElement>("motion-camera").value;
        const crops: Record<string, number[]> = {
          all: [570, 35, 620, 920],
          middle: [570, 335, 620, 360],
          top: [570, 35, 620, 270],
          bottom: [570, 745, 620, 205],
        };
        const [sx, sy, sw, sh] = crops[which];
        const pixelRatio = Math.min(devicePixelRatio, 2);
        canvas.width = Math.round(canvas.clientWidth * pixelRatio);
        canvas.height = Math.round(canvas.clientHeight * pixelRatio);
        const c = canvas.getContext("2d")!;
        c.fillStyle = "#141915";
        c.fillRect(0, 0, canvas.width, canvas.height);
        const ratio = Math.min(canvas.width / sw, canvas.height / sh);
        const w = sw * ratio,
          h = sh * ratio;
        c.drawImage(
          video,
          sx,
          sy,
          sw,
          sh,
          (canvas.width - w) / 2,
          (canvas.height - h) / 2,
          w,
          h,
        );
      }
      video.addEventListener("seeked", drawVideo);
      new ResizeObserver(drawVideo).observe(canvas);
      video.addEventListener("loadeddata", () => {
        update();
        drawVideo();
      });
      video.addEventListener("error", () => {
        $("motion-status").textContent =
          "The source video could not be decoded. The recorded 3D annotations and model comparison remain available.";
      });
      function charts() {
        $("motion-angle-label").textContent =
          legs[selected] + " / FEMUR–TIBIA INCLUDED ANGLE";
        $("motion-error-label").textContent =
          legs[selected] + " / CLAW POSITION ERROR";
        const slice = (p: number[][]) =>
          p.slice(selected * 5, selected * 5 + 5);
        plot(
          $("motion-angle-plot"),
          [
            { values: recording.ftiAngles[legs[selected]], color: "#9caaa0" },
            {
              values: recording.fittedLandmarks.map((p) => included(slice(p))),
              color: "#317c96",
            },
            {
              values: traces.tracking.landmarks.map((p) => included(slice(p))),
              color: "#b65d27",
            },
          ],
          frame,
          "°",
        );
        const i = selected * 5 + 4;
        plot(
          $("motion-error-plot"),
          [
            {
              values: recording.landmarks.map((p, f) =>
                distance(p[i], recording.fittedLandmarks[f][i]),
              ),
              color: "#317c96",
            },
            {
              values: traces.tracking.landmarks.map((p, f) =>
                distance(p[i], recording.fittedLandmarks[f][i]),
              ),
              color: "#b65d27",
            },
          ],
          frame,
          "mm",
        );
      }
      const descriptions: Record<string, string> = {
        pose: "Pose replay sets fitted joint angles. It tests anatomy; it is not a muscle or neural simulation.",
        reduced:
          "Same anatomy and landmarks, but only three joint freedoms vary per leg. The other four stay at their initial fitted angles.",
        tracking:
          "Recorded targets recruit 84 experimental Hill muscles through feedback. This is a tethered mechanics assay, not reconstructed neural control.",
        passive:
          "Same initial pose, gravity and damping. All muscle excitation is zero. The thorax stays fixed.",
      };
      function update() {
        const trace =
          mode === "tracking"
            ? traces.tracking
            : mode === "passive"
              ? traces.passive
              : undefined;
        bench.pose(frame, trace);
        if (mode === "reduced") {
          bench.data.qpos.set(recording.reducedQpos[frame]);
          bench.mujoco.mj_forward(bench.model, bench.data);
        }
        suit.set(recording.landmarks[frame], selected);
        bodyPoints.set(recording.landmarks[frame], selected);
        bodyPoints.group.visible = $<HTMLInputElement>("motion-ghost").checked;
        $("motion-time").textContent =
          `${recording.times[frame].toFixed(3)} s · source row ${recording.sourceFrames[frame]} · ${frame + 1} / 37`;
        $<HTMLInputElement>("motion-scrub").value = String(frame);
        $("motion-play").textContent = playing ? "Ⅱ Pause" : "▶ Play recording";
        $("motion-mode-description").textContent = descriptions[mode];
        $("motion-mode-badge").textContent = (
          {
            pose: "Fitted pose",
            reduced: "Reduced fit",
            tracking: "Muscle dynamics",
            passive: "Passive control",
          } as Record<string, string>
        )[mode];
        const t = (frame + 0.05) / recording.videoFps;
        if (video.readyState >= 1 && Math.abs(video.currentTime - t) > 0.002)
          video.currentTime = t;
        drawVideo();
        charts();
        body.update();
      }
      $("motion-play").onclick = () => {
        playing = !playing;
        if (playing && frame === 36) frame = 0;
        accumulator = 0;
        update();
      };
      $("motion-prev").onclick = () => {
        playing = false;
        frame = Math.max(0, frame - 1);
        update();
      };
      $("motion-next").onclick = () => {
        playing = false;
        frame = Math.min(36, frame + 1);
        update();
      };
      $("motion-scrub").oninput = () => {
        playing = false;
        frame = Number($<HTMLInputElement>("motion-scrub").value);
        update();
      };
      $("motion-mode").onchange = () => {
        mode = $<HTMLSelectElement>("motion-mode").value;
        update();
      };
      $("motion-camera").onchange = drawVideo;
      $("motion-ghost").onchange = update;
      $("motion-home").onclick = home;
      $("motion-xray").onclick = () => {
        $("motion-xray").setAttribute(
          "aria-pressed",
          String(body.toggleXray()),
        );
      };
      document.querySelectorAll<HTMLButtonElement>("[data-motion-leg]").forEach(
        (b, i) =>
          (b.onclick = () => {
            selected = i;
            document.querySelectorAll("[data-motion-leg]").forEach((el, j) => {
              el.classList.toggle("active", j === i);
              el.setAttribute("aria-pressed", String(j === i));
            });
            update();
          }),
      );
      $("motion-fit-rms").textContent =
        recording.registration.landmarkRmsMm.toFixed(3) + " mm";
      $("motion-reduced-rms").textContent =
        recording.registration.reducedRmsMm.toFixed(3) + " mm";
      $("motion-track-rms").textContent =
        traces.tracking.rmsMarkerMm.toFixed(3) + " mm";
      $("motion-passive-rms").textContent =
        traces.passive.rmsMarkerMm.toFixed(3) + " mm";
      $("motion-status").textContent =
        "Recording → registered landmarks → fitted anatomy → experimental muscle response.";
      [
        "motion-play",
        "motion-prev",
        "motion-next",
        "motion-scrub",
        "motion-mode",
        "motion-xray",
        "motion-home",
      ].forEach((id) => ($<HTMLButtonElement>(id).disabled = false));
      // Read-only inspection surface for transparent acceptance checks.
      (window as unknown as { flyMotion: unknown }).flyMotion = {
        recording,
        traces,
        get frame() {
          return frame;
        },
        get mode() {
          return mode;
        },
      };
      new ResizeObserver(charts).observe($("motion-angle-plot"));
      function animate(now: number) {
        if (!$("motion").hidden && !document.hidden) {
          if (playing) {
            accumulator +=
              Math.min((now - last) / 1000, 0.1) *
              Number($<HTMLSelectElement>("motion-speed").value) *
              120;
            if (accumulator >= 1) {
              frame = Math.min(36, frame + Math.floor(accumulator));
              accumulator %= 1;
              if (frame === 36) playing = false;
              update();
            }
          }
          control.update();
          renderer.render(scene, camera);
          body.update();
        }
        last = now;
        requestAnimationFrame(animate);
      }
      update();
      requestAnimationFrame(animate);
    } catch (error) {
      console.error(error);
      $("motion-status").textContent =
        "Could not load the motion comparison. Reload to retry; source files remain linked below.";
      if ($("motion-loading"))
        $("motion-loading").textContent =
          "Motion data or anatomy could not be loaded.";
    }
  }
  const route = () => {
    if (location.hash.slice(1).split("/")[0] === "motion") void boot();
  };
  window.addEventListener("hashchange", route);
  route();
}
