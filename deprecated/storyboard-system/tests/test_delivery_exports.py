import unittest
import xml.etree.ElementTree as ET

from delivery_exports import (
    frames_to_tc,
    tc_to_frames,
    generate_cmx3600_edl,
    generate_otio_json,
    generate_fcpxml,
    generate_srt_subtitles,
    generate_vtt_subtitles,
)


class DeliveryExportsTest(unittest.TestCase):
    def setUp(self):
        self.bundle = {
            "project": {"name": "Sample Film", "fps": 25.0, "is_drop_frame": False,
                        "start_tc": "01:00:00:00"},
            "total_frames": 50,
            "shots": [{"id": "shot-1", "number": 1, "title": "Opening", "duration_frames": 50,
                       "tc_in": "01:00:00:00", "tc_out": "01:00:02:00",
                       "tc_in_frames": 90000, "tc_out_frames": 90050,
                       "primary_method": "LIVE", "shot_size": "Wide", "lens": "35mm",
                       "voiceover": "Hello."}],
        }

    def test_timecode_conversion_including_drop_frame(self):
        self.assertEqual(frames_to_tc(75, 25), "00:00:03:00")
        self.assertEqual(tc_to_frames("01:00:03:12", 25), 90087)
        self.assertEqual(frames_to_tc(1800, 29.97, True), "00:01:00;02")
        self.assertEqual(tc_to_frames("00:01:00;02", 29.97), 1800)

    def test_editorial_formats_preserve_bundle_timing_and_voiceover(self):
        edl = generate_cmx3600_edl(self.bundle)
        self.assertIn("TITLE: Sample Film", edl)
        self.assertIn("00:00:02:00", edl)
        self.assertIn("* COMMENT: VO: Hello.", edl)

        otio = generate_otio_json(self.bundle)
        self.assertEqual(otio["global_start_time"]["value"], 90000)
        self.assertEqual(otio["tracks"]["children"][0]["children"][0]["source_range"]["duration"]["value"], 50)

        xml = ET.fromstring(generate_fcpxml(self.bundle))
        self.assertEqual(xml.find(".//clip").attrib["duration"], "50/25s")
        self.assertEqual(xml.find(".//note").text, "Hello.")

        srt = generate_srt_subtitles(self.bundle)
        self.assertIn("01:00:00,000 --> 01:00:02,000", srt)
        self.assertIn("Hello.", srt)
        self.assertTrue(generate_vtt_subtitles(self.bundle).startswith("WEBVTT\r\n\r\n"))


if __name__ == "__main__":
    unittest.main()
