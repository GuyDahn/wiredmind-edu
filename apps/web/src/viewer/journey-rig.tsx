"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  Box3,
  MeshBasicMaterial,
  Sphere,
  SphereGeometry,
  Vector3,
  type LineSegments,
  type Mesh,
  type PerspectiveCamera,
} from "three";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { samplePath } from "./centerline.js";
import { frameBox, type Box } from "./fit.js";
import { openBody, type FlyBody } from "./fly-body.js";
import {
  ease,
  FLIGHT_MS,
  JOURNEY_LAYERS,
  JOURNEY_LEVELS,
  SPIKE_MS,
  type JourneyLevel,
} from "./journey.js";
import type { LoadedCircuit } from "./load-circuit.js";
import { useViewerStore } from "./store.js";

/** Front, right, and a little above: the fly as you would meet it on a table. */
const FLY_DIRECTION = new Vector3(0.62, -0.36, -0.7).normalize();
/** Nearly face on, so both eyes and the brain between them are in view. */
const HEAD_DIRECTION = new Vector3(0.38, -0.2, -0.9).normalize();
const NEURON_PADDING = 1.5;

type Pose = { position: Vector3; target: Vector3; near: number; far: number };
type Layers = { body: number; shell: number; lines: boolean };

/** Shared with the scene, which leaves the camera alone while a flight is on. */
export type JourneyState = { flying: boolean };

function toBox(box: Box3): Box {
  return {
    min: { x: box.min.x, y: box.min.y, z: box.min.z },
    max: { x: box.max.x, y: box.max.y, z: box.max.z },
  };
}

/** The cell of `group` that reaches farthest: the one whose spike is easiest to follow. */
export function journeyNeuron(
  model: LoadedCircuit,
  group: string,
): { index: number; box: Box3 } | null {
  let best: { index: number; box: Box3 } | null = null;
  let reach = 0;
  const point = new Vector3();
  for (const index of model.session.groups.get(group) ?? []) {
    const start = model.paths.offset[index] ?? 0;
    const end = model.paths.offset[index + 1] ?? start;
    if (end - start < 6) continue;
    const box = new Box3();
    for (let at = start; at < end; at += 3) {
      point.set(
        model.paths.data[at] ?? 0,
        model.paths.data[at + 1] ?? 0,
        model.paths.data[at + 2] ?? 0,
      );
      box.expandByPoint(point);
    }
    const size = box.getSize(new Vector3()).length();
    if (size > reach) {
      reach = size;
      best = { index, box };
    }
  }
  return best;
}

/**
 * Flies the camera between the journey's four stops and fades the body, the
 * brain outline, and the neurons in and out as it goes. With reduced motion
 * it cuts from stop to stop instead.
 */
export function JourneyRig({
  model,
  group,
  direction,
  orbit,
  lines,
  state,
}: {
  model: LoadedCircuit;
  /** Color group the last stop's single neuron is picked from. */
  group: string;
  /** The lesson's own view of the circuit, which the third stop lands in. */
  direction: Vector3;
  orbit: RefObject<OrbitControls | null>;
  lines: RefObject<LineSegments | null>;
  state: RefObject<JourneyState>;
}) {
  const camera = useThree((three) => three.camera) as PerspectiveCamera;
  const size = useThree((three) => three.size);
  const invalidate = useThree((three) => three.invalidate);
  const level = useViewerStore((store) => store.level);
  const [body, setBody] = useState<FlyBody | null>(null);
  const dot = useRef<Mesh>(null);
  const reduce = useRef(false);
  const lastLevel = useRef<number | null>(null);
  /** Frames still owed after a flight lands, so its last state is the one on screen. */
  const settle = useRef(0);
  const shown = useRef<Layers>({ body: 0, shell: 0, lines: false });
  const flight = useRef<{
    from: Pose;
    to: Pose;
    layersFrom: Layers;
    layersTo: Layers;
    startedAt: number;
  } | null>(null);
  const neuron = useMemo(() => journeyNeuron(model, group), [model, group]);
  const aspect = size.width / Math.max(size.height, 1);

  useEffect(() => {
    let active = true;
    reduce.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    void openBody().then((loaded) => {
      if (active) setBody(loaded);
    });
    return () => {
      active = false;
    };
  }, []);

  const dotGeometry = useMemo(() => {
    const radius = neuron
      ? neuron.box.getBoundingSphere(new Sphere()).radius
      : 1;
    return new SphereGeometry(Math.max(radius * 0.035, 0.6), 14, 10);
  }, [neuron]);
  const dotMaterial = useMemo(() => {
    const material = new MeshBasicMaterial({ color: "#fff7e8" });
    material.toneMapped = false;
    return material;
  }, []);
  useEffect(
    () => () => {
      dotGeometry.dispose();
      dotMaterial.dispose();
    },
    [dotGeometry, dotMaterial],
  );

  const poses = useMemo(() => {
    const whole = model.bounds.getBoundingSphere(new Sphere()).radius;
    const pose = (box: Box3, toward: Vector3, padding: number): Pose => {
      const frame = frameBox(
        toBox(box),
        { x: toward.x, y: toward.y, z: toward.z },
        camera.fov,
        aspect,
        padding,
      );
      const target = box.getCenter(new Vector3());
      return {
        target,
        position: target.clone().addScaledVector(toward, frame.distance),
        near: frame.near,
        far: frame.distance * 3 + whole * 6,
      };
    };
    const circuit = pose(model.frameBounds, direction, 1.08);
    const all = pose(model.bounds, direction, 1.08);
    const byLevel: Record<JourneyLevel, Pose> = {
      fly: body ? pose(body.bounds, FLY_DIRECTION, 1.1) : all,
      brain: body ? pose(body.head, HEAD_DIRECTION, 1.25) : all,
      circuit,
      neuron: neuron ? pose(neuron.box, direction, NEURON_PADDING) : circuit,
    };
    return byLevel;
  }, [model, body, neuron, direction, camera.fov, aspect]);

  useEffect(() => {
    const name = JOURNEY_LEVELS[level] ?? "fly";
    const to = poses[name];
    // Without the body there is nothing but neurons to show at any stop.
    const layersTo: Layers = body
      ? JOURNEY_LAYERS[name]
      : { ...JOURNEY_LAYERS[name], lines: true };
    // The last stop dims every cell but one.
    model.focus.fill(name === "neuron" && neuron ? 0 : 255);
    if (name === "neuron" && neuron) model.focus[neuron.index] = 255;
    model.focusTexture.needsUpdate = true;
    const control = orbit.current;
    const from: Pose = {
      position: camera.position.clone(),
      target: control?.target.clone() ?? to.target.clone(),
      near: camera.near,
      far: Math.max(camera.far, to.far),
    };
    const cut = reduce.current || lastLevel.current === level;
    const first = lastLevel.current === null;
    lastLevel.current = level;
    flight.current = {
      from: cut || first ? to : from,
      to,
      layersFrom: cut || first ? layersTo : { ...shown.current },
      layersTo,
      startedAt: cut || first ? -Infinity : performance.now(),
    };
    state.current.flying = true;
    useViewerStore.getState().setFlying(!(cut || first));
    if (control) {
      control.enabled = false;
      control.minDistance = 0;
      control.maxDistance = Infinity;
    }
    // Far enough for both ends of the flight.
    camera.far = Math.max(from.far, to.far);
    camera.updateProjectionMatrix();
    invalidate();
  }, [poses, level, body, neuron, model, camera, orbit, state, invalidate]);

  useEffect(() => {
    const view = lines.current;
    const flag = state.current;
    return () => {
      body?.show(0, 0);
      if (view) view.visible = true;
      flag.flying = false;
      useViewerStore.getState().setFlying(false);
      // The controls as they are when the journey closes, not when it opened.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      if (orbit.current) orbit.current.enabled = true;
    };
  }, [body, lines, orbit, state]);

  useFrame(() => {
    const now = performance.now();
    const current = flight.current;
    if (current) {
      const raw = Math.min(1, (now - current.startedAt) / FLIGHT_MS);
      const t = ease(raw);
      camera.position.lerpVectors(
        current.from.position,
        current.to.position,
        t,
      );
      const target = new Vector3().lerpVectors(
        current.from.target,
        current.to.target,
        t,
      );
      camera.near =
        current.from.near + (current.to.near - current.from.near) * t;
      camera.lookAt(target);
      const mix = (a: number, b: number) => a + (b - a) * t;
      shown.current = {
        body: mix(current.layersFrom.body, current.layersTo.body),
        shell: mix(current.layersFrom.shell, current.layersTo.shell),
        lines: t >= 0.5 ? current.layersTo.lines : current.layersFrom.lines,
      };
      const control = orbit.current;
      if (raw >= 1) {
        flight.current = null;
        settle.current = 2;
        useViewerStore.getState().setFlying(false);
        state.current.flying = false;
        camera.far = current.to.far;
        if (control) {
          control.target.copy(current.to.target);
          control.enabled = true;
          control.update();
        }
      }
      camera.updateProjectionMatrix();
      invalidate();
    } else if (settle.current > 0) {
      settle.current -= 1;
      invalidate();
    }
    body?.show(shown.current.body, shown.current.shell);
    if (lines.current) lines.current.visible = shown.current.lines;
    const mesh = dot.current;
    if (mesh) {
      const at =
        JOURNEY_LEVELS[level] === "neuron" && neuron && !flight.current;
      mesh.visible = Boolean(at);
      if (at && neuron) {
        // Still, halfway along, for readers who asked for less motion.
        const t = reduce.current ? 0.5 : (now % SPIKE_MS) / SPIKE_MS;
        const point = samplePath(model.paths, neuron.index, t);
        if (point) mesh.position.set(point[0], point[1], point[2]);
        if (!reduce.current) invalidate();
      }
    }
  });

  return (
    <>
      <hemisphereLight args={["#fff4e0", "#3b2a1a", 2.2]} />
      <directionalLight position={[600, -1400, -1200]} intensity={2.4} />
      {body ? <primitive object={body.group} /> : null}
      <mesh
        ref={dot}
        geometry={dotGeometry}
        material={dotMaterial}
        visible={false}
        frustumCulled={false}
        renderOrder={3}
      />
    </>
  );
}
