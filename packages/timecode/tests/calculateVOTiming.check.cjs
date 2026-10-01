const assert = require('node:assert/strict');
const { calculateVOTiming } = require('../dist');

const shots = [
  { id: 'locked', voiceover: '固定', locked: true, duration_frames: 73 },
  { id: 'long', voiceover: '字'.repeat(5000), locked: false, duration_frames: 20 },
  { id: 'empty', voiceover: '', locked: false, duration_frames: 20 },
  { id: 'short', voiceover: '字', locked: false, duration_frames: 20 },
];
const feasible = calculateVOTiming(shots, 130, 25, undefined, 4);
assert.equal(feasible[0].duration_frames, 73, 'locked duration stays unchanged');
assert.deepEqual(feasible.slice(1).map(shot => shot.duration_frames), [49, 4, 4]);
assert.equal(feasible.reduce((sum, shot) => sum + shot.duration_frames, 0), 130);
assert.ok(feasible.slice(1).every(shot => shot.duration_frames >= 4));

const infeasible = calculateVOTiming(shots, 84, 25, undefined, 4);
assert.equal(infeasible[0].duration_frames, 73, 'infeasible targets still preserve locked frames');
assert.deepEqual(infeasible.slice(1).map(shot => shot.duration_frames), [4, 4, 4]);
assert.equal(infeasible.reduce((sum, shot) => sum + shot.duration_frames, 0), 85);
assert.notEqual(infeasible.reduce((sum, shot) => sum + shot.duration_frames, 0), 84,
  'the caller can detect the infeasible target from the proposed total');

console.log('calculateVOTiming regression check passed');
