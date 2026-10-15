import {
  Box3,
  DoubleSide,
  Group,
  Mesh,
  MeshLambertMaterial,
  type BufferGeometry,
  type Material,
} from "three";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { readGlb } from "./glb.js";
import { decodePosition, versioned } from "./load-circuit.js";

/**
 * The fly the zoom journey starts from: the NeuroMechFly body, with the
 * MaleCNS brain and nerve cord outlines inside it, already in the circuit's
 * coordinates (tools/data/scripts/bake_body.py; credits in ATTRIBUTION.md).
 * One small file, fetched only when a journey is about to open.
 */
const BODY_URL = "/data/body.glb";

const CUTICLE = ["body", "head"] as const;
const SHELLS = ["brain", "vnc"] as const;
const PARTS = [...CUTICLE, "eyes", "wings", ...SHELLS] as const;
type Part = (typeof PARTS)[number];

const COLOR: Record<Part, string> = {
  body: "#a8722f",
  head: "#a8722f",
  eyes: "#a3331d",
  wings: "#cdd5ea",
  brain: "#7dd3fc",
  vnc: "#7dd3fc",
};
/** Wings are a film even on the whole fly. */
const WING_OPACITY = 0.32;

export type FlyBody = {
  group: Group;
  /** Around the whole fly, wings and legs included. */
  bounds: Box3;
  /** Around the head and the eyes. */
  head: Box3;
  /**
   * For each circuit, the neuron the zoom ends on and the way its spike runs,
   * from where its inputs meet it to its farthest terminal, along its real
   * skeleton (bake_body.py). Flat x, y, z in microns, start first.
   */
  journey: ReadonlyMap<string, { bodyId: number; path: Float32Array }>;
  /** Sets how solid the body and the outlines inside it are, each from 0 to 1. */
  show: (body: number, shell: number) => void;
};

let cached: Promise<FlyBody | null> | null = null;

/**
 * The body, or null if its file is not there. A journey without it still
 * runs: it starts from the brain's own neurons instead.
 */
export function openBody(): Promise<FlyBody | null> {
  cached ??= loadBody().catch((error: unknown) => {
    console.error(error);
    cached = null;
    return null;
  });
  return cached;
}

async function loadBody(): Promise<FlyBody> {
  const response = await fetch(
    versioned(BODY_URL, process.env.NEXT_PUBLIC_DATA_VERSION),
  );
  if (!response.ok) throw new Error(`The fly body is missing: ${BODY_URL}`);
  const { json, bin } = readGlb(await response.arrayBuffer());
  const draco = new DRACOLoader();
  draco.setDecoderPath("/draco/");
  draco.setWorkerLimit(1);
  const group = new Group();
  const materials = new Map<Part, Material>();
  const bounds = new Box3();
  const head = new Box3();
  try {
    for (const node of json.nodes ?? []) {
      const part = PARTS.find((name) => name === node.name);
      if (!part || typeof node.mesh !== "number") continue;
      const ext =
        json.meshes?.[node.mesh]?.primitives?.[0]?.extensions
          ?.KHR_draco_mesh_compression;
      const view = json.bufferViews?.[ext?.bufferView ?? -1];
      const positionId = ext?.attributes?.POSITION;
      if (!view || positionId === undefined) continue;
      const start = view.byteOffset ?? 0;
      const bytes = bin.slice(start, start + (view.byteLength ?? 0)).buffer;
      const geometry: BufferGeometry = await decodePosition(
        draco,
        bytes,
        positionId,
      );
      geometry.computeVertexNormals();
      geometry.computeBoundingBox();
      const shell = SHELLS.some((name) => name === part);
      // The outlines are lit like the body, so they read as solid shapes
      // inside it, and glow a little so they show through the cuticle.
      const material = shell
        ? new MeshLambertMaterial({
            color: COLOR[part],
            emissive: COLOR[part],
            emissiveIntensity: 0.35,
            transparent: true,
            opacity: 0,
            depthWrite: false,
          })
        : new MeshLambertMaterial({ color: COLOR[part], side: DoubleSide });
      materials.set(part, material);
      const mesh = new Mesh(geometry, material);
      mesh.name = part;
      mesh.raycast = () => undefined;
      // Outlines draw after the body they sit in.
      mesh.renderOrder = shell ? 2 : 1;
      group.add(mesh);
      if (!shell && geometry.boundingBox) {
        bounds.union(geometry.boundingBox);
        if (part === "head" || part === "eyes")
          head.union(geometry.boundingBox);
      }
    }
  } finally {
    draco.dispose();
  }
  if (bounds.isEmpty() || head.isEmpty()) {
    throw new Error("The fly body has no head or no body.");
  }
  const journey = new Map<string, { bodyId: number; path: Float32Array }>();
  for (const [circuit, entry] of Object.entries(json.extras?.journey ?? {})) {
    const { bodyId, path } = entry;
    if (typeof bodyId !== "number" || !Array.isArray(path)) continue;
    if (path.length < 6 || path.length % 3 !== 0) continue;
    if (!path.every((value) => typeof value === "number")) continue;
    journey.set(circuit, { bodyId, path: Float32Array.from(path as number[]) });
  }
  return {
    group,
    bounds,
    head,
    journey,
    show(body, shell) {
      for (const [part, material] of materials) {
        const isShell = SHELLS.some((name) => name === part);
        const base = part === "wings" ? WING_OPACITY : 1;
        const opacity = (isShell ? shell : body) * base;
        material.visible = opacity > 0.004;
        material.opacity = opacity;
        if (!isShell) {
          // Solid while whole, so its own parts hide each other; a film once
          // the brain has to show through.
          const solid = opacity > 0.98;
          if (material.transparent === solid) material.needsUpdate = true;
          material.transparent = !solid;
          material.depthWrite = solid;
        }
      }
    },
  };
}
