const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');

const src = fs.readFileSync(path.join(__dirname, '../static/app.js'), 'utf8');
const start = src.indexOf('const NARRATION_SPEED_OPTIONS');
const end = src.indexOf('function updateTimingWorkspaceSummary', start);
assert.ok(start >= 0 && end > start, 'timing helpers should be present');
const context = vm.createContext({ Math, Number, String });
vm.runInContext(`${src.slice(start, end)}\nglobalThis.timing = { normalizeNarrationSpeed, estimateNarrationFrames, recalculateTimingSegments };`, context);

const { normalizeNarrationSpeed, estimateNarrationFrames, recalculateTimingSegments } = context.timing;
const text = '今天开始拍摄';
const slow = estimateNarrationFrames(text, 25, 0.5);
const standard = estimateNarrationFrames(text, 25, 1);
const fast = estimateNarrationFrames(text, 25, 2);
assert.ok(slow > standard && standard > fast, `expected slower rate to lengthen duration: ${slow}, ${standard}, ${fast}`);
assert.equal(estimateNarrationFrames('Wait, go!', 25, 2) >= 15, true, 'minimum duration still applies');
assert.equal(normalizeNarrationSpeed(99), 1, 'out of range speeds fall back to standard');
assert.equal(normalizeNarrationSpeed('1.5'), 1.5);

const segments = [
  { text, frames: 99 },
  { text, frames: 84, manuallyEdited: true },
  { text, frames: 66, locked: true }
];
recalculateTimingSegments(segments, 25, 1.5);
assert.equal(segments[0].frames, estimateNarrationFrames(text, 25, 1.5));
assert.equal(segments[1].frames, 84, 'manual frame edits survive speed changes');
assert.equal(segments[2].frames, 66, 'locked segments survive speed changes');
console.log('PASS speed-adjusted single-shot estimate, bounds, minimum duration, manual edits, and locks');
