# Flutter UI — Layout & Responsiveness Reference

## Breakpoint System

```dart
class AppBreakpoints {
  AppBreakpoints._();
  static const double mobile  = 600;   // < 600: mobile (single column)
  static const double tablet  = 1024;  // 600–1024: tablet (2 columns)
  static const double desktop = 1200;  // > 1024: desktop (3+ columns)
  static const double wide    = 1440;  // > 1440: wide desktop (full layout)
}
```

### Reading breakpoints — read ONCE at the top, pass down

```dart
@override
Widget build(BuildContext context) {
  final w = MediaQuery.of(context).size.width;
  final isMobile  = w < AppBreakpoints.mobile;
  final isTablet  = w >= AppBreakpoints.mobile && w < AppBreakpoints.desktop;
  final isDesktop = w >= AppBreakpoints.desktop;

  return Scaffold(
    body: SafeArea(
      child: SingleChildScrollView(
        child: Column(
          children: [
            _Navbar(isDark: isDark, isMobile: isMobile),
            _HeroSection(isDark: isDark, isMobile: isMobile, isTablet: isTablet),
          ],
        ),
      ),
    ),
  );
}
```

Never call `MediaQuery.of(context)` deeper than two widget levels. Pass `isMobile` / `isTablet`
as constructor parameters.

---

## Column Grid System

### 1-Column (mobile)
```dart
Column(
  children: items.map((item) => _ItemCard(item: item, isDark: isDark)).toList(),
)
```

### 2-Column (tablet)
```dart
Row(
  children: [
    Expanded(child: _LeftPanel(isDark: isDark)),
    const SizedBox(width: 16),
    Expanded(child: _RightPanel(isDark: isDark)),
  ],
)
```

### Adaptive Wrap Grid (auto-wraps at any size)
```dart
// Best for cards, feature tiles, industry chips, etc.
LayoutBuilder(
  builder: (context, constraints) {
    final w = constraints.maxWidth;
    final colCount = w < 600 ? 1 : (w < 900 ? 2 : (w < 1200 ? 3 : 4));
    final itemWidth = (w - (colCount - 1) * 16) / colCount;

    return Wrap(
      spacing: 16,
      runSpacing: 16,
      children: items
          .map((item) => SizedBox(width: itemWidth, child: _ItemCard(item: item)))
          .toList(),
    );
  },
)
```

### Sidebar + Content Layout (dashboard pattern)
```dart
Row(
  crossAxisAlignment: CrossAxisAlignment.start,
  children: [
    if (!isMobile) _Sidebar(isDark: isDark, width: 240),
    Expanded(
      child: _MainContent(isDark: isDark),
    ),
  ],
)
```

---

## Section Wrapper Pattern

Every page section uses this wrapper for consistent spacing and max-width constraints:

```dart
Widget _buildSection({
  required bool isDark,
  required Widget child,
  Color? backgroundColor,
  EdgeInsets? padding,
  bool constrain = true,
}) {
  final content = constrain
      ? Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 1200),
            child: child,
          ),
        )
      : child;

  return Container(
    width: double.infinity,
    padding: padding ?? const EdgeInsets.symmetric(vertical: 64, horizontal: 24),
    color: backgroundColor,
    child: content,
  );
}
```

---

## Responsive Layout: Mobile-Stacked vs Desktop Side-by-Side

```dart
Widget _buildHeroLayout(BuildContext context, bool isMobile) {
  final content = _HeroContent(isDark: isDark, isMobile: isMobile);
  final visual  = _HeroVisual(isDark: isDark, isMobile: isMobile);

  if (isMobile) {
    return Column(
      children: [content, const SizedBox(height: 40), visual],
    );
  }

  return Row(
    crossAxisAlignment: CrossAxisAlignment.center,
    children: [
      Expanded(flex: 5, child: content),
      const SizedBox(width: 64),
      Expanded(flex: 6, child: visual),
    ],
  );
}
```

---

## Scrolling Patterns

### Vertical page scroll (standard)
```dart
body: SafeArea(
  child: SingleChildScrollView(
    physics: const BouncingScrollPhysics(),
    child: Column(children: [...]),
  ),
)
```

### Horizontal scroll (workflow steps, chips, tabs)
```dart
SingleChildScrollView(
  scrollDirection: Axis.horizontal,
  physics: const BouncingScrollPhysics(),
  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
  child: Row(children: steps),
)
```

### List inside a fixed-height container (dashboard panels)
```dart
Container(
  height: 320,
  child: ListView.separated(
    itemCount: items.length,
    separatorBuilder: (_, __) => Divider(color: AppColors.borderSubtle(isDark), height: 1),
    itemBuilder: (context, index) => _ListItem(item: items[index], isDark: isDark),
  ),
)
```

### Pull-to-refresh
```dart
RefreshIndicator(
  color: AppColors.primary(isDark),
  backgroundColor: AppColors.card(isDark),
  onRefresh: () => controller.fetchData(),
  child: ListView.builder(...),
)
```

---

## Safe Area & Scaffold Patterns

### Standard screen
```dart
Scaffold(
  backgroundColor: AppColors.bg(isDark),
  body: SafeArea(
    child: Column(
      children: [
        _CustomAppBar(isDark: isDark),
        Expanded(child: _BodyContent(isDark: isDark)),
      ],
    ),
  ),
)
```

### Screen with bottom nav
```dart
Scaffold(
  backgroundColor: AppColors.bg(isDark),
  body: SafeArea(child: _PageContent(isDark: isDark)),
  bottomNavigationBar: _BottomNav(isDark: isDark),  // See navigation.md
)
```

### Modal bottom sheet
```dart
showModalBottomSheet(
  context: context,
  backgroundColor: AppColors.card(isDark),
  shape: const RoundedRectangleBorder(
    borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
  ),
  isScrollControlled: true,   // Allows full-height sheets
  builder: (context) => DraggableScrollableSheet(
    initialChildSize: 0.6,
    minChildSize: 0.4,
    maxChildSize: 0.92,
    expand: false,
    builder: (_, scrollController) => _SheetContent(controller: scrollController),
  ),
);
```

---

## Overlay & Padding for Keyboards

On forms and inputs, always account for keyboard intrusion:

```dart
// Wrap forms in this to avoid keyboard overflow
Padding(
  padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
  child: _FormContent(isDark: isDark),
)
```

---

## ConstrainedBox Widths by Context

| Context | maxWidth |
|---|---|
| Landing page sections | 1200 |
| Dashboard content area | 1400 |
| Auth screens (login, register) | 440 |
| Modal dialogs | 560 |
| Confirmation dialogs | 380 |
| Alert banners | full-width |
