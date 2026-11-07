import { Filter, GlProgram, defaultFilterVert } from 'pixi.js';

/**
 * A politician burnt by a Polémique: the fire climbs from its feet, a ragged front of flame that leaves nothing behind
 * and chars what it is about to eat. Drawn over the medallion's own box (the filter's frame), `uProgress` from 0
 * (untouched) to 1 (all gone). The flame's two colours make it toxic green or plain orange.
 */
const FRAGMENT = `
precision highp float;
in vec2 vTextureCoord;
out vec4 finalColor;
uniform sampler2D uTexture;
uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform float uProgress;
uniform float uSeed;
uniform vec3 uHot;
uniform vec3 uCool;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7)) + uSeed) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

void main(void) {
  vec4 color = texture(uTexture, vTextureCoord);
  vec2 local = vTextureCoord * uInputSize.xy / uOutputFrame.zw;
  float ragged = noise(local * 7.0) * 0.6 + noise(local * 15.0) * 0.3;
  float height = 1.0 - local.y;
  float front = uProgress * 1.6 - 0.25;
  float left = height + ragged * 0.45 - front;
  if (left < 0.0) {
    finalColor = vec4(0.0);
    return;
  }
  float flame = 1.0 - smoothstep(0.0, 0.07, left);
  float charred = 1.0 - smoothstep(0.04, 0.22, left);
  vec3 fire = mix(uHot, uCool, smoothstep(0.0, 0.05, left));
  vec3 rgb = color.rgb * (1.0 - 0.8 * charred);
  rgb = mix(rgb, fire * color.a * 1.4, flame);
  finalColor = vec4(rgb, color.a);
}
`;

export interface BurnUniforms {
  uProgress: number;
  uSeed: number;
  uHot: Float32Array;
  uCool: Float32Array;
}

export function createBurnFilter(hot: [number, number, number], cool: [number, number, number]): Filter {
  return new Filter({
    glProgram: GlProgram.from({ vertex: defaultFilterVert, fragment: FRAGMENT, name: 'casserolade-burn' }),
    resources: {
      burn: {
        uProgress: { value: 0, type: 'f32' },
        uSeed: { value: Math.random() * 100, type: 'f32' },
        uHot: { value: new Float32Array(hot), type: 'vec3<f32>' },
        uCool: { value: new Float32Array(cool), type: 'vec3<f32>' },
      },
    },
  });
}

export function burnUniforms(filter: Filter): BurnUniforms {
  return filter.resources.burn.uniforms as BurnUniforms;
}
