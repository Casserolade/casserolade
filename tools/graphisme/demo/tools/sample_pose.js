const DEFAULT_POSE = { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 };

/** Pose of an animation at a given time, snapped to the animation's frame rate so it stays choppy. */
export function samplePose({ keyframes, duration, loop }, time, fps) {
  const wrapped = loop ? time % duration : Math.min(time, duration);
  const snapped = Math.floor(wrapped * fps) / fps;
  const nextIndex = keyframes.findIndex((keyframe) => keyframe.at > snapped);
  if (nextIndex === -1) return { ...DEFAULT_POSE, ...keyframes[keyframes.length - 1] };
  if (nextIndex === 0) return { ...DEFAULT_POSE, ...keyframes[0] };
  const before = { ...DEFAULT_POSE, ...keyframes[nextIndex - 1] };
  const after = { ...DEFAULT_POSE, ...keyframes[nextIndex] };
  const progress = (snapped - before.at) / (after.at - before.at);
  return {
    x: before.x + (after.x - before.x) * progress,
    y: before.y + (after.y - before.y) * progress,
    rotation: before.rotation + (after.rotation - before.rotation) * progress,
    scaleX: before.scaleX + (after.scaleX - before.scaleX) * progress,
    scaleY: before.scaleY + (after.scaleY - before.scaleY) * progress,
  };
}
