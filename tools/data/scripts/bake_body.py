# /// script
# requires-python = ">=3.12"
# dependencies = [
#   "flygym @ git+https://github.com/NeLy-EPFL/flygym@38c8ec61034cd59bc5ba0de20688d4a3c0000d60",
#   "fast-simplification>=0.1.9",
#   "numpy>=2",
#   "scipy>=1.14",
#   "trimesh>=4.5",
# ]
# ///
"""Bake the fly body the zoom journey starts from, with the brain inside it.

Two animals meet in this file, and neither is the other's:

* The body is NeuroMechFly, built from a micro-CT scan of an adult female
  (NeLy-EPFL/flygym, Apache-2.0), in its neutral standing pose.
* The brain and nerve cord outlines are the MaleCNS v1.0 shell meshes
  (HHMI Janelia FlyEM, CC BY 4.0), the same male the neurons come from.

The file also carries, for each lesson circuit, the one neuron its zoom ends
on and the path a spike takes along it: from where the lesson's upstream
cells meet it (the looming cells on the giant fiber, the Kenyon cells on an
output neuron, the ring neurons on a compass cell) to its farthest terminal,
along its MaleCNS skeleton. That needs the baked circuits in dist/ and their
skeletons in raw/skeletons/ (make-data).

The body is moved into MaleCNS coordinates (microns), so it lines up with the
circuit files without touching them. Both stay at their true size. The
placement is a rigid fit, not a registration: FIT below is the pitch and
offset that put the most of the brain shell inside the head and the most of
the nerve cord shell inside the thorax (convex hulls), found once with
Nelder-Mead and kept here so the bake is repeatable. `--check` prints how
much of each shell lands inside.

    uv run tools/data/scripts/bake_body.py            # writes tools/data/dist/body.glb
    uv run tools/data/scripts/bake_body.py --check
"""

from __future__ import annotations

import argparse
import json
import struct
import subprocess
import urllib.request
import warnings
from pathlib import Path

import fast_simplification
import numpy as np
import trimesh

ROOT = Path(__file__).resolve().parents[1]
BUCKET = "https://storage.googleapis.com/flyem-male-cns/rois"
SHELLS = {
    "brain": f"{BUCKET}/brain-shell-v2.2/mesh/brain-shell.ngmesh",
    "vnc": f"{BUCKET}/vnc-shell-v2/mesh/vnc-shell.ngmesh",
}
SHELL_FACES = {"brain": 9000, "vnc": 4000}

# NeuroMechFly: x forward, y left, z up, in mm. MaleCNS: x across the fly,
# y toward the belly, z toward the tail, in microns.
AXES = np.array([[0.0, 1.0, 0.0], [0.0, 0.0, -1.0], [-1.0, 0.0, 0.0]])
MM_TO_UM = 1000.0
FIT = {"pitch": -0.397, "x": 383.74, "y": 1837.735, "z": 378.332}

# Which glTF mesh each body segment joins. The viewer colors meshes by name.
EYES = ("l_eye", "r_eye")
WINGS = ("l_wing", "r_wing")
HEAD = (
    "c_head",
    "c_rostrum",
    "c_haustellum",
    "l_pedicel",
    "r_pedicel",
    "l_funiculus",
    "r_funiculus",
    "l_arista",
    "r_arista",
)


def face_budget(name: str) -> int:
    """Triangles a segment keeps. A tarsus is a few pixels; the head is the subject."""
    if name in ("c_head", "c_thorax"):
        return 2000
    if name in EYES:
        return 1200
    if "tarsus" in name:
        return 60
    if "abdomen" in name or name in WINGS:
        return 700
    if "tibia" in name or "femur" in name or "coxa" in name:
        return 220
    return 260


def to_cns(points_mm: np.ndarray) -> np.ndarray:
    cos, sin = np.cos(FIT["pitch"]), np.sin(FIT["pitch"])
    pitch = np.array([[1.0, 0.0, 0.0], [0.0, cos, -sin], [0.0, sin, cos]])
    moved = (points_mm * MM_TO_UM) @ AXES.T @ pitch.T
    return moved + np.array([FIT["x"], FIT["y"], FIT["z"]])


def simplify(vertices: np.ndarray, faces: np.ndarray, keep: int) -> trimesh.Trimesh:
    if len(faces) > keep:
        vertices, faces = fast_simplification.simplify(
            vertices.astype(np.float32),
            faces.astype(np.int32),
            target_count=keep,
        )
    mesh = trimesh.Trimesh(vertices=vertices, faces=faces, process=True)
    # Right-side segments are left-side meshes mirrored, which turns them
    # inside out.
    trimesh.repair.fix_normals(mesh)
    return mesh


def body_parts() -> dict[str, tuple[np.ndarray, np.ndarray]]:
    """Every NeuroMechFly segment mesh, posed, in model millimetres."""
    import mujoco as mj
    from flygym.anatomy import AxisOrder, JointPreset, Skeleton
    from flygym.compose.fly import NeuroMechFly
    from flygym.compose.pose import KinematicPosePreset

    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        fly = NeuroMechFly()
        skeleton = Skeleton(
            axis_order=AxisOrder.YAW_PITCH_ROLL,
            joint_preset=JointPreset.ALL_BIOLOGICAL,
        )
        fly.add_joints(skeleton, neutral_pose=KinematicPosePreset.NEUTRAL)
        model, data = fly.compile()
        data.qpos[:] = fly._get_neutral_qpos(model)  # noqa: SLF001
    mj.mj_forward(model, data)
    parts: dict[str, tuple[np.ndarray, np.ndarray]] = {}
    for geom in range(model.ngeom):
        if model.geom_type[geom] != mj.mjtGeom.mjGEOM_MESH:
            continue
        mesh = model.geom_dataid[geom]
        name = mj.mj_id2name(model, mj.mjtObj.mjOBJ_GEOM, geom)
        v0, nv = model.mesh_vertadr[mesh], model.mesh_vertnum[mesh]
        f0, nf = model.mesh_faceadr[mesh], model.mesh_facenum[mesh]
        rotation = data.geom_xmat[geom].reshape(3, 3)
        vertices = model.mesh_vert[v0 : v0 + nv] @ rotation.T + data.geom_xpos[geom]
        parts[name] = (vertices, model.mesh_face[f0 : f0 + nf].copy())
    return parts


def read_ngmesh(path: Path) -> tuple[np.ndarray, np.ndarray]:
    """A neuroglancer legacy mesh: vertex count, float32 nm positions, uint32 faces."""
    blob = path.read_bytes()
    count = int(np.frombuffer(blob, "<u4", 1)[0])
    vertices = np.frombuffer(blob, "<f4", count * 3, 4).reshape(-1, 3) / 1000.0
    faces = np.frombuffer(blob, "<u4", offset=4 + count * 12).reshape(-1, 3)
    return vertices, faces


def shell(name: str, raw_dir: Path) -> tuple[np.ndarray, np.ndarray]:
    path = raw_dir / f"{name}-shell.ngmesh"
    if not path.exists():
        raw_dir.mkdir(parents=True, exist_ok=True)
        print(f"download {SHELLS[name]}")
        urllib.request.urlretrieve(SHELLS[name], path)  # noqa: S310
    return read_ngmesh(path)


# For each circuit: the cells the zoom's last neuron is picked from, and the
# upstream cells whose contacts mark where its spike starts.
JOURNEY = {
    "escape": ({"DNp01"}, None, {"LC4", "LPLC2"}, None),
    "olfactory": (None, "mbon", None, "kc"),
    "visual": ({"EPG", "EPGt"}, None, None, "ring"),
}
JOURNEY_POINTS = 64
CONTACT_UM = 3.0
# Upstream skeletons sampled per circuit, enough to find where they meet the cell.
UPSTREAM_CAP = 400


def matches(row: dict, types: set[str] | None, group: str | None) -> bool:
    return (types is not None and row["type"] in types) or (
        group is not None and row["colorGroup"] == group
    )


def skeleton(path: Path):
    """Points in microns, and the skeleton as a weighted graph."""
    from scipy.sparse import coo_matrix

    table = np.loadtxt(path, comments="#", ndmin=2)
    ids = table[:, 0].astype(int)
    points = table[:, 2:5] * 0.008
    index = {node: at for at, node in enumerate(ids)}
    edges = np.array(
        [
            (at, index[parent])
            for at, parent in enumerate(table[:, 6].astype(int))
            if parent in index
        ]
    )
    lengths = np.linalg.norm(points[edges[:, 0]] - points[edges[:, 1]], axis=1)
    count = len(points)
    graph = coo_matrix(
        (
            np.r_[lengths, lengths],
            (np.r_[edges[:, 0], edges[:, 1]], np.r_[edges[:, 1], edges[:, 0]]),
        ),
        shape=(count, count),
    ).tocsr()
    return points, graph


def resample(points: np.ndarray, count: int) -> np.ndarray:
    steps = np.r_[0, np.cumsum(np.linalg.norm(np.diff(points, axis=0), axis=1))]
    targets = np.linspace(0, steps[-1], count)
    return np.stack([np.interp(targets, steps, points[:, axis]) for axis in range(3)], axis=1)


def journey_paths(dist: Path, skeletons: Path) -> dict[str, dict]:
    """The zoom's last neuron in each circuit, and its spike's path, start first."""
    from scipy.sparse.csgraph import dijkstra
    from scipy.spatial import cKDTree

    out: dict[str, dict] = {}
    for circuit, (types, group, up_types, up_group) in JOURNEY.items():
        rows = json.loads((dist / f"{circuit}.neurons.json").read_text())["neurons"]
        upstream = [
            skeleton(skeletons / f"{row['id']}.swc")[0]
            for row in rows
            if matches(row, up_types, up_group) and (skeletons / f"{row['id']}.swc").exists()
        ][:UPSTREAM_CAP]
        cloud = cKDTree(np.vstack(upstream))
        best: tuple[float, int, np.ndarray] | None = None
        for row in rows:
            file = skeletons / f"{row['id']}.swc"
            if not matches(row, types, group) or not file.exists():
                continue
            points, graph = skeleton(file)
            contacts = np.array([len(near) for near in cloud.query_ball_point(points, CONTACT_UM)])
            start = int(np.argmax(contacts))
            reach, previous = dijkstra(graph, indices=start, return_predecessors=True)
            reach = np.where(np.isinf(reach), -1, reach)
            end = int(np.argmax(reach))
            # The cell whose spike has the farthest to go is the easiest to follow.
            if best is None or reach[end] > best[0]:
                walk = [end]
                while walk[-1] != start:
                    walk.append(int(previous[walk[-1]]))
                best = (float(reach[end]), int(row["id"]), points[walk[::-1]])
        if best is None:
            raise SystemExit(f"No skeleton for the zoom's neuron in {circuit}")
        length, body_id, path = best
        print(f"{circuit}: body {body_id}, a {length:.0f} um path")
        out[circuit] = {
            "bodyId": body_id,
            "path": [round(float(v), 2) for v in resample(path, JOURNEY_POINTS).ravel()],
        }
    return out


def with_extras(glb: Path, extras: dict) -> None:
    """Writes `extras` into the glTF's own JSON, padded as the format asks."""
    blob = glb.read_bytes()
    json_length = struct.unpack_from("<I", blob, 12)[0]
    gltf = json.loads(blob[20 : 20 + json_length])
    gltf["extras"] = extras
    text = json.dumps(gltf, separators=(",", ":")).encode()
    text += b" " * (-len(text) % 4)
    rest = blob[20 + json_length :]
    header = struct.pack("<4sII", b"glTF", 2, 12 + 8 + len(text) + len(rest))
    glb.write_bytes(header + struct.pack("<I4s", len(text), b"JSON") + text + rest)


def group_of(name: str) -> str:
    if name in EYES:
        return "eyes"
    if name in WINGS:
        return "wings"
    if name in HEAD:
        return "head"
    return "body"


def check(parts: dict[str, tuple[np.ndarray, np.ndarray]], raw_dir: Path) -> None:
    from scipy.spatial import Delaunay

    rng = np.random.default_rng(1)

    def hull(*names: str) -> Delaunay:
        return Delaunay(to_cns(np.vstack([parts[name][0] for name in names])))

    for label, inside in (
        ("brain", hull("c_head", *EYES)),
        ("vnc", hull("c_thorax")),
    ):
        vertices, _ = shell(label, raw_dir)
        sample = vertices[rng.choice(len(vertices), 8000, replace=False)]
        share = float((inside.find_simplex(sample) >= 0).mean())
        where = "head" if label == "brain" else "thorax"
        print(f"{label} shell inside the {where} hull: {share:.1%}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", type=Path, default=ROOT / "dist" / "body.glb")
    parser.add_argument("--raw", type=Path, default=ROOT / "raw" / "shells")
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()

    parts = body_parts()
    if args.check:
        check(parts, args.raw)
        return

    groups: dict[str, list[trimesh.Trimesh]] = {}
    for name, (vertices, faces) in parts.items():
        mesh = simplify(to_cns(vertices), faces, face_budget(name))
        groups.setdefault(group_of(name), []).append(mesh)
    scene = trimesh.Scene()
    for name, meshes in groups.items():
        scene.add_geometry(trimesh.util.concatenate(meshes), node_name=name, geom_name=name)
    for name, keep in SHELL_FACES.items():
        vertices, faces = shell(name, args.raw)
        scene.add_geometry(simplify(vertices, faces, keep), node_name=name, geom_name=name)
    for name, geometry in scene.geometry.items():
        # Positions only: the viewer shades from its own normals and colors.
        geometry.visual = trimesh.visual.ColorVisuals()
        print(f"{name}: {len(geometry.faces)} triangles")

    args.out.parent.mkdir(parents=True, exist_ok=True)
    plain = args.out.with_suffix(".plain.glb")
    plain.write_bytes(scene.export(file_type="glb", include_normals=False))
    subprocess.run(  # noqa: S603
        [
            "pnpm",
            "exec",
            "gltf-transform",
            "draco",
            str(plain),
            str(args.out),
            "--quantize-position",
            "14",
        ],
        check=True,
        cwd=ROOT.parents[1],
    )
    plain.unlink()
    with_extras(args.out, {"journey": journey_paths(ROOT / "dist", ROOT / "raw" / "skeletons")})
    print(f"wrote {args.out} ({args.out.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
