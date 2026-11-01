import {
  ClampToEdgeWrapping,
  DataTexture,
  LineBasicMaterial,
  NearestFilter,
  NoColorSpace,
  RedFormat,
  UnsignedByteType,
  type Texture,
} from "three";

export function createFlashTexture(
  bytes: Uint8Array,
  neuronCount: number,
): DataTexture {
  const texture = new DataTexture(
    bytes as BufferSource,
    Math.max(neuronCount, 1),
    1,
    RedFormat,
    UnsignedByteType,
  );
  texture.colorSpace = NoColorSpace;
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  texture.wrapS = ClampToEdgeWrapping;
  texture.wrapT = ClampToEdgeWrapping;
  texture.generateMipmaps = false;
  texture.unpackAlignment = 1;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Neurons outside the focus keep this share of their linear color, about a
 * third of their brightness on screen. A spike still shows through.
 */
export const DIM_LEVEL = 0.11;

/**
 * While a pathway is in focus, everything off it keeps this share of its
 * linear color: about a tenth of its brightness on screen.
 */
export const PATHWAY_DIM_LEVEL = 0.012;

/**
 * How far a dimmed neuron's color moves toward a neutral of its own strongest
 * channel, so a blue cell stays as readable as a yellow one.
 */
export const DIM_NEUTRAL = 0.5;

/** The dim level the shader reads, as a uniform the scene can change. */
export type DimUniform = { value: number };

export function createNeuronMaterial(
  texture: Texture,
  focus: Texture,
  neuronCount: number,
  dim: DimUniform = { value: DIM_LEVEL },
): LineBasicMaterial {
  const material = new LineBasicMaterial({
    color: "#ffffff",
    vertexColors: true,
  });
  material.customProgramCacheKey = () => "wiredmind-line-focus-v3";
  material.onBeforeCompile = (shader) => {
    shader.uniforms.flashMap = { value: texture };
    shader.uniforms.focusMap = { value: focus };
    shader.uniforms.neuronCount = { value: neuronCount };
    shader.uniforms.dimLevel = dim;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nattribute float neuronIndex;\nvarying float vNeuronIndex;",
      )
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvNeuronIndex = neuronIndex;",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nuniform sampler2D flashMap;\nuniform sampler2D focusMap;\nuniform float neuronCount;\nuniform float dimLevel;\nvarying float vNeuronIndex;",
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>\nfloat wiredmindFocus = texture2D(focusMap, vec2((vNeuronIndex + 0.5) / max(neuronCount, 1.0), 0.5)).r;\nvec3 wiredmindDim = mix(diffuseColor.rgb, vec3(max(diffuseColor.r, max(diffuseColor.g, diffuseColor.b))), ${DIM_NEUTRAL.toFixed(3)}) * dimLevel;\ndiffuseColor.rgb = mix(wiredmindDim, diffuseColor.rgb, wiredmindFocus);\nfloat wiredmindFlash = texture2D(flashMap, vec2((vNeuronIndex + 0.5) / max(neuronCount, 1.0), 0.5)).r;\ndiffuseColor.rgb += diffuseColor.rgb * wiredmindFlash * 2.5;\n// Dimmed neurons sit just in front of the far plane, so the focus draws over them.\ngl_FragDepth = mix(gl_FragCoord.z, 0.99995 + gl_FragCoord.z * 0.00004, 1.0 - wiredmindFocus);`,
      );
  };
  return material;
}
