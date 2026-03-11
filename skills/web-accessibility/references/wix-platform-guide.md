# Wix Platform Accessibility Guide

Accessibility patterns, APIs, and tooling specific to Wix's codebase. Read this when working in any Wix project — Business Manager apps, editor-elements, or any repo that uses `@wix/design-system`.

## Rule Zero: Use the Design System

**Before building any interactive component from scratch, check if `@wix/design-system` provides it.** WDS components have built-in accessibility — ARIA, keyboard handling, focus management, screen reader support. Rolling your own is almost always worse.

| You Need | Use This WDS Component | Why It's Accessible |
|----------|----------------------|---------------------|
| Form input with label | `<FormField>` + `<Input>` | Auto-associates label, error messages, required state |
| Dropdown / select | `<Dropdown>` | Keyboard nav, aria-expanded, role=listbox |
| Autocomplete | `<AutoComplete>` | Combobox pattern, aria-activedescendant |
| Multi-select | `<MultiSelect>` | Tag management with keyboard support |
| Modal / dialog | `<Modal>` + `<CustomModalLayout>` | Focus trap, aria-modal, escape to close, focus restore |
| Tooltip | `<Tooltip>` | aria-describedby, keyboard + hover, dismissible |
| Tabs | `<Tabs>` / `<VerticalTabs>` | Arrow key nav, aria-selected, role=tablist |
| Toggle | `<ToggleSwitch>` | role=switch, aria-checked, keyboard |
| Notification | `<FloatingNotification>` | aria-live, role=alert |
| Screen reader announcement | `<LiveRegion>` | broadcast() for dynamic announcements |
| Accordion | `<Accordion>` | aria-expanded, keyboard toggle |
| Data table | `<Table>` | Scope headers, keyboard nav, sort announcements |
| Date picker | `<DatePicker>` | Full keyboard calendar navigation |
| Checkbox / radio | `<Checkbox>` / `<RadioGroup>` | Proper grouping, fieldset/legend |
| Breadcrumbs | `<Breadcrumbs>` | nav + aria-current |
| Pagination | `<Pagination>` | aria-label, keyboard navigation |

### WDS Imports

```tsx
import { Button, FormField, Input, Modal, CustomModalLayout, Tooltip, Tabs, ToggleSwitch, LiveRegion } from '@wix/design-system';
import { Add, Edit, Delete } from '@wix/wix-ui-icons-common';
```

### WDS Accessibility Utilities

```tsx
// Forward ARIA props to WDS components — use when wrapping
import { pickAccessibilityProps } from '@wix/design-system/common/accessibility';
const a11yProps = pickAccessibilityProps(props); // filters aria-* props

// Focus ring management
import { useFocusRing } from '@wix/design-system/providers';
const { isFocusVisible } = useFocusRing();

// Screen reader announcements for dynamic content
import { LiveRegion } from '@wix/design-system';
<LiveRegion>
  {({ broadcast }) => (
    <button onClick={() => {
      deleteItem(id);
      broadcast({ message: `${name} deleted`, role: 'alert' });
    }}>
      Delete
    </button>
  )}
</LiveRegion>
```

### WDS Spacing Tokens

Use spacing tokens, not pixel values. Values differ per editor type:

| Token | Classic | Studio |
|-------|---------|--------|
| `SP1` | 6px | 4px |
| `SP2` | 12px | 8px |
| `SP3` | 18px | 12px |
| `SP4` | 24px | 16px |
| `SP5` | 30px | 20px |
| `SP6` | 36px | 24px |

```tsx
<Box gap="SP2" padding="SP3">
```

Only use SP tokens for gap, padding, margin — not for width/height.

### WDS Provider

Always wrap your app with `WixDesignSystemProvider`:

```tsx
import { WixDesignSystemProvider } from '@wix/design-system';

<WixDesignSystemProvider features={{ newColorsBranding: true }}>
  <App />
</WixDesignSystemProvider>
```

**Do NOT use `compactMode`** — it reduces spacing below accessible minimums.

---

## Editor Elements — Accessibility APIs

When building or modifying components in the `editor-elements` repo, use the platform's accessibility utilities. Never implement raw ARIA from scratch — use these APIs.

### getAriaAttributes / getAccessibilityAttributes

Every editor-element component receives `ariaAttributes` from the platform (set via the Corvid/Velo SDK or the Editor UI). Spread these onto the root element:

```tsx
import { getAriaAttributes } from '@wix/editor-elements-common-utils';

// In your component:
const MyComponent = ({ ariaAttributes, ...props }) => {
  return (
    <div
      {...getAriaAttributes(ariaAttributes)}
      className={styles.root}
    >
      {/* component content */}
    </div>
  );
};
```

**`getAccessibilityAttributes`** is the newer API (use this for new components):

```tsx
import { getAccessibilityAttributes } from '@wix/editor-elements-common-utils';

const MyComponent = ({ role, tabIndex, ariaAttributes, screenReader, lang }) => {
  const a11y = getAccessibilityAttributes({ role, tabIndex, ariaAttributes, screenReader, lang });
  return (
    <div
      role={a11y.role}
      tabIndex={a11y.tabIndex}
      lang={a11y.lang}
      {...a11y.ariaAttributes}
    >
      {/* component content */}
    </div>
  );
};
```

### Keyboard Utilities

```tsx
import {
  activateBySpaceOrEnterButton,
  activateByEnterButton,
  activateByEscapeButton,
  keyCodes,
} from '@wix/editor-elements-common-utils';

// On a custom interactive element:
<div
  role="button"
  tabIndex={0}
  onClick={handleAction}
  onKeyDown={activateBySpaceOrEnterButton}
>
  Custom Action
</div>
```

### Focus Ring

Editor-elements use a platform focus ring system. The ring is a box-shadow applied on `:focus-visible`:

```tsx
import { getFocusRingValue, HAS_CUSTOM_FOCUS_CLASSNAME, INNER_FOCUS_RING_CLASSNAME } from '@wix/editor-elements-common-utils';

// Outer focus ring (default): blue ring outside the element
const outerRing = getFocusRingValue(true);
// → "0 0 0 1px#ffffff, 0 0 0 3px#116dff"

// Inner focus ring: for elements where outer ring is clipped
const innerRing = getFocusRingValue(false);
// → "inset 0 0 0 1px#116dff, inset 0 0 0 3px#ffffff"

// Add className to opt into custom focus behavior
<div className={HAS_CUSTOM_FOCUS_CLASSNAME}>
```

**Never remove or override the platform focus ring** unless you're providing a compliant alternative.

### Corvid/Velo Accessibility SDK

Site creators can set accessibility properties via Velo code. Your component receives these as props. The SDK factories in `@wix/editor-elements-corvid-utils` validate and transform these:

```tsx
import { createAccessibilityPropSDKFactory } from '@wix/editor-elements-corvid-utils';

// Available SDK properties that users can set via Velo:
// ariaLabel, ariaDescribedBy, ariaLabelledBy, ariaExpanded,
// ariaLive, ariaHidden, ariaPressed, ariaHaspopup,
// role, tabIndex, screenReader, lang
```

When building a new component, ensure you:
1. Accept `ariaAttributes` prop and spread it via `getAccessibilityAttributes()`
2. Register the appropriate SDK factories in your Corvid definition
3. Set sensible default ARIA attributes (role, label) even when not set by the user

### Editor-Elements Component Structure

```
ComponentName/
├── viewer/
│   ├── ComponentName.tsx              # Runtime component
│   ├── skinComps/                     # Visual variants
│   │   └── SkinName/
│   │       └── SkinName.skin.tsx
│   └── ComponentName.mapper.ts        # Props mapping
├── corvid/
│   └── ComponentName.corvid.ts        # Velo SDK definition
└── ComponentName.types.ts             # Type definitions
```

Accessibility lives in the **viewer** layer. Every skin must spread aria attributes from the component above.

---

## A11y Testing at Wix

### E2E: a11y-audit-tool-plugin (CI/CD — Build Breaker)

Every artifact build at Wix runs Playwright-based accessibility checks via `@wix/a11y-audit-tool-plugin`. **This breaks the build on failure.**

Inspections that run:
- **axe-core**: Full automated WCAG scan
- **focus-ring**: Verify visible focus indicators
- **tab-reachability**: All interactive elements reachable via Tab
- **keyboard-trap**: No elements trap keyboard focus
- **button-operability**: Buttons respond to Enter and Space
- **link-operability**: Links respond to Enter

#### Setting Up for Editor-Elements

```typescript
// sled/e2e/ComponentName/ComponentName.a11y.ts
import type { A11yTestConfig } from '@wix/a11y-audit-tool-plugin';

export const ComponentNameA11y: A11yTestConfig = {
  url: 'https://ssrdev.wixsite.com/component-name-a11y',
  containerSelector: '#site-root',
};
```

#### Running Locally

```bash
# Run a11y audit for a specific component
yarn run-inspection --component=ComponentName

# Run all a11y audits
yarn run-inspection
```

### Unit Tests: axe-core + Testing Library

```tsx
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

it('has no axe violations', async () => {
  const { container } = render(<MyComponent />);
  expect(await axe(container)).toHaveNoViolations();
});
```

### Storybook: Compliance Tests

For `@wix/design-system` components, compliance tests are auto-generated:

```bash
# Generate and run compliance tests
yarn test:compliance
```

### ESLint jsx-a11y

Both `editor-elements` and `@wix/design-system` use `eslint-plugin-jsx-a11y`. It runs as part of `yarn lint`. **Never suppress jsx-a11y rules** — fix the actual accessibility issue.

---

## Common Patterns by Context

### Business Manager Apps

You're building internal tools with `@wix/design-system`. Priority:

1. **Use WDS components for everything** — `FormField` + `Input`, `Modal` + `CustomModalLayout`, `Table`, etc.
2. **Use `<LiveRegion>` for dynamic feedback** — when actions complete, errors appear, or content updates
3. **Every page needs**: `<title>`, skip link, landmark regions (`<main>`, `<nav>`, `<header>`)
4. **Form validation**: Use `FormField`'s built-in `statusMessage` prop — it handles aria-describedby automatically

```tsx
<FormField label="Email" required statusMessage={error ? error.message : undefined} status={error ? 'error' : undefined}>
  <Input value={email} onChange={e => setEmail(e.target.value)} />
</FormField>
```

### Editor-Elements (Viewer Components)

You're building components that appear on live Wix sites. Priority:

1. **Always spread `ariaAttributes`** via `getAccessibilityAttributes()` or `getAriaAttributes()`
2. **Keyboard support is mandatory** — use `activateBySpaceOrEnterButton` for custom buttons
3. **Use platform focus ring** — `getFocusRingValue()`, never `outline: none`
4. **Write `.a11y.ts` E2E config** for every new component
5. **Every interactive skin** must receive and forward keyboard/ARIA props

### Harmony — AI-Generated Sites and Components

When AI generates pages or components for Harmony:

1. **Use editor-elements** — generated components should compose existing editor-elements, not raw HTML
2. **Set ariaAttributes** on every interactive element in the component definition
3. **Include `<html lang="...">` and `<title>`** on generated pages
4. **Heading hierarchy matters** — generated pages must have one `<h1>` and sequential levels
5. **Run `scripts/a11y-check.js`** on all generated component code before serving to users
6. **For custom components**: Apply the same rules as the core SKILL.md — semantic HTML, labels, keyboard access

---

## Quick Decision Guide

```
Is there a WDS component for this?
├── Yes → Use it. Done.
└── No
    ├── In editor-elements?
    │   ├── Yes → Use getAccessibilityAttributes(), keyboard utils, focus ring
    │   └── No → Build with semantic HTML following SKILL.md rules
    └── In Business Manager?
        ├── Can compose WDS components? → Do that
        └── Must be custom? → Build with semantic HTML following SKILL.md rules
```
