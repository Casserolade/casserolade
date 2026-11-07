import { Container, MeshSimple } from 'pixi.js';
import type { Texture } from 'pixi.js';
import { polygonCentroid } from '#src/client/tools/polygonCentroid.ts';
import { shardPolygons } from '#src/client/tools/shardPolygons.ts';
import type { Point } from '#src/client/tools/shardPolygons.ts';

export interface ShardBlast {
  /** Where the medallion stood on the stage: its top left corner and its scale. */
  x: number;
  y: number;
  scale: number;
  /** Where the blow came from, as a direction (the pieces fly away from it), and how hard. */
  dirX: number;
  dirY: number;
  power: number;
  /** How many cracks run out from the heart: twice as many pieces. */
  wedges: number;
  /** A tint over the pieces (charred black, gold), white for none. */
  tint?: string;
  life?: number;
}

interface Shard {
  mesh: MeshSimple;
  vx: number;
  vy: number;
  spin: number;
  /** It tumbles: turns around its own axis, shown by squeezing it. */
  tumble: number;
  phase: number;
}

const GRAVITY = 1700;
const DRAG = 0.9;

/** One piece of the picture: a fan of triangles around its centre, cut from the medallion's snapshot. */
function shardMesh(texture: Texture, points: Point[], center: Point): MeshSimple {
  const ring = [center, ...points];
  const vertices = new Float32Array(ring.flatMap(([x, y]) => [x - center[0], y - center[1]]));
  const uvs = new Float32Array(ring.flatMap(([x, y]) => [x / texture.width, y / texture.height]));
  const indices = new Uint32Array(points.flatMap((_, index) => [0, index + 1, ((index + 1) % points.length) + 1]));
  return new MeshSimple({ texture, vertices, uvs, indices });
}

/**
 * A medallion broken to pieces: its snapshot cut like glass (shardPolygons), every piece flying away from the blow,
 * spinning and tumbling, falling, fading. The pieces carry the politician's real face.
 */
export class Shards {
  readonly view = new Container();
  private readonly shards: Shard[];
  private readonly life: number;
  private age = 0;

  /** `texture` is the medallion's snapshot; `offsetX`, `offsetY` where its top left sits in the medallion. */
  constructor(texture: Texture, offsetX: number, offsetY: number, blast: ShardBlast) {
    this.life = blast.life ?? 1.1;
    this.view.position.set(blast.x, blast.y);
    this.view.scale.set(blast.scale);
    const polygons = shardPolygons(texture.width, texture.height, blast.wedges, Math.random);
    const heart: Point = [texture.width / 2, texture.height / 2];
    this.shards = polygons.map((points) => {
      const center = polygonCentroid(points);
      const mesh = shardMesh(texture, points, center);
      mesh.position.set(offsetX + center[0], offsetY + center[1]);
      if (blast.tint) mesh.tint = blast.tint;
      this.view.addChild(mesh);
      const outX = center[0] - heart[0];
      const outY = center[1] - heart[1];
      const away = Math.hypot(outX, outY) || 1;
      const speed = (220 + Math.random() * 380) * blast.power * blast.scale;
      return {
        mesh,
        vx: (outX / away) * speed * 0.7 + blast.dirX * speed,
        vy: (outY / away) * speed * 0.7 + blast.dirY * speed - 180 * blast.power * blast.scale,
        spin: (Math.random() - 0.5) * 16,
        tumble: 4 + Math.random() * 9,
        phase: Math.random() * Math.PI,
      };
    });
  }

  /** False once every piece has gone. */
  update(deltaSeconds: number): boolean {
    this.age += deltaSeconds;
    const fade = Math.max(0, 1 - Math.max(0, this.age - this.life * 0.55) / (this.life * 0.45));
    const slowing = Math.exp(-DRAG * deltaSeconds);
    for (const shard of this.shards) {
      shard.vx *= slowing;
      shard.vy = shard.vy * slowing + GRAVITY * this.view.scale.y * deltaSeconds;
      shard.mesh.x += (shard.vx * deltaSeconds) / this.view.scale.x;
      shard.mesh.y += (shard.vy * deltaSeconds) / this.view.scale.y;
      shard.mesh.rotation += shard.spin * deltaSeconds;
      shard.mesh.scale.y = Math.cos(shard.phase + shard.tumble * this.age);
      shard.mesh.alpha = fade;
    }
    return this.age < this.life;
  }

  destroy(): void {
    this.view.destroy({ children: true });
  }
}
