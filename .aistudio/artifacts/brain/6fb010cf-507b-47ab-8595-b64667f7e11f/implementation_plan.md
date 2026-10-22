# Event Tracker Customization & Multi-Style Progress Architecture

Comprehensive enhancement to the **Event Tracker** widget inside the Work Station desktop environment, providing granular event customization (icons, background themes, accent colors, custom bottom tags, searchable taxonomy, repeatable lifecycle badges), five selectable progress bar visual styles, customizable milestone threshold alert banners, and a streamlined unified progress button.

### User Review & Critical Decisions

> [!IMPORTANT]
> The following decisions were clarified and confirmed in Phase 1:
> - **Progress Bar Styles**: Support all requested styles (Continuous Smooth Bar, Segmented Step Blocks, Segmented Pips, Radial Donut Ring, and Connected Milestone Nodes), excluding liquid level wave fill.
> - **Threshold Triggers**: Rendered as a prominent visual banner badge with custom alert message directly on the event card when the target step or percentage is reached or exceeded.
> - **Unified Progress Button**: Replaces the redundant dual buttons ("Progress All" & "Progress Selected") with a single smart button. The button dynamically adapts its label and action: "Progress All (N)" if all events are checked, "Progress Selected (k)" if a subset is checked, and disabled ("Select events to progress") if 0 are checked.

---

### 1. Overview & Core Concept

- **What It Does**: Enhances the Event Tracker widget into a rich personal and project goal-tracking command center. Users can configure distinct visual aesthetics for each event card (custom background shades, thematic icons with custom colors, and progress visual styles), attach repeatable cycle tags and searchable keyword tags, set progression threshold triggers that activate milestone alert banners, and advance items with an adaptive single progress control.
- **Target Audience / Persona**: Writers tracking chapters and word quotas, game masters tracking narrative beats or combat milestones, students organizing study cycles, and productivity-focused desktop users who need lightweight, flexible progression meters on their virtual workstation desktop.
- **Key Value**: Replaces rigid single-format task lists with deeply customizable, tactile tracking cards that match the user's workflow style and give immediate visual satisfaction upon milestone completion.

---

### 2. User Experience & Visual Design

#### Key User Flows
1. **Creating & Customizing an Event**:
   - The user opens the Event Tracker and clicks **"New Event"** (or edits an existing one).
   - In the expanded editor, they enter a title, target steps, and optional notes.
   - **Icon & Color**: Select an icon (e.g. Flame, Target, Star, Sword, Book, Shield, Zap) and an icon accent tint.
   - **Card Background**: Choose from clean background palettes (Crisp White, Muted Slate, Soft Sage, Indigo Tint, Rose Mist, Amber Gold, Cyber Noir).
   - **Progress Bar Style**: Choose between 5 visual styles:
     - *Segmented Step Blocks*: Individual tactile clickable boxes (`1`, `2`, `3`...).
     - *Continuous Smooth Bar*: High-precision horizontal fill track with rounded ends and percentage label.
     - *Segmented Pips*: Horizontal battery-style segmented bars.
     - *Radial Ring Gauge*: Circular SVG donut gauge with progress percentage inside.
     - *Connected Milestone Nodes*: Numbered checkpoint circles linked by progress lines.
   - **Tags & Repeatability**: Toggle repeatability (with cycle counter) and add custom comma-separated tags (e.g. `writing`, `quest`, `daily`).
   - **Milestone Thresholds**: Define milestone step thresholds (e.g. step 3 or 50%) with a custom alert message (e.g. *"Halfway Checkpoint Reached! Draft Finished"*).
2. **Browsing, Searching & Filtering**:
   - A dedicated top search & tag bar allows typing text or clicking any active tag chip to instantly filter visible events.
   - Bottom tags on cards are clickable: clicking a tag automatically filters the widget by that tag.
3. **Progressing & Threshold Triggers**:
   - Checking items enables the unified **"Progress"** button. If all are checked, it reads **"Progress All"**; if some are checked, it reads **"Progress (k)"**; if none are checked, it is disabled.
   - Clicking progress advances the selected items by +1 step.
   - If an event reaches its defined threshold, a visual banner badge appears with the custom alert message and an celebratory icon.
   - If a repeatable event reaches 100%, it cycles back to 0, increments its completion counter (e.g. `3x Completed`), and retains its cycle tag.

#### Visual Identity & Theme
- **Color Discipline (60-30-10)**:
  - 60% neutral canvas matching the Work Station desktop aesthetic.
  - 30% structural surfaces with subtle hairline borders (`border-neutral-200/80` or dark-mode counterpart).
  - 10% high-intent accent colors chosen per event for progress fills and icons.
- **Zero-Pill Metadata**: Tags at the bottom of cards are rendered with clean text and subtle typographic dividers (`·`) or minimalist clickable filter tags rather than heavy decorative badge sandwiches.
- **Typography & Tabular Numerals**: Numeric metrics, step fractions (`3/5`), percentages (`60%`), and completion multipliers (`4x`) use strict monospace tabular figures (`font-mono tabular-nums`).

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Progress Bar Representation Options**:
  - *Chosen Approach*: Support 5 diverse visual representations (Segmented Blocks, Smooth Linear Bar, Segmented Pips, Radial Donut Gauge, Connected Milestone Nodes).
  - *Why*: Accommodates both discrete checklist events (like chapter structural beats) and continuous metrics (like word counts and daily quotas), matching the user's reference designs while omitting messy liquid fills.
  - *Alternative Considered*: Only offering a linear bar vs segmented boxes; rejected because users explicitly requested diverse styles.
- **Decision 2: Unified Progress Button Logic**:
  - *Chosen Approach*: Single dynamic action button that checks `selectedCount`:
    - `selectedCount === 0`: Disabled (`Progress (Select events)`).
    - `selectedCount === events.length`: `Progress All (${events.length})`.
    - `0 < selectedCount < events.length`: `Progress Selected (${selectedCount})`.
  - *Why*: Eliminates toolbar clutter, prevents misclicks, and delivers the exact unified behavior requested by the user.
- **Decision 3: Card Threshold Alerts**:
  - *Chosen Approach*: Visual banner badge at the top or bottom of the event card that activates when `currentStep >= thresholdStep`, displaying the user's alert text and dismissible/persistent indicator.
  - *Why*: Provides immediate, non-intrusive feedback directly in context without modal popups that would interrupt workstation desktop multitasking.

---

### 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             Work Station Desktop                            │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                     EventTrackerWidget (Window)                       │  │
│  │                                                                       │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │ Window Titlebar (Traffic lights, Widget Title, Summary Copy)    │  │  │
│  │  └─────────────────────────────────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │ Widget Toolbar:                                                 │  │  │
│  │  │ • Unified Progress Button [Progress (k)] (Disabled when 0 sel)  │  │  │
│  │  │ • "+ New Event" Button                                          │  │  │
│  │  │ • Search input & Active Tag Filter Bar                          │  │  │
│  │  └─────────────────────────────────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │ Event Card List (Filtered by Search / Tag / Status)              │  │  │
│  │  │                                                                 │  │  │
│  │  │  ┌───────────────────────────────────────────────────────────┐  │  │  │
│  │  │  │ Event Card (Custom BG & Accent)                           │  │  │  │
│  │  │  │ • Selection checkbox + Custom Icon (colored) + Title      │  │  │  │
│  │  │  │ • Threshold Alert Banner (visible when threshold reached) │  │  │  │
│  │  │  │ • Selected Progress Bar Style (Blocks/Bar/Pips/Ring/Nodes)│  │  │  │
│  │  │  │ • Bottom Bar: Repeatable Cycle Tag + Custom Search Tags   │  │  │  │
│  │  │  │ • Actions: [+1 Step], [Reset], [Edit], [Delete]          │  │  │  │
│  │  │  └───────────────────────────────────────────────────────────┘  │  │  │
│  │  └─────────────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Data Model Definition
```typescript
export type ProgressBarStyle =
  | 'segmented-blocks'   // Clickable numbered boxes
  | 'smooth-linear'      // Rounded filled horizontal bar
  | 'segmented-pips'     // Battery-style discrete pips
  | 'circular-ring'      // Radial SVG circle gauge
  | 'milestone-nodes';   // Connected checkpoint nodes

export type EventBgTheme =
  | 'white'
  | 'slate'
  | 'sage'
  | 'indigo'
  | 'rose'
  | 'amber'
  | 'noir';

export type EventIconName =
  | 'star'
  | 'flame'
  | 'target'
  | 'trophy'
  | 'book'
  | 'shield'
  | 'zap'
  | 'sparkles'
  | 'flag'
  | 'check';

export interface EventThreshold {
  enabled: boolean;
  step: number;          // Trigger at step N
  message: string;       // Custom alert message
}

export interface TrackedEvent {
  id: string;
  title: string;
  currentStep: number;
  totalSteps: number;
  isRepeatable: boolean;
  completionCount: number;
  selected: boolean;
  notes?: string;
  // Customization additions:
  icon: EventIconName;
  iconColor: string;       // Hex or Tailwind color token
  bgTheme: EventBgTheme;    // Card background color
  accentColor: string;     // Progress bar accent color
  progressStyle: ProgressBarStyle;
  tags: string[];          // Custom searchable tags
  threshold?: EventThreshold;
}
```

#### Component & State Transitions
- **EventTrackerWidget.tsx**:
  - `events`: Array of `TrackedEvent` items initialized with rich multi-style defaults.
  - `searchQuery`: String query for live filtering by title or notes.
  - `activeTagFilter`: Selected tag filter (or `'all'`).
  - `editingEventId`: Optional ID for in-place card editing vs new event creation.
  - `progressSelected()`: Advances only events where `event.selected === true`, managing cycle wrap-arounds and threshold detection.
  - `toggleTagFilter(tag)`: Toggles active tag filter.
