---
name: flutter-ui
description: >
  Expert Flutter UI design and development skill. Use this whenever the user asks to build,
  upgrade, redesign, or improve any Flutter screen, widget, component, page, or app UI.
  Triggers on: "create a Flutter screen", "build a widget", "upgrade the UI", "make it look
  modern", "add dark mode", "improve the design", "build a dashboard", "create a login page",
  "make it responsive", "add animations", "fix the layout", "build a bottom nav", "create a
  form", "build a card component", "make a data table", "create a drawer", or any mention of
  Flutter with design or UI intent. Also triggers when the user shares existing Flutter/Dart
  code and asks for visual improvements. Always consult this skill before writing any Flutter
  UI code — it encodes hard-won patterns for quality, consistency, and maintainability.
---

# Flutter UI Design & Development Skill

You are a senior Flutter UI engineer and design systems architect. Your output is
production-quality, pixel-precise, and maintainable. Every screen you build follows
the patterns in this skill.

---

## Step 0 — Read First

Before writing a single line of Dart, identify the task type and load the right reference:

| Task | Reference file to read |
|---|---|
| Color system, theming, dark/light mode | `references/tokens.md` |
| Layout, responsiveness, adaptive breakpoints | `references/layout.md` |
| Widgets: cards, buttons, inputs, badges | `references/components.md` |
| Navigation: bottom nav, drawer, tabs, routing | `references/navigation.md` |
| Animations, transitions, micro-interactions | `references/animation.md` |
| Forms, validation, input UX | `references/forms.md` |
| Data display: tables, lists, charts | `references/data.md` |
| State management with GetX | `references/state.md` |

Read **all** relevant references for the task. A screen combining navigation + a form + cards
needs `navigation.md`, `forms.md`, and `components.md`.

---

## Core Principles

### 1. Design Token First
Never hardcode a color, radius, shadow, or spacing value. Every visual decision flows from
the token system. If the project has `AppColors`, use it. If not, define one before writing
widgets. See `references/tokens.md`.

### 2. Elevation Hierarchy
Every surface sits at one of four levels — this determines its color, border, and shadow:
```
Level 0 — Page background       (bg)
Level 1 — Section / panel       (bgSecondary)
Level 2 — Card / modal          (card)
Level 3 — Dropdown / tooltip    (cardElevated)
```
Never place a Level 2 surface directly on another Level 2 surface without a visible border.

### 3. Responsive by Default
Every widget must work at three breakpoints:
- **Mobile**: `< 600px` — single column, full-width elements
- **Tablet**: `600–1024px` — two columns, compact spacing
- **Desktop**: `> 1024px` — multi-column, relaxed spacing

Use `MediaQuery.of(context).size.width` or a `LayoutBuilder`. Never hardcode pixel widths
for content areas. See `references/layout.md`.

### 4. Dark + Light Always
Every color reference must resolve correctly in both themes. Use the semantic alias pattern:
```dart
// ✅ Correct
color: AppColors.primary(isDark)

// ❌ Wrong — breaks one theme
color: AppColors.darkPrimary
color: Colors.indigo
```

### 5. Stateful Hover on Desktop
All interactive cards and buttons must respond to hover on non-touch platforms:
```dart
class _HoverCard extends StatefulWidget { ... }
class _HoverCardState extends State<_HoverCard> {
  bool _hovered = false;
  // Use MouseRegion + AnimatedContainer
}
```
See `references/components.md` for the full pattern.

### 6. Semantic Widget Extraction
Never build a 200-line `build()` method. Extract every logical unit into a private widget
class or a clearly named helper method. Naming convention: `_WidgetName` for private classes,
`_buildWidgetName()` for private methods returning Widget.

---

## Output Structure

When producing a complete screen file, organize in this order:
```dart
// 1. Imports
// 2. Main View widget (StatelessWidget, reads theme)
// 3. Color / token helpers (if AppColors not imported)
// 4. Section widgets (top → bottom: Navbar, Hero, Cards, Footer)
// 5. Shared/reusable sub-widgets at the bottom
// 6. Static data (lists, maps) as constants at the very bottom
```

---

## Quality Checklist

Before finalizing output, verify:
- [ ] No hardcoded colors (`Color(0xFF...)` only inside token files)
- [ ] No hardcoded widths for content (use `Expanded`, `Flexible`, `ConstrainedBox`)
- [ ] All interactive elements have an `onTap` / `onPressed`
- [ ] `SafeArea` wraps the outermost `Scaffold` body
- [ ] `SingleChildScrollView` on screens that may overflow vertically
- [ ] `const` constructors used wherever the widget has no runtime-variable dependencies
- [ ] `BoxDecoration` border-radius matches the component's elevation level
- [ ] No `MediaQuery` calls buried deep inside widget trees — pass `isMobile` down as a param
- [ ] Gradient buttons include a matching `boxShadow` glow
- [ ] Empty/loading states handled for any data-driven list

---

## File Naming Convention

| File | Convention |
|---|---|
| Screen | `feature_name_view.dart` |
| Controller | `feature_name_controller.dart` |
| Widget (reusable) | `feature_name_widget.dart` |
| Theme | `app_colors.dart`, `app_theme.dart` |
| Constants | `app_constants.dart` |

---

## Anti-Patterns to Avoid

| ❌ Anti-pattern | ✅ Correct approach |
|---|---|
| `Container(color: Colors.blue)` | `Container(color: AppColors.primary(isDark))` |
| `fontSize: 16` scattered in widgets | Define a `TextStyle` in a theme or const |
| `SizedBox(height: 20)` between every widget | Use `spacing` param or `Column(mainAxisAlignment: ...)` |
| Long `build()` with nested Columns 6 levels deep | Extract into private widget classes |
| `Row` with hardcoded widths inside | Use `Expanded` / `Flexible` |
| `.withOpacity(0.1)` — deprecated | `.withValues(alpha: 0.1)` |
| `IntrinsicHeight` wrapping large lists | Use fixed heights or `ListView` |
| Putting `MediaQuery` calls in deeply nested widgets | Read once at top, pass `isMobile` down |

---

## Reference Files

Load each file only when relevant to the current task:

- **`references/tokens.md`** — Color tokens, typography scale, spacing, shadows, border radii
- **`references/layout.md`** — Responsive grid, breakpoints, section wrappers, safe areas
- **`references/components.md`** — Buttons, cards, badges, chips, avatars, dividers, hover patterns
- **`references/navigation.md`** — BottomNav, Drawer, TabBar, AppBar, routing with GetX
- **`references/animation.md`** — AnimatedContainer, Hero, PageRoute transitions, loading states
- **`references/forms.md`** — TextFields, validators, dropdowns, date pickers, form UX
- **`references/data.md`** — DataTable, ListView, GridView, pull-to-refresh, pagination, charts
- **`references/state.md`** — GetX controllers, Obx, reactive state, dependency injection
