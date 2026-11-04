import assert from 'node:assert/strict';
import { test } from 'node:test';
import { samplePose } from './sample_pose.js';

const ANIMATION = {
  duration: 1,
  keyframes: [
    { at: 0, y: 0 },
    { at: 1, y: 12 },
  ],
};

test('snaps time to the frame rate', () => {
  assert.equal(samplePose(ANIMATION, 0.5, 12).y, 6);
  assert.equal(samplePose(ANIMATION, 0.53, 12).y, 6);
});

test('holds the last pose after the end', () => {
  assert.equal(samplePose(ANIMATION, 5, 12).y, 12);
});

test('wraps time when the animation loops', () => {
  assert.equal(samplePose({ ...ANIMATION, loop: true }, 1.5, 12).y, 6);
});

test('fills missing properties with the neutral pose', () => {
  const pose = samplePose(ANIMATION, 0, 12);
  assert.equal(pose.scaleX, 1);
  assert.equal(pose.x, 0);
});
