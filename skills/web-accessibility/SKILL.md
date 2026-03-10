---
name: web-accessibility
description: Use when creating, modifying, or reviewing any UI code — React components, pages, HTML, CSS, or JSX/TSX. Activates before writing UI code to ensure WCAG 2.2 AA compliance, and after completing code for verification. Covers semantic HTML, keyboard access, images, forms, focus management, ARIA, and contrast.
---

# Accessibility for Web Components

Build accessible-by-default. Semantic HTML first, ARIA second, custom JS last.

**Standard**: WCAG 2.2 Level AA (53 criteria). Every interactive element must be keyboard-operable, every piece of content perceivable by assistive technology.

## Common AI-Generation Mistakes

LLMs produce inaccessible code the majority of the time. These are the patterns models get wrong most often — watch for them in every generation:

1. **`<div onClick>` instead of `<button>`** — the #1 failure. Models default to divs for clickable elements. Always use `<button>` for actions, `<a href>` for navigation.
2. **Icon buttons without accessible names** — models generate `<button><Icon /></button>` without `aria-label`. Screen readers announce nothing.
3. **`<img>` without `alt`** — models skip alt text, especially on decorative images (which still need `alt=""`).
4. **`<svg>` without `aria-hidden` or labeling** — models treat SVGs as invisible to assistive tech by default. They're not.
5. **`outline: none` on focus states** — models remove focus indicators for aesthetics. This makes keyboard navigation impossible.
6. **`<input>` without `<label>`** — models use placeholder text as a substitute. It isn't one.
7. **Nested interactive elements** — `<a>` wrapping `<button>` or vice versa. Invalid HTML that breaks screen readers.

## Severity Tiers

| Tier | Impact | Rules |
|------|--------|-------|
| **CRITICAL** | Complete access barrier — fix immediately, ship-blocker | 1, 2, 3, 5, 6, 7, 8 |
| **SERIOUS** | Major barrier — fix before release | 4, 9, 10, 11, 14, 18, 20, 21 |
| **MODERATE** | Usability impact — fix within sprint | 12, 13, 15, 16, 17, 19, 22-26 |

96% of accessibility errors on the web come from 6 failure types: missing alt text, empty links, missing form labels, low contrast, empty buttons, missing document language. The Critical rules below cover all of these.

## Critical Rules

Rules numbered to match the quick-reference table below. Rule 4 (Headings) is Serious severity — see `references/rules-reference.md`.

### 1. Semantic Interactive Elements

This is the #1 source of accessibility failures in generated code.

```tsx
// ✅ CORRECT — clickable action = <button>
<button onClick={handleSave}>Save</button>

// ✅ CORRECT — navigation = <a> with href
<a href="/dashboard">Dashboard</a>

// ❌ WRONG — never put onClick on non-interactive elements
<div onClick={handleSave}>Save</div>
<span role="button" onClick={handleSave}>Save</span>
```

**The rule**: If it's clickable, it MUST be a `<button>` or `<a href>`. Not a `<div>`, `<span>`, or any other non-interactive element. No exceptions. If you find yourself adding `role="button"` to a `<div>`, stop — use a `<button>`.

**Every button and link MUST have an accessible name.** A `<button>` with only an icon and no text or `aria-label` is invisible to screen readers.

```tsx
// ❌ WRONG — button has no accessible name
<button onClick={onClose}><CloseIcon /></button>

// ✅ CORRECT — provide an accessible name
<button onClick={onClose} aria-label="Close dialog"><CloseIcon aria-hidden="true" /></button>
```

**Never nest interactive elements.** A `<button>` inside an `<a>`, or vice versa, is invalid HTML and breaks screen readers. For clickable cards, use the stretched-link pattern:

```tsx
// ❌ WRONG — button nested inside a link
<a href="/product/123">
  <h3>Product Name</h3>
  <button onClick={addToCart}>Add to Cart</button>
</a>

// ✅ CORRECT — stretched primary link + sibling actions
<article className="card" style={{ position: 'relative' }}>
  <h3>
    <a href="/product/123" className="card-link">Product Name</a>
    {/* .card-link::before { content:''; position:absolute; inset:0; z-index:1; } */}
  </h3>
  <button onClick={addToCart} style={{ position:'relative', zIndex:2 }}>Add to Cart</button>
</article>
```

### 2. Keyboard Accessibility

Every mouse interaction MUST have a keyboard equivalent.

```tsx
// ✅ CORRECT — <button> handles Enter and Space natively
<button onClick={handleAction}>Do Thing</button>

// ✅ CORRECT — if you truly cannot use <button>, add FULL keyboard support
<div
  role="button"
  tabIndex={0}
  onClick={handleAction}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleAction();
    }
  }}
>
  Do Thing
</div>
```

**Rules**:
- Every `onClick` MUST have `onKeyDown` handler (unless on `<button>`, `<a>`, `<input>`)
- Support `Enter` for all, `Space` for buttons/checkboxes
- Never use positive `tabIndex` — only `0` or `-1`
- Don't add `tabIndex` to non-interactive elements that have no event handlers
- Test for keyboard traps — user must be able to Tab away from every element

### 3. Images and Alt Text

```tsx
// ✅ Informative — describe the content
<img src="chart.png" alt="Sales increased 25% from Q1 to Q2 2025" />

// ✅ Decorative — empty alt
<img src="decorative-border.png" alt="" />

// ❌ WRONG — missing alt
<img src="photo.jpg" />
```

**Rules**: Every `<img>` MUST have `alt`. Decorative: `alt=""`. Informative: describe what it communicates. Don't start with "Image of". Icons inside buttons: `aria-hidden="true"` on icon, `aria-label` on button.

**SVG Accessibility** — almost always handled wrong:

```tsx
// ✅ Decorative SVG — hide from AT
<svg aria-hidden="true" viewBox="0 0 24 24"><path d="..." /></svg>

// ✅ Informative SVG — needs role="img" + accessible name
import { useId } from 'react';
function StatusIcon({ label }: { label: string }) {
  const titleId = useId();
  return (
    <svg role="img" aria-labelledby={titleId} viewBox="0 0 24 24">
      <title id={titleId}>{label}</title>
      <path d="..." />
    </svg>
  );
}

// ✅ SVG inside button — hide SVG, label the button
<button aria-label="Close dialog">
  <svg aria-hidden="true" viewBox="0 0 24 24"><path d="..." /></svg>
</button>
```

### 5. Color and Contrast

| Text Type | Minimum Ratio |
|-----------|--------------|
| Normal text (< 18px, or < 14px bold) | 4.5:1 |
| Large text (≥ 18px, or ≥ 14px bold) | 3:1 |
| UI components & graphical objects | 3:1 |

**Rules**: Never use color as sole indicator of meaning (errors need icons/text too). Focus indicators need 3:1 contrast. Test with light and dark themes.

### 6. Forms and Inputs

```tsx
// ✅ CORRECT — explicit label + error association
<label htmlFor="email">Email address</label>
<input id="email" type="email" aria-required="true" />

// ✅ CORRECT — error linked to input
<input id="pw" type="password" aria-invalid="true" aria-describedby="pw-error" />
<span id="pw-error" role="alert">Password must be at least 8 characters</span>

// ❌ WRONG — no label
<input type="email" placeholder="Enter email" />
```

**Rules**: Every input MUST have `<label>` (via `htmlFor`/`id`). Placeholder is NOT a label. Mark required: `aria-required="true"`. Link errors: `aria-describedby`. Invalid: `aria-invalid="true"`. Group related: `<fieldset>` + `<legend>`.

### 7. Focus Management

```css
/* ✅ CORRECT */
button:focus-visible {
  outline: 2px solid #0055FF;
  outline-offset: 2px;
}

/* ❌ WRONG — removing focus with no replacement */
*:focus { outline: none; }
```

**Rules**: All interactive elements MUST have visible focus indicators. Never remove `outline` without a visible alternative. Use `:focus-visible` (not `:focus`). When content changes dynamically, manage focus explicitly. **Focus Not Obscured (WCAG 2.2)**: Focused elements must not be hidden by sticky headers — use `scroll-padding-top`.

**Note on `autoFocus`**: Using `autoFocus` is correct in dialog/modal patterns to move initial focus to the dialog or its first interactive element (e.g., the Cancel button in a confirmation dialog).

### 8. ARIA Usage

**First rule of ARIA: don't use ARIA if semantic HTML achieves the same result.**

```tsx
// ✅ Semantic HTML, no ARIA needed
<nav>...</nav>
<button>Click me</button>

// ❌ Redundant ARIA
<nav role="navigation">...</nav>
<button role="button">Click me</button>

// ❌ ARIA instead of semantic HTML
<div role="navigation">...</div>
```

**Critical: never put `aria-hidden="true"` on or around focusable elements.** This creates "ghost focus" — keyboard users Tab to an element that screen readers cannot see.

## All Rules Quick Reference

| # | Rule | WCAG | Severity |
|---|------|------|----------|
| 1 | Semantic elements: `<button>` for actions, `<a>` for navigation | 4.1.2 | Critical |
| 2 | Keyboard: every mouse action has keyboard equivalent | 2.1.1, 2.1.2 | Critical |
| 3 | Images: every `<img>` has `alt`, SVGs labeled or hidden | 1.1.1 | Critical |
| 4 | Headings: sequential levels, prefer one `<h1>` per page | 1.3.1 | Serious |
| 5 | Contrast: 4.5:1 normal text, 3:1 large text/UI | 1.4.3, 1.4.11 | Critical |
| 6 | Forms: every input has `<label>`, errors linked | 1.3.1, 3.3.1-2 | Critical |
| 7 | Focus: visible indicators, no traps, managed on change | 2.4.7, 2.4.11, 2.1.2 | Critical |
| 8 | ARIA: semantic HTML first, no ghost focus | 4.1.2 | Critical |
| 9 | Live regions: `aria-live` for dynamic content | 4.1.3 | Serious |
| 10 | Links: descriptive text, no `href="#"` | 2.4.4 | Serious |
| 11 | Label in name: visible text in accessible name | 2.5.3 | Serious |
| 12 | Pointer: up-event actions, single-pointer alternatives | 2.5.1-2 | Moderate |
| 13 | Hover/focus: dismissible, hoverable, persistent | 1.4.13 | Moderate |
| 14 | Media: captions, transcripts, audio control | 1.2.1-5, 1.4.2 | Serious |
| 15 | Reflow: works at 320px width, resizable text | 1.4.4, 1.4.10, 1.4.12 | Moderate |
| 16 | Sensory: don't rely on color/shape/sound alone | 1.3.3, 1.4.1 | Moderate |
| 17 | Autocomplete: `autoComplete` on identity inputs | 1.3.5 | Moderate |
| 18 | Language: `lang` on `<html>`, `lang` on foreign text | 3.1.1, 3.1.2 | Serious |
| 19 | Predictable: no changes on focus/input | 3.2.1-4 | Moderate |
| 20 | Errors: identify, suggest fix, prevent (confirm destructive) | 3.3.1, 3.3.3-4 | Serious |
| 21 | Page: unique `<title>`, skip link, landmarks, timing | 2.4.1-2, 2.2.1-2 | Serious |
| 22 | Target size: ≥24×24px (44×44 recommended) | 2.5.8 | Moderate |
| 23 | Dragging: button alternative for drag interactions | 2.5.7 | Moderate |
| 24 | Auth: allow paste, password managers, no puzzles | 3.3.8 | Moderate |
| 25 | Redundant entry: auto-populate in multi-step forms | 3.3.7 | Moderate |
| 26 | Consistent help: same location across pages | 3.2.6 | Moderate |

Full code examples for rules 4, 9-26: see `references/rules-reference.md`
Component patterns (Modal, Tabs, Menu, etc.): see `references/react-patterns.md`
**Wix developers**: see `references/wix-platform-guide.md` — WDS components, editor-elements APIs, testing infrastructure

## Anti-Patterns Quick-Lookup

| Anti-Pattern | Fix | WCAG |
|-------------|-----|------|
| `<div onClick={fn}>` | `<button onClick={fn}>` | 4.1.2 |
| `<span onClick={() => navigate(url)}>` | `<a href={url}>` | 4.1.2 |
| `<div role="button" tabIndex={0}>` | `<button>` | 4.1.2 |
| `onClick` without `onKeyDown` on non-native | Add `onKeyDown`, or use `<button>` | 2.1.1 |
| `<img>` without `alt` | `alt="description"` or `alt=""` | 1.1.1 |
| `<svg>` without `aria-hidden` or name | Decorative: `aria-hidden="true"`. Informative: `role="img"` + `<title>` | 1.1.1 |
| `<input placeholder="Email">` no `<label>` | Add `<label htmlFor="id">` | 1.3.1 |
| `outline: none` on `:focus` | `:focus-visible` with visible alternative | 2.4.7 |
| Headings skip levels (h1 → h3) | Sequential levels | 1.3.1 |
| Color-only error indication | Add icon + text alongside color | 1.4.1 |
| `<a href="#">` / `javascript:void(0)` | `<button>` for actions | 4.1.2 |
| Button/link with no text and no `aria-label` | Add visible text or `aria-label` | 4.1.2 |
| `<button>` inside `<a>`, or `<a>` inside `<button>` | Restructure — stretched-link pattern | 4.1.2 |
| `aria-hidden="true"` around focusable elements | Remove, or `tabIndex={-1}` on children, or `inert` | 4.1.2 |
| `role="button"` on `<button>` | Remove redundant role | 4.1.2 |
| `aria-label="Find items"` visible text "Search" | `aria-label` must contain visible text | 2.5.3 |
| `onMouseDown={action}` for primary actions | `onClick` (fires on up-event) | 2.5.2 |
| `<select onChange={navigate}>` | Add explicit Go button | 3.2.2 |
| `<video autoPlay>` without pause | Remove `autoPlay` or add pause button | 1.4.2 |
| `width: 1200px` (fixed) | `max-width` + responsive layout | 1.4.10 |
| `onPaste={(e) => e.preventDefault()}` | Remove — users must paste passwords | 3.3.8 |
| `autocomplete="off"` on login | Remove — allow password managers | 3.3.8 |
| `<iframe>` without `title` | Add `title="description"` | 2.4.1 |
| CSS `animation-duration` < 333ms with color change | Slow to >333ms or use transform instead | 2.3.1 |
| Icon button < 24×24px | `min-width: 24px; min-height: 24px` | 2.5.8 |
| `<canvas>` without fallback | Add `role="img"` + `aria-label`, or fallback content inside | 1.1.1 |
| `role="presentation"` on `<button>`/`<a>`/`<input>` | Remove — fix the actual issue, don't suppress with role | 4.1.2 |
| Icon component as sole `<button>` child, no `aria-label` | Add `aria-label` to button, `aria-hidden` on icon | 4.1.2 |

## Mandatory Verification — Run After Every Change

**You MUST run the a11y scanner after writing or modifying any component.** Do not skip. Do not rely on mental review.

### Step 1: Run the Accessibility Scanner

```bash
node scripts/a11y-check.js path/to/component.tsx
```

This runs both:
- **Pattern scanner** (18 checks, zero deps, always works) — catches onClick on divs, missing alt, SVG a11y, empty buttons, focus removal, fake links, nested interactives, paste blocking, and more
- **ESLint jsx-a11y** (17 rules, runs if eslint + plugin are installed) — catches additional semantic and ARIA violations

Fix every violation reported. **Never suppress jsx-a11y rules** with `eslint-disable`.

### Step 2: Re-run Until Clean

Fixing one issue can introduce another. Repeat Step 1 until the scanner exits with 0 violations.

### Step 3: Run Project Tests (when available)

```bash
yarn test --testPathPattern="a11y|accessibility"
yarn test-storybook --stories="**/YourComponent.stories.*"
yarn run-inspection
```

### Step 4: Manual Verification (interactive sessions)

**Keyboard**: Tab through every interactive element. Enter/Space activate correctly. Escape closes overlays. No keyboard traps.

**Visual**: Focus indicators visible. Focused content not hidden behind sticky elements. Works at 200% zoom. Touch targets ≥ 24×24px.

**Screen reader** (pick one): macOS VoiceOver (`Cmd+F5`), Windows NVDA, or Chrome DevTools Accessibility Inspector.

## Wix Platform Integration

**If the project imports from `@wix/design-system`, `@wix/editor-elements-*`, or is in the `editor-elements` / `wix-design-systems` / `business-manager` repo — read `references/wix-platform-guide.md` immediately.**

Key principles:
- **Use `@wix/design-system` components first** — `FormField`, `Modal`, `Tabs`, `Dropdown`, `Table`, `LiveRegion`, `ToggleSwitch`, etc. all have built-in a11y. Don't build from scratch.
- **In editor-elements**: use `getAccessibilityAttributes()` from `@wix/editor-elements-common-utils` — never raw ARIA on components. Use `activateBySpaceOrEnterButton` for keyboard. Use `getFocusRingValue()` for focus.
- **In Business Manager apps**: compose WDS components. Use `<LiveRegion>` for dynamic announcements. Use `<FormField>` for label association.
- **CI/CD catches failures**: `@wix/a11y-audit-tool-plugin` runs axe + focus-ring + tab-reachability + keyboard-trap on every build. Your code will break the build if it's inaccessible.
- **For AI-generated sites/components (Harmony)**: use editor-elements, set `ariaAttributes`, run `scripts/a11y-check.js` before serving.
- **Spacing tokens**: Use SP1-SP8, not pixel values.
- **Page requirements**: distinct `<title>`, `lang` attribute, skip-to-main-content link, landmark regions.
