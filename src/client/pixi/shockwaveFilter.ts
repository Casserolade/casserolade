import { Filter, GlProgram, defaultFilterVert } from 'pixi.js';

/**
 * A ring of distortion that races out from a point, the table bending under a huge blow. `uCenter` is in the stage's
 * pixels; the ring is `uRadius` out, `uWidth` thick, and pushes the picture out by up to `uStrength` pixels.
 */
const FRAGMENT = `
precision highp float;
in vec2 vTextureCoord;
out vec4 finalColor;
uniform sampler2D uTexture;
uniform vec4 uInputSize;
uniform vec4 uInputClamp;
uniform vec4 uOutputFrame;
uniform vec2 uCenter;
uniform float uRadius;
uniform float uWidth;
uniform float uStrength;

void main(void) {
  vec2 pixel = vTextureCoord * uInputSize.xy + uOutputFrame.xy;
  vec2 delta = pixel - uCenter;
  float dist = length(delta);
  float wave = (dist - uRadius) / uWidth;
  float crest = abs(wave) < 1.0 ? (1.0 - wave * wave) : 0.0;
  vec2 direction = dist > 0.0 ? delta / dist : vec2(0.0);
  vec2 offset = direction * sin(wave * 3.14159) * crest * uStrength;
  vec2 coord = clamp(vTextureCoord - offset * uInputSize.zw, uInputClamp.xy, uInputClamp.zw);
  vec4 color = texture(uTexture, coord);
  color.rgb *= 1.0 + crest * 0.18;
  finalColor = color;
}
`;

export interface ShockwaveUniforms {
  uCenter: Float32Array;
  uRadius: number;
  uWidth: number;
  uStrength: number;
}

export function createShockwaveFilter(): Filter {
  return new Filter({
    glProgram: GlProgram.from({ vertex: defaultFilterVert, fragment: FRAGMENT, name: 'casserolade-shockwave' }),
    resources: {
      shockwave: {
        uCenter: { value: new Float32Array(2), type: 'vec2<f32>' },
        uRadius: { value: 0, type: 'f32' },
        uWidth: { value: 60, type: 'f32' },
        uStrength: { value: 0, type: 'f32' },
      },
    },
  });
}

/** The uniforms of a filter made by createShockwaveFilter, to move its ring. */
export function shockwaveUniforms(filter: Filter): ShockwaveUniforms {
  return filter.resources.shockwave.uniforms as ShockwaveUniforms;
}
