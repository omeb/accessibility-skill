# Accessibility Rules — Complete Reference

Full code examples and guidance for all WCAG 2.2 AA rules beyond the critical rules in SKILL.md. This file is loaded on demand for detailed guidance.

## Additional Critical Patterns

### Canvas Accessibility

Canvas elements are invisible to screen readers. Every `<canvas>` needs either a role + label or fallback content.

```tsx
// ✅ CORRECT — canvas with role and label (for static charts/graphics)
<canvas role="img" aria-label="Bar chart showing Q1-Q4 revenue: Q1 $2M, Q2 $3.1M, Q3 $2.8M, Q4 $4.2M" />

// ✅ CORRECT — canvas with fallback content (for complex visualizations)
<canvas aria-label="Interactive sales dashboard">
  {/* Fallback for screen readers — content inside <canvas> is shown when canvas is unsupported */}
  <table>
    <caption>Sales data</caption>
    <tr><th>Quarter</th><th>Revenue</th></tr>
    <tr><td>Q1</td><td>$2M</td></tr>
  </table>
</canvas>

// ❌ WRONG — canvas with no accessible alternative
<canvas id="chart" width={600} height={400} />
```

### Icon Library Components

Generated code frequently imports icons from `lucide-react`, `react-icons`, `@heroicons/react`, etc. These are always decorative when inside a labeled button/link, but need attention when used as sole children.

```tsx
// ✅ CORRECT — icon button with aria-label
import { X } from 'lucide-react';
<button aria-label="Close dialog"><X aria-hidden="true" /></button>

// ✅ CORRECT — icon with visible text (icon is decorative)
import { Download } from 'lucide-react';
<button><Download aria-hidden="true" /> Download report</button>

// ❌ WRONG — icon-only button without accessible name
import { Settings } from 'lucide-react';
<button><Settings /></button>
```

**Rule**: When an icon component is the sole child of a `<button>` or `<a>`, the parent MUST have `aria-label` and the icon MUST have `aria-hidden="true"`.

---

## Heading Structure (Rule 4) — Serious

```tsx
// ✅ CORRECT — sequential, no skipped levels
<h1>Page Title</h1>
  <h2>Section</h2>
    <h3>Subsection</h3>
  <h2>Another Section</h2>

// ❌ WRONG — skips h2
<h1>Page Title</h1>
  <h3>Subsection</h3>

// ❌ WRONG — using headings for styling
<h3 className="small-text">This is not a real heading</h3>
```

**Rules**:
- **Best practice**: One `<h1>` per page (not a hard WCAG requirement, but strongly recommended — screen reader users navigate by headings and expect a single top-level heading)
- Headings should be sequential — avoid skipping levels (h1 → h3) as it creates a confusing document outline
- Use headings to create document outline, not for visual styling
- Every distinct content section should have a heading

---

## Dynamic Content and Live Regions (Rule 9) — Serious

```tsx
// ✅ CORRECT — announce status updates
<div aria-live="polite" aria-atomic="true">
  {statusMessage}
</div>

// ✅ CORRECT — announce errors immediately
<div role="alert">
  {errorMessage}
</div>

// ✅ CORRECT — loading state
<div aria-busy="true" aria-live="polite">
  Loading results...
</div>
```

**Rules**:
- Use `aria-live="polite"` for non-urgent updates (search results, status messages)
- Use `aria-live="assertive"` or `role="alert"` for errors and urgent notifications
- The live region container must exist in the DOM BEFORE content is injected
- Use `aria-busy="true"` during loading states

---

## Links (Rule 10) — Serious

```tsx
// ✅ CORRECT — link text describes destination
<a href="/pricing">View pricing plans</a>
<a href="/report.pdf">Download annual report (PDF, 2MB)</a>

// ✅ CORRECT — if more context is needed, use aria-label
<a href="/product/123" aria-label="Read more about Premium Widget">
  Read more
</a>

// ❌ WRONG — ambiguous link text
<a href="/pricing">Click here</a>
<a href="/report">Read more</a>
<a href="/page">Link</a>
```

**Rules (2.4.4 Link Purpose)**:
- Link text must describe the destination or purpose — never use "click here", "read more", "link", or "here" alone
- If multiple links point to different places, their text must be distinguishable
- For repeated "Read more" patterns, use `aria-label` or `aria-labelledby` to differentiate
- Include file type and size for download links
- **Never use `<a href="#">` or `<a href="javascript:void(0)">`** — if it performs an action (not navigation), use `<button>` instead. These patterns create broken links for screen reader link lists and confuse keyboard users.
  ```tsx
  // ❌ WRONG — not a real link, performs an action
  <a href="#" onClick={handleSave}>Save</a>
  <a href="javascript:void(0)" onClick={handleDelete}>Delete</a>

  // ✅ CORRECT — actions use <button>
  <button onClick={handleSave}>Save</button>
  ```

---

## Label in Name (Rule 11) — Serious

The visible text label of an element MUST be contained within its accessible name.

```tsx
// ✅ CORRECT — aria-label contains visible text
<button aria-label="Search products">Search</button>

// ❌ WRONG — aria-label doesn't contain visible text "Search"
<button aria-label="Find items">Search</button>

// ❌ WRONG — visible text says "Close" but accessible name says "Dismiss"
<button aria-label="Dismiss dialog">Close</button>
```

**Rules (2.5.3)**:
- If a component has visible text, that text must appear in its accessible name
- `aria-label` must contain (not replace) the visible text
- This enables voice control users to activate controls by speaking visible text

---

## Pointer and Input (Rule 12) — Moderate

```tsx
// ✅ CORRECT — pinch-to-zoom has button alternatives
<button onClick={zoomIn} aria-label="Zoom in">+</button>
<button onClick={zoomOut} aria-label="Zoom out">−</button>

// ✅ CORRECT — action fires on mouseup (click), allowing cancellation
<button onClick={handleDelete}>Delete</button>

// ❌ WRONG — action fires on mousedown with no abort
<div onMouseDown={handleDelete}>Delete</div>
```

**Rules**:
- **Pointer Gestures (2.5.1)**: Multi-point gestures (pinch, multi-finger swipe) and path-based gestures must have single-pointer alternatives (buttons, inputs)
- **Pointer Cancellation (2.5.2)**: Actions must fire on the up-event (`click`/`mouseup`/`pointerup`), not down-event. Use native `click` events
- **Motion Actuation (2.5.4)**: If functionality is triggered by device motion (shake, tilt), provide a UI alternative and allow disabling motion response
- **Character Key Shortcuts (2.1.4)**: Single-character keyboard shortcuts must be remappable or only active when the relevant component has focus

---

## Content on Hover and Focus (Rule 13) — Moderate

Tooltips, popovers, and any content that appears on hover/focus must follow these rules:

```tsx
// ✅ CORRECT — tooltip that is dismissible, hoverable, and persistent
function Tooltip({ trigger, content }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      onFocus={() => setIsOpen(true)}
      onBlur={() => setIsOpen(false)}
    >
      {trigger}
      {isOpen && (
        <div
          role="tooltip"
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
        >
          {content}
        </div>
      )}
    </div>
  );
}
// Also add: Escape key dismisses tooltip (dismissible)
```

**Rules (1.4.13)**:
- **Dismissible**: User can close without moving focus/hover (Escape key)
- **Hoverable**: User can move pointer over the additional content without it disappearing
- **Persistent**: Content stays visible until user dismisses, moves focus/hover away, or it's no longer relevant

---

## Media Accessibility (Rule 14) — Serious

```tsx
// ✅ CORRECT — video with captions
<video controls>
  <source src="demo.mp4" type="video/mp4" />
  <track kind="captions" src="captions.vtt" srcLang="en" label="English" default />
</video>

// ✅ CORRECT — audio with transcript link
<audio controls src="podcast.mp3" />
<a href="/podcast-transcript">Read transcript</a>
```

**Rules**:
- **Captions (1.2.2, 1.2.4)**: All prerecorded and live video with audio must have captions via `<track kind="captions">`
- **Audio Description (1.2.3, 1.2.5)**: Prerecorded video must have audio descriptions or a text alternative for visual-only content
- **Audio-only (1.2.1)**: Provide a text transcript for podcasts and audio content
- **Video-only (1.2.1)**: Provide text or audio alternative for silent video
- **Audio Control (1.4.2)**: Audio that auto-plays for more than 3 seconds must have pause/stop/volume controls. Prefer not auto-playing at all
- **Autoplay**: Always set `autoPlay={false}` by default

---

## Responsive and Reflow (Rule 15) — Moderate

```css
/* ✅ CORRECT — content reflows to single column at narrow widths */
.container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}

/* ❌ WRONG — fixed width that forces horizontal scrolling */
.container {
  width: 1200px;
}
```

**Rules**:
- **Reflow (1.4.10)**: Content must be viewable at 320px width (400% zoom) without horizontal scrolling. Exception: data tables, maps, diagrams
- **Resize Text (1.4.4)**: Text must be resizable to 200% without losing content or functionality
- **Orientation (1.3.4)**: Don't lock content to portrait or landscape unless essential
- **Text Spacing (1.4.12)**: Content must remain usable when users apply: line-height 1.5x, paragraph spacing 2x, letter-spacing 0.12em, word-spacing 0.16em. Don't set fixed heights on text containers
- **Images of Text (1.4.5)**: Use real text styled with CSS, not images of text. Exception: logos

---

## Sensory and Instructions (Rule 16) — Moderate

**Rules (1.3.3)**:
- Don't rely solely on shape, color, size, visual location, or sound to convey instructions
- "Click the green button" — also provide text label
- "See the sidebar on the right" — also provide a heading or link
- "The error fields are highlighted in red" — also show error icons and text messages

---

## Input Purpose and Autocomplete (Rule 17) — Moderate

```tsx
// ✅ CORRECT — autocomplete attributes help browsers and assistive tech
<label htmlFor="name">Full name</label>
<input id="name" type="text" autoComplete="name" />

<label htmlFor="email">Email</label>
<input id="email" type="email" autoComplete="email" />

// ❌ WRONG — no autocomplete on identity fields
<input type="text" placeholder="Your name" />
```

**Rules (1.3.5)**:
- Add `autoComplete` attributes to inputs collecting personal data
- Common values: `name`, `given-name`, `family-name`, `email`, `tel`, `street-address`, `postal-code`, `country`, `bday`, `organization`, `username`, `new-password`, `current-password`, `cc-name`, `cc-number`

---

## Language (Rule 18) — Serious

**Rules**:
- **Language of Page (3.1.1)**: Set `lang` attribute on `<html>` matching the page's primary language (`<html lang="en">`)
- **Language of Parts (3.1.2, AA)**: When content includes passages in a different language, mark them:
  ```tsx
  <p>The French term <span lang="fr">joie de vivre</span> means joy of living.</p>
  ```

---

## Predictable Behavior (Rule 19) — Moderate

```tsx
// ❌ WRONG — auto-navigates on select change
<select onChange={(e) => window.location.href = e.target.value}>
  <option value="/page1">Page 1</option>
</select>

// ✅ CORRECT — explicit submit action
<select value={selectedPage} onChange={(e) => setSelectedPage(e.target.value)}>
  <option value="/page1">Page 1</option>
</select>
<button onClick={() => navigate(selectedPage)}>Go</button>
```

**Rules**:
- **On Focus (3.2.1)**: Receiving focus must not trigger unexpected changes
- **On Input (3.2.2)**: Changing a form value must not cause unexpected context changes unless warned
- **Consistent Navigation (3.2.3)**: Navigation menus must appear in the same relative order across pages
- **Consistent Identification (3.2.4)**: Components with the same function must be labeled the same way across pages

---

## Error Handling (Rule 20) — Serious

```tsx
// ✅ CORRECT — specific error with correction suggestion
<label htmlFor="email">Email</label>
<input
  id="email"
  type="email"
  aria-invalid="true"
  aria-describedby="email-error"
  value={email}
/>
<span id="email-error" role="alert">
  Please enter a valid email address, e.g., user@example.com
</span>

// ✅ CORRECT — confirmation step before destructive action
<dialog open={showConfirm} role="alertdialog" aria-labelledby="confirm-title">
  <h2 id="confirm-title">Confirm deletion</h2>
  <p>Are you sure you want to delete your account? This cannot be undone.</p>
  <button onClick={onConfirm}>Yes, delete</button>
  <button onClick={onCancel} autoFocus>Cancel</button>
</dialog>
```

**Rules**:
- **Error Identification (3.3.1)**: Identify the field in error and describe the error in text
- **Error Suggestion (3.3.3)**: Provide suggestions for correction when possible
- **Error Prevention (3.3.4, AA)**: For legal, financial, or data-deletion actions, provide at least one of: reversible, verified, or confirmed
- Error messages must be associated with fields (`aria-describedby`)
- Use `role="alert"` or `aria-live` for dynamically appearing errors

---

## Page-Level Accessibility (Rule 21) — Serious

- Provide a descriptive, unique `<title>` for each page
- Include a skip-to-main-content link as the first focusable element
- Use landmark elements: `<header>`, `<nav>`, `<main>`, `<aside>`, `<footer>`
- Ensure meaningful reading order (DOM order) matches visual order
- Provide more than one way to find pages (navigation + search, or navigation + sitemap)
- **Timing (2.2.1)**: If a time limit exists, warn users and allow extension (at least 20 seconds to request more time)
- **Auto-updating content (2.2.2)**: Moving, blinking, scrolling, or auto-updating content must have a pause/stop/hide mechanism

---

## Target Size — WCAG 2.2 (Rule 22) — Moderate

Interactive targets must be at least **24x24 CSS pixels**, with exceptions for inline links within text.

```tsx
// ✅ CORRECT — sufficient target size
<button style={{ minWidth: 44, minHeight: 44, padding: '12px 16px' }}>
  Submit
</button>

// ❌ WRONG — tiny target
<button style={{ width: 16, height: 16 }}>×</button>
```

**Rules**:
- Minimum 24x24 CSS pixels for all interactive elements (WCAG 2.2 AA minimum)
- Recommended 44x44 CSS pixels for touch interfaces
- Icon-only buttons are especially prone to being too small — always check

---

## Dragging Movements — WCAG 2.2 (Rule 23) — Moderate

Any functionality that uses dragging MUST have a non-drag alternative.

```tsx
// ✅ CORRECT — drag-to-reorder with button alternatives
<li draggable>
  <span>Item 1</span>
  <button aria-label="Move Item 1 up" onClick={() => moveUp(0)}>↑</button>
  <button aria-label="Move Item 1 down" onClick={() => moveDown(0)}>↓</button>
</li>

// ✅ CORRECT — slider with direct input alternative
<input type="range" min={0} max={100} value={value} onChange={...} aria-label="Price" />
<input type="number" min={0} max={100} value={value} onChange={...} aria-label="Price (exact value)" />

// ❌ WRONG — drag-only interaction with no alternative
<div draggable onDrag={handleReorder}>Drag to reorder</div>
```

---

## Accessible Authentication — WCAG 2.2 (Rule 24) — Moderate

Authentication must not rely on cognitive function tests.

```tsx
// ✅ CORRECT — allows paste and password managers
<input type="password" id="password" autoComplete="current-password" />

// ❌ WRONG — blocks paste
<input type="password" onPaste={(e) => e.preventDefault()} autoComplete="off" />
```

**Rules**:
- Never block paste in password fields
- Allow password managers to fill credentials (don't use `autocomplete="off"` on login fields)
- If using CAPTCHAs, provide an alternative that doesn't require cognitive ability
- Biometric, passkey, and OAuth/SSO flows are compliant alternatives

---

## Redundant Entry — WCAG 2.2 (Rule 25) — Moderate

In multi-step processes, don't ask users to re-enter information they've already provided.

```tsx
// ✅ CORRECT — shipping address pre-fills billing
<fieldset>
  <legend>Billing Address</legend>
  <label>
    <input
      type="checkbox"
      checked={sameAsShipping}
      onChange={(e) => setSameAsShipping(e.target.checked)}
    />
    Same as shipping address
  </label>
  {!sameAsShipping && <AddressFields />}
</fieldset>
```

---

## Consistent Help — WCAG 2.2 (Rule 26) — Moderate

Help mechanisms must appear in the same relative location across pages.

**Rules**:
- If you provide help links, contact info, or support chat, place them consistently across all pages
- Help mechanisms should be in the same relative order in the page structure

---

## Accessibility-First Development

Write accessibility tests BEFORE implementing the component. This catches regressions and forces you to think about accessibility from the start.

### Test-First Pattern with jest-axe

```tsx
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

describe('PricingCard accessibility', () => {
  it('has no axe violations', async () => {
    const { container } = render(<PricingCard plan="Pro" price={29} />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('is keyboard navigable', () => {
    render(<PricingCard plan="Pro" price={29} />);
    const button = screen.getByRole('button', { name: /select pro/i });
    button.focus();
    expect(button).toHaveFocus();
  });

  it('has proper heading hierarchy', () => {
    render(<PricingCard plan="Pro" price={29} />);
    const heading = screen.getByRole('heading', { level: 3 });
    expect(heading).toHaveTextContent('Pro');
  });
});
```

### Setup

```bash
npm install --save-dev jest-axe @testing-library/react @testing-library/jest-dom
```

Write at minimum:
1. `axe(container)` test — catches ~57% of WCAG violations automatically
2. Keyboard focus test — verify interactive elements are focusable
3. Role/label test — verify correct ARIA roles and accessible names

---

## Visual, Perceptual, and Cognitive Accessibility

Beyond code — these require visual verification and design consideration:

- **Target size**: Minimum 24x24 CSS pixels (WCAG 2.2 AA), recommended 44x44 for touch interfaces
- **Text resizing**: Content must be usable at 200% zoom without horizontal scrolling
- **Motion**: Respect `prefers-reduced-motion` — disable animations, autoplay, parallax
  ```css
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }
  ```
- **High contrast / forced-colors mode**: Support Windows High Contrast Mode and user contrast preferences
  ```css
  @media (forced-colors: active) {
    button, a, input, select, textarea {
      border: 1px solid ButtonText;
    }
    button:focus-visible {
      outline: 2px solid Highlight;
    }
    .icon-status {
      forced-color-adjust: none; /* opt out only when needed */
    }
  }

  @media (prefers-contrast: high) {
    :root {
      --border-color: #000;
      --text-color: #000;
      --bg-color: #fff;
    }
  }
  ```
  **Rules**: Don't use `background-image` as the only way to convey meaning (invisible in forced-colors). Ensure focus indicators use `outline` (not just `box-shadow` — invisible in high contrast). Test with Windows High Contrast Mode or `forced-colors: active` emulation in DevTools.
- **Spacing**: Sufficient space between interactive elements to prevent mis-taps
- **Text spacing**: Content must remain readable when users override letter/word/line spacing
- **Scrollable regions**: Must be keyboard-scrollable (add `tabIndex={0}` and `role="region"` with a label)
- **Cognitive accessibility**: Use clear, simple language in labels, errors, and instructions. Show progress indicators for multi-step processes (`Step 2 of 4`). Don't use jargon without explanation. Provide clear feedback for every user action. Avoid time pressure unless essential — and always allow extension.
- **Flashing content / seizure safety (WCAG 2.3.1, Level A)**: Content must NEVER flash more than 3 times per second. This is a seizure safety requirement — not optional, not reduced-motion-dependent.
  - One "flash" = one complete dark→light→dark cycle. 3 flashes/second = minimum 333ms per cycle.
  - **CSS animations**: Any `animation-duration` under 333ms combined with luminance-changing keyframes is a potential violation.
  - **Red flashes are especially dangerous** — saturated red alternating with light backgrounds at any rate above 3Hz is a known seizure trigger.
  - `prefers-reduced-motion` does NOT make you compliant — 2.3.1 requires content to be safe by default for ALL users.
  ```css
  /* ❌ VIOLATION — 200ms cycle = 5 flashes/second */
  @keyframes pulse { 0% { background: #f00; } 50% { background: #fff; } 100% { background: #f00; } }
  .badge { animation: pulse 0.2s infinite; }

  /* ✅ SAFE — use non-luminance animation (scale/shadow) or slow it down */
  @keyframes pulse-safe { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }
  .badge { animation: pulse-safe 1.5s infinite; }
  ```
  **Safe patterns**: Transform (scale, translate, rotate), box-shadow, opacity within a narrow range (0.7–1.0), border-color with low contrast. **Dangerous patterns**: background-color between dark/light, color between extremes, opacity 0↔1 on high-contrast backgrounds.

---

## Performance for Assistive Technology

Poorly optimized components degrade the experience for screen reader and assistive tech users:

- **Efficient live regions**: Batch updates to `aria-live` regions. Don't fire rapid successive updates — screen readers queue announcements and fall behind.
  ```tsx
  const [announcement, setAnnouncement] = useState('');
  const announceRef = useRef<ReturnType<typeof setTimeout>>();

  const announce = (message: string) => {
    clearTimeout(announceRef.current);
    announceRef.current = setTimeout(() => setAnnouncement(message), 300);
  };
  ```
- **Cached focus trapping**: In modals/dialogs, cache the `querySelectorAll` result for focusable elements. Don't re-query the DOM on every keypress.
  ```tsx
  const focusableEls = useRef<HTMLElement[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    focusableEls.current = Array.from(
      modalRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) ?? []
    );
  }, [isOpen, children]);
  ```
- **Lazy-loaded content**: Use `role="feed"` for infinite scroll lists so screen readers can navigate efficiently. Announce new items loading via `aria-busy`.
  ```tsx
  <div role="feed" aria-busy={isLoading} aria-label="News articles">
    {items.map((item) => (
      <article key={item.id} aria-posinset={item.index} aria-setsize={-1}>
        {item.content}
      </article>
    ))}
  </div>
  ```
- **Avoid layout thrashing**: Don't trigger forced reflows (reading `offsetHeight` after writing styles) inside keyboard event handlers — causes jank that affects switch-access and eye-tracking users.
- **Large lists**: Virtualize long lists (react-window, react-virtualized) but ensure `aria-setsize` and `aria-posinset` are maintained.

---

## Wix-Specific Patterns

When building for the Wix platform:

- **Use `@wix/design-system` components** when available — they have built-in accessibility. Don't rebuild what the design system provides.
- **Spacing tokens**: Use SP1-SP8 instead of pixel values. Values differ per editor type (Classic vs Studio vs OD Editor).
- **Visual focus indicators**: Ensure they're enabled, not disabled via site settings.
- **Skip-to-main-content**: Include on all pages as the first focusable element.
- **Site language**: Set the `lang` attribute — it drives screen reader pronunciation.
- **DOM order**: Ensure DOM source order matches the logical reading/visual order. Don't rely on CSS to reorder content.
- **Unique page titles**: Every page must have a distinct, descriptive `<title>`.
- **Component-level testing**: Use `@accesslint/storybook-addon` with `toBeAccessible()` matcher in Storybook stories.
- **CI/CD**: The `a11y-audit-tool-plugin` runs Playwright-based accessibility checks (axe + focus-ring + tab-reachability + keyboard-trap + keyboard operability). If your component fails these, the build breaks.
