export interface Spring {
  offset: number;
  velocity: number;
}

/**
 * One step of a damped spring pulling `offset` back to 0: a medallion knocked back by a blow springs home with a
 * little bounce, like a flipper bumper. Integrated in small slices, so that a long frame never makes it explode.
 */
export function springStep({ offset, velocity }: Spring, deltaSeconds: number, stiffness: number, damping: number): Spring {
  const slices = Math.max(1, Math.ceil(deltaSeconds / 0.008));
  const slice = deltaSeconds / slices;
  let position = offset;
  let speed = velocity;
  for (let index = 0; index < slices; index++) {
    speed += (-stiffness * position - damping * speed) * slice;
    position += speed * slice;
  }
  return { offset: position, velocity: speed };
}
