# Product

## Register

product

## Users

Civil and pavement engineers in Algeria — experienced technical professionals who understand CTTP methodology. They use the tool on a workstation in an office or on-site, primarily PC-first (laptop or desktop with a full keyboard). They are opening the tool to run a structural analysis, validate field measurements, or produce a traceable reinforcement recommendation for a DTP submission. They are not being guided — they already know the domain. The UI should respect that expertise.

## Product Purpose

CTTP Renforcement is a startup engineering SaaS that digitizes the Algerian CTTP pavement reinforcement design workflow (Guide des Renforcements des Chaussées Souples, Dec 1992). It computes traffic classes, applies season/region/temperature deflection correction factors, and outputs reinforcement structures with full CTTP traceability. An AI-powered pavement distress detection module augments field assessment by analyzing uploaded pavement photos via Gemini Vision. The tool is the authoritative digital implementation of a previously manual, paper-based standard.

## Brand Personality

Precise, modern, efficient, trustworthy. Voice is expert-to-expert — no hand-holding, no marketing softness. Every label is technical. Every result is sourced. The interface should feel like a precision instrument, not a consumer web app.

## Anti-references

- The current lime-green/eco palette: reads "sustainability startup" or "agriculture app", not "civil engineering standard"
- Generic shadcn default dashboard: white cards, slate text, blue primary button — it looks unbranded
- Healthcare white+teal aesthetic
- Consumer SaaS with large rounded corners, pastel gradients, and decorative illustrations
- Legacy Windows Forms engineering software (ETABS-era gray UI): the opposite failure — not that either
- Any interface where the status/severity system relies on color alone without labels

## Design Principles

1. **Precision over decoration** — every visual element maps to a data relationship or workflow state; nothing decorative exists
2. **Expert confidence** — the interface speaks the language of engineers (CTTP codes, technical units, French terminology); never condescending or over-explaining
3. **Information density over airiness** — engineers need to see calculations, factors, and results simultaneously; whitespace is a tool for grouping, not a default filler
4. **Traceability is visible** — every result must display its source formula and factor chain; the UI should make computation legible, not hide it
5. **Keyboard-first, mouse-friendly** — forms should be navigable without the mouse; desktop efficiency is priority one

## Accessibility & Inclusion

WCAG AA minimum. High contrast is critical — engineers may use the tool in bright office lighting or on screens with reflective glare. Status indicators (deflection zone, severity, visual rating) must never rely on color alone — always paired with a text label or icon. No motion for functional states.
