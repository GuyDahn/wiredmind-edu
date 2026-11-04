"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Box3,
  ConeGeometry,
  CylinderGeometry,
  MeshBasicMaterial,
  Object3D,
  PerspectiveCamera,
  Sphere,
  SphereGeometry,
  Vector3,
  type InstancedMesh,
  type LineSegments,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { TICK_MS } from "../sim/index.js";
import { samplePath, type NeuronPaths } from "./centerline.js";
import { placeBadges } from "./badges.js";
import { drainCommands, setPoker, type ViewerCommand } from "./commands.js";
import {
  activityByGroup,
  AFTERGLOW_FAST_MS,
  AFTERGLOW_MS,
  FLASH_DECAY_MS,
} from "./flash.js";
import { frameBox, frameSphere, type Box } from "./fit.js";
import { writeFocus } from "./groups.js";
import { groupColor } from "./module.js";
import { JourneyRig, type JourneyState } from "./journey-rig.js";
import { DIM_LEVEL, PATHWAY_DIM_LEVEL } from "./materials.js";
import { pathwayFor, WaveTracker } from "./pathway.js";
import {
  boxForGroups,
  loadError,
  openCircuit,
  watchLoadProgress,
  type LoadedCircuit,
} from "./load-circuit.js";
import { activePlayback, recordCommand, restartRecording } from "./recorder.js";
import type { StepResult } from "./session.js";
import { useViewerStore } from "./store.js";
import type { ModuleSpec } from "./types.js";

const MAX_DOTS = 32;
/** Spike dot radius as a share of the framed region, so dots read the same zoomed in or out. */
const DOT_SHARE = 0.013;
const MIN_MODEL_MS = 0.2;
const MAX_MODEL_MS = 2;
/** Wall ms between activity meter and puff clock updates. */
const PUBLISH_MS = 100;
/** A little margin around whatever the camera fits: the frame, not the text. */
const FRAME_PADDING = 1.08;
/** Wall ms the camera takes to glide to a new frame. Reduced motion jumps. */
const GLIDE_MS = 550;
/** The light's glowing ball, as a share of the framed region. */
const LIGHT_SHARE = 0.03;

/**
 * MaleCNS runs +y toward the fly's belly and +z toward its tail, so the
 * camera's up is -y and it sits ahead of the fly, to its side and a little
 * above: the brain upright, the nerve cord trailing down and away, the same
 * way up as the body the zoom journey shows it in.
 */
const CAMERA_UP: [number, number, number] = [0, -1, 0];
const CAMERA_DIRECTION = new Vector3(0.72, -0.42, -0.86).normalize();

function toBox(box: Box3): Box {
  return {
    min: { x: box.min.x, y: box.min.y, z: box.min.z },
    max: { x: box.max.x, y: box.max.y, z: box.max.z },
  };
}

type Dot = { neuron: number; ageMs: number };

const NO_SPIKES = new Uint8Array(0);

type Runtime = {
  dots: Dot[];
  cursor: number;
  /** The puff the footer clock follows: its group and first tick. */
  puff: { colorGroup: string; startTick: number } | null;
  /** The order the lesson lists for this wave, or null if it lists none. */
  expected: string[] | null;
  /** In step mode, the place in `expected` the wave stops at next. */
  stepAt: number;
};

type Glide = {
  fromPosition: Vector3;
  toPosition: Vector3;
  fromTarget: Vector3;
  toTarget: Vector3;
  elapsedMs: number;
};

/** The groups in focus while a wave is on screen: the ones its pathway lists, and any that fired. */
function pathwayGroups(): string[] {
  const store = useViewerStore.getState();
  if (!store.pathway) return store.focus;
  const listed = pathwayFor(
    store.pathways,
    store.pathway.stimulus,
    store.pathway.silenced,
  );
  return [
    ...new Set([
      store.pathway.stimulus,
      ...(listed?.order ?? []),
      ...store.wave,
    ]),
  ];
}

function ignoreRaycast() {
  return undefined;
}

export default function Scene({
  module,
  journeyGroup,
}: {
  module: ModuleSpec;
  /** Color group the zoom journey picks its one neuron from. */
  journeyGroup: string;
}) {
  const [model, setModel] = useState<LoadedCircuit | null>(null);
  const opening = useViewerStore((state) => state.chapter !== "lesson");

  // The body is a small file, fetched while the story is still being read.
  useEffect(() => {
    if (opening) void import("./fly-body.js").then((body) => body.openBody());
  }, [opening]);

  useEffect(() => {
    let active = true;
    const stop = watchLoadProgress((fraction) => {
      if (active) useViewerStore.getState().setProgress(fraction);
    });
    useViewerStore.getState().setStatus("loading");
    const ticket = openCircuit(module);
    void ticket.promise.then(
      (loaded) => {
        if (!active) return;
        setModel(loaded);
        useViewerStore.getState().setProgress(1);
        useViewerStore.getState().setStatus("ready");
      },
      (error: unknown) => {
        if (!active) return;
        // The reader gets a plain sentence; developers get the details.
        console.error(error);
        useViewerStore.getState().setStatus("error", loadError(error));
      },
    );
    return () => {
      active = false;
      stop();
      ticket.release();
      setModel(null);
    };
  }, [module]);

  useEffect(() => {
    const store = useViewerStore.getState();
    store.setCompass(model?.compass ?? null);
    store.setCircuit(model ? module.id : null);
    return () => {
      useViewerStore.getState().setCompass(null);
      useViewerStore.getState().setCircuit(null);
    };
  }, [model, module.id]);

  return (
    <Canvas
      flat
      frameloop="demand"
      dpr={[1, 1.5]}
      camera={{
        fov: 42,
        near: 0.1,
        far: 8000,
        position: [0, 0, -800],
        up: CAMERA_UP,
      }}
      gl={{ antialias: true, alpha: false }}
      className="h-full w-full touch-none"
    >
      <color attach="background" args={["#09090b"]} />
      {model ? (
        <CircuitView
          model={model}
          module={module}
          journeyGroup={journeyGroup}
        />
      ) : null}
    </Canvas>
  );
}

function CircuitView({
  model,
  module,
  journeyGroup,
}: {
  model: LoadedCircuit;
  module: ModuleSpec;
  journeyGroup: string;
}) {
  const camera = useThree((state) => state.camera);
  const gl = useThree((state) => state.gl);
  const size = useThree((state) => state.size);
  const invalidate = useThree((state) => state.invalidate);
  const orbitRef = useRef<OrbitControls | null>(null);
  const dotsRef = useRef<InstancedMesh>(null);
  const linesRef = useRef<LineSegments>(null);
  const journey = useViewerStore((state) => state.chapter === "journey");
  const journeyState = useRef<JourneyState>({ flying: false });
  const fittedAspect = useRef<number | null>(null);
  const fittedDistance = useRef<number | null>(null);
  const modelMs = useRef(1);
  const publishClock = useRef(0);
  const runtime = useRef<Runtime>({
    dots: [],
    cursor: 0,
    puff: null,
    expected: null,
    stepAt: 0,
  });
  const failed = useRef(false);
  const allowDots = useRef(true);
  /** Groups the camera fits now. Null: the lesson step's focus. */
  const framed = useRef<string[] | null>(null);
  const glide = useRef<Glide | null>(null);
  const lastView = useRef("");
  const tracker = useMemo(
    () => new WaveTracker(model.session.groups, model.focus.length),
    [model],
  );
  /** Each group's middle, and the light's two ends: where their labels sit. */
  const anchors = useMemo(() => {
    const points = new Map<string, Vector3>();
    for (const name of model.session.groups.keys()) {
      const box = boxForGroups(model.paths, model.session.groups, [name]);
      if (box) points.set(name, box.getCenter(new Vector3()));
    }
    if (model.light) {
      points.set("light", model.light.source);
      points.set("eye", model.light.eye);
    }
    return points;
  }, [model]);
  /** The light, a beam from it, and an arrowhead where the beam meets the eye. */
  const lightParts = useMemo(() => {
    if (!model.light) return null;
    const { source, eye } = model.light;
    const ball = Math.max(
      model.frameBounds.getBoundingSphere(new Sphere()).radius * LIGHT_SHARE,
      1,
    );
    const length = source.distanceTo(eye);
    const head = Math.min(ball * 2.2, length * 0.4);
    // Cylinders and cones stand along +y: turn them to point from light to eye.
    const toward = eye.clone().sub(source).normalize();
    const turn = new Object3D();
    turn.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), toward);
    const beamMaterial = new MeshBasicMaterial({
      color: "#fde68a",
      transparent: true,
      opacity: 0.75,
    });
    beamMaterial.toneMapped = false;
    const ballMaterial = new MeshBasicMaterial({ color: "#fde047" });
    ballMaterial.toneMapped = false;
    return {
      ball: new SphereGeometry(ball, 16, 12),
      ballMaterial,
      beam: new CylinderGeometry(ball * 0.22, ball * 0.22, length - head, 8),
      beamAt: source.clone().addScaledVector(toward, (length - head) / 2),
      arrow: new ConeGeometry(ball * 0.7, head, 12),
      arrowAt: eye.clone().addScaledVector(toward, -head / 2),
      beamMaterial,
      quaternion: turn.quaternion,
    };
  }, [model]);
  const sizeRef = useRef(size);
  sizeRef.current = size;
  const dummy = useMemo(() => new Object3D(), []);
  const dotGeometry = useMemo(() => {
    const radius = model.frameBounds.getBoundingSphere(new Sphere()).radius;
    return new SphereGeometry(Math.max(radius * DOT_SHARE, 0.5), 10, 8);
  }, [model]);
  const dotMaterial = useMemo(() => {
    const material = new MeshBasicMaterial({ color: "#fff7e8" });
    material.toneMapped = false;
    return material;
  }, []);

  const placeCamera = useCallback(
    (force: boolean, smooth = false, keepAngle = false) => {
      const perspective = camera as PerspectiveCamera;
      if (perspective.isPerspectiveCamera !== true) return;
      // The zoom journey flies the camera itself.
      if (useViewerStore.getState().chapter === "journey") return;
      const view = sizeRef.current;
      if (view.width < 2 || view.height < 2) return;
      const aspect = view.width / view.height;
      if (
        !force &&
        fittedAspect.current !== null &&
        Math.abs(aspect - fittedAspect.current) < 0.02
      ) {
        return;
      }
      fittedAspect.current = aspect;
      // What the lesson asked to frame (a pathway, or the group a step-mode
      // wave stopped on), else the current step's highlighted groups, or the
      // module's whole frame once nothing is highlighted (free play, or the
      // check question).
      const focusNames = framed.current ?? useViewerStore.getState().focus;
      const focusBox =
        focusNames.length > 0
          ? boxForGroups(model.paths, model.session.groups, focusNames)
          : null;
      const box = (focusBox ?? model.frameBounds).clone();
      // Where the light shines in is part of every view of its lesson.
      if (model.light) {
        box.expandByPoint(model.light.source).expandByPoint(model.light.eye);
      }
      const center = box.getCenter(new Vector3());
      const boxRadius = box.getBoundingSphere(new Sphere()).radius;
      const orbitNow = orbitRef.current;
      const direction =
        keepAngle && orbitNow
          ? perspective.position.clone().sub(orbitNow.target).normalize()
          : CAMERA_DIRECTION;
      const frame = frameBox(
        toBox(box),
        { x: direction.x, y: direction.y, z: direction.z },
        perspective.fov,
        aspect,
        FRAME_PADDING,
      );
      const wholeRadius = model.bounds.getBoundingSphere(new Sphere()).radius;
      const whole = frameSphere(wholeRadius, perspective.fov, aspect);
      // Farthest the learner can zoom out, framed on a part or on everything.
      const reach = Math.max(frame.distance, whole.distance) * 3;
      const orbit = orbitRef.current;
      perspective.aspect = aspect;
      if (
        smooth &&
        orbit &&
        !window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        stopOrbitDrift(orbit);
        glide.current = {
          fromPosition: perspective.position.clone(),
          toPosition: center.clone().addScaledVector(direction, frame.distance),
          fromTarget: orbit.target.clone(),
          toTarget: center.clone(),
          elapsedMs: 0,
        };
      } else if (force || !orbit || fittedDistance.current === null) {
        glide.current = null;
        if (orbit) stopOrbitDrift(orbit);
        perspective.position
          .copy(center)
          .addScaledVector(direction, frame.distance);
        perspective.lookAt(center);
        orbit?.target.copy(center);
      } else {
        // The phone sheet grows and shrinks the canvas. Keep the learner's
        // turn and zoom, and only scale the distance to the new fit.
        const offset = perspective.position.clone().sub(orbit.target);
        offset.multiplyScalar(frame.distance / fittedDistance.current);
        perspective.position.copy(orbit.target).add(offset);
      }
      fittedDistance.current = frame.distance;
      perspective.near = frame.near;
      // Past the whole circuit even from the farthest zoom.
      perspective.far = reach + wholeRadius * 3;
      perspective.updateProjectionMatrix();
      if (orbit) {
        orbit.minDistance = Math.max(boxRadius * 0.18, frame.near * 2);
        orbit.maxDistance = reach;
        orbit.update();
      }
      invalidate();
    },
    [
      camera,
      invalidate,
      model.bounds,
      model.frameBounds,
      model.light,
      model.paths,
      model.session,
    ],
  );

  useLayoutEffect(() => {
    placeCamera(false);
  }, [placeCamera, size.width, size.height]);

  // No spikes yet, so no dots: an instanced mesh draws all of them, at the
  // origin, until it is told how many there are.
  useLayoutEffect(() => {
    if (dotsRef.current) dotsRef.current.count = 0;
  }, [model]);

  // Whatever ran on this circuit before (it is cached across pages) is not
  // part of the next recording. The lesson or replay resets it next.
  useEffect(() => {
    restartRecording(model.session.seed, performance.now());
  }, [model]);

  useEffect(() => {
    allowDots.current = !window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches;
    const orbit = new OrbitControls(camera, gl.domElement);
    orbit.enableDamping = true;
    orbit.dampingFactor = 0.08;
    orbit.rotateSpeed = 0.85;
    orbit.zoomSpeed = 0.9;
    orbit.screenSpacePanning = true;
    gl.domElement.style.touchAction = "none";
    const onChange = () => invalidate();
    orbit.addEventListener("change", onChange);
    // Frames stop while the tab is hidden, so a puff sent then (or cut off
    // by switching apps) needs a nudge to finish when the learner comes back.
    document.addEventListener("visibilitychange", onChange);
    orbitRef.current = orbit;
    placeCamera(true);
    setPoker(() => invalidate());
    invalidate();
    return () => {
      orbit.removeEventListener("change", onChange);
      document.removeEventListener("visibilitychange", onChange);
      orbit.dispose();
      orbitRef.current = null;
      setPoker(() => undefined);
    };
  }, [camera, gl, invalidate, placeCamera]);

  // Back from the journey: the lesson's own highlight and framing again.
  useEffect(() => {
    if (journey) return;
    writeFocus(model.focus, model.session.groups, pathwayGroups());
    model.focusTexture.needsUpdate = true;
    placeCamera(true);
  }, [journey, model, placeCamera]);

  /** Step mode stops on the group it waits for as soon as that group has fired. */
  const stopIfFired = useCallback((): boolean => {
    const store = useViewerStore.getState();
    const run = runtime.current;
    if (!store.stepMode || !model.session.running()) return false;
    // A puff the lesson lists no pathway for stops at each group as it fires.
    const target = (run.expected ?? tracker.order)[run.stepAt];
    if (target === undefined || !tracker.order.includes(target)) return false;
    store.setWave([...tracker.order], target);
    store.setPaused(true);
    return true;
  }, [model, tracker]);

  /** "Next group": on to the next group of the pathway, unless it has fired already. */
  const resume = useCallback(() => {
    runtime.current.stepAt += 1;
    stopIfFired();
    invalidate();
  }, [stopIfFired, invalidate]);

  // Focus mode: while a wave is on screen, its pathway is drawn in full and
  // everything else falls to a tenth of its brightness. Between waves the
  // step's own highlight is drawn, with the rest dimmed less.
  useEffect(() => {
    const paint = () => {
      const store = useViewerStore.getState();
      if (store.chapter === "journey") return;
      const names = pathwayGroups();
      writeFocus(model.focus, model.session.groups, names);
      model.dim.value = store.pathway ? PATHWAY_DIM_LEVEL : DIM_LEVEL;
      model.focusTexture.needsUpdate = true;
      // What the shader was just given, for the page and its tests.
      const stage = gl.domElement.closest<HTMLElement>("[data-stage]");
      if (stage) {
        stage.dataset.focusGroups = names.join(" ");
        stage.dataset.dimLevel = String(model.dim.value);
      }
      invalidate();
    };
    paint();
    return useViewerStore.subscribe((state, prev) => {
      if (state.focus !== prev.focus) {
        // A new step (or leaving one, for free play): its wave is over.
        // Glide to what it highlights, and leave the learner's own orbit
        // and zoom alone until the next one.
        if (state.pathway) useViewerStore.getState().setPathway(null);
        framed.current = null;
        paint();
        placeCamera(true, true);
        return;
      }
      if (
        state.pathway !== prev.pathway ||
        state.wave !== prev.wave ||
        state.pathways !== prev.pathways
      ) {
        paint();
      }
      // "Reset view": the whole pathway in view, from the usual side.
      if (state.viewRequest !== prev.viewRequest) {
        framed.current = state.pathway ? pathwayGroups() : null;
        placeCamera(true, true);
      }
      // Step mode stopped on a group: bring it into view, from where the
      // learner is looking.
      if (state.paused && !prev.paused && state.current) {
        framed.current = [state.current];
        placeCamera(true, true, true);
      }
      if (prev.paused && !state.paused) resume();
      if (state.stepMode && !prev.stepMode) {
        // Switched on mid-wave: stop at the next group still to fire.
        const run = runtime.current;
        const done = new Set(state.wave);
        const order = run.expected ?? state.wave;
        run.stepAt = 0;
        while (done.has(order[run.stepAt] ?? "")) run.stepAt += 1;
      }
      if (state.speed !== prev.speed || state.stepMode !== prev.stepMode) {
        invalidate();
      }
    });
  }, [model, gl, invalidate, placeCamera, resume]);

  useEffect(() => {
    return () => {
      dotGeometry.dispose();
      dotMaterial.dispose();
    };
  }, [dotGeometry, dotMaterial]);

  useEffect(() => {
    if (!lightParts) return;
    return () => {
      lightParts.beam.dispose();
      lightParts.arrow.dispose();
      lightParts.beamMaterial.dispose();
      lightParts.ball.dispose();
      lightParts.ballMaterial.dispose();
    };
  }, [lightParts]);

  const applyCommand = useCallback(
    (command: ViewerCommand, wallMs: number) => {
      const store = useViewerStore.getState();
      const state = runtime.current;
      if (command.type === "reset") {
        model.session.reset(command.seed);
        model.flash.clear();
        model.texture.needsUpdate = true;
        model.compass?.clear();
        tracker.reset();
        state.dots = [];
        state.puff = null;
        state.expected = null;
        state.stepAt = 0;
        const mesh = dotsRef.current;
        if (mesh) {
          mesh.count = 0;
          mesh.instanceMatrix.needsUpdate = true;
        }
        restartRecording(model.session.seed, wallMs);
        store.resetControls();
        return;
      }
      recordCommand(command, model.session.clock, wallMs);
      if (command.type === "stimulate") {
        // A new wave: number it from 1, and let the last one's glow go.
        const silenced = Object.keys(store.silenced).filter(
          (name) => store.silenced[name],
        );
        tracker.reset();
        model.flash.clearGlow();
        model.texture.needsUpdate = true;
        state.expected =
          pathwayFor(store.pathways, command.colorGroup, silenced)?.order ??
          null;
        state.stepAt = 0;
        store.setPaused(false);
        store.setWave([], null);
        store.setPathway({
          stimulus: command.colorGroup,
          silenced: silenced.sort(),
        });
        model.session.stimulate(
          command.colorGroup,
          module.stimulusHz,
          module.stimulusMs,
        );
        state.puff = {
          colorGroup: command.colorGroup,
          startTick: model.session.clock,
        };
        store.setStimulating(command.colorGroup, true);
        store.setPuff({
          colorGroup: command.colorGroup,
          elapsedMs: 0,
          totalMs: module.stimulusMs,
        });
        return;
      }
      model.session.setSilenced(command.colorGroup, command.on);
      store.setSilenced(command.colorGroup, command.on);
      // The brain starts over at rest, so no wave is on screen.
      tracker.reset();
      state.expected = null;
      store.setPaused(false);
      store.setPathway(null);
      store.setWave([], null);
    },
    [model, module, tracker],
  );

  useFrame((_, delta) => {
    if (failed.current) return;
    const wallMs = Math.min(Math.max(delta, 0) * 1000, 64);
    const gliding = stepGlide(wallMs);
    const moving = journeyState.current.flying
      ? false
      : (orbitRef.current?.update() ?? false) || gliding;
    let busy = moving;
    try {
      if (!document.hidden) {
        const now = performance.now();
        for (const command of drainCommands()) applyCommand(command, now);
        const state = runtime.current;
        const settings = useViewerStore.getState();
        const paused = settings.paused;
        model.flash.glowMs = !allowDots.current
          ? null
          : settings.speed === 1
            ? AFTERGLOW_FAST_MS
            : AFTERGLOW_MS;
        const budget = paused
          ? 0
          : Math.max(
              1,
              Math.round((modelMs.current * settings.speed) / TICK_MS),
            );
        const quiet = () =>
          !model.session.running() &&
          !model.flash.busy &&
          state.dots.length === 0;
        const started = performance.now();
        let result: StepResult | null = null;
        let left = budget;
        const playback = activePlayback();
        let joined = false;
        if (playback && !playback.finished && !paused) {
          const outcome = playback.frame(
            model.session,
            budget,
            now,
            quiet,
            (command) => applyCommand(command, now),
          );
          result = outcome.result;
          left = outcome.left;
          busy = true;
          if (result && tracker.observe(result.spikes).length > 0) {
            joined = true;
          }
          if (outcome.applied > 0) {
            useViewerStore.getState().setPlayback({
              applied: playback.applied,
              total: playback.total,
              done: false,
            });
          }
        }
        // Step mode runs tick by tick, so it can stop on the very tick a
        // group fires. Otherwise a frame's ticks run in one go and the wave
        // is read once, which keeps a busy machine from slowing it further.
        let stopped = false;
        const chunk = settings.stepMode ? 1 : left;
        let ran = 0;
        while (ran < left && model.session.running()) {
          const ticks = Math.min(chunk, left - ran);
          const step = model.session.advance(ticks, result !== null);
          ran += ticks;
          result = {
            spikes: step.spikes,
            finished: [...(result?.finished ?? []), ...step.finished],
          };
          if (tracker.observe(step.spikes).length === 0) continue;
          joined = true;
          if (stopIfFired()) {
            stopped = true;
            break;
          }
        }
        if (joined && !stopped) {
          const store = useViewerStore.getState();
          if (!stopIfFired()) {
            store.setWave([...tracker.order], tracker.order.at(-1) ?? null);
          }
        }
        const store = useViewerStore.getState();
        if (result) {
          const elapsed = performance.now() - started;
          if (elapsed > 6)
            modelMs.current = Math.max(MIN_MODEL_MS, modelMs.current * 0.75);
          else if (elapsed < 2.5) {
            modelMs.current = Math.min(MAX_MODEL_MS, modelMs.current + 0.1);
          }
          for (const group of result.finished) {
            store.setStimulating(group, false);
            if (state.puff?.colorGroup === group) {
              state.puff = null;
              store.setPuff(null);
            }
          }
        }
        // Flashes and dots fade on wall time, so they die out even after the
        // brain holds still at the end of a settle. A paused wave holds still.
        if (
          !useViewerStore.getState().paused &&
          (result ||
            model.flash.busy ||
            model.flash.fading ||
            state.dots.length > 0)
        ) {
          const wasBusy = model.flash.busy;
          model.flash.decay(wallMs);
          if (result) model.flash.mark(result.spikes);
          if (wasBusy || model.flash.busy || model.flash.fading || result) {
            model.texture.needsUpdate = true;
          }
          advanceDots(
            state,
            result?.spikes ?? NO_SPIKES,
            model.paths,
            model.focus,
            wallMs,
            allowDots.current,
          );
          writeDots(dotsRef.current, state.dots, model.paths, dummy);
          publishClock.current += wallMs;
          if (publishClock.current >= PUBLISH_MS || quiet()) {
            publishClock.current = 0;
            const next = activityByGroup(
              model.flash.values,
              model.session.groups,
            );
            if (activityChanged(store.activity, next)) store.setActivity(next);
            if (state.puff) {
              store.setPuff({
                colorGroup: state.puff.colorGroup,
                elapsedMs:
                  (model.session.clock - state.puff.startTick) * TICK_MS,
                totalMs: module.stimulusMs,
              });
            }
          }
        }
        if (model.compass?.update(model.flash.values, wallMs)) busy = true;
        if (playback?.finished && quiet()) {
          const shown = store.playback;
          if (shown && !shown.done) store.setPlayback({ ...shown, done: true });
        }
        if (store.paused && !model.session.running()) store.setPaused(false);
        // A stopped wave waits for "next group" without drawing.
        busy =
          busy ||
          (!store.paused && (!quiet() || model.flash.fading)) ||
          (playback !== null && !playback.finished && !store.paused);
        placeLabels();
      }
    } catch (error) {
      failed.current = true;
      // The reader gets a plain sentence; developers get the details.
      console.error(error);
      useViewerStore.getState().setStatus("error", loadError(error));
      return;
    }
    if (busy) invalidate();
  });

  /** Moves the camera a frame along its glide. True while it is gliding. */
  function stepGlide(wallMs: number): boolean {
    const move = glide.current;
    const orbit = orbitRef.current;
    if (!move || !orbit) return false;
    move.elapsedMs += wallMs;
    const t = Math.min(1, move.elapsedMs / GLIDE_MS);
    const ease = t * t * (3 - 2 * t);
    camera.position.lerpVectors(move.fromPosition, move.toPosition, ease);
    orbit.target.lerpVectors(move.fromTarget, move.toTarget, ease);
    if (t >= 1) glide.current = null;
    return true;
  }

  const projected = useMemo(() => new Vector3(), []);
  /** Puts each label beside its point, and notes the camera for the page. */
  function placeLabels() {
    const { width, height } = sizeRef.current;
    placeBadges((anchor) => {
      const point = anchors.get(anchor);
      if (!point) return null;
      projected.copy(point).project(camera);
      if (projected.z > 1 || projected.z < -1) return null;
      return {
        x: ((projected.x + 1) / 2) * width,
        y: ((1 - projected.y) / 2) * height,
      };
    });
    const view = [camera.position.x, camera.position.y, camera.position.z]
      .map((value) => Math.round(value))
      .join(",");
    if (view !== lastView.current) {
      lastView.current = view;
      const stage = gl.domElement.closest<HTMLElement>("[data-stage]");
      if (stage) stage.dataset.view = view;
    }
  }

  return (
    <group>
      {lightParts && !journey ? (
        <group>
          <mesh
            position={lightParts.beamAt}
            quaternion={lightParts.quaternion}
            geometry={lightParts.beam}
            material={lightParts.beamMaterial}
            raycast={ignoreRaycast}
          />
          <mesh
            position={lightParts.arrowAt}
            quaternion={lightParts.quaternion}
            geometry={lightParts.arrow}
            material={lightParts.beamMaterial}
            raycast={ignoreRaycast}
          />
          <mesh
            position={model.light!.source}
            geometry={lightParts.ball}
            material={lightParts.ballMaterial}
            raycast={ignoreRaycast}
          />
        </group>
      ) : null}
      {journey ? (
        <JourneyRig
          model={model}
          group={journeyGroup}
          circuit={module.circuit}
          color={groupColor(module, journeyGroup)}
          direction={CAMERA_DIRECTION}
          orbit={orbitRef}
          lines={linesRef}
          state={journeyState}
        />
      ) : null}
      <lineSegments
        ref={linesRef}
        geometry={model.geometry}
        material={model.material}
        raycast={ignoreRaycast}
      />
      <instancedMesh
        ref={dotsRef}
        args={[dotGeometry, dotMaterial, MAX_DOTS]}
        frustumCulled={false}
        raycast={ignoreRaycast}
      />
    </group>
  );
}

/**
 * Spends whatever turn a drag left in the controls' damping, so a camera the
 * lesson moves stays where it is put instead of drifting on.
 */
function stopOrbitDrift(orbit: OrbitControls) {
  orbit.enableDamping = false;
  orbit.update();
  orbit.enableDamping = true;
}

/** Dots follow spikes along neurons in the focus. Dimmed cells flash but get no dot. */
function advanceDots(
  state: Runtime,
  spikes: Uint8Array,
  paths: NeuronPaths,
  focus: Uint8Array,
  wallMs: number,
  allow: boolean,
) {
  const alive: Dot[] = [];
  for (const dot of state.dots) {
    dot.ageMs += wallMs;
    if (dot.ageMs < FLASH_DECAY_MS) alive.push(dot);
  }
  state.dots = alive;
  if (!allow || spikes.length === 0) return;
  let scanned = 0;
  while (scanned < spikes.length && state.dots.length < MAX_DOTS) {
    const neuron = state.cursor;
    state.cursor = (state.cursor + 1) % spikes.length;
    scanned += 1;
    if (!spikes[neuron] || focus[neuron] === 0) continue;
    if (samplePath(paths, neuron, 0) === null) continue;
    const existing = state.dots.find((dot) => dot.neuron === neuron);
    if (existing) existing.ageMs = 0;
    else state.dots.push({ neuron, ageMs: 0 });
  }
}

function writeDots(
  mesh: InstancedMesh | null,
  dots: readonly Dot[],
  paths: NeuronPaths,
  dummy: Object3D,
) {
  if (!mesh) return;
  let visible = 0;
  for (const dot of dots) {
    const point = samplePath(paths, dot.neuron, dot.ageMs / FLASH_DECAY_MS);
    if (!point) continue;
    dummy.position.set(point[0], point[1], point[2]);
    dummy.scale.setScalar(1);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(visible, dummy.matrix);
    visible += 1;
    if (visible >= MAX_DOTS) break;
  }
  mesh.count = visible;
  mesh.instanceMatrix.needsUpdate = true;
}

function activityChanged(
  prev: Record<string, number>,
  next: Record<string, number>,
): boolean {
  const keys = Object.keys(next);
  if (keys.length !== Object.keys(prev).length) return true;
  for (const key of keys) {
    if (Math.abs((prev[key] ?? 0) - (next[key] ?? 0)) > 0.008) return true;
  }
  return false;
}
