# Operations redesign

Date: 2026-11-17

## Purpose

The product site and operations console now use one light, information-dense visual system. The redesign changes presentation only. It keeps the existing routes, role gates, API contracts, handlers, state transitions, and operational copy that protects behavior.

## Research basis

- Nielsen Norman Group, [Dashboards: Making Charts and Graphs Easier to Understand](https://www.nngroup.com/articles/dashboards-preattentive/). Operational dashboards support rapid decisions; quantitative values use position and length, not angle or area. Circular gauges, donut charts, and 3D charts are poor choices for rapid comparison.
- Nielsen Norman Group, [Data Tables: Four Major User Tasks](https://www.nngroup.com/articles/data-tables/). Tables support finding, comparison, row inspection, and record actions. Human-readable identifiers come first, headers stay visible, filters are discoverable, and side panels preserve table context.
- Nielsen Norman Group, [8 Design Guidelines for Complex Applications](https://www.nngroup.com/articles/complex-application-design/). Reduce clutter without reducing capability, use staged disclosure, make critical information salient, and support flexible pathways through work.
- W3C, [How to Meet WCAG 2.2](https://www.w3.org/WAI/WCAG22/quickref/). The redesign targets AA contrast, visible keyboard focus, reflow, non-color status cues, minimum pointer target size, and reduced motion.

## Design decisions

- **Light operational canvas.** Warm off-white canvas, white working surfaces, thin borders, and a deep teal action color. The palette is not a dark-blue or purple gradient theme.
- **Exception-first hierarchy.** The dashboard leads with exceptions, movement, and delay counts. Secondary readiness and audit information follows.
- **Dense, flat surfaces.** Working panels and repeated rows use 4-6 px radii and borders instead of stacked rounded cards.
- **Linear charts.** Inventory utilization is a horizontal bar chart. Forecast demand is a line chart. Color reinforces categories but never carries a value alone.
- **Icon-led tools.** Navigation uses Lucide icons. Utility actions such as refresh use icon-only controls with accessible labels and tooltips. Destructive and record-changing actions retain explicit text.
- **Persistent workspace context.** The desktop rail can collapse without unmounting the shell. The mobile drawer closes after navigation. The header remains sticky.
- **Real product imagery.** The public home page includes a responsive, accessible rendering of the actual control-tower layout rather than generic decorative cards.
- **Calm motion.** Page changes remain brief. Public section reveals are short and reduced-motion aware. No looping decorative motion was added.

## Verification

- Console: typecheck, lint, 178 tests, and production build.
- Product site: 73 tests, production build, and per-route bundle budget.
- In-app browser: seeded workspace checked at desktop and narrow responsive widths; navigation drawer, forms, summary strip, and route/exception/account surfaces inspected.

## Known limits

- The public home preview is a static product representation, not a live embedded console.
- The repository's migration chain is consistent through `20261107_0026`. The production Cloudflare API reports that live revision in both `/health` and `/api/v1/health/schema`; the production smoke workflow requires the exact revision, not only a generic "current" status.
