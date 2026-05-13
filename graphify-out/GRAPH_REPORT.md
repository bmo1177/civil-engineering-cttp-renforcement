# Graph Report - .  (2026-05-12)

## Corpus Check
- Corpus is ~36,656 words - fits in a single context window. You may not need a graph.

## Summary
- 368 nodes · 478 edges · 19 communities detected
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 30 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_CTTP Color Coding|CTTP Color Coding]]
- [[_COMMUNITY_CTTP Design & Prediction|CTTP Design & Prediction]]
- [[_COMMUNITY_Detection & Selection|Detection & Selection]]
- [[_COMMUNITY_OfflineOnline Utilities|Offline/Online Utilities]]
- [[_COMMUNITY_Traffic Classification|Traffic Classification]]
- [[_COMMUNITY_Settings & UI Shell|Settings & UI Shell]]
- [[_COMMUNITY_License Input|License Input]]
- [[_COMMUNITY_Detection Processing|Detection Processing]]
- [[_COMMUNITY_UI Primitives|UI Primitives]]
- [[_COMMUNITY_Gemini AI Integration|Gemini AI Integration]]
- [[_COMMUNITY_Toast Notifications|Toast Notifications]]
- [[_COMMUNITY_Report Export|Report Export]]
- [[_COMMUNITY_Carousel UI|Carousel UI]]
- [[_COMMUNITY_Layout & SW Registration|Layout & SW Registration]]
- [[_COMMUNITY_PDF Report Generation|PDF Report Generation]]
- [[_COMMUNITY_AI Backend Server|AI Backend Server]]
- [[_COMMUNITY_Input Validation|Input Validation]]
- [[_COMMUNITY_App Branding|App Branding]]
- [[_COMMUNITY_Download README|Download README]]

## God Nodes (most connected - your core abstractions)
1. `cn()` - 46 edges
2. `classifyDeflection()` - 9 edges
3. `computeDesign()` - 8 edges
4. `Input()` - 6 edges
5. `getDeflectionColor()` - 6 edges
6. `GeminiProvider` - 6 edges
7. `Badge()` - 5 edges
8. `Separator()` - 5 edges
9. `Label()` - 5 edges
10. `getDeflectionZoneColor()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `getDeflectionZoneInfo()` --calls--> `classifyDeflection()`  [INFERRED]
  src/components/cttp/MetricsPanel.tsx → src/lib/cttp-rules.ts
- `getDeflectionBarColor()` --calls--> `getDeflectionColor()`  [INFERRED]
  src/components/cttp/MetricsPanel.tsx → src/lib/ui-helpers.ts
- `getVisualStatusStyle()` --calls--> `cttpStatusBadge()`  [INFERRED]
  src/components/cttp/MetricsPanel.tsx → src/lib/ui-helpers.ts
- `POST()` --calls--> `computeDesign()`  [INFERRED]
  src/app/api/design/route.ts → src/lib/engine.ts
- `getDeflectionColor()` --calls--> `classifyDeflection()`  [INFERRED]
  src/lib/ui-helpers.ts → src/lib/cttp-rules.ts

## Hyperedges (group relationships)
- **CTTP Design Computation Pipeline** — cttp_rules_ts, engine_ts, api_design, reinforcement_decision_matrix, deflection_correction_method [INFERRED 0.95]
- **Calculator UI Component System** — metricspanel_tsx, reinforcementpanel_tsx, detectioncanvas_tsx, imageuploader_tsx, settingsmodal_tsx, reportexporter_tsx, calculatorapp_tsx [INFERRED 0.95]
- **AI Inference Pipeline (Gemini/ONNX)** — inference_provider_ts, onnx_provider_ts, api_predict, detectioncanvas_tsx, imageuploader_tsx [INFERRED 0.85]

## Communities (55 total, 7 thin omitted)

### Community 0 - "CTTP Color Coding"
Cohesion: 0.1
Nodes (27): getDeflectionBarColor(), getDeflectionZoneInfo(), getVisualStatusStyle(), cttpDeflectionBadge(), cttpReinforcementBadge(), cttpStatusBadge(), cttpTrafficBadge(), formatDeflection() (+19 more)

### Community 1 - "CTTP Design & Prediction"
Cohesion: 0.12
Nodes (16): /api/design, /api/predict, CTTP Color Coding System, CTTP Guide (Dec 1992), Deflection Correction (Cs·Cr·Ct), Inference Provider Abstraction (Gemini/ONNX), Nuclear SSR Fix, Reinforcement Decision Matrix (18 rules) (+8 more)

### Community 2 - "Detection & Selection"
Cohesion: 0.09
Nodes (11): useIsMobile(), formatPercent(), getSeverityColor(), Sheet(), SheetDescription(), SheetHeader(), SheetTitle(), SidebarMenuButton() (+3 more)

### Community 3 - "Offline/Online Utilities"
Cohesion: 0.1
Nodes (8): Alert(), Select(), SelectItem(), SelectTrigger(), SelectValue(), Tabs(), TabsList(), TabsTrigger()

### Community 4 - "Traffic Classification"
Cohesion: 0.19
Nodes (15): POST(), calculateTraffic(), classifyDeflection(), classifyTraffic(), correctDeflection(), interpolateCt(), computeDeflection(), computeDesign() (+7 more)

### Community 6 - "License Input"
Cohesion: 0.15
Nodes (6): Input(), Popover(), PopoverTrigger(), ScrollArea(), handleKeyPress(), sendMessage()

### Community 7 - "Detection Processing"
Cohesion: 0.19
Nodes (8): confidenceToSeverity(), getVal(), iou(), nms(), postprocessDetections(), preprocessImage(), determineStatus(), ONNXProvider

### Community 9 - "Gemini AI Integration"
Cohesion: 0.2
Nodes (6): determineStatus(), GeminiProvider, getInferenceProvider(), ONNXProviderStub, resetProvider(), POST()

### Community 12 - "Toast Notifications"
Cohesion: 0.39
Nodes (6): addToRemoveQueue(), dispatch(), genId(), reducer(), toast(), useToast()

### Community 13 - "Report Export"
Cohesion: 0.32
Nodes (4): buildReportHTML(), formatDate(), formatValue(), DropdownMenu()

### Community 29 - "AI Backend Server"
Cohesion: 0.83
Nodes (3): createSystemMessage(), createUserMessage(), generateMessageId()

### Community 37 - "App Branding"
Cohesion: 1.0
Nodes (3): App Brand Logo, Logo SVG, Play Icon

## Knowledge Gaps
- **3 isolated node(s):** `/api/predict`, `Style Agent: ImageUploader Restyle`, `Download README`
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `UI Primitives` to `CTTP Color Coding`, `Detection & Selection`, `Offline/Online Utilities`, `Settings & UI Shell`, `License Input`, `Drawer UI`, `Menu Bar UI`, `Report Export`, `Pagination UI`, `Breadcrumb UI`, `Carousel UI`, `Navigation Menu UI`, `Table UI`, `Context Menu UI`, `Toggle Group UI`, `Card UI`, `Avatar UI`, `Input OTP UI`, `Alert Dialog UI`, `Accordion UI`, `Radio Group UI`, `Calendar UI`, `Resizable UI`, `Slider UI`, `Chart UI`?**
  _High betweenness centrality (0.389) - this node is a cross-community bridge._
- **Why does `classifyDeflection()` connect `Traffic Classification` to `CTTP Color Coding`, `Offline/Online Utilities`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Why does `useToast()` connect `Toast Notifications` to `Offline/Online Utilities`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `classifyDeflection()` (e.g. with `getDeflectionZoneInfo()` and `getDeflectionColor()`) actually correct?**
  _`classifyDeflection()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `getDeflectionColor()` (e.g. with `getDeflectionBarColor()` and `classifyDeflection()`) actually correct?**
  _`getDeflectionColor()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `/api/predict`, `Style Agent: ImageUploader Restyle`, `Download README` to the rest of the system?**
  _3 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `CTTP Color Coding` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._