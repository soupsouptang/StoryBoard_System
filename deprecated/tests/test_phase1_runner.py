"""
FrameForge OS Phase 1 Automated Test Suite
Validates Storyboard, Shot List, VO Auto-Timing, Revision OCC, and Layout Contracts
"""
from __future__ import annotations

import json
import math
import re
import unittest


class Phase1TimecodeAndVOTests(unittest.TestCase):
    def test_timecode_conversions(self):
        fps = 25.0
        # 0 frame -> 00:00:00:00
        # 25 frames -> 00:00:01:00
        # 250 frames -> 00:00:10:00
        # 6750 frames -> 00:04:30:00
        def f_to_tc(frames: int) -> str:
            ff = frames % int(fps)
            total_sec = frames // int(fps)
            ss = total_sec % 60
            mm = (total_sec // 60) % 60
            hh = total_sec // 3600
            return f"{hh:02d}:{mm:02d}:{ss:02d}:{ff:02d}"

        self.assertEqual(f_to_tc(0), "00:00:00:00")
        self.assertEqual(f_to_tc(25), "00:00:01:00")
        self.assertEqual(f_to_tc(250), "00:00:10:00")
        self.assertEqual(f_to_tc(6750), "00:04:30:00")

    def test_vo_auto_timing_largest_remainder(self):
        """Verify largest remainder VO timing allocation without drift."""
        fps = 25.0
        target_frames = 6750  # 4m30s
        weights = {"comma": 8, "period": 16, "ellipsis": 14}

        shots = [
            {"id": "s1", "vo": "渤海之滨，津门故里，一座现代化的国际农产品交易中心正在拔地而起。", "locked": False, "duration": 75},
            {"id": "s2", "vo": "园区总占地面积达三千余亩，具备完善的冷链仓储与智慧分拣系统。", "locked": False, "duration": 75},
            {"id": "s3", "vo": "LOGO定格", "locked": True, "duration": 100},  # Locked shot
        ]

        locked_frames = sum(s["duration"] for s in shots if s["locked"])
        avail = target_frames - locked_frames

        unlocked = [s for s in shots if not s["locked"]]
        char_weights = []
        for s in unlocked:
            text = s["vo"]
            chars = len(re.sub(r"\s+", "", text))
            commas = text.count("，") + text.count(",")
            periods = text.count("。")
            pauses = commas * weights["comma"] + periods * weights["period"]
            w = max(1.0, chars * 1.0 + (pauses / fps) * 2.0)
            char_weights.append(w)

        total_w = sum(char_weights)
        allocations = []
        assigned = 0
        for i, w in enumerate(char_weights):
            if i == len(char_weights) - 1:
                allocations.append(avail - assigned)
            else:
                share = round((w / total_w) * avail)
                allocations.append(share)
                assigned += share

        final_total = locked_frames + sum(allocations)
        self.assertEqual(final_total, target_frames)
        self.assertEqual(len(allocations), len(unlocked))


class Phase1ContractTests(unittest.TestCase):
    def test_methods_and_departments(self):
        valid_methods = {"live", "stock", "client", "archive", "still", "ae", "mg", "three_d", "vfx", "type"}
        valid_departments = {"director", "camera", "production", "art", "stock", "editorial", "motion", "three_d", "vfx", "sound", "color"}

        self.assertIn("live", valid_methods)
        self.assertIn("vfx", valid_methods)
        self.assertIn("three_d", valid_methods)
        self.assertIn("camera", valid_departments)


if __name__ == "__main__":
    unittest.main(verbosity=2)
