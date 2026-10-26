# Flutter UI — Design Tokens Reference

## Color System

### Token Architecture

The project uses a two-layer token system:

**Layer 1 — Raw values** (`AppColors.darkPrimary`, `AppColors.lightPrimary`)
Only referenced inside `AppColors` itself and `AppTheme`. Never use raw tokens in widget code.

**Layer 2 — Semantic aliases** (`AppColors.primary(isDark)`)
The only layer widgets should ever call. Resolves correctly for both themes automatically.

### Full Semantic Alias Map

```dart
// Surfaces (elevation order: bg → bgSecondary → card → cardElevated)
AppColors.bg(isDark)              // Page background
AppColors.bgSecondary(isDark)     // Sections, alternate panels
AppColors.card(isDark)            // Cards, modals, sidebars
AppColors.cardElevated(isDark)    // Dropdowns, tooltips, popovers
AppColors.glass(isDark)           // Nav / overlay — use with .withValues(alpha: 0.85)

// Accents
AppColors.primary(isDark)         // Primary CTA, logo, active states
AppColors.primaryVariant(isDark)  // Pressed/hover shade of primary
AppColors.primaryMuted(isDark)    // 8–10% opacity fill for chips, icon bg

AppColors.secondary(isDark)       // Secondary action, info accent
AppColors.secondaryMuted(isDark)

AppColors.gold(isDark)            // Warning, pending, highlight
AppColors.goldMuted(isDark)

AppColors.success(isDark)         // Positive, approved, active
AppColors.successMuted(isDark)

AppColors.danger(isDark)          // Error, rejected, destructive action
AppColors.dangerMuted(isDark)

// Text (use in this priority order)
AppColors.textPrimary(isDark)     // Headings, labels, key values
AppColors.textSecondary(isDark)   // Body text, descriptions
AppColors.textMuted(isDark)       // Captions, placeholders, helper text
AppColors.textDisabled(isDark)    // Disabled controls
AppColors.textOnPrimary(isDark)   // Text/icons on colored surfaces (always white)

// Borders
AppColors.border(isDark)          // Default divider / card outline
AppColors.borderAccent(isDark)    // Focus ring, active/selected card
AppColors.borderSubtle(isDark)    // Between list items

// Shadows
AppColors.shadowPrimary(isDark)   // Glow under gradient buttons (40% primary)
AppColors.shadowCard(isDark)      // Resting card shadow (3–4% black)

// Gradients (return List<Color>)
AppColors.gradientPrimary(isDark) // Indigo → Violet — buttons, logo
AppColors.gradientCyan(isDark)    // Cyan → Sky — secondary elements
AppColors.gradientHero(isDark)    // 3-stop page hero background

// Role colors (portal-specific identity)
AppColors.roleAdmin(isDark)       // Super Admin — primary/indigo
AppColors.roleCompany(isDark)     // Company — secondary/cyan
AppColors.roleBranch(isDark)      // Branch — gold/amber
AppColors.roleUser(isDark)        // User — success/emerald

// Status colors (for transaction states, badges, table rows)
AppColors.statusPositive(isDark)  // ✓ approved, paid, active
AppColors.statusWarning(isDark)   // ⏳ pending, review
AppColors.statusError(isDark)     // ✗ rejected, overdue, failed
AppColors.statusInfo(isDark)      // ℹ in-progress, informational
```

---

## Typography Scale

Define once in `AppTheme` or use as named `TextStyle` constants. Never set `fontSize`
ad-hoc in widget code.

```dart
// app_text_styles.dart
class AppText {
  AppText._();

  // Display — Hero headlines, landing page titles
  static TextStyle display(bool isDark) => TextStyle(
    fontSize: 48, fontWeight: FontWeight.w900,
    fontFamily: AppConstants.fontFamilyAlt,
    color: AppColors.textPrimary(isDark),
    letterSpacing: -1.5, height: 1.08,
  );

  // H1 — Screen titles, section headers
  static TextStyle h1(bool isDark) => TextStyle(
    fontSize: 32, fontWeight: FontWeight.w800,
    fontFamily: AppConstants.fontFamilyAlt,
    color: AppColors.textPrimary(isDark),
    letterSpacing: -0.8, height: 1.15,
  );

  // H2 — Card titles, modal headers
  static TextStyle h2(bool isDark) => TextStyle(
    fontSize: 22, fontWeight: FontWeight.w700,
    color: AppColors.textPrimary(isDark),
    letterSpacing: -0.3, height: 1.2,
  );

  // H3 — Section labels, group headers
  static TextStyle h3(bool isDark) => TextStyle(
    fontSize: 17, fontWeight: FontWeight.w700,
    color: AppColors.textPrimary(isDark),
  );

  // Body — Main content text
  static TextStyle body(bool isDark) => TextStyle(
    fontSize: 15, fontWeight: FontWeight.w400,
    color: AppColors.textSecondary(isDark),
    height: 1.6,
  );

  // BodySmall — Secondary descriptions
  static TextStyle bodySmall(bool isDark) => TextStyle(
    fontSize: 13, fontWeight: FontWeight.w400,
    color: AppColors.textSecondary(isDark),
    height: 1.5,
  );

  // Caption — Timestamps, hints, table captions
  static TextStyle caption(bool isDark) => TextStyle(
    fontSize: 11, fontWeight: FontWeight.w500,
    color: AppColors.textMuted(isDark),
    letterSpacing: 0.3,
  );

  // Label — Badges, tags, navigation items
  static TextStyle label(bool isDark) => TextStyle(
    fontSize: 12, fontWeight: FontWeight.w700,
    color: AppColors.textPrimary(isDark),
    letterSpacing: 0.8,
  );

  // Eyebrow — Section eyebrows (ALL CAPS badge text)
  static TextStyle eyebrow(bool isDark) => TextStyle(
    fontSize: 11, fontWeight: FontWeight.w700,
    color: AppColors.primary(isDark),
    letterSpacing: 1.5,
  );

  // Mono — Code, IDs, reference numbers
  static TextStyle mono(bool isDark) => TextStyle(
    fontSize: 13, fontWeight: FontWeight.w500,
    fontFamily: 'monospace',
    color: AppColors.secondary(isDark),
  );
}
```

---

## Spacing Scale

Use these values for all padding, margin, and gap decisions:

```dart
class AppSpacing {
  AppSpacing._();
  static const double xs  = 4;
  static const double sm  = 8;
  static const double md  = 12;
  static const double lg  = 16;
  static const double xl  = 20;
  static const double xl2 = 24;
  static const double xl3 = 32;
  static const double xl4 = 40;
  static const double xl5 = 48;
  static const double xl6 = 64;
  static const double xl7 = 80;
}
```

Standard section vertical padding: `xl5` (48) on desktop, `xl3` (32) on mobile.
Standard horizontal gutter: `xl2` (24) on all sizes.
Standard card internal padding: `xl` (20) to `xl2` (24).
Standard gap between cards in a grid: `lg` (16).

---

## Border Radius Scale

```dart
class AppRadius {
  AppRadius._();
  static const double sm  = 6;   // Chips, small badges
  static const double md  = 10;  // Buttons, small cards
  static const double lg  = 14;  // Standard cards
  static const double xl  = 18;  // Large cards, modals
  static const double xl2 = 24;  // Hero containers, banners
  static const double full = 999; // Pills, avatars, circular icons
}
```

Match radius to elevation: higher elevation → larger radius.
```
bg containers:        0 (no radius)
Section panels:       AppRadius.lg (14)
Cards:                AppRadius.lg (14) – AppRadius.xl (18)
Modals / bottom sheet: AppRadius.xl (18) – AppRadius.xl2 (24)
Buttons:              AppRadius.md (10) – AppRadius.lg (14)
Inputs:               AppRadius.md (10)
Chips / badges:       AppRadius.sm (6) – AppRadius.full (999)
```

---

## Shadow Patterns

```dart
// Card resting shadow — subtle depth
List<BoxShadow> cardShadow(bool isDark) => [
  BoxShadow(
    color: AppColors.shadowCard(isDark),
    blurRadius: 8,
    offset: const Offset(0, 2),
  ),
];

// Card hover shadow — elevated on interaction
List<BoxShadow> cardHoverShadow(bool isDark, Color accentColor) => [
  BoxShadow(
    color: accentColor.withValues(alpha: 0.18),
    blurRadius: 20,
    offset: const Offset(0, 6),
  ),
];

// Gradient button glow shadow
List<BoxShadow> buttonGlowShadow(bool isDark) => [
  BoxShadow(
    color: AppColors.shadowPrimary(isDark),
    blurRadius: 16,
    offset: const Offset(0, 6),
  ),
];

// Modal / bottom sheet shadow
List<BoxShadow> modalShadow(bool isDark) => [
  BoxShadow(
    color: Colors.black.withValues(alpha: 0.4),
    blurRadius: 40,
    offset: const Offset(0, -8),
  ),
];
```

---

## AppTheme Setup

```dart
// app_theme.dart
class AppTheme {
  static ThemeData dark() => ThemeData(
    brightness: Brightness.dark,
    scaffoldBackgroundColor: AppColors.darkBg,
    colorScheme: ColorScheme.dark(
      primary: AppColors.darkPrimary,
      secondary: AppColors.darkSecondary,
      surface: AppColors.darkCard,
      error: AppColors.darkDanger,
    ),
    cardColor: AppColors.darkCard,
    dividerColor: AppColors.darkBorder,
    fontFamily: AppConstants.fontFamily,
    textTheme: _buildTextTheme(Brightness.dark),
  );

  static ThemeData light() => ThemeData(
    brightness: Brightness.light,
    scaffoldBackgroundColor: AppColors.lightBg,
    colorScheme: ColorScheme.light(
      primary: AppColors.lightPrimary,
      secondary: AppColors.lightSecondary,
      surface: AppColors.lightCard,
      error: AppColors.lightDanger,
    ),
    cardColor: AppColors.lightCard,
    dividerColor: AppColors.lightBorder,
    fontFamily: AppConstants.fontFamily,
    textTheme: _buildTextTheme(Brightness.light),
  );

  static TextTheme _buildTextTheme(Brightness brightness) {
    final isDark = brightness == Brightness.dark;
    return TextTheme(
      displayLarge: AppText.display(isDark),
      headlineLarge: AppText.h1(isDark),
      headlineMedium: AppText.h2(isDark),
      headlineSmall: AppText.h3(isDark),
      bodyLarge: AppText.body(isDark),
      bodyMedium: AppText.bodySmall(isDark),
      labelSmall: AppText.caption(isDark),
    );
  }
}
```
