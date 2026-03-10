# Accessible React Component Patterns

Detailed implementation patterns for common interactive components. Each pattern includes the required ARIA attributes, keyboard interactions, and focus management.

**Before building any of these from scratch**: Check if `@wix/design-system` provides the component — it likely already handles accessibility correctly. These patterns are for cases where you need a custom implementation.

## Modal / Dialog

```tsx
function Modal({ isOpen, onClose, title, children }) {
  const modalRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement;
      modalRef.current?.focus();
    }
    return () => {
      if (triggerRef.current) {
        triggerRef.current.focus();
      }
    };
  }, [isOpen]);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} aria-hidden="true" />

      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <h2 id="modal-title">{title}</h2>
        {children}
        <button onClick={onClose}>Close</button>
      </div>
    </>
  );
}
```

**Requirements**:
- `role="dialog"` and `aria-modal="true"` on the container
- `aria-labelledby` pointing to the dialog title
- Focus moves into the modal when it opens
- Focus is trapped inside the modal (Tab cycles through modal content only)
- Escape key closes the modal
- Focus returns to the triggering element when closed
- Background content is inert (not reachable by Tab or screen reader)

**Focus trapping** (use a library like `focus-trap-react` or implement):
```tsx
const focusableElements = modal.querySelectorAll(
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
);
const firstEl = focusableElements[0];
const lastEl = focusableElements[focusableElements.length - 1];

if (e.key === 'Tab') {
  if (e.shiftKey && document.activeElement === firstEl) {
    e.preventDefault();
    lastEl.focus();
  } else if (!e.shiftKey && document.activeElement === lastEl) {
    e.preventDefault();
    firstEl.focus();
  }
}
```

---

## Dropdown / Menu

```tsx
function DropdownMenu({ label, items }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const buttonRef = useRef(null);
  const itemRefs = useRef([]);

  const handleButtonKeyDown = (e) => {
    switch (e.key) {
      case 'ArrowDown':
      case 'Enter':
      case ' ':
        e.preventDefault();
        setIsOpen(true);
        setActiveIndex(0);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setIsOpen(true);
        setActiveIndex(items.length - 1);
        break;
    }
  };

  const handleMenuKeyDown = (e) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % items.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((prev) => (prev - 1 + items.length) % items.length);
        break;
      case 'Home':
        e.preventDefault();
        setActiveIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setActiveIndex(items.length - 1);
        break;
      case 'Escape':
        setIsOpen(false);
        buttonRef.current?.focus();
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        items[activeIndex]?.onClick();
        setIsOpen(false);
        buttonRef.current?.focus();
        break;
    }
  };

  useEffect(() => {
    if (isOpen && activeIndex >= 0) {
      itemRefs.current[activeIndex]?.focus();
    }
  }, [activeIndex, isOpen]);

  return (
    <div>
      <button
        ref={buttonRef}
        aria-haspopup="true"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleButtonKeyDown}
      >
        {label}
      </button>

      {isOpen && (
        <ul role="menu" onKeyDown={handleMenuKeyDown}>
          {items.map((item, i) => (
            <li
              key={item.id}
              ref={(el) => (itemRefs.current[i] = el)}
              role="menuitem"
              tabIndex={i === activeIndex ? 0 : -1}
              onClick={() => {
                item.onClick();
                setIsOpen(false);
                buttonRef.current?.focus();
              }}
            >
              {item.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

**Requirements**:
- Trigger button has `aria-haspopup="true"` and `aria-expanded`
- Menu container has `role="menu"`, items have `role="menuitem"`
- Arrow keys navigate between items (with wrapping)
- Home/End jump to first/last item
- Enter/Space activates the focused item
- Escape closes the menu and returns focus to the trigger
- Only the active item has `tabIndex={0}`, others have `tabIndex={-1}`

---

## Tabs

```tsx
function Tabs({ tabs }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const tabRefs = useRef([]);

  const handleKeyDown = (e) => {
    let newIndex = activeIndex;
    switch (e.key) {
      case 'ArrowRight':
        newIndex = (activeIndex + 1) % tabs.length;
        break;
      case 'ArrowLeft':
        newIndex = (activeIndex - 1 + tabs.length) % tabs.length;
        break;
      case 'Home':
        newIndex = 0;
        break;
      case 'End':
        newIndex = tabs.length - 1;
        break;
      default:
        return;
    }
    e.preventDefault();
    setActiveIndex(newIndex);
    tabRefs.current[newIndex]?.focus();
  };

  return (
    <div>
      <div role="tablist" aria-label="Content tabs">
        {tabs.map((tab, i) => (
          <button
            key={tab.id}
            ref={(el) => (tabRefs.current[i] = el)}
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={i === activeIndex}
            aria-controls={`panel-${tab.id}`}
            tabIndex={i === activeIndex ? 0 : -1}
            onClick={() => setActiveIndex(i)}
            onKeyDown={handleKeyDown}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {tabs.map((tab, i) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`panel-${tab.id}`}
          aria-labelledby={`tab-${tab.id}`}
          hidden={i !== activeIndex}
          tabIndex={0}
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
```

**Requirements**:
- Container has `role="tablist"` with a label
- Each tab has `role="tab"`, `aria-selected`, `aria-controls`
- Each panel has `role="tabpanel"`, `aria-labelledby`
- Arrow keys navigate between tabs (Left/Right for horizontal, Up/Down for vertical)
- Home/End jump to first/last tab
- Only active tab has `tabIndex={0}`, others have `tabIndex={-1}`
- Panel is associated with its tab via `aria-controls` / `aria-labelledby`

---

## Accordion

```tsx
function Accordion({ items }) {
  const [expandedItems, setExpandedItems] = useState(new Set());

  const toggleItem = (id) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div>
      {items.map((item) => {
        const isExpanded = expandedItems.has(item.id);
        return (
          <div key={item.id}>
            <h3 id={`heading-${item.id}`}>
              <button
                aria-expanded={isExpanded}
                aria-controls={`section-${item.id}`}
                onClick={() => toggleItem(item.id)}
              >
                {item.title}
              </button>
            </h3>
            <div
              id={`section-${item.id}`}
              role="region"
              aria-labelledby={`heading-${item.id}`}
              hidden={!isExpanded}
            >
              {item.content}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

**Requirements**:
- Trigger is a `<button>` inside a heading element
- `aria-expanded` reflects open/closed state
- `aria-controls` links button to its controlled panel
- Panel has `role="region"` with `aria-labelledby`
- Enter/Space toggles (native `<button>` behavior)

---

## Data Table

```tsx
function DataTable({ caption, columns, rows }) {
  return (
    <table>
      <caption>{caption}</caption>
      <thead>
        <tr>
          {columns.map((col) => (
            <th key={col.key} scope="col">
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            <th scope="row">{row[columns[0].key]}</th>
            {columns.slice(1).map((col) => (
              <td key={col.key}>{row[col.key]}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

**Requirements**:
- Use `<table>`, `<thead>`, `<tbody>`, `<th>`, `<td>` — not divs with `display: grid`
- Provide `<caption>` describing the table's purpose
- Column headers: `<th scope="col">`
- Row headers: `<th scope="row">`
- For complex tables with multi-level headers, use `headers` attribute
- Don't use tables for layout — only for tabular data

---

## Toast / Notification

```tsx
function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      role="status"
      className="toast-container"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="toast">
          <span>{toast.message}</span>
          <button
            onClick={() => dismissToast(toast.id)}
            aria-label={`Dismiss: ${toast.message}`}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
```

**Requirements**:
- Container uses `aria-live="polite"` for non-urgent or `aria-live="assertive"` for errors
- The live region container must be in the DOM before toast content appears
- Auto-dismiss timing: minimum 5 seconds, respect `prefers-reduced-motion`
- Provide a dismiss button with an accessible label
- Don't auto-dismiss error notifications — user must dismiss them
- Use `role="alert"` for error toasts

---

## Autocomplete / Combobox

```tsx
function Autocomplete({ label, options, onSelect }) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef(null);
  const listboxId = 'autocomplete-listbox';

  const filtered = options.filter((opt) =>
    opt.label.toLowerCase().includes(query.toLowerCase())
  );

  const handleKeyDown = (e) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((prev) => Math.min(prev + 1, filtered.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((prev) => Math.max(prev - 1, -1));
        break;
      case 'Enter':
        if (activeIndex >= 0) {
          e.preventDefault();
          onSelect(filtered[activeIndex]);
          setIsOpen(false);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setActiveIndex(-1);
        break;
    }
  };

  return (
    <div>
      <label htmlFor="autocomplete-input">{label}</label>
      <input
        ref={inputRef}
        id="autocomplete-input"
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-activedescendant={
          activeIndex >= 0 ? `option-${filtered[activeIndex].id}` : undefined
        }
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
          setActiveIndex(-1);
        }}
        onKeyDown={handleKeyDown}
      />

      {isOpen && filtered.length > 0 && (
        <ul id={listboxId} role="listbox">
          {filtered.map((option, i) => (
            <li
              key={option.id}
              id={`option-${option.id}`}
              role="option"
              aria-selected={i === activeIndex}
              onClick={() => {
                onSelect(option);
                setIsOpen(false);
                inputRef.current?.focus();
              }}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}

      <div aria-live="polite" className="sr-only">
        {isOpen && `${filtered.length} results available`}
      </div>
    </div>
  );
}
```

**Requirements**:
- Input has `role="combobox"`, `aria-autocomplete="list"`, `aria-expanded`, `aria-controls`
- `aria-activedescendant` on input points to the currently highlighted option
- Listbox has `role="listbox"`, items have `role="option"` with `aria-selected`
- Arrow keys navigate options, Enter selects, Escape closes
- Announce result count to screen readers via `aria-live` region
- Focus stays on the input — options are highlighted via `aria-activedescendant`, not `focus()`

---

## Navigation

```tsx
function MainNavigation({ items, currentPath }) {
  return (
    <nav aria-label="Main navigation">
      <ul>
        {items.map((item) => (
          <li key={item.path}>
            <a
              href={item.path}
              aria-current={item.path === currentPath ? 'page' : undefined}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
```

**Requirements**:
- Use `<nav>` element (not `<div role="navigation">`)
- Provide `aria-label` when multiple nav regions exist ("Main navigation", "Footer links")
- Use `aria-current="page"` on the active link
- Navigation links use `<a href>` — never `<div onClick>`
- Use `<ul>` / `<li>` for navigation lists — screen readers announce item count

---

## Skip Link

```tsx
function SkipLink() {
  return (
    <a href="#main-content" className="skip-link">
      Skip to main content
    </a>
  );
}
```

```css
.skip-link {
  position: absolute;
  left: -10000px;
  top: auto;
  width: 1px;
  height: 1px;
  overflow: hidden;
}
.skip-link:focus {
  position: static;
  width: auto;
  height: auto;
}
```

```tsx
<main id="main-content" tabIndex={-1}>
  ...
</main>
```

**Requirements**:
- First focusable element on the page
- Visually hidden until focused (not `display: none` — must be focusable)
- Links to `<main>` with a matching `id`
- Main element has `tabIndex={-1}` to receive programmatic focus

---

## Visually Hidden Text (Screen Reader Only)

```tsx
const srOnly = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  borderWidth: 0,
} as const;

<span style={srOnly}>Additional context for screen readers</span>
```

Use for supplemental screen reader context — NOT as a substitute for visible labels.

---

## Sortable List with Drag Alternative (WCAG 2.2)

```tsx
function SortableList({ items, onReorder }) {
  const [liveMessage, setLiveMessage] = useState('');

  const moveItem = (fromIndex, toIndex) => {
    if (toIndex < 0 || toIndex >= items.length) return;
    const newItems = [...items];
    const [moved] = newItems.splice(fromIndex, 1);
    newItems.splice(toIndex, 0, moved);
    onReorder(newItems);
    setLiveMessage(`${moved.label} moved to position ${toIndex + 1} of ${items.length}`);
  };

  return (
    <>
      <ul role="listbox" aria-label="Reorderable list">
        {items.map((item, index) => (
          <li key={item.id} role="option" aria-selected={false}>
            <span>{item.label}</span>
            <button
              aria-label={`Move ${item.label} up`}
              disabled={index === 0}
              onClick={() => moveItem(index, index - 1)}
            >
              ↑
            </button>
            <button
              aria-label={`Move ${item.label} down`}
              disabled={index === items.length - 1}
              onClick={() => moveItem(index, index + 1)}
            >
              ↓
            </button>
          </li>
        ))}
      </ul>
      <div aria-live="assertive" className="sr-only">
        {liveMessage}
      </div>
    </>
  );
}
```

**Requirements (WCAG 2.2 — 2.5.7 Dragging Movements)**:
- Every drag-to-reorder interaction MUST have button-based alternatives
- Announce the result of reordering via `aria-live` region
- Disable up button on first item, down button on last item
- Move buttons have descriptive `aria-label` including the item name

---

## Tooltip / Popover (WCAG 1.4.13)

```tsx
function Tooltip({ children, content }) {
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef(null);

  const show = () => {
    clearTimeout(timeoutRef.current);
    setIsOpen(true);
  };

  const hide = () => {
    timeoutRef.current = setTimeout(() => setIsOpen(false), 100);
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  return (
    <div
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      style={{ position: 'relative', display: 'inline-block' }}
    >
      {children}
      {isOpen && (
        <div
          role="tooltip"
          onMouseEnter={show}
          onMouseLeave={hide}
        >
          {content}
        </div>
      )}
    </div>
  );
}
```

**Requirements (1.4.13 Content on Hover or Focus)**:
- **Dismissible**: Escape key closes the tooltip without moving focus/pointer
- **Hoverable**: Pointer can move to the tooltip content without it closing
- **Persistent**: Stays visible until user dismisses, or moves pointer/focus away
- Small delay on hide prevents flicker when moving between trigger and tooltip
- Tooltip appears on both hover AND focus (keyboard users need it too)
- Never put essential/required content in tooltips — they should be supplemental

---

## Confirmation Dialog for Destructive Actions (WCAG 3.3.4)

```tsx
function DeleteWithConfirmation({ itemName, onDelete }) {
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <>
      <button onClick={() => setShowConfirm(true)}>
        Delete {itemName}
      </button>

      {showConfirm && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          aria-describedby="confirm-desc"
        >
          <h2 id="confirm-title">Confirm deletion</h2>
          <p id="confirm-desc">
            Are you sure you want to delete "{itemName}"? This cannot be undone.
          </p>
          <div>
            <button onClick={() => setShowConfirm(false)} autoFocus>
              Cancel
            </button>
            <button onClick={() => { onDelete(); setShowConfirm(false); }}>
              Yes, delete
            </button>
          </div>
        </div>
      )}
    </>
  );
}
```

**Requirements (3.3.4 Error Prevention)**:
- Use `role="alertdialog"` (not `role="dialog"`) for confirmation dialogs — screen readers announce it as important
- `aria-describedby` links to the warning message
- Default focus on the non-destructive action (Cancel) — `autoFocus` is correct here
- Required for: deletions, financial transactions, legal agreements, data submissions that can't be reversed

---

## Toggle / Switch (WAI-ARIA APG Switch Pattern)

```tsx
import { useCallback, useId } from 'react';

function Switch({
  label,
  checked,
  onChange,
  disabled = false,
  description,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  description?: string;
}) {
  const labelId = useId();
  const descId = useId();

  const handleClick = useCallback(() => {
    if (!disabled) onChange(!checked);
  }, [checked, disabled, onChange]);

  return (
    <div className="switch-wrapper">
      <button
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelId}
        aria-describedby={description ? descId : undefined}
        aria-disabled={disabled || undefined}
        onClick={handleClick}
        type="button"
        className="switch-button"
      >
        <span className="switch-track" aria-hidden="true">
          <span className="switch-thumb" />
        </span>
      </button>

      <span id={labelId} className="switch-label">
        {label}
      </span>

      {description && (
        <span id={descId} className="switch-description">
          {description}
        </span>
      )}
    </div>
  );
}
```

**CSS (required for compliance)**:
```css
.switch-button {
  appearance: none;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  min-width: 44px;
  min-height: 44px;     /* WCAG 2.5.8 target size */
  display: inline-flex;
  align-items: center;
}

.switch-button:focus-visible {
  outline: 3px solid #005fcc;
  outline-offset: 2px;
  border-radius: 4px;
}

.switch-track {
  width: 48px;
  height: 28px;
  border-radius: 14px;
  position: relative;
  transition: background-color 200ms ease;
}

.switch-button[aria-checked='true'] .switch-track { background-color: #0057b8; }
.switch-button[aria-checked='false'] .switch-track { background-color: #767676; }

.switch-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
  position: absolute;
  top: 4px;
  left: 4px;
  transition: transform 200ms ease;
}

.switch-button[aria-checked='true'] .switch-thumb { transform: translateX(20px); }

.switch-button[aria-disabled='true'] { cursor: not-allowed; opacity: 0.5; }

@media (forced-colors: active) {
  .switch-track { border: 2px solid ButtonText; }
  .switch-button:focus-visible { outline: 2px solid Highlight; }
}
```

**Requirements (WAI-ARIA APG Switch Pattern, WCAG 4.1.2)**:
- `role="switch"` on the interactive element (not a wrapper)
- `aria-checked` must be dynamically updated (`"true"` or `"false"` — `"mixed"` is NOT valid for switches, unlike checkboxes)
- An accessible name MUST be provided via `aria-label`, `aria-labelledby`, or visible text
- **The label text must NOT change** when the switch state changes — `aria-checked` already communicates on/off. Changing the label (e.g., "Enable" / "Disable") causes double announcements
- `Space` key toggles the switch (native `<button>` provides this + `Enter` for free)
- **Disabled state**: Prefer `aria-disabled` over `disabled` for custom widgets — `disabled` removes the element from the tab order, making it undiscoverable by keyboard-only users. When using `aria-disabled`, prevent the action in your click handler
- State must not be communicated by color alone — the thumb position is the required non-color indicator (WCAG 1.4.1)
- Focus indicator must be visible on keyboard navigation (WCAG 2.4.7)
- Minimum 24x24px target size, recommended 44x44px (WCAG 2.5.8)

**When to use Switch vs. Checkbox vs. Toggle Button**:
- `role="switch"`: Immediate effect (dark mode, notifications, feature on/off). Screen reader announces "on/off"
- `role="checkbox"`: Multi-select, form submissions, can be indeterminate. Announces "checked/unchecked"
- `<button aria-pressed>`: Toolbar toggles (bold, mute). Announces "pressed/not pressed"
