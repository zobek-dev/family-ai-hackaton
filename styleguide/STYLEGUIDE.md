# IdeaLens visual styleguide

Files included:

- `styleguide.html`: visual reference page with colors, type, icons and reusable UI patterns.
- `assets/idealens-tokens.css`: design tokens and base component classes.
- `assets/idealens-icons.svg`: SVG sprite with product icons.

## Quick integration

```html
<link rel="stylesheet" href="/assets/idealens-tokens.css" />

<button class="il-button il-button-primary">
  <svg class="il-icon" aria-hidden="true">
    <use href="/assets/idealens-icons.svg#il-spark"></use>
  </svg>
  Generate Workspace
</button>
```

## Icon names

- `il-lens`
- `il-spark`
- `il-target`
- `il-personas`
- `il-map`
- `il-experiment`
- `il-score`
- `il-tool`
- `il-activity`
- `il-warning`
- `il-check`
- `il-close`
- `il-plus`
- `il-refresh`
- `il-edit`
- `il-chevron-down`
- `il-rocket`

## Visual rules

- Use `--il-color-brand` for primary actions and selected states.
- Use success, warning and danger colors only for evidence, risk and validation state.
- Keep cards at `8px` radius.
- Prefer compact dashboard typography over large marketing sections.
- Use icons in buttons for agent tools, validation actions and navigation.
