# Known wallpapers bugs (ground truth for bug recall)

Filed before this experiment. A case "finds" one if a bug report or a bug-asserting test of that case describes the same defect.

- **ZED-3.** Premium wallpapers at the same price (10 credits) show different primary buttons on the detail page: "White Feathers
  Floating Dark Wallpaper" (/wallpapers/a1b0f0ad-1ccd-4410-95f7-f04b3823c604) shows "Download" (ad-unlock flow), "Spooky
  Mansion" (/wallpapers/e1b7e619-872b-4180-bd79-2f426d91c225) shows "Buy". Expected: a Premium item shows Buy.
- **ZED-4.** Opening the "Buy for" purchase modal on a premium wallpaper logs a console warning: Missing `Description` or
  `aria-describedby={undefined}` for DialogContent (a Radix dialog without an accessible description).
