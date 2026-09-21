---
name: Lytera Design System
colors:
  surface: '#fbf8ff'
  surface-dim: '#d8d8ec'
  surface-bright: '#fbf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f2ff'
  surface-container: '#ececff'
  surface-container-high: '#e6e7fb'
  surface-container-highest: '#e0e1f5'
  on-surface: '#181b29'
  on-surface-variant: '#43474b'
  inverse-surface: '#2d2f3f'
  inverse-on-surface: '#f0efff'
  outline: '#73787c'
  outline-variant: '#c3c7cc'
  surface-tint: '#4b6171'
  primary: '#000911'
  on-primary: '#ffffff'
  primary-container: '#0a2230'
  on-primary-container: '#748a9b'
  inverse-primary: '#b2c9dc'
  secondary: '#845145'
  on-secondary: '#ffffff'
  secondary-container: '#ffbcad'
  on-secondary-container: '#7b493e'
  tertiary: '#140300'
  on-tertiary: '#ffffff'
  tertiary-container: '#391504'
  on-tertiary-container: '#b37a60'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#cee6f9'
  primary-fixed-dim: '#b2c9dc'
  on-primary-fixed: '#051e2c'
  on-primary-fixed-variant: '#344959'
  secondary-fixed: '#ffdad2'
  secondary-fixed-dim: '#f9b7a8'
  on-secondary-fixed: '#341008'
  on-secondary-fixed-variant: '#693a2f'
  tertiary-fixed: '#ffdbcc'
  tertiary-fixed-dim: '#f9b89a'
  on-tertiary-fixed: '#331102'
  on-tertiary-fixed-variant: '#683b25'
  background: '#fbf8ff'
  on-background: '#181b29'
  surface-variant: '#e0e1f5'
typography:
  display-hero:
    fontFamily: Plus Jakarta Sans
    fontSize: 56px
    fontWeight: '800'
    lineHeight: 68px
    letterSpacing: -0.02em
  display-hero-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '800'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-page:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.015em
  headline-page-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.01em
  headline-section:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  title-card:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  title-item:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
  body-large:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-regular:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-medium:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
  body-secondary:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-secondary-medium:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  caption:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  caption-medium:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
  button-text:
    fontFamily: Plus Jakarta Sans
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 20px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
  space-2xl: 3rem
  space-section: 6rem
---

## Brand & Style

This design system establishes a quiet, authoritative, yet deeply humane digital infrastructure for healthcare coordination and shared patient records across Indonesia. The brand tone avoids the sanitized, tech-startup sterility of standard clinical SaaS while rejecting the cluttered, bureaucratic weight typical of legacy hospital information systems (SIMRS).

The personality is defined by:
- **Calm Authority:** Grounded in deep oceanic navies that evoke clinical sobriety and permanence.
- **Warm Humanity:** Softened by terracotta, cream, and peach tones, preventing the interface from feeling transactional, alarming, or detached.
- **Radical Clarity:** Healthcare providers and administrative staff operate under cognitive fatigue; layouts prioritize scanability, generous negative space, and plain everyday Bahasa Indonesia over clinical jargon and visual noise.

The visual direction uses a hybrid **Modern Institutional** language: structured canvas tiers, generous human-scaled corner radii, razor-sharp 1px dividers, and an absolute absence of gradients, decorative spot illustrations, synthetic badge stamps, and artificial urgency markers.

## Colors

The palette operates on purposeful environmental shifts: immersive, focused deep-navy command zones at the top level, paired with open, breathable warm-white operational workspaces below.

### Primary Command & Structural Roles
- **Night (`#0A2230`):** Structural foundation for global navigation bars, hero backdrops, and primary system framing.
- **Deep Navy (`#0F3040`):** Heading text, section titles, high-prominence UI icons, and dark institutional panels.
- **Canvas (`#F8FAFC`):** Global operational background for data screens and portals.
- **White (`#FFFFFF`):** Base surface for all data cards, modular sections, modals, and sheets.
- **Cream (`#FAF5F2`):** Warm auxiliary sections, quiet clinical notices, patient context callouts, and off-canvas panels.
- **Mist (`#EBF2F6`):** Information highlights, selected table rows, active patient state containers, and subtle informational banners.
- **Border Tone (`#E2E8F0`):** Universal neutral outline, used consistently at 1px thickness.

### Interactive & Action Elements
- **Terracotta (`#8F5A4E`):** Primary action token on light backgrounds. Always paired with crisp white text (`#FFFFFF`).
- **Terracotta Hover (`#A56F63`):** State change for terracotta controls.
- **Soft Peach (`#D99B7F`):** High-contrast primary call-to-action placed strictly against Night (`#0A2230`) backgrounds. Paired with Night text (`#0A2230`).
- **Soft Peach Hover (`#E4AE94`):** State change for peach controls.

### Typography Neutrals
- **Primary Body (`#464858`):** Slate tone for high readability across dense medical records, referrals, and lab outputs.
- **Muted Text (`#6B7280`):** Secondary metadata, timestamps, helper descriptions, and input placeholders.

### Clinical Status & Triage Pipeline
Status colors follow strict semantic pairing with tinted backgrounds:
- **Success (`#1B6B4D` on `#EDF7F2`):** Completed referrals, confirmed transfers, active clinical sync. Completed state uses a filled circle in `#1B6B4D` containing a white check.
- **In-Progress (`#7A5200` text on `#FFF4D6` surface):** Referral review, waiting on labs, bed matching in progress. Indicator dot/accent: `#E0A100`.
- **Danger / Alert (`#B3261E` on `#FDECEA`):** Rejected cases, allergy flags, contraindications, and system warnings.

**Triage Priority Mapping:**
Every triage element must display both its designated chromatic indicator and an unambiguous Indonesian text label.
1. **Gawat Darurat:** Solid `#B3261E` container or indicator with bold red label.
2. **Urgent:** Solid `#E0A100` container or indicator with dark amber label.
3. **Elektif:** Surface `#FFFFFF` with 1px `#E2E8F0` border and slate `#464858` label.

## Typography

Typography is set exclusively in **Plus Jakarta Sans**, utilizing its geometric clarity and open apertures for effortless legibility across clinical monitors, hospital tablets, and mobile devices.

### Editorial Governance Rules
- **No Eyebrow Labels:** Never place small uppercase badges, pill chips, or mini track-spaced captions directly above primary headings. Introduce context naturally within the headline or via introductory section sentences.
- **Left-Aligned Discipline:** All page titles, section titles, and narrative blocks align strictly left. Center-aligned text is forbidden in operational interfaces and restricted solely to minimal empty-state actions.
- **Tabular Figures:** All numeric displays—such as NIK (Nomor Induk Kependudukan), BPJS registration numbers, ICD-10 codes, lab measurements, and vital signs—must use the OpenType feature `tnum` (`font-variant-numeric: tabular-nums`) to preserve columnar alignment.
- **Absolute Floor:** No clinical or patient text drops below 13px under any scenario.

## Layout & Spacing

The layout is engineered around an **8px structural grid** calibrated for high visual order and unhurried cognitive processing.

### Layout Dimensions & Grids
- **Global Content Constraint:** Max width of `1200px` centered on desktop viewpoints.
- **Landing Page Rhythm:** Section transitions carry exactly `96px` (`6rem`) vertical clearance to establish breathing room between distinct service offerings.
- **App Workspace Canvas:** Screen margins maintain `32px` (`2rem`) padding on desktop/tablet views and collapse cleanly to `16px` (`1rem`) on mobile.
- **Card Interior Padding:** Default to `24px` (`1.5rem`) on all sides to safeguard medical entries from edge friction.
- **12-Column Desktop Grid:** 12 columns with `24px` gutters (`gutter: 1.5rem`).
- **4-Column Mobile Grid:** 4 columns with `16px` gutters (`gutter-mobile: 1rem`).

### Form-Factor Breakpoints
- **Mobile (`< 768px`):** Single column stacks, sticky top-context bar with safe-area padding, bottom sheet overlays for filters.
- **Tablet (`768px - 1024px`):** 8-column layout, contextual side panel collapses to off-canvas drawer.
- **Desktop (`> 1024px`):** Full 12-column grid, persistent clinical sidebar navigation (fixed 260px), multi-pane patient split-views.

## Elevation & Depth

This system intentionally eliminates artificial multi-tier elevation, intense z-axis blur filters, and dramatic cast shadows. Spatial hierarchy is communicated through **structural surface tiers and crisp boundaries**.

### Surface Tiers
- **Tier 0 (Foundation):** `#F8FAFC` (Canvas).
- **Tier 1 (Cards & Workspaces):** `#FFFFFF` paired with an omnipresent 1px `#E2E8F0` border.
- **Tier 2 (Contextual Highlights):** `#FAF5F2` (Cream) for patient backdrops and `#EBF2F6` (Mist) for focused records.
- **Tier 3 (Institutional Command):** `#0A2230` (Night) for primary navigation headers and top-level clinical context bars.

### Shadow Policy
- **Static In-Page Elements:** Completely flat (`box-shadow: none`). Structure is defined exclusively by the 1px `#E2E8F0` border.
- **Floating Controls Only:** Menus, contextual dropdowns, autocompletes, and modal dialogs use an ultra-diffused, low-opacity ambient drop:
  `box-shadow: 0 10px 24px -4px rgba(10, 34, 48, 0.08), 0 4px 8px -2px rgba(10, 34, 48, 0.04)`

## Shapes

The design system uses deliberate, graduated border-radii that soften clinical tension while maintaining structural discipline. No sharp corners exist anywhere, with one specific functional exception.

### Radius Hierarchy
- **Cards & Data Modules:** `24px` outer radius.
- **Nested Inner Surfaces:** `16px` radius (e.g., patient vital card inside a diagnostic referral block).
- **Interactive Controls (Buttons & Text Inputs):** `14px` radius.
- **Pill Elements:** Fully rounded `9999px` applied uniformly to status badges, chips, category tags, notification counters, and circular avatar holders.
- **Data Tables:** Must live encased within an outer `24px` container with overflow clipping, preventing raw corner exposures.
- **Navbar Exception:** A full-width sticky navigation bar pinned against the top edge of the browser viewport uses flat `0px` corners along its top boundary, terminating at `0px` or smooth bottom boundary curves depending on viewport state.

## Components

### Buttons
- **Primary Action (Light Canvas):** Terracotta `#8F5A4E` background, `#FFFFFF` text, `14px` radius, height `48px` (padding: `0 24px`). Hover state: `#A56F63`. Active state: `#7B4B40`.
- **Primary Action (Dark Night Header):** Soft Peach `#D99B7F` background, Night `#0A2230` text, `14px` radius. Hover state: `#E4AE94`.
- **Secondary / Outline:** White surface, 1px border `#E2E8F0`, Deep Navy `#0F3040` text. Hover: `#F8FAFC` canvas tint.
- **Ghost Action:** Transparent background, Deep Navy `#0F3040` text. Hover: `#EBF2F6` (Mist).
- **Prohibitions:** No text transformation to full uppercase. Button text uses `button-text` tokens (`15px`, weight `600`).

### Input Fields & Selectors
- **Container:** Height `48px`, `14px` radius, background `#FFFFFF`, border 1px `#E2E8F0`.
- **States:**
  - *Default:* Slate text `#464858`, placeholder `#6B7280`.
  - *Focus:* Border color shifts to Deep Navy `#0F3040` with an outer outline ring of `2px solid rgba(15, 48, 64, 0.12)`.
  - *Error:* Border `#B3261E`, error text below input set in caption-medium `13px` `#B3261E`.
- **Labeling:** Clean top-aligned label set in body-secondary-medium (`14px`, `#0F3040`), `8px` gap to input field.

### Status Badges & Chips
- Fully rounded (`border-radius: 9999px`), vertical padding `4px`, horizontal padding `12px`, font size `13px` medium.
- **Selesai (Done):** `#1B6B4D` text on `#EDF7F2` background, preceded by a `16px` filled circle in `#1B6B4D` with a white checkmark icon.
- **Dalam Proses (In Progress):** `#7A5200` text on `#FFF4D6` background. Preceded by an `8px` solid `#E0A100` indicator dot.
- **Ditolak / Batal (Rejected):** `#B3261E` text on `#FDECEA` background.

### Triage Flags
- Always pairs color with unambiguous text:
  - *Gawat Darurat:* Background `#FDECEA`, text `#B3261E`, left border `4px solid #B3261E`.
  - *Urgen:* Background `#FFF4D6`, text `#7A5200`, left border `4px solid #E0A100`.
  - *Elektif:* Background `#FFFFFF`, text `#464858`, 1px border `#E2E8F0`.

### Selection Controls (Checkboxes & Radios)
- **Checkbox:** `20px × 20px`, `6px` radius, 1.5px border `#CBD5E1`. Checked: filled `#0F3040` with crisp white checkmark.
- **Radio Button:** `20px × 20px`, circular. Checked: `#0F3040` border with an inner `8px` solid `#0F3040` center dot.

### Cards & Modular Containers
- `24px` border radius, `#FFFFFF` background, 1px `#E2E8F0` solid border.
- Internal padding: `24px` standard.
- Inner contextual partitions (e.g., patient summary block, lab findings snippet): nested with `16px` border-radius and `#FAF5F2` (Cream) or `#EBF2F6` (Mist) fills.

### Data Tables
- Encapsulated within a parent card with `24px` border radius and `overflow: hidden`.
- **Header Row:** Background `#F8FAFC`, height `48px`, uppercase-disabled text in `13px` medium `#6B7280`.
- **Row Styling:** Height `60px`, border-bottom 1px `#E2E8F0`, alternating hover background `#FAF5F2`.
- **Selected Row:** Background `#EBF2F6` with an active indicator strip.
- **Numeric Columns:** Strict right-alignment with `tabular-nums` typography enabled.

### Language & Microcopy Rules
- Interface copy must be written in plain, clear, conversational Indonesian:
  - Use *Rujuk Pasien* (not *Submit Referral Request*).
  - Use *Riwayat Medis* (not *Medical History Log*).
  - Use *Kirim Berkas* (not *Upload Document Attachment*).
  - Use *Simpan Perubahan* (not *Commit Edits*).
- Sentences are kept short, transparent, and respectful, eliminating technical jargon wherever patient-facing or cross-clinic communications occur.