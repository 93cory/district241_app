import 'package:flutter/material.dart';

import '../theme/pnpi_theme.dart';

const String _logoAssetPath = 'assets/images/pnpi_logo.png';

class PnpiLogoMark extends StatelessWidget {
  final double size;
  final bool showCaption;

  const PnpiLogoMark({
    super.key,
    this.size = 92,
    this.showCaption = false,
  });

  @override
  Widget build(BuildContext context) {
    final logo = ClipRRect(
      borderRadius: BorderRadius.circular(size * 0.25),
      child: Image.asset(
        _logoAssetPath,
        width: size,
        height: size,
        fit: BoxFit.cover,
        errorBuilder: (context, error, stackTrace) => _FallbackLogo(size: size),
      ),
    );

    if (!showCaption) return logo;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        logo,
        const SizedBox(height: 10),
        const Text(
          'PNPI',
          style: TextStyle(
            color: Colors.white,
            fontSize: 28,
            fontWeight: FontWeight.w800,
            letterSpacing: 1.4,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          'Systeme Intelligent Gabonais',
          style: TextStyle(
            color: colorWithOpacity(Colors.white, 0.88),
            fontSize: 12,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }
}

class PnpiFlagRibbon extends StatelessWidget {
  final double height;

  const PnpiFlagRibbon({
    super.key,
    this.height = 8,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: height,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(height),
        gradient: const LinearGradient(
          colors: [
            Color(0xFF009E60),
            Color(0xFFFCD116),
            Color(0xFF003DA5),
          ],
        ),
      ),
    );
  }
}

class _FallbackLogo extends StatelessWidget {
  final double size;

  const _FallbackLogo({required this.size});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(size * 0.25),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Color(0xFF009E60),
            Color(0xFFFCD116),
            Color(0xFF003DA5),
          ],
        ),
        boxShadow: const [
          BoxShadow(
            color: Color(0x33000000),
            blurRadius: 18,
            offset: Offset(0, 10),
          ),
        ],
      ),
      child: Center(
        child: Text(
          'SG',
          style: TextStyle(
            color: Colors.white,
            fontSize: size * 0.32,
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
    );
  }
}
