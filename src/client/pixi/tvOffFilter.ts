import { Filter, GlProgram, defaultFilterVert } from 'pixi.js';

/**
 * A Vedette goes off the air like an old television: snow eats the picture, it squashes into a white line, the line
 * shrinks to a dot, and the dot goes out. Drawn over the medallion's own box (the filter's frame), `uProgress` from 0
 * to 1.
 */
const FRAGMENT = `
precision highp float;
in vec2 vTextureCoord;
out vec4 finalColor;
uniform sampler2D uTexture;
uniform vec4 uInputSize;
uniform vec4 uInputClamp;
uniform vec4 uOutputFrame;
uniform float uProgress;
uniform float uTime;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main(void) {
  vec2 toLocal = uInputSize.xy / uOutputFrame.zw;
  vec2 local = vTextureCoord * toLocal;
  float squashY = mix(1.0, 0.018, smoothstep(0.45, 0.68, uProgress));
  float squashX = mix(1.0, 0.02, smoothstep(0.7, 0.9, uProgress));
  vec2 centered = local - 0.5;
  vec2 source = vec2(centered.x / squashX, centered.y / squashY) + 0.5;
  if (source.x < 0.0 || source.x > 1.0 || source.y < 0.0 || source.y > 1.0) {
    finalColor = vec4(0.0);
    return;
  }
  float roll = floor(uTime * 24.0);
  float tear = (hash(vec2(floor(source.y * 40.0), roll)) - 0.5) * 0.06 * smoothstep(0.05, 0.4, uProgress);
  vec2 coord = clamp((source + vec2(tear, 0.0)) / toLocal, uInputClamp.xy, uInputClamp.zw);
  vec4 color = texture(uTexture, coord);
  float snow = hash(floor(source * vec2(70.0, 90.0)) + roll);
  float amount = smoothstep(0.0, 0.42, uProgress);
  vec3 rgb = mix(color.rgb, vec3(snow) * color.a, amount * 0.8);
  rgb *= 1.0 + smoothstep(0.4, 0.75, uProgress) * 3.0;
  float off = 1.0 - smoothstep(0.92, 1.0, uProgress);
  finalColor = vec4(rgb, color.a) * off;
}
`;

export interface TvOffUniforms {
  uProgress: number;
  uTime: number;
}

export function createTvOffFilter(): Filter {
  return new Filter({
    glProgram: GlProgram.from({ vertex: defaultFilterVert, fragment: FRAGMENT, name: 'casserolade-tv-off' }),
    resources: {
      tvOff: {
        uProgress: { value: 0, type: 'f32' },
        uTime: { value: 0, type: 'f32' },
      },
    },
  });
}

export function tvOffUniforms(filter: Filter): TvOffUniforms {
  return filter.resources.tvOff.uniforms as TvOffUniforms;
}
