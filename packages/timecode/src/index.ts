/**
 * FrameForge Timecode Engine (TypeScript)
 * SMPTE Drop-Frame & Non-Drop-Frame Frame-Accurate Arithmetic
 */

export interface FrameRate {
  num: number;
  den: number;
  fps: number;
  dropFrame: boolean;
}

export const STANDARD_FRAME_RATES: Record<string, FrameRate> = {
  '23.976': { num: 24000, den: 1001, fps: 23.976023976, dropFrame: false },
  '24': { num: 24, den: 1, fps: 24, dropFrame: false },
  '25': { num: 25, den: 1, fps: 25, dropFrame: false },
  '29.97_NDF': { num: 30000, den: 1001, fps: 29.97002997, dropFrame: false },
  '29.97_DF': { num: 30000, den: 1001, fps: 29.97002997, dropFrame: true },
  '30': { num: 30, den: 1, fps: 30, dropFrame: false },
  '48': { num: 48, den: 1, fps: 48, dropFrame: false },
  '50': { num: 50, den: 1, fps: 50, dropFrame: false },
  '59.94_NDF': { num: 60000, den: 1001, fps: 59.94005994, dropFrame: false },
  '59.94_DF': { num: 60000, den: 1001, fps: 59.94005994, dropFrame: true },
  '60': { num: 60, den: 1, fps: 60, dropFrame: false }
};

export function isDropFrameRate(fps: number, dropFrameFlag = false): boolean {
  return dropFrameFlag && (Math.abs(fps - 29.97) < 0.05 || Math.abs(fps - 59.94) < 0.05);
}

export function framesToTimecode(totalFrames: number, fps: number, isDropFrame = false): string {
  totalFrames = Math.max(0, Math.round(totalFrames));
  const nominalFps = Math.round(fps);

  if (isDropFrame && Math.abs(fps - 29.97) < 0.05) {
    const dropFrames = 2;
    const framesPerMinute = 1800 - dropFrames; // 1798
    const framesPer10Minutes = 1800 * 10 - dropFrames * 9; // 17982

    const d = Math.floor(totalFrames / framesPer10Minutes);
    const m = totalFrames % framesPer10Minutes;

    let adjustedFrames = totalFrames;
    if (m > dropFrames) {
      adjustedFrames += dropFrames * 9 * d + dropFrames * Math.floor((m - dropFrames) / framesPerMinute);
    } else {
      adjustedFrames += dropFrames * 9 * d;
    }

    const ff = adjustedFrames % 30;
    const ss = Math.floor(adjustedFrames / 30) % 60;
    const mm = Math.floor(adjustedFrames / 1800) % 60;
    const hh = Math.floor(adjustedFrames / 108000);

    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')};${String(ff).padStart(2, '0')}`;
  }

  // Non-Drop Frame
  const ff = totalFrames % nominalFps;
  const totalSeconds = Math.floor(totalFrames / nominalFps);
  const ss = totalSeconds % 60;
  const mm = Math.floor(totalSeconds / 60) % 60;
  const hh = Math.floor(totalSeconds / 3600);
  const sep = isDropFrame ? ';' : ':';

  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}${sep}${String(ff).padStart(2, '0')}`;
}

export function timecodeToFrames(tc: string, fps: number): number {
  if (!tc || typeof tc !== 'string') return 0;
  const parts = tc.trim().split(/[:;.]/);
  if (parts.length !== 4) return 0;

  const [hh, mm, ss, ff] = parts.map(p => parseInt(p, 10) || 0);
  const nominalFps = Math.round(fps);
  const isDf = tc.includes(';') || (Math.abs(fps - 29.97) < 0.05 && tc.includes(';'));

  if (isDf && Math.abs(fps - 29.97) < 0.05) {
    const totalMinutes = 60 * hh + mm;
    const dropFrames = 2;
    const baseFrames = 108000 * hh + 1800 * mm + 30 * ss + ff;
    const dropped = dropFrames * (totalMinutes - Math.floor(totalMinutes / 10));
    return Math.max(0, baseFrames - dropped);
  }

  return Math.max(0, (hh * 3600 + mm * 60 + ss) * nominalFps + ff);
}

export function framesToSeconds(frames: number, fps: number): number {
  return frames / fps;
}

export function secondsToFrames(seconds: number, fps: number): number {
  return Math.round(seconds * fps);
}

export function convertFrameRate(frames: number, sourceFps: number, targetFps: number): number {
  const seconds = framesToSeconds(frames, sourceFps);
  return secondsToFrames(seconds, targetFps);
}

export interface VOTimingInput {
  id: string;
  voiceover: string;
  locked: boolean;
  duration_frames: number;
}

export interface PunctuationWeights {
  comma: number;
  period: number;
  question: number;
  exclamation: number;
  ellipsis: number;
  paragraph: number;
}

export const DEFAULT_PUNCTUATION_WEIGHTS: PunctuationWeights = {
  comma: 8,
  period: 16,
  question: 16,
  exclamation: 18,
  ellipsis: 14,
  paragraph: 24
};

export function calculateVOTiming(
  shots: VOTimingInput[],
  targetDurationFrames: number,
  fps: number,
  weights = DEFAULT_PUNCTUATION_WEIGHTS,
  minFrames = Math.round(fps * 0.8)
): VOTimingInput[] {
  if (!Number.isSafeInteger(targetDurationFrames)) {
    throw new RangeError('targetDurationFrames must be a safe integer');
  }
  if (!Number.isSafeInteger(minFrames) || minFrames < 0) {
    throw new RangeError('minFrames must be a non-negative integer');
  }

  const lockedTotalFrames = shots
    .filter(s => s.locked)
    .reduce((sum, s) => sum + s.duration_frames, 0);

  const unlockedShots = shots.filter(s => !s.locked);
  if (unlockedShots.length === 0) return shots;

  const availableFrames = targetDurationFrames - lockedTotalFrames;
  const minimumTotal = unlockedShots.length * minFrames;

  // Calculate weights for each unlocked shot
  const weightsList = unlockedShots.map(s => {
    const vo = (s.voiceover || '').trim();
    if (!vo) return { base: 1.0, pauses: 0, total: 1.0 };

    const clean = vo.replace(/\s+/g, '');
    const charCount = clean.length;
    const commas = (vo.match(/[，,、]/g) || []).length;
    const periods = (vo.match(/[。；;]/g) || []).length;
    const questions = (vo.match(/[？?]/g) || []).length;
    const exclamations = (vo.match(/[！!]/g) || []).length;
    const ellipses = (vo.match(/[…：:]/g) || []).length;

    const pauseFrames =
      commas * weights.comma +
      periods * weights.period +
      questions * weights.question +
      exclamations * weights.exclamation +
      ellipses * weights.ellipsis;

    const totalWeight = Math.max(1.0, charCount * 1.0 + (pauseFrames / fps) * 2.0);
    return { base: charCount, pauses: pauseFrames, total: totalWeight };
  });

  let allocations: number[];
  if (availableFrames < minimumTotal) {
    // Keep locked durations and the per-shot minimum; the caller detects the
    // infeasible target because the proposed total remains above the target.
    allocations = unlockedShots.map(() => minFrames);
  } else {
    const extraFrames = availableFrames - minimumTotal;
    const sumWeights = weightsList.reduce((acc, w) => acc + w.total, 0) || unlockedShots.length;
    const shares = weightsList.map((weight, index) => {
      const exact = (weight.total / sumWeights) * extraFrames;
      const floor = Math.floor(exact);
      return { index, floor, remainder: exact - floor };
    });
    let framesLeft = extraFrames - shares.reduce((sum, share) => sum + share.floor, 0);
    const byRemainder = [...shares].sort((a, b) => b.remainder - a.remainder || a.index - b.index);
    allocations = shares.map(share => minFrames + share.floor);
    for (let i = 0; i < framesLeft; i++) allocations[byRemainder[i].index] += 1;
  }

  // Apply back to unlocked shots
  let uIdx = 0;
  return shots.map(s => {
    if (s.locked) return s;
    const allocated = allocations[uIdx++];
    return { ...s, duration_frames: allocated };
  });
}
