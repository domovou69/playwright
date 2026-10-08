# SUB-008: Premium content and the guest gate
Parent: [STORY-001](STORY-001-wallpapers-guest-e2e.md) · Spec: `tests/wallpapers/08-premium-gate.spec.ts`

Safety: only opens and closes the gate. "Login & Watch Ad" and "Buy Credits" are asserted visible, never clicked.

| # | Scenario | Invariant |
|---|----------|-----------|
| 1 | Cards | Default feed mixes free (no price) and premium (price) cards |
| 2 | Premium detail | "Premium" label with the same price as the card |
| 3 | Gate opens | Download on a premium item priced 10 opens "Unlock and Support the Artist" with Login & Watch Ad, Buy Credits, "3 free premium downloads daily" copy; no file downloads |
| 4 | Close | Close button dismisses; URL unchanged; Download still enabled |
| 5 | Reopen | Gate reopens |
| 6 | Escape | Escape dismisses |
| 7 | Expensive items | Show "Buy for Ƶ<price>" matching the card (not clicked) |
