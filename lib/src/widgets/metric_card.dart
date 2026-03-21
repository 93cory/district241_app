import 'package:flutter/material.dart';

import '../theme/pnpi_theme.dart';

class MetricCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;
  final String footnote;

  const MetricCard({
    super.key,
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
    this.footnote = '',
  });

  @override
  Widget build(BuildContext context) {
    final gradient = LinearGradient(
      colors: [
        colorWithOpacity(color, 0.35),
        colorWithOpacity(color, 0.05),
      ],
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
    );

    return Semantics(
      label: '$label: $value${footnote.isNotEmpty ? ', $footnote' : ''}',
      child: Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: gradient,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: colorWithOpacity(color, 0.35)),
        boxShadow: PnpiTheme.softShadows,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: LinearGradient(
                colors: [
                  colorWithOpacity(color, 0.95),
                  colorWithOpacity(color, 0.65),
                ],
              ),
            ),
            child: Icon(icon, color: Colors.white, size: 26),
          ),
          const SizedBox(height: 14),
          Text(
            label,
            style: Theme.of(
              context,
            ).textTheme.labelLarge?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
          ),
          const SizedBox(height: 6),
          Text(
            value,
            style: Theme.of(
              context,
            ).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
          ),
          if (footnote.isNotEmpty) ...[
            const SizedBox(height: 10),
            Text(
              footnote,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: colorWithOpacity(PnpiColors.slateDark, 0.7),
                ),
            ),
          ],
        ],
      ),
      ),
    );
  }
}
