# FrameForge offline fonts

Only the two approved font families are bundled:

- **Satoshi** — official Fontshare webfont files, weights 400/500/700:
  https://www.fontshare.com/fonts/satoshi
- **Sarasa Gothic SC / 更纱黑体** — regular source font, split into
  Unicode-range WOFF2 files for progressive Chinese glyph loading:
  https://github.com/be5invis/Sarasa-Gothic

No Noto font files are included. Regenerate the files with the
scripts/build_offline_fonts.py utility. Do not replace the source URLs or
families without product-owner approval.
