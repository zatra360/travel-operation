# UI Checklist

Items every page, modal, form, and table must satisfy.

## Page layout

- [ ] Page title and subtitle via `PageHeader`.
- [ ] Primary action in the header (right-aligned on desktop).
- [ ] Toolbar below header (`TableToolbar` or `DataToolbar`).
- [ ] Empty state in body with CTA.
- [ ] Pagination at the bottom.
- [ ] No horizontal overflow at any viewport.

## Table

- [ ] Column headers explicit, sortable where it makes sense.
- [ ] Row actions in a `role="group"` cluster.
- [ ] Mobile fallback renders `mobileCard` (mobile + tablet).
- [ ] Sticky header on long lists.
- [ ] Density toggle (compact / comfortable) where useful.

## Form

- [ ] Every input has a label (`<Label htmlFor>` or `aria-label`).
- [ ] Validation messages inline below the field.
- [ ] Submit button disabled while submitting.
- [ ] Server errors surfaced as both inline banner and toast.
- [ ] Required fields marked with `aria-required` (not just
  `required`, which conflicts with custom validation).
- [ ] Cancel preserves no hidden state loss (autosave or
  warning).

## Loading

- [ ] Skeleton or spinner while loading.
- [ ] Optimistic update where it's safe.
- [ ] Visible debounce on search (250 ms default).

## Empty

- [ ] Friendly message + CTA.
- [ ] Distinguishes "no data" from "no results" (filtered).

## Error

- [ ] Inline banner at the form.
- [ ] Toast for transient errors.
- [ ] Error message is actionable (says what to do next).
- [ ] No `[object Object]` or array literals in error messages.

## Permission denied

- [ ] Clear copy: "You don't have permission to ...".
- [ ] Link to admin where the role can request access.

## Disabled module

- [ ] Card explaining why the module is unavailable.
- [ ] Link to admin to enable.

## Accessibility

- [ ] Every icon-only button has `aria-label`.
- [ ] Every decorative SVG has `aria-hidden="true"`.
- [ ] Modal traps focus; Esc closes.
- [ ] Tab order reaches every interactive element.
- [ ] `lang` attribute on the page.
- [ ] Colour contrast WCAG AA 4.5:1 body, 3:1 large text.
- [ ] No keyboard trap.

## Mobile

- [ ] Tested at 360, 390, 768, 1024, 1440.
- [ ] Tap targets ≥ 44 px.
- [ ] No reliance on hover for primary actions.
- [ ] Sticky table headers behave well on iOS Safari.

## Travel-agent usability

- [ ] Search by partial name, phone, email works in ≤ 2 keystrokes
  per filter.
- [ ] Status badges have tooltip on hover and label.
- [ ] Deadlines / TTLs visible at a glance.
- [ ] Next-action CTA obvious.
- [ ] Cross-record links open in same tab (or new tab with
  hint).
