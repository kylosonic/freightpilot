# Workspace interface

FreightPilot uses Notion's calm, document-like hierarchy as a reference. It is not a Notion clone, and the redesign preserves every route, form, permission, and operational action.

## Visual system

- Use a white content canvas and `#f7f7f5` for navigation and quiet grouping.
- Use `#252522` for primary text, `#5f5f59` for secondary text, and `#73736e` for descriptions.
- Use `#e5e4e0` for light rules. Full borders are reserved for inputs, dialogs, distinct tools, and repeated records.
- Use `#087f72` for public primary actions, `#176b5c` for console primary actions, and `#2e4f47` for the brand mark.
- Use Inter across the public site and console with a 1.5 to 1.75 line height for body copy. Use monospace only for identifiers and code.
- Use 6 px radii for inputs, 8 px for panels and dialogs, and full pills for compact actions.

The console tokens live in `apps/ops-console/src/index.css`. The public site's tokens live in `apps/product-web/src/app/globals.css` and `apps/product-web/tailwind.config.ts`.

## Navigation and layout

Console navigation uses plain labels: Overview, Routes, Shipments, Dispatch, Exceptions, Planning, Fleet and cash, Import data, Payments, Verify payments, Settings, and Integrations. Two-letter route codes are removed.

The public header exposes Sign in in its desktop navigation and Open console in the mobile menu. The footer retains its console link. Start free remains the single primary call to action on each public route.

Page headings are compact and descriptive. Summary metrics are a single scan-friendly band, avoiding a grid of decorative cards. Tags, confidence readouts, and supporting data sit in table or document-style rows. Empty states use quiet surfaces rather than nested borders.

Interactive controls use icon-only buttons only where the meaning is conventional; every such control has an accessible label and tooltip. Forms use visible labels and clear text actions. All controls preserve the existing focus-visible ring.

## Motion and responsiveness

Motion is limited to a brief page fade and the existing hero entrance. Reduced-motion preferences suppress animation.

Check the public site at 320, 375, 768, 1280, and 1920 px. Check the console at 320, 375, 768, and 1280 px. Navigation collapses below its desktop breakpoint, the console rail becomes an overlay, and tables scroll within their own region. The document must never overflow horizontally.
