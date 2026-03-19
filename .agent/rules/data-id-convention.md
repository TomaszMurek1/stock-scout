---
trigger: always_on
glob: frontend/src/**/*.tsx
description: Require data-id attributes on meaningful DOM elements in all frontend components
---

# `data-id` Attribute Convention

## Rule

When **creating or modifying** any `.tsx` file in the frontend, **always add `data-id` attributes** to meaningful DOM elements. This is a project-wide convention for improved DOM querying, testing, and debugging.

## Why `data-id` instead of `id`

- `id` must be globally unique per HTML spec — risk of silent conflicts.
- `data-*` attributes are designed for custom metadata with no uniqueness constraint.
- Queryable via `document.querySelector('[data-id="..."]')`.

## Naming Convention

Use **compact, kebab-case** names. Keep them short but descriptive.

| Category | Prefix / Pattern | Examples |
|----------|-----------------|----------|
| Pages | `*-page` | `home-page`, `admin-page`, `stock-page` |
| Sections | descriptive noun | `hero`, `summary`, `holdings`, `alerts` |
| Buttons | `btn-*` | `btn-signin`, `btn-buy`, `btn-cancel`, `btn-retry` |
| Modals | `modal-*` | `modal-ai`, `modal-add-stock`, `modal-add-alert` |
| Forms | `form-*` | `form-add-stock`, `form-trade`, `auth-form` |
| Tabs (main) | `tab-*` | `tab-portfolio`, `tab-perf` |
| Tabs (sub) | `stab-*` | `stab-holdings`, `stab-alerts` |
| Tab content | `sc-*` (sub-content) | `sc-holdings`, `sc-alerts` |
| Cards | `card-*` | `card-perf`, `card-capital` |
| Loading states | `*-skeleton` or `*-loading` | `brief-skeleton`, `perf-loading` |
| Empty states | `*-empty` | `holdings-empty`, `closed-empty` |
| Navigation | `nav-*` | `nav-home`, `nav-about`, `nav-admin` |
| Layout chrome | `app-*` | `app-header`, `app-footer` |
| Links | `link-*` | `link-privacy`, `link-portfolio` |
| Toggles | `toggle-*` | `toggle-buy`, `toggle-sell` |

## What Gets a `data-id`

**Always tag these elements:**

1. **Page-level containers** — the outermost `<div>` of every page/route component.
2. **Section containers** — major visual sections (cards, panels, table wrappers).
3. **Interactive elements** — buttons, links, toggles, tabs, form elements.
4. **Modals / Dialogs** — the `DialogContent` or modal wrapper.
5. **Forms** — the `<form>` element itself.
6. **State containers** — loading skeletons, empty states, error screens.
7. **Navigation elements** — nav links, menu triggers, dropdowns.

## What Does NOT Get a `data-id`

- Pure presentational wrappers (`<div className="flex ...">` with no semantic role).
- Individual list items in dynamic lists (e.g., rows in a `.map()`).
- SVG internal elements (`<linearGradient>`, `<path>`).
- HTML `id` attributes used for **label association** (`htmlFor`/`id` pairs on form inputs) — keep those as `id`.

## Syntax

```tsx
// ✅ Correct
<div data-id="holdings" className="shadow-sm">

// ✅ Correct — button
<Button data-id="btn-buy" onClick={handleBuy}>

// ✅ Correct — modal
<DialogContent data-id="modal-add-stock" className="...">

// ❌ Wrong — don't use id for custom identification
<div id="holdings" className="shadow-sm">

// ❌ Wrong — too verbose
<div data-id="portfolio-management-holdings-table-container">

// ✅ Exception — keep id for form label association
<Label htmlFor="ticker">Ticker</Label>
<Input id="ticker" ... />
```

## Existing `data-id` Reference

The codebase already has 120+ `data-id` attributes. Run this to see all of them:

```bash
grep -r 'data-id=' --include="*.tsx" frontend/src | sed 's/.*data-id="//' | sed 's/".*//' | sort -u
```

When adding new components, check existing names for consistency before introducing new ones.
