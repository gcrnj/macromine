# MacroMine design notes

## References (reviewed 23 October 2026)

- [MacroFactor](https://macrofactor.com/macrofactor/), including its product screenshots: borrow a clear daily summary, fast food entry, and immediate nutrition feedback.
- [Cronometer](https://cronometer.com/), product screenshots and target overview: borrow precise consumed/target pairs and compact nutrient progress. Track only calories, protein, fiber, and fat.
- [Hevy](https://www.hevyapp.com/), workout logging screenshots: borrow dense, repeatable rows with inline numeric editing. Gym remains disabled.
- [Material bottom sheets](https://m1.material.io/components/bottom-sheets.html): use a full-width mobile sheet with scrollable content and persistent actions; a constrained dialog on desktop.

## Visual system

- Warm paper #f6f5f0, white surface, ink #242b27, muted #67716a, hairlines #dce0d8. One pine accent #286044. Dark mode uses charcoal #151b17, #1c241e surfaces, pale ink, and a lighter pine accent. Semantic amber indicates over-target progress.
- Self-hosted DM Sans: a readable humanist face with open counters and a compact rhythm. Its tabular figures make amounts easy to compare; no network font fetch or layout shift.
- Space scale: 4, 8, 12, 16, 24, 32, 48 px. Corners: 6 px; no decorative shadows, gradients, imagery, or oversized cards.
- Left-aligned headings; constrained 1040 px workspace; 2-column desktop summary, single-column mobile. All four macro values appear in a consistent order. Macro columns right-align; calories use integers, grams one decimal.
- Lucide only, 20 px and stroke width 1.75. Controls have at least 44 px touch areas. Persistent bottom navigation with Today, Meals, Ingredients, and disabled Gym / Soon.
- Flat panels and dividers. Small uppercase labels provide hierarchy; primary actions are solid pine. Empty states state the next action plainly.
- Dialogs use native modal focus trapping, Escape, labeled headings, visible close buttons. Tabs keep three entry sources distinct and one editable list shared. Totals and save actions stay visible at the sheet bottom.
- Light/dark follows the device by default, with a local override. Short color transitions only; respect reduced motion. No animation-driven layout.
