import type { ModuleSpec } from "./types.js";

/**
 * Downloading a circuit's three files, apart from decoding them, so the
 * story can start the download without loading three.js: the files come in
 * while the story is read, and the decode starts later (load-circuit.ts).
 */

/**
 * What went wrong loading a circuit, for the reader: the files are missing,
 * damaged, or something else failed. The viewer says it in the reader's
 * language, from viewer.load, and logs the details for developers.
 */
export type LoadErrorCode = "unavailable" | "damaged" | "failed" | "noWebgl";

/** A circuit that could not load, and why. */
export class CircuitError extends Error {
  constructor(
    readonly code: LoadErrorCode,
    message: string,
  ) {
    super(message);
  }
}

/**
 * /data files are cached for a year, so each request names the data release
 * the build fetched. A new release is a new URL.
 */
export function versioned(url: string, version: string | undefined): string {
  if (!version) return url;
  const join = url.includes("?") ? "&" : "?";
  return `${url}${join}v=${encodeURIComponent(version)}`;
}

export type Download = { loaded: number; total: number; done: boolean };

/**
 * How much of the downloads is in, from 0 to 1. By bytes when every file
 * said how big it is; otherwise each file counts the same, and one that did
 * not say counts only once it is done.
 */
export function downloaded(downloads: readonly Download[]): number {
  if (downloads.length === 0) return 1;
  if (downloads.every((item) => item.done || item.total > 0)) {
    let loaded = 0;
    let total = 0;
    for (const item of downloads) {
      const size = item.total > 0 ? item.total : item.loaded;
      total += size;
      loaded += item.done ? size : Math.min(item.loaded, size);
    }
    return total > 0 ? loaded / total : 0;
  }
  let sum = 0;
  for (const item of downloads) {
    if (item.done) sum += 1;
    else if (item.total > 0) sum += Math.min(1, item.loaded / item.total);
  }
  return sum / downloads.length;
}

/** A circuit's files on their way in: how far each has got, and all three once they are. */
export type CircuitDownload = {
  /** The graph, the neuron list and the model, in that order. */
  seen: Download[];
  files: Promise<[ArrayBuffer, ArrayBuffer, ArrayBuffer]>;
  /** Called on every chunk that arrives. */
  listeners: Set<() => void>;
};

const downloads = new Map<string, CircuitDownload>();

/**
 * Starts downloading a circuit's files, or joins the download already under
 * way. One file at a time: on a slow line that is no slower in all, and it
 * leaves room for anything else the page asks for.
 */
export function downloadCircuit(module: ModuleSpec): CircuitDownload {
  const running = downloads.get(module.id);
  if (running) return running;
  const urls = [
    module.assets.graph,
    module.assets.neurons,
    module.assets.gltf,
  ] as const;
  const seen: Download[] = urls.map(() => ({
    loaded: 0,
    total: 0,
    done: false,
  }));
  const listeners = new Set<() => void>();
  const changed = () => {
    for (const listener of listeners) listener();
  };
  const fetchOne = async (index: number) => {
    const download = seen[index]!;
    const buffer = await readBody(
      await fetchOk(urls[index]!),
      (loaded, total) => {
        download.loaded = loaded;
        download.total = total;
        changed();
      },
    );
    download.done = true;
    changed();
    return buffer;
  };
  const files = (async () => {
    const graph = await fetchOne(0);
    const neurons = await fetchOne(1);
    const model = await fetchOne(2);
    return [graph, neurons, model] as [ArrayBuffer, ArrayBuffer, ArrayBuffer];
  })();
  const entry: CircuitDownload = { seen, files, listeners };
  downloads.set(module.id, entry);
  // A failed download is not kept, so the next try starts over.
  files.catch(() => {
    if (downloads.get(module.id) === entry) downloads.delete(module.id);
  });
  return entry;
}

/**
 * Hands over a finished download's files and forgets them, so the page does
 * not hold on to megabytes it has already decoded.
 */
export async function takeCircuitFiles(
  download: CircuitDownload,
  module: ModuleSpec,
): Promise<[ArrayBuffer, ArrayBuffer, ArrayBuffer]> {
  const files = await download.files;
  if (downloads.get(module.id) === download) downloads.delete(module.id);
  return files;
}

/** Fetches a circuit's files in the background, for a decode that comes later. Never throws. */
export function prefetchCircuit(module: ModuleSpec) {
  downloadCircuit(module).files.catch(() => undefined);
}

/**
 * The whole body, telling `onBytes` how much has arrived as it does. The
 * total is the Content-Length, which counts bytes on the wire: when the
 * server compressed the file, the body reads longer, so then it is unknown (0).
 */
async function readBody(
  response: Response,
  onBytes: (loaded: number, total: number) => void,
): Promise<ArrayBuffer> {
  const length = Number(response.headers.get("content-length"));
  const total =
    response.headers.get("content-encoding") ||
    !Number.isFinite(length) ||
    length <= 0
      ? 0
      : length;
  if (!response.body) {
    const buffer = await response.arrayBuffer();
    onBytes(buffer.byteLength, total);
    return buffer;
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.byteLength;
    onBytes(loaded, total);
  }
  const body = new Uint8Array(loaded);
  let at = 0;
  for (const chunk of chunks) {
    body.set(chunk, at);
    at += chunk.byteLength;
  }
  return body.buffer;
}

async function fetchOk(url: string): Promise<Response> {
  const response = await fetch(
    versioned(url, process.env.NEXT_PUBLIC_DATA_VERSION),
  );
  if (!response.ok) {
    throw new CircuitError(
      "unavailable",
      "The circuit files are not available. Run pnpm data:fetch and refresh.",
    );
  }
  return response;
}
