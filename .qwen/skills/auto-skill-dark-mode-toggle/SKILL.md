---
name: dark-mode-toggle
description: Add dark mode support with a toggle button in the Angular shell component
source: auto-skill
extracted_at: '2026-06-20T20:58:52.922Z'
---

## Overview
Implemented a reusable dark‑mode feature for the **Anka Sphere** Angular application.

## Steps
1. **Create a ThemeService** (`src/app/services/theme.service.ts`)
   - Stores dark‑mode state in a signal.
   - Persists the choice in `localStorage`.
   - Provides `isDark()` signal, `toggle()` method, and applies/removes a `dark` class on `document.body`.
2. **Inject ThemeService into Shell component** (`src/app/layout/shell/shell.ts`)
   - Added import and `private themeService = inject(ThemeService);` after the class declaration.
3. **Add a toggle button to the top‑bar**
   - Inserted a button next to the notification bell that calls `themeService.toggle()`.
   - Displays a sun/moon icon depending on the current theme.
4. **Define dark theme CSS variables** in `src/styles.scss`
   - Added a `.dark { … }` block that overrides all color variables for dark mode.
5. **Optional UI polish** – added a transition for smoother colour changes (can be added later).

## Rationale
- Centralizes theme logic in a service, making it easy to reuse elsewhere.
- Persists user preference across sessions.
- Uses CSS custom properties so existing component styles automatically adapt.
- Minimal UI impact – a single button in the top‑bar provides an intuitive switch.

## Verification
- The toggle persists after page reloads.
- All components that rely on `var(--color-*)` automatically switch colours.
- No other functionality was altered.

## Applicable Scenarios
Use this pattern whenever an Angular project needs a simple, globally‑applied dark‑mode toggle without adding a heavyweight theming library.
