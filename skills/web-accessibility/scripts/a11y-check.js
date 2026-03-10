#!/usr/bin/env node

/**
 * Accessibility checker for generated/modified UI code.
 * Zero dependencies — runs with plain Node.js.
 *
 * Usage:
 *   node scripts/a11y-check.js path/to/component.tsx [path/to/another.tsx ...]
 *
 * Checks:
 *   1. AST-lite pattern scanning (always runs, zero deps)
 *   2. ESLint jsx-a11y (runs if eslint + plugin are available in the project)
 *
 * Exit codes:
 *   0 = clean
 *   1 = violations found
 *   2 = usage error
 */

const fs = require("node:fs");
const path = require("node:path");
const { execSync } = require("node:child_process");

// ─── Pattern Definitions ────────────────────────────────────────────────────

const PATTERNS = [
  {
    id: "div-onclick",
    severity: "critical",
    wcag: "4.1.2",
    // Matches <div or <span (and similar) followed eventually by onClick on the same or nearby lines
    test(lines) {
      const violations = [];
      const nonInteractive =
        /^\s*<(div|span|p|li|section|article|header|footer|tr|td|main|aside)\b/;
      for (let i = 0; i < lines.length; i++) {
        if (nonInteractive.test(lines[i]) && /onClick/.test(lines[i])) {
          violations.push({
            line: i + 1,
            message: `onClick on non-interactive <${lines[i].match(/<(\w+)/)?.[1]}> — use <button> or <a>`,
            fix: "Replace with <button onClick={...}> for actions, <a href={...}> for navigation",
          });
        }
      }
      return violations;
    },
  },
  {
    id: "img-no-alt",
    severity: "critical",
    wcag: "1.1.1",
    test(lines) {
      const violations = [];
      for (let i = 0; i < lines.length; i++) {
        if (/<img\b/.test(lines[i]) && !/alt\s*=/.test(lines[i])) {
          // Check next 3 lines too (multiline JSX)
          const chunk = lines.slice(i, i + 4).join(" ");
          if (!/alt\s*=/.test(chunk)) {
            violations.push({
              line: i + 1,
              message: "<img> missing alt attribute",
              fix: 'Add alt="description" or alt="" for decorative images',
            });
          }
        }
      }
      return violations;
    },
  },
  {
    id: "svg-no-a11y",
    severity: "critical",
    wcag: "1.1.1",
    test(lines) {
      const violations = [];
      for (let i = 0; i < lines.length; i++) {
        if (/<svg\b/.test(lines[i])) {
          const chunk = lines.slice(i, i + 4).join(" ");
          if (
            !/aria-hidden/.test(chunk) &&
            !/role\s*=\s*["']img/.test(chunk) &&
            !/aria-label/.test(chunk)
          ) {
            violations.push({
              line: i + 1,
              message: "SVG without aria-hidden or accessible name",
              fix: 'Decorative: add aria-hidden="true". Informative: add role="img" + <title> + aria-labelledby',
            });
          }
        }
      }
      return violations;
    },
  },
  {
    id: "input-no-label",
    severity: "critical",
    wcag: "1.3.1",
    test(lines, fullText) {
      const violations = [];
      for (let i = 0; i < lines.length; i++) {
        if (/<input\b/.test(lines[i]) || /<select\b/.test(lines[i]) || /<textarea\b/.test(lines[i])) {
          const chunk = lines.slice(i, i + 4).join(" ");
          const hasId = chunk.match(/id\s*=\s*["'{]([^"'}]+)/);
          if (hasId) {
            const id = hasId[1];
            if (!fullText.includes(`htmlFor="${id}"`) && !fullText.includes(`htmlFor={'${id}'}`)) {
              // Check for aria-label or aria-labelledby as alternatives
              if (!/aria-label/.test(chunk) && !/aria-labelledby/.test(chunk)) {
                violations.push({
                  line: i + 1,
                  message: `<${lines[i].match(/<(\w+)/)?.[1]}> with id="${id}" has no associated <label htmlFor="${id}">`,
                  fix: `Add <label htmlFor="${id}">Label text</label> before the input`,
                });
              }
            }
          } else {
            // No id at all — definitely no label association
            if (!/aria-label/.test(chunk) && !/aria-labelledby/.test(chunk)) {
              violations.push({
                line: i + 1,
                message: `<${lines[i].match(/<(\w+)/)?.[1]}> without id or aria-label — cannot be associated with a label`,
                fix: 'Add id="..." and a matching <label htmlFor="...">, or add aria-label',
              });
            }
          }
        }
      }
      return violations;
    },
  },
  {
    id: "focus-removal",
    severity: "critical",
    wcag: "2.4.7",
    test(lines) {
      const violations = [];
      for (let i = 0; i < lines.length; i++) {
        if (
          /outline\s*:\s*(none|0)\b/.test(lines[i]) ||
          /outline\s*:\s*['"]none['"]/.test(lines[i]) ||
          /outline\s*:\s*['"]0['"]/.test(lines[i])
        ) {
          if (!/focus-visible/.test(lines[i]) && !/focus-visible/.test(lines[i - 1] || "")) {
            violations.push({
              line: i + 1,
              message: "Focus indicator removed — outline: none without :focus-visible replacement",
              fix: "Use :focus-visible with a visible outline or box-shadow",
            });
          }
        }
      }
      return violations;
    },
  },
  {
    id: "fake-link",
    severity: "critical",
    wcag: "4.1.2",
    test(lines) {
      const violations = [];
      for (let i = 0; i < lines.length; i++) {
        if (/href\s*=\s*["']#["']/.test(lines[i]) || /href\s*=\s*["']javascript:/.test(lines[i])) {
          violations.push({
            line: i + 1,
            message: 'href="#" or javascript: — use <button> for actions',
            fix: "Replace <a href=\"#\" onClick={fn}> with <button onClick={fn}>",
          });
        }
      }
      return violations;
    },
  },
  {
    id: "empty-button",
    severity: "critical",
    wcag: "4.1.2",
    test(lines) {
      const violations = [];
      for (let i = 0; i < lines.length; i++) {
        if (/<button\b/.test(lines[i])) {
          const chunk = lines.slice(i, i + 4).join(" ");
          // Has aria-label or aria-labelledby — OK
          if (/aria-label/.test(chunk)) continue;
          // Check if it has text content (non-JSX, non-whitespace between tags)
          const afterOpen = chunk.replace(/<button[^>]*>/, "");
          const beforeClose = afterOpen.split("</button>")[0] || "";
          const textContent = beforeClose.replace(/<[^>]*>/g, "").replace(/[{}\s]/g, "");
          if (textContent.length === 0) {
            violations.push({
              line: i + 1,
              message: "Button has no accessible name (no aria-label and no visible text)",
              fix: "Add aria-label to the button, or ensure it has visible text content",
            });
          }
        }
      }
      return violations;
    },
  },
  {
    id: "paste-blocked",
    severity: "serious",
    wcag: "3.3.8",
    test(lines) {
      const violations = [];
      for (let i = 0; i < lines.length; i++) {
        if (/onPaste/.test(lines[i]) && /preventDefault/.test(lines.slice(i, i + 3).join(" "))) {
          violations.push({
            line: i + 1,
            message: "Paste blocked — users must be able to paste passwords",
            fix: "Remove the preventDefault() call in the onPaste handler",
          });
        }
      }
      return violations;
    },
  },
  {
    id: "autocomplete-off",
    severity: "serious",
    wcag: "3.3.8",
    test(lines) {
      const violations = [];
      for (let i = 0; i < lines.length; i++) {
        if (/autoComplete\s*=\s*["'{]off["'}]/.test(lines[i]) || /autocomplete\s*=\s*["']off["']/.test(lines[i])) {
          violations.push({
            line: i + 1,
            message: 'autocomplete="off" blocks password managers',
            fix: 'Use specific value: "username", "current-password", "email", etc.',
          });
        }
      }
      return violations;
    },
  },
  {
    id: "mousedown-action",
    severity: "serious",
    wcag: "2.5.2",
    test(lines) {
      const violations = [];
      for (let i = 0; i < lines.length; i++) {
        if (/onMouseDown\s*=/.test(lines[i])) {
          // Skip canvas and input elements
          if (/<canvas\b/.test(lines[i]) || /<input\b/.test(lines[i])) continue;
          violations.push({
            line: i + 1,
            message: "onMouseDown may prevent pointer cancellation",
            fix: "Use onClick instead (fires on up-event, allows abort)",
          });
        }
      }
      return violations;
    },
  },
  {
    id: "autoplay",
    severity: "serious",
    wcag: "1.4.2",
    test(lines) {
      const violations = [];
      for (let i = 0; i < lines.length; i++) {
        if (/autoPlay/.test(lines[i]) || /autoplay/.test(lines[i])) {
          violations.push({
            line: i + 1,
            message: "autoPlay may violate WCAG 1.4.2 / 2.2.2",
            fix: "Remove autoPlay or add immediate pause/stop control",
          });
        }
      }
      return violations;
    },
  },
  {
    id: "iframe-no-title",
    severity: "serious",
    wcag: "2.4.1",
    test(lines) {
      const violations = [];
      for (let i = 0; i < lines.length; i++) {
        if (/<iframe\b/.test(lines[i])) {
          const chunk = lines.slice(i, i + 4).join(" ");
          if (!/title\s*=/.test(chunk)) {
            violations.push({
              line: i + 1,
              message: "iframe missing title attribute",
              fix: 'Add title="description of iframe content"',
            });
          }
        }
      }
      return violations;
    },
  },
  {
    id: "canvas-no-fallback",
    severity: "serious",
    wcag: "1.1.1",
    test(lines) {
      const violations = [];
      for (let i = 0; i < lines.length; i++) {
        if (/<canvas\b/.test(lines[i])) {
          const chunk = lines.slice(i, i + 4).join(" ");
          if (!/role\s*=/.test(chunk) && !/aria-label/.test(chunk)) {
            violations.push({
              line: i + 1,
              message: "Canvas without role or aria-label — invisible to screen readers",
              fix: 'Add role="img" + aria-label, or provide fallback content inside <canvas>',
            });
          }
        }
      }
      return violations;
    },
  },
  {
    id: "vague-link-text",
    severity: "moderate",
    wcag: "2.4.4",
    test(lines) {
      const violations = [];
      for (let i = 0; i < lines.length; i++) {
        if (/>Click here<|>Read more<|>Learn more<|>Here<|>More<|>Click</.test(lines[i])) {
          violations.push({
            line: i + 1,
            message: "Vague link text — not descriptive of destination",
            fix: 'Use descriptive text: "View pricing plans" not "Click here"',
          });
        }
      }
      return violations;
    },
  },
  {
    id: "fast-animation",
    severity: "serious",
    wcag: "2.3.1",
    test(lines) {
      const violations = [];
      for (let i = 0; i < lines.length; i++) {
        if (/animation(-duration)?\s*:\s*0\.[0-2]/.test(lines[i])) {
          violations.push({
            line: i + 1,
            message: "Animation under 333ms — potential seizure risk",
            fix: "Slow to >333ms per cycle, or use transform instead of color changes",
          });
        }
      }
      return violations;
    },
  },
  {
    id: "fixed-width",
    severity: "moderate",
    wcag: "1.4.10",
    test(lines) {
      const violations = [];
      for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(/(?<!max-)width\s*:\s*(\d+)px/);
        if (match && parseInt(match[1]) > 320) {
          // Skip max-width
          if (/max-width/.test(lines[i])) continue;
          violations.push({
            line: i + 1,
            message: `Fixed width ${match[1]}px may break reflow at 320px viewport`,
            fix: "Use max-width, percentage, or responsive units",
          });
        }
      }
      return violations;
    },
  },
  {
    id: "nested-interactive",
    severity: "critical",
    wcag: "4.1.2",
    test(lines, fullText) {
      const violations = [];
      // Simple heuristic: look for <a containing <button or <button containing <a
      if (/<a[^>]*>[\s\S]*?<button/m.test(fullText)) {
        const match = fullText.match(/<a[^>]*>[\s\S]*?<button/m);
        if (match) {
          const line = fullText.substring(0, match.index).split("\n").length;
          violations.push({
            line,
            message: "<button> nested inside <a> — invalid HTML, breaks screen readers",
            fix: "Restructure using the stretched-link CSS pattern (see SKILL.md Rule 1)",
          });
        }
      }
      if (/<button[^>]*>[\s\S]*?<a\s/m.test(fullText)) {
        const match = fullText.match(/<button[^>]*>[\s\S]*?<a\s/m);
        if (match) {
          const line = fullText.substring(0, match.index).split("\n").length;
          violations.push({
            line,
            message: "<a> nested inside <button> — invalid HTML, breaks screen readers",
            fix: "Restructure using the stretched-link CSS pattern (see SKILL.md Rule 1)",
          });
        }
      }
      return violations;
    },
  },
  {
    id: "role-presentation-misuse",
    severity: "critical",
    wcag: "4.1.2",
    test(lines) {
      const violations = [];
      for (let i = 0; i < lines.length; i++) {
        if (/role\s*=\s*["'](presentation|none)["']/.test(lines[i])) {
          if (/<(button|a|input|select|textarea)\b/.test(lines[i])) {
            const tag = lines[i].match(/<(button|a|input|select|textarea)/)?.[1];
            violations.push({
              line: i + 1,
              message: `role="presentation" on interactive <${tag}> hides it from assistive technology`,
              fix: "Remove role=\"presentation\" — fix the underlying issue instead of suppressing",
            });
          }
        }
      }
      return violations;
    },
  },
];

// ─── Pattern Scanner ────────────────────────────────────────────────────────

function scanFile(filePath) {
  const code = fs.readFileSync(filePath, "utf-8");
  const lines = code.split("\n");
  const violations = [];

  for (const pattern of PATTERNS) {
    const found = pattern.test(lines, code);
    for (const v of found) {
      violations.push({
        file: filePath,
        line: v.line,
        id: pattern.id,
        severity: pattern.severity,
        wcag: pattern.wcag,
        message: v.message,
        fix: v.fix,
      });
    }
  }

  return violations.sort((a, b) => a.line - b.line);
}

// ─── ESLint jsx-a11y (optional — runs if available) ─────────────────────────

function tryEslintJsxA11y(files) {
  try {
    // Check if eslint and jsx-a11y are available
    execSync("npx --no-install eslint --version", { stdio: "ignore" });
  } catch {
    return null; // ESLint not available
  }

  const rules = [
    "jsx-a11y/alt-text",
    "jsx-a11y/anchor-has-content",
    "jsx-a11y/anchor-is-valid",
    "jsx-a11y/aria-props",
    "jsx-a11y/aria-proptypes",
    "jsx-a11y/aria-role",
    "jsx-a11y/click-events-have-key-events",
    "jsx-a11y/heading-has-content",
    "jsx-a11y/html-has-lang",
    "jsx-a11y/interactive-supports-focus",
    "jsx-a11y/label-has-associated-control",
    "jsx-a11y/no-noninteractive-element-interactions",
    "jsx-a11y/no-noninteractive-element-to-interactive-role",
    "jsx-a11y/no-noninteractive-tabindex",
    "jsx-a11y/no-redundant-roles",
    "jsx-a11y/no-static-element-interactions",
    "jsx-a11y/tabindex-no-positive",
  ];

  try {
    // Try running eslint with jsx-a11y on the files
    const ruleFlags = rules.map((r) => `"${r}":"error"`).join(",");
    const cmd = `npx --no-install eslint --no-eslintrc --plugin jsx-a11y --rule '{${ruleFlags}}' --format json ${files.map((f) => `"${f}"`).join(" ")}`;
    const result = execSync(cmd, { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] });
    return JSON.parse(result);
  } catch (e) {
    // eslint exits with code 1 when it finds violations — parse stdout
    if (e.stdout) {
      try {
        return JSON.parse(e.stdout);
      } catch {
        return null;
      }
    }
    return null;
  }
}

// ─── Reporter ───────────────────────────────────────────────────────────────

const SEVERITY_COLORS = {
  critical: "\x1b[31m", // red
  serious: "\x1b[33m",  // yellow
  moderate: "\x1b[36m", // cyan
};
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";

function formatViolation(v) {
  const color = SEVERITY_COLORS[v.severity] || "";
  return [
    `  ${DIM}${v.file}:${v.line}${RESET}`,
    `  ${color}${BOLD}${v.severity.toUpperCase()}${RESET} [${v.id}] ${v.message}`,
    `  ${DIM}Fix: ${v.fix}${RESET}`,
    `  ${DIM}WCAG: ${v.wcag}${RESET}`,
    "",
  ].join("\n");
}

function printSummary(violations, eslintIssues) {
  const total = violations.length + eslintIssues.length;
  const bySeverity = { critical: 0, serious: 0, moderate: 0 };

  for (const v of violations) bySeverity[v.severity]++;
  for (const e of eslintIssues) bySeverity["serious"]++; // ESLint issues are at least serious

  console.log(`\n${BOLD}━━━ Accessibility Check Results ━━━${RESET}\n`);

  if (total === 0) {
    console.log(`  ${BOLD}\x1b[32m✓ No accessibility violations found${RESET}\n`);
    return;
  }

  console.log(`  ${BOLD}${total} violation${total === 1 ? "" : "s"} found${RESET}\n`);

  // Pattern scanner violations
  if (violations.length > 0) {
    console.log(`${BOLD}Pattern Scanner (${violations.length}):${RESET}\n`);
    for (const v of violations) process.stdout.write(formatViolation(v));
  }

  // ESLint violations
  if (eslintIssues.length > 0) {
    console.log(`${BOLD}ESLint jsx-a11y (${eslintIssues.length}):${RESET}\n`);
    for (const issue of eslintIssues) {
      console.log(`  ${DIM}${issue.file}:${issue.line}:${issue.column}${RESET}`);
      console.log(`  ${SEVERITY_COLORS.serious}${BOLD}SERIOUS${RESET} [${issue.ruleId}] ${issue.message}\n`);
    }
  }

  // Summary line
  const parts = [];
  if (bySeverity.critical > 0) parts.push(`${SEVERITY_COLORS.critical}${bySeverity.critical} critical${RESET}`);
  if (bySeverity.serious > 0) parts.push(`${SEVERITY_COLORS.serious}${bySeverity.serious} serious${RESET}`);
  if (bySeverity.moderate > 0) parts.push(`${SEVERITY_COLORS.moderate}${bySeverity.moderate} moderate${RESET}`);
  console.log(`  ${parts.join(", ")}\n`);
}

// ─── Main ───────────────────────────────────────────────────────────────────

function main() {
  const files = process.argv.slice(2).filter((f) => !f.startsWith("-"));

  if (files.length === 0) {
    console.error("Usage: node a11y-check.js <file.tsx> [file2.tsx ...]");
    process.exit(2);
  }

  // Verify files exist
  for (const f of files) {
    if (!fs.existsSync(f)) {
      console.error(`File not found: ${f}`);
      process.exit(2);
    }
  }

  // 1. Pattern scanner (always runs)
  const allViolations = [];
  for (const f of files) {
    allViolations.push(...scanFile(f));
  }

  // 2. ESLint jsx-a11y (runs if available)
  let eslintIssues = [];
  const eslintResults = tryEslintJsxA11y(files);
  if (eslintResults) {
    for (const result of eslintResults) {
      for (const msg of result.messages || []) {
        if (msg.ruleId?.startsWith("jsx-a11y/")) {
          eslintIssues.push({
            file: result.filePath,
            line: msg.line,
            column: msg.column,
            ruleId: msg.ruleId,
            message: msg.message,
          });
        }
      }
    }
  } else {
    console.log(`${DIM}Note: ESLint jsx-a11y not available — running pattern scanner only.`);
    console.log(`Install for deeper checks: npm i -D eslint eslint-plugin-jsx-a11y${RESET}\n`);
  }

  // Deduplicate — if both scanners flag the same line, prefer eslint's more specific message
  const eslintLines = new Set(eslintIssues.map((e) => `${e.file}:${e.line}`));
  const deduped = allViolations.filter((v) => {
    // Keep pattern scanner results that eslint didn't also catch
    const key = `${v.file}:${v.line}`;
    // Some pattern checks overlap with eslint rules
    const overlapIds = ["div-onclick", "img-no-alt", "input-no-label"];
    if (overlapIds.includes(v.id) && eslintLines.has(key)) return false;
    return true;
  });

  printSummary(deduped, eslintIssues);

  // Exit code
  const total = deduped.length + eslintIssues.length;
  process.exit(total > 0 ? 1 : 0);
}

main();
