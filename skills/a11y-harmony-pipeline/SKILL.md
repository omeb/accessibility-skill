---
name: wix-a11y-harmony-pipeline
description: Use when building, modifying, or maintaining AI code generation pipelines that need accessibility enforcement — specifically the Harmony platform's component generation system. Covers system prompt injection, ESLint programmatic linting, AST-based pattern scanning, fix-up re-prompt loops, structural integrity checks, confidence scoring, and rollout strategy.
---

# Harmony Pipeline Integration Guide

How to integrate accessibility checks into Harmony's AI component generation pipeline.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│  USER REQUEST: "Generate a pricing card component"      │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│  LAYER 1: GUIDED LLM CALL                               │
│  System prompt includes web-accessibility skill          │
│  → Model generates component with a11y knowledge        │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│  LAYER 2: ESLINT jsx-a11y (26 rules, strict mode)       │
│  LAYER 2.5: PATTERN SCANNER (CSS, inline styles,        │
│    autocomplete, paste-blocking, link text, reflow)      │
│  ── both run in parallel, ~100ms total ──               │
│  → If all clean: serve to user ✅                        │
│  → If issues: proceed to Layer 3                        │
└──────────┬───────────────────────┬──────────────────────┘
           │ clean                 │ issues found
           ▼                      ▼
┌──────────────────┐  ┌──────────────────────────────────┐
│  SERVE TO USER ✅ │  │  LAYER 3: FIX-UP RE-PROMPT       │
│                  │  │  Send violations + fix reference   │
│                  │  │  + original code to LLM            │
│                  │  │  → Max 2 iterations                │
└──────────────────┘  └──────────┬───────────────────────┘
                                 │
                                 ▼
                      ┌──────────────────────────────────┐
                      │  RE-SCAN (Layer 2 + 2.5 again)    │
                      │  → If clean: serve to user ✅      │
                      │  → If still issues after 2 tries: │
                      │    serve with a11y warning badge ⚠ │
                      └──────────────────────────────────┘
```

## Layer 1: System Prompt Injection

### What to Inject

The accessibility skill is split into multiple files for progressive loading. For Harmony's system prompt, you have three options with different token budgets:

| Option | Files | ~Tokens | Coverage |
|--------|-------|---------|----------|
| A: Full | web-accessibility + a11y-rules-reference skills | ~7,000 | All 26 rules with examples |
| B: Core only | web-accessibility skill | ~3,000 | 7 critical rules (96% of errors) |
| C: Condensed | Critical Rules + Anti-patterns only | ~1,500 | Top violations only |

### How to Inject

**Option A: Full injection** (recommended for initial rollout — ~7,000 tokens)

Concatenate the `web-accessibility` and `a11y-rules-reference` skill content into the system prompt. This gives the model comprehensive accessibility knowledge for all 26 rules.

```python
system_prompt = f"""
{base_system_prompt}

## Accessibility Requirements

{web_accessibility_skill_content}

## Complete Rules Reference

{rules_reference_content}
"""
```

**Option B: Core only** (balanced — best token/quality tradeoff — ~3,000 tokens)

Use only the `web-accessibility` skill content. This covers the 7 critical rules (96% of real-world errors), severity tiers, anti-patterns table, and the automated verification protocol.

```python
system_prompt = f"""
{base_system_prompt}

## Accessibility Requirements

{web_accessibility_skill_content}
"""
```

**Option C: Condensed injection** (if token budget is tight)

Use only the Critical Rules section and the Anti-Patterns table from the `web-accessibility` skill. These cover ~90% of the issues seen in the linter data.

### Prompt Reinforcement

Add an explicit instruction at the END of the system prompt (recency bias helps):

```
IMPORTANT: Before returning the component, verify it passes all accessibility rules above.
Specifically check:
1. No onClick on <div>, <span>, or other non-interactive elements — use <button> or <a>
2. All images have alt attributes
3. All form inputs have associated labels
4. Heading levels are sequential
5. All interactive elements have visible focus styles
```

This "checklist at the end" pattern significantly improves compliance in single-shot LLM generation.

## Layer 2: Static Lint Gate

### Setup

Install `eslint` and `eslint-plugin-jsx-a11y`:

```bash
npm install --save-dev eslint eslint-plugin-jsx-a11y @eslint/js
```

### ESLint Configuration

```js
// eslint.config.js (flat config)
import jsxA11y from 'eslint-plugin-jsx-a11y';

export default [
  {
    files: ['**/*.{jsx,tsx}'],
    plugins: {
      'jsx-a11y': jsxA11y,
    },
    rules: {
      // Top violations from linter data — all set to error
      'jsx-a11y/no-static-element-interactions': 'error',
      'jsx-a11y/no-noninteractive-tabindex': 'error',
      'jsx-a11y/no-noninteractive-element-interactions': 'error',
      'jsx-a11y/click-events-have-key-events': 'error',
      'jsx-a11y/no-noninteractive-element-to-interactive-role': 'error',
      'jsx-a11y/no-redundant-roles': 'error',
      'jsx-a11y/role-supports-aria-props': 'error',
      'jsx-a11y/interactive-supports-focus': 'error',
      'jsx-a11y/no-interactive-element-to-noninteractive-role': 'error',

      // autoFocus: warn instead of error — autoFocus is correct in dialog/modal
      // patterns for initial focus placement (WCAG 2.4.3 Focus Order).
      // Suppress with eslint-disable-next-line ONLY in dialog contexts.
      'jsx-a11y/no-autofocus': ['warn', { ignoreNonDOM: true }],

      // Additional important rules
      'jsx-a11y/alt-text': 'error',
      'jsx-a11y/anchor-has-content': 'error',
      'jsx-a11y/anchor-is-valid': 'error',
      'jsx-a11y/aria-props': 'error',
      'jsx-a11y/aria-proptypes': 'error',
      'jsx-a11y/aria-role': 'error',
      'jsx-a11y/aria-unsupported-elements': 'error',
      'jsx-a11y/heading-has-content': 'error',
      'jsx-a11y/html-has-lang': 'error',
      'jsx-a11y/img-redundant-alt': 'error',
      'jsx-a11y/label-has-associated-control': 'error',
      'jsx-a11y/mouse-events-have-key-events': 'error',
      'jsx-a11y/no-access-key': 'error',
      'jsx-a11y/no-distracting-elements': 'error',
      'jsx-a11y/scope': 'error',
      'jsx-a11y/tabindex-no-positive': 'error',
    },
  },
];
```

### Programmatic Linting

Run eslint programmatically on the generated code string:

```typescript
import { ESLint } from 'eslint';

async function lintForAccessibility(code: string, filename: string): Promise<{
  isClean: boolean;
  issues: Array<{ rule: string; message: string; line: number; column: number }>;
}> {
  const eslint = new ESLint({
    overrideConfigFile: './eslint-a11y.config.js',
  });

  const results = await eslint.lintText(code, { filePath: filename });

  const issues = results[0]?.messages
    .filter((msg) => msg.ruleId?.startsWith('jsx-a11y/'))
    .map((msg) => ({
      rule: msg.ruleId,
      message: msg.message,
      line: msg.line,
      column: msg.column,
    })) ?? [];

  return {
    isClean: issues.length === 0,
    issues,
  };
}
```

### Performance Consideration

ESLint linting on a single component is fast — typically <100ms. This adds negligible latency to the generation pipeline. The ESLint instance can be cached and reused across requests.

## Layer 2.5: AST-Based Pattern Scanner

ESLint jsx-a11y catches ~70% of static accessibility issues. The remaining ~30% require pattern-based scanning for things the linter doesn't cover: CSS-in-JS styles, missing autocomplete attributes, anti-patterns in JSX structure, canvas elements, and icon library misuse.

**Why AST over regex**: Generated JSX is frequently multi-line. Regex breaks on `<button\n  onClick={fn}\n>` where the tag spans 3 lines. An AST parser handles this natively.

### Setup

```bash
npm install --save-dev @typescript-eslint/typescript-estree
```

### Programmatic Pattern Scanner

```typescript
import { parse } from '@typescript-eslint/typescript-estree';
import { AST_NODE_TYPES, TSESTree } from '@typescript-eslint/typescript-estree';

interface PatternViolation {
  pattern: string;
  line: number;
  message: string;
  fix: string;
}

function scanForA11yPatterns(code: string): PatternViolation[] {
  const violations: PatternViolation[] = [];
  let ast: TSESTree.Program;

  try {
    ast = parse(code, { jsx: true, loc: true });
  } catch {
    return scanWithRegexFallback(code);
  }

  function visit(node: TSESTree.Node) {
    if (node.type === AST_NODE_TYPES.JSXOpeningElement) {
      checkJSXElement(node, ast, code, violations);
    }
    for (const key of Object.keys(node)) {
      const child = (node as any)[key];
      if (child && typeof child === 'object') {
        if (Array.isArray(child)) {
          child.forEach((c) => c?.type && visit(c));
        } else if (child.type) {
          visit(child);
        }
      }
    }
  }

  visit(ast);
  checkStyleStrings(code, violations);
  return violations;
}

function getElementName(node: TSESTree.JSXOpeningElement): string {
  if (node.name.type === AST_NODE_TYPES.JSXIdentifier) return node.name.name;
  return '';
}

function hasAttribute(node: TSESTree.JSXOpeningElement, name: string): boolean {
  return node.attributes.some(
    (attr) => attr.type === AST_NODE_TYPES.JSXAttribute && attr.name.name === name
  );
}

function getAttributeValue(node: TSESTree.JSXOpeningElement, name: string): string | null {
  const attr = node.attributes.find(
    (a) => a.type === AST_NODE_TYPES.JSXAttribute && a.name.name === name
  );
  if (!attr || attr.type !== AST_NODE_TYPES.JSXAttribute) return null;
  const val = attr.value;
  if (val?.type === AST_NODE_TYPES.Literal) return String(val.value);
  if (val?.type === AST_NODE_TYPES.JSXExpressionContainer &&
      val.expression.type === AST_NODE_TYPES.Literal) {
    return String(val.expression.value);
  }
  return null;
}

function hasTextChildren(node: TSESTree.JSXOpeningElement, ast: TSESTree.Program, code: string): boolean {
  const startEnd = node.loc.end;
  const lines = code.split('\n');
  for (let i = startEnd.line - 1; i < Math.min(startEnd.line + 5, lines.length); i++) {
    if (i === startEnd.line - 1) continue;
    if (/<\/button>|<\/a>/.test(lines[i])) break;
    const textOnly = lines[i].replace(/<[^>]*>/g, '').replace(/[{}\s]/g, '');
    if (textOnly.length > 0) return true;
  }
  return false;
}

function checkJSXElement(node: TSESTree.JSXOpeningElement, ast: TSESTree.Program, code: string, violations: PatternViolation[]) {
  const tag = getElementName(node);
  const line = node.loc.start.line;

  // Buttons without accessible name
  if (tag === 'button') {
    if (!hasAttribute(node, 'aria-label') && !hasAttribute(node, 'aria-labelledby')
        && !hasTextChildren(node, ast, code)) {
      violations.push({
        pattern: 'empty-button',
        line,
        message: 'Button has no accessible name — no aria-label, aria-labelledby, or visible text (WCAG 4.1.2)',
        fix: 'Add aria-label to the button, or ensure it contains visible text',
      });
    }
  }

  // SVG without a11y attributes
  if (tag === 'svg') {
    if (!hasAttribute(node, 'aria-hidden') && !hasAttribute(node, 'role') && !hasAttribute(node, 'aria-label')) {
      violations.push({
        pattern: 'svg-no-alt',
        line,
        message: 'SVG without accessible name or aria-hidden (WCAG 1.1.1)',
        fix: 'Decorative: aria-hidden="true". Informative: role="img" + <title> + aria-labelledby',
      });
    }
  }

  // Canvas without fallback
  if (tag === 'canvas') {
    if (!hasAttribute(node, 'role') && !hasAttribute(node, 'aria-label')) {
      violations.push({
        pattern: 'canvas-no-fallback',
        line,
        message: 'Canvas element without role or aria-label — invisible to screen readers (WCAG 1.1.1)',
        fix: 'Add role="img" + aria-label, or provide fallback content inside <canvas>',
      });
    }
  }

  // iframe without title
  if (tag === 'iframe' && !hasAttribute(node, 'title')) {
    violations.push({
      pattern: 'iframe-no-title',
      line,
      message: 'iframe missing title attribute (WCAG 2.4.1)',
      fix: 'Add title="description of iframe content"',
    });
  }

  // Fake links
  if (tag === 'a') {
    const href = getAttributeValue(node, 'href');
    if (href === '#' || href?.startsWith('javascript:')) {
      violations.push({
        pattern: 'fake-link',
        line,
        message: 'href="#" or javascript: — use <button> for actions (WCAG 4.1.2)',
        fix: 'Replace <a href="#" onClick={fn}> with <button onClick={fn}>',
      });
    }
  }

  // autocomplete="off"
  if ((tag === 'input' || tag === 'select' || tag === 'textarea')) {
    const autocomplete = getAttributeValue(node, 'autoComplete');
    if (autocomplete === 'off') {
      violations.push({
        pattern: 'autocomplete-off',
        line,
        message: 'autocomplete="off" blocks password managers (WCAG 3.3.8)',
        fix: 'Use specific value: "username", "current-password", "email", etc.',
      });
    }
  }

  // onPaste prevention
  if (hasAttribute(node, 'onPaste')) {
    violations.push({
      pattern: 'paste-blocked',
      line,
      message: 'onPaste handler detected — verify it does not block paste (WCAG 3.3.8)',
      fix: 'Remove any preventDefault() call in the onPaste handler',
    });
  }

  // onMouseDown for primary actions
  if (hasAttribute(node, 'onMouseDown') && !['canvas', 'input'].includes(tag)) {
    violations.push({
      pattern: 'mousedown-action',
      line,
      message: 'onMouseDown may prevent pointer cancellation (WCAG 2.5.2)',
      fix: 'Use onClick instead (fires on up-event, allows abort)',
    });
  }

  // autoPlay
  if (hasAttribute(node, 'autoPlay')) {
    violations.push({
      pattern: 'autoplay',
      line,
      message: 'autoPlay may violate WCAG 1.4.2 / 2.2.2',
      fix: 'Remove autoPlay or add immediate pause/stop control',
    });
  }

  // role="presentation" / role="none" misuse
  const role = getAttributeValue(node, 'role');
  if (role === 'presentation' || role === 'none') {
    const interactiveTags = ['button', 'a', 'input', 'select', 'textarea'];
    if (interactiveTags.includes(tag)) {
      violations.push({
        pattern: 'role-presentation-misuse',
        line,
        message: `role="${role}" on interactive <${tag}> hides it from AT (WCAG 4.1.2)`,
        fix: 'Remove role="presentation" — fix the actual lint issue instead of suppressing',
      });
    }
  }
}

function checkStyleStrings(code: string, violations: PatternViolation[]) {
  const lines = code.split('\n');
  lines.forEach((line, i) => {
    const lineNum = i + 1;

    if (/outline:\s*(none|0)\b|outline:\s*['"]none['"]|outline:\s*['"]0['"]/.test(line) && !/focus-visible/.test(line)) {
      violations.push({ pattern: 'focus-removal', line: lineNum,
        message: 'Focus indicator removed (WCAG 2.4.7)',
        fix: 'Use :focus-visible with visible outline or box-shadow' });
    }

    if (/width:\s*(\d{3,})px/.test(line) && parseInt(line.match(/width:\s*(\d+)px/)?.[1] ?? '0') > 320) {
      violations.push({ pattern: 'fixed-width', line: lineNum,
        message: 'Fixed width may break reflow at 320px (WCAG 1.4.10)',
        fix: 'Use max-width, percentage, or responsive units' });
    }

    if (/animation(-duration)?:\s*0\.[0-2]/.test(line)) {
      violations.push({ pattern: 'fast-animation', line: lineNum,
        message: 'Animation under 333ms — potential seizure risk (WCAG 2.3.1)',
        fix: 'Slow to >333ms per cycle, or use transform instead of color' });
    }

    if (/>Click here<|>Read more<|>Learn more<|>Here<|>More</.test(line)) {
      violations.push({ pattern: 'vague-link-text', line: lineNum,
        message: 'Vague link text (WCAG 2.4.4)',
        fix: 'Use descriptive text: "View pricing plans" not "Click here"' });
    }
  });
}

function scanWithRegexFallback(code: string): PatternViolation[] {
  const violations: PatternViolation[] = [];
  const lines = code.split('\n');
  lines.forEach((line, i) => {
    const n = i + 1;
    if (/<svg/.test(line) && !/aria-hidden|role=["']img|aria-label/.test(line))
      violations.push({ pattern: 'svg-no-alt', line: n, message: 'SVG without a11y', fix: 'Add aria-hidden or role="img"' });
    if (/href=["']#["']|href=["']javascript:/.test(line))
      violations.push({ pattern: 'fake-link', line: n, message: 'Fake link', fix: 'Use <button>' });
    if (/outline:\s*(none|0)\b/.test(line) && !/focus-visible/.test(line))
      violations.push({ pattern: 'focus-removal', line: n, message: 'Focus removed', fix: 'Use :focus-visible' });
  });
  return violations;
}
```

### Integrate Pattern Scanner into Pipeline

```typescript
async function lintAndScanForAccessibility(code: string, filename: string) {
  const [lintResult, patternViolations] = await Promise.all([
    lintForAccessibility(code, filename),
    Promise.resolve(scanForA11yPatterns(code)),
  ]);

  const allIssues = [
    ...lintResult.issues.map((i) => ({ ...i, source: 'eslint' as const })),
    ...patternViolations.map((v) => ({
      rule: v.pattern,
      message: v.message,
      line: v.line,
      column: 0,
      source: 'pattern-scanner' as const,
      fix: v.fix,
    })),
  ];

  return {
    isClean: allIssues.length === 0,
    issues: allIssues,
  };
}
```

## Layer 3: Fix-Up Re-Prompt

When the lint gate finds issues, send them back to the LLM for correction.

### Fix-Up Prompt Template

```
The following React component has accessibility violations detected by automated scanning tools (eslint-plugin-jsx-a11y and pattern analysis).
Fix ONLY the accessibility issues listed below. Do not change the visual design or functionality.

## Violations Found

{violations_formatted}

## Original Component

```tsx
{original_code}
```

## Fix Reference

{dynamic_fix_reference}

## Rules
1. Apply the specific fix for each violation
2. Preserve all existing styling, layout, and functionality — do NOT remove interactive elements to "fix" a violation
3. Do NOT add eslint-disable comments — fix the actual code
4. Do NOT add role="presentation" or role="none" to suppress warnings — this hides elements from assistive technology
5. Return only the fixed component code
```

### Dynamic Fix Reference Builder

Only include fix instructions for the specific violations that were detected — don't send the full reference every time:

```typescript
const FIX_REFERENCES: Record<string, string> = {
  'jsx-a11y/no-static-element-interactions': 'Replace <div onClick> with <button onClick>. The <button> element handles Enter, Space, and focus natively.',
  'jsx-a11y/click-events-have-key-events': 'Replace event handlers on div/span with a <button> or <a> element.',
  'jsx-a11y/no-noninteractive-tabindex': 'Remove tabIndex from non-interactive elements (div, span, section). Only interactive elements should be focusable.',
  'jsx-a11y/no-noninteractive-element-interactions': 'Replace event handlers on div/span with a <button> or <a> element.',
  'jsx-a11y/no-redundant-roles': 'Remove role="button" from <button>, role="navigation" from <nav>, etc.',
  'jsx-a11y/alt-text': 'Add alt="descriptive text" to <img> elements, or alt="" for decorative images.',
  'jsx-a11y/label-has-associated-control': 'Add <label htmlFor="id"> for every <input>, <select>, <textarea>.',
  'jsx-a11y/interactive-supports-focus': 'Add tabIndex={0} to custom interactive elements (but prefer using <button> instead).',
  'focus-removal': 'Replace outline:none with :focus-visible styling that shows a visible focus ring.',
  'paste-blocked': 'Remove onPaste preventDefault entirely.',
  'autocomplete-off': 'Replace autocomplete="off" with the correct autocomplete value (e.g., "email", "current-password").',
  'mousedown-action': 'Replace onMouseDown with onClick.',
  'autoplay': 'Remove autoPlay or add a visible pause/stop control adjacent to the media element.',
  'fixed-width': 'Replace width with max-width, or use responsive units (%, vw, auto-fit).',
  'vague-link-text': 'Replace "Click here"/"Read more" with text describing the destination.',
  'svg-no-alt': 'Decorative SVG: add aria-hidden="true". Informative SVG: add role="img", a <title> as first child, and aria-labelledby pointing to the title id.',
  'fake-link': 'Replace <a href="#" onClick={fn}> with <button onClick={fn}>. Links are for navigation, buttons are for actions.',
  'iframe-no-title': 'Add title="description of content" to the iframe element.',
  'fast-animation': 'Increase animation-duration to >333ms, or replace color/background changes with transform/shadow animations.',
  'canvas-no-fallback': 'Add role="img" + aria-label to <canvas>, or provide fallback content inside <canvas>...</canvas>.',
  'role-presentation-misuse': 'Remove role="presentation" from interactive elements — fix the underlying lint issue instead.',
  'empty-button': 'Button has no accessible name — add aria-label, or add visible text. If it wraps an icon component, add aria-label to the button and aria-hidden="true" to the icon.',
};

function buildDynamicFixReference(issues: Array<{ rule: string }>): string {
  const uniqueRules = [...new Set(issues.map((i) => i.rule))];
  return uniqueRules
    .filter((rule) => FIX_REFERENCES[rule])
    .map((rule) => `- **${rule}**: ${FIX_REFERENCES[rule]}`)
    .join('\n');
}
```

### Formatting Violations

Format violations clearly for the LLM:

```typescript
function formatViolationsForPrompt(issues: LintIssue[]): string {
  return issues
    .map((issue, i) => `${i + 1}. Line ${issue.line}: [${issue.rule}] ${issue.message}`)
    .join('\n');
}
```

### Iteration Logic

```typescript
async function generateAccessibleComponent(userPrompt: string): Promise<{
  code: string;
  hadIssues: boolean;
  remainingIssues: A11yIssue[];
  iterations: number;
  confidence: 'high' | 'medium' | 'low';
}> {
  const MAX_FIX_ITERATIONS = 2;

  // Layer 1: Initial generation with a11y skill in system prompt
  let code = await generateComponent(userPrompt, { systemPrompt: a11ySystemPrompt });
  const originalStructure = getComponentStructure(code);

  // Layer 2 + 2.5: ESLint + AST Pattern Scanner (run in parallel)
  let scanResult = await lintAndScanForAccessibility(code, 'component.tsx');

  metrics.increment('a11y.generation.total');
  metrics.increment(scanResult.isClean ? 'a11y.generation.clean_first_pass' : 'a11y.generation.dirty_first_pass');
  scanResult.issues.forEach((issue) => {
    metrics.increment('a11y.violation', { rule: issue.rule, source: issue.source });
  });

  if (scanResult.isClean) {
    return { code, hadIssues: false, remainingIssues: [], iterations: 0,
      confidence: computeConfidence(code) };
  }

  // Layer 3: Fix-up loop
  for (let i = 0; i < MAX_FIX_ITERATIONS; i++) {
    const fixPrompt = buildFixUpPrompt(code, scanResult.issues);
    const fixedCode = await fixComponent(fixPrompt);

    // Structural integrity check
    const fixedStructure = getComponentStructure(fixedCode);
    if (fixedStructure.interactiveCount < originalStructure.interactiveCount * 0.8) {
      metrics.increment('a11y.generation.structural_regression');
      break;
    }

    code = fixedCode;
    scanResult = await lintAndScanForAccessibility(code, 'component.tsx');

    if (scanResult.isClean) {
      metrics.increment('a11y.generation.fixed', { iterations: i + 1 });
      return { code, hadIssues: true, remainingIssues: [], iterations: i + 1,
        confidence: computeConfidence(code) };
    }
  }

  metrics.increment('a11y.generation.unfixed');
  scanResult.issues.forEach((issue) => {
    metrics.increment('a11y.unfixed_violation', { rule: issue.rule });
  });

  return {
    code,
    hadIssues: true,
    remainingIssues: scanResult.issues,
    iterations: MAX_FIX_ITERATIONS,
    confidence: 'low',
  };
}
```

### Structural Integrity Check

LLMs sometimes "fix" accessibility by removing functionality — deleting a complex interactive element instead of making it accessible. The structural check catches this.

```typescript
interface ComponentStructure {
  interactiveCount: number;
  elementTags: Set<string>;
}

function getComponentStructure(code: string): ComponentStructure {
  const interactiveTags = ['button', 'a', 'input', 'select', 'textarea', 'details'];
  const tagRegex = /<(\w+)[\s>]/g;
  let match;
  let interactiveCount = 0;
  const elementTags = new Set<string>();

  while ((match = tagRegex.exec(code)) !== null) {
    const tag = match[1].toLowerCase();
    elementTags.add(tag);
    if (interactiveTags.includes(tag)) interactiveCount++;
  }

  return { interactiveCount, elementTags };
}
```

If the fixed code has >20% fewer interactive elements than the original, reject the fix. This heuristic catches model deletions without blocking legitimate refactors (replacing `<div onClick>` with `<button>` is net-zero).

### Confidence Signal

Not all "lint-clean" components are equally accessible. A component may pass all automated checks but still have semantic issues.

```typescript
function computeConfidence(code: string): 'high' | 'medium' | 'low' {
  let score = 100;

  const genericAltPatterns = /alt=["'](image|icon|photo|picture|img|logo|banner)["']/gi;
  const genericMatches = code.match(genericAltPatterns)?.length ?? 0;
  score -= genericMatches * 10;

  const genericAriaPatterns = /aria-label=["'](button|link|icon|input|close|click)["']/gi;
  const ariaMatches = code.match(genericAriaPatterns)?.length ?? 0;
  score -= ariaMatches * 10;

  const hasLandmarks = /<(main|nav|header|footer|aside)\b/.test(code);
  const isPageLevel = /<html|<head|<body/.test(code) || code.length > 2000;
  if (isPageLevel && !hasLandmarks) score -= 20;

  const hasHeadings = /<h[1-6]\b/.test(code);
  if (code.length > 1000 && !hasHeadings) score -= 15;

  if (score >= 80) return 'high';
  if (score >= 50) return 'medium';
  return 'low';
}
```

Surface the confidence signal in the UI: `high` = green checkmark, `medium` = yellow "review recommended", `low` = orange warning badge.

### Why Max 2 Iterations

- **Iteration 1** fixes ~80-90% of remaining issues (model now has specific lint errors to address)
- **Iteration 2** catches any issues introduced by the first fix
- **Beyond 2**: diminishing returns — if the model can't fix it in 2 passes, it likely needs a different approach
- Each iteration adds ~1-3 seconds of latency (LLM call) — 2 iterations keep total overhead under ~6s

## Monitoring and Metrics

Track these metrics to measure impact:

### Generation Quality Metrics

| Metric | Description | Target |
|--------|-------------|--------|
| `a11y.generation.clean_rate` | % of components passing lint on first generation | > 65% (from current ~16%) |
| `a11y.generation.fix_rate` | % of issues fixed by re-prompt loop | > 95% |
| `a11y.generation.total_clean_rate` | % clean after all layers | > 98% |
| `a11y.generation.avg_fix_iterations` | Average fix iterations needed | < 1.5 |
| `a11y.generation.latency_overhead_ms` | Latency added by lint + fix loop | < 3000ms avg |

### Issue Distribution

Track which rules are violated most often to refine the system prompt:

```typescript
issues.forEach((issue) => {
  metrics.increment('a11y.violation', { rule: issue.rule });
});
```

If a specific rule consistently fails (> 5% of generations), add a more explicit example for that pattern in the system prompt.

## Rollout Strategy

### Phase 1: Measure Baseline (Week 1)
- Add linting to the pipeline without blocking — log results only
- Measure current clean rate across all generated components
- Identify the top violation patterns specific to your LLM/prompt

### Phase 2: Prompt Enhancement (Week 2)
- Inject the `web-accessibility` skill into the system prompt
- Measure improvement in clean rate
- A/B test with and without the skill to quantify impact

### Phase 3: Lint Gate + Fix Loop (Week 3-4)
- Enable the lint gate with fix-up re-prompt loop
- Start with `MAX_FIX_ITERATIONS = 1` to keep latency low
- Monitor latency impact and fix success rate
- Increase to 2 iterations if needed

### Phase 4: Iterate (Ongoing)
- Refine system prompt based on remaining violation patterns
- Add new rules to the eslint config as they become relevant
- Consider adding Layer 4 (dedicated a11y agent) for semantic issues linters can't catch

## Future: Layer 4 — Rendered Component Validation (Optional)

For issues that static linting cannot catch (meaningful alt text quality, logical heading hierarchy in context, color contrast with computed styles, keyboard interaction correctness), add a rendered-component validation layer:

### 4a: Lighthouse Accessibility Audit

```typescript
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';

async function runLighthouseA11y(url: string): Promise<{
  score: number;
  issues: Array<{ title: string; description: string }>;
}> {
  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
  const result = await lighthouse(url, {
    port: chrome.port,
    onlyCategories: ['accessibility'],
  });
  await chrome.kill();

  const audits = Object.values(result.lhr.audits)
    .filter((a) => a.score !== null && a.score < 1);

  return {
    score: result.lhr.categories.accessibility.score * 100,
    issues: audits.map((a) => ({ title: a.title, description: a.description })),
  };
}
```

Lighthouse catches contrast violations, missing document structure, tap target sizing from rendered layout, and viewport issues that static analysis misses. Adds ~3-5s per component.

### 4b: Full A11y Agent

A dedicated accessibility review agent that:

1. Takes the generated component code
2. Renders it in a headless browser
3. Runs axe-core on the rendered output
4. Runs Lighthouse accessibility audit
5. Checks focus-ring visibility, tab order, keyboard operability
6. Optionally uses an LLM to evaluate screenshot for visual a11y issues

This mirrors the `a11y-audit-tool-plugin` architecture from the accessibility monorepo. The inspections to run:
- **axe**: Full axe-core scan on rendered component
- **lighthouse**: Accessibility score and audit failures
- **focus-ring**: Verify focus indicators are visible
- **tab-reachability**: All interactive elements reachable via Tab
- **keyboard-trap**: No elements trap keyboard focus
- **button-operability**: Buttons respond to Enter and Space
- **link-operability**: Links respond to Enter

The full agent adds significant complexity and latency (~5-10s per component) so should only be introduced after Layers 1-3 are optimized. Lighthouse alone (4a) is a good intermediate step — it adds ~3-5s but catches rendered-layout issues that static analysis misses entirely.
