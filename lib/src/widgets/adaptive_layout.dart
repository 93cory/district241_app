import 'package:flutter/material.dart';

/// Breakpoint for tablet (768 logical pixels)
const double kTabletBreakpoint = 768.0;

/// Wraps content in a responsive layout.
/// On phones: shows [child] only.
/// On tablets: shows [sidePanel] on the left and [child] on the right.
class AdaptiveLayout extends StatelessWidget {
  final Widget child;
  final Widget? sidePanel;
  final double sidePanelWidth;

  const AdaptiveLayout({
    super.key,
    required this.child,
    this.sidePanel,
    this.sidePanelWidth = 320,
  });

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isTablet = constraints.maxWidth >= kTabletBreakpoint;

        if (isTablet && sidePanel != null) {
          return Row(
            children: [
              SizedBox(
                width: sidePanelWidth,
                child: sidePanel!,
              ),
              const VerticalDivider(width: 1, thickness: 1),
              Expanded(child: child),
            ],
          );
        }

        return child;
      },
    );
  }
}

/// A responsive grid that adjusts columns based on screen width.
class ResponsiveGrid extends StatelessWidget {
  final List<Widget> children;
  final double minChildWidth;
  final double spacing;
  final double runSpacing;

  const ResponsiveGrid({
    super.key,
    required this.children,
    this.minChildWidth = 160,
    this.spacing = 12,
    this.runSpacing = 12,
  });

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final columns = (constraints.maxWidth / (minChildWidth + spacing)).floor().clamp(1, 4);
        return Wrap(
          spacing: spacing,
          runSpacing: runSpacing,
          children: children.map((child) {
            final width = (constraints.maxWidth - (columns - 1) * spacing) / columns;
            return SizedBox(width: width, child: child);
          }).toList(),
        );
      },
    );
  }
}
