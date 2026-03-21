import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../models/industrial_unit.dart';
import '../models/map_site.dart';
import '../theme/pnpi_theme.dart';

/// Panel cartographique permettant de visualiser les sites par secteur/province.
class SiteMapPanel extends StatefulWidget {
  const SiteMapPanel({super.key, required this.sites});

  final List<MapSite> sites;

  @override
  State<SiteMapPanel> createState() => _SiteMapPanelState();
}

class _SiteMapPanelState extends State<SiteMapPanel> {
  String? _activeSector;
  String? _activeProvince;
  MapSite? _highlightedSite;

  List<MapSite> get _filteredSites {
    var current = widget.sites;
    if (_activeSector != null) {
      current = current.where((site) => site.sector == _activeSector).toList();
    }
    if (_activeProvince != null) {
      current = current.where((site) => site.province == _activeProvince).toList();
    }
    return current;
  }

  List<String> get _sectors =>
      widget.sites.map((site) => site.sector).toSet().toList()..sort();

  List<String> get _provinces =>
      widget.sites.map((site) => site.province).toSet().toList()..sort();

  void _toggleSector(String sector) {
    setState(() {
      _activeSector = _activeSector == sector ? null : sector;
    });
  }

  void _toggleProvince(String province) {
    setState(() {
      _activeProvince = _activeProvince == province ? null : province;
    });
  }

  void _selectSite(MapSite site) {
    setState(() => _highlightedSite = site);
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 360,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        boxShadow: PnpiTheme.softShadows,
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: const [
              Icon(Icons.map_outlined, color: PnpiColors.deepSpace),
              SizedBox(width: 8),
              Text(
                'Carte des sites validés',
                style: TextStyle(fontWeight: FontWeight.w700),
              ),
              Spacer(),
              Text(
                'Gabon',
                style: TextStyle(color: Colors.black54),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Expanded(
            child: Row(
              children: [
                Expanded(flex: 3, child: _buildMapArea()),
                const SizedBox(width: 12),
                Expanded(flex: 2, child: _buildSidePanel()),
              ],
            ),
          ),
          if (_highlightedSite != null)
            Padding(
              padding: const EdgeInsets.only(top: 12),
              child: _buildHighlightedInfo(_highlightedSite!),
            ),
        ],
      ),
    );
  }

  Widget _buildMapArea() {
    return ClipRRect(
      borderRadius: BorderRadius.circular(18),
      child: AspectRatio(
        aspectRatio: 3 / 4,
        child: Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [
                PnpiColors.deepSpace,
                PnpiColors.oceanPulse,
              ],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
          child: Stack(
            children: [
              Positioned.fill(
                child: CustomPaint(
                  painter: _GabonMapPainter(),
                ),
              ),
              Positioned.fill(
                child: LayoutBuilder(
                  builder: (context, constraints) {
                    final displayed = _filteredSites;
                    if (displayed.isEmpty) {
                      return Center(
                        child: Text(
                          'Aucun site trouvé pour ces filtres',
                          style: TextStyle(
                            color: Colors.white70,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      );
                    }
                    return Stack(
                      children: displayed
                          .map(
                            (site) => _buildMarker(site, constraints.maxWidth, constraints.maxHeight),
                          )
                          .toList(),
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMarker(MapSite site, double width, double height) {
    const double markerSize = 26;
    final left = (site.position.dx.clamp(0.08, 0.92) * width) - markerSize / 2;
    final top = (site.position.dy.clamp(0.12, 0.88) * height) - markerSize / 2;
    final isActive = site.status == UnitStatus.active;
    final isHighlighted = _highlightedSite?.id == site.id;

    return Positioned(
      left: math.max(4, math.min(left, width - markerSize - 4)),
      top: math.max(4, math.min(top, height - markerSize - 4)),
      child: GestureDetector(
        onTap: () => _selectSite(site),
        child: AnimatedScale(
          scale: isHighlighted ? 1.2 : 1,
          duration: const Duration(milliseconds: 220),
          child: Tooltip(
            message: '${site.name} · ${site.statusLabel}',
            child: Container(
              width: markerSize,
              height: markerSize,
              decoration: BoxDecoration(
                color: isActive ? Colors.greenAccent : Colors.redAccent,
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white, width: 2),
                boxShadow: PnpiTheme.softShadows,
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSidePanel() {
    final filtered = _filteredSites;
    final activeCount =
        filtered.where((site) => site.status == UnitStatus.active).length;
    final inactiveCount = filtered.length - activeCount;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Secteurs en cartes', style: TextStyle(fontWeight: FontWeight.w600)),
        const SizedBox(height: 8),
        Wrap(
          spacing: 6,
          runSpacing: 4,
          children: _sectors.map((sector) {
            final selected = _activeSector == sector;
            return Semantics(
              label: 'Filtre secteur $sector${selected ? ', sélectionné' : ''}',
              child: FilterChip(
                label: Text(sector),
                selected: selected,
                onSelected: (_) => _toggleSector(sector),
                backgroundColor: Colors.grey.shade100,
                selectedColor: colorWithOpacity(PnpiColors.lagoon, 0.2),
              ),
            );
          }).toList(),
        ),
        const SizedBox(height: 12),
        const Text('Provinces focus', style: TextStyle(fontWeight: FontWeight.w600)),
        const SizedBox(height: 8),
        Wrap(
          spacing: 6,
          runSpacing: 4,
          children: _provinces.map((province) {
            final isSelected = _activeProvince == province;
            return Semantics(
              label: 'Filtre province $province${isSelected ? ', sélectionné' : ''}',
              child: ChoiceChip(
                label: Text(province),
                selected: isSelected,
                onSelected: (_) => _toggleProvince(province),
                selectedColor: colorWithOpacity(PnpiColors.oceanPulse, 0.3),
                backgroundColor: Colors.grey.shade100,
              ),
            );
          }).toList(),
        ),
        const SizedBox(height: 12),
        const Divider(),
        const SizedBox(height: 8),
        Row(
          children: [
            _StatusBadge(color: Colors.greenAccent, label: 'Actifs'),
            const SizedBox(width: 6),
            Text('$activeCount', style: const TextStyle(fontWeight: FontWeight.w700)),
            const SizedBox(width: 12),
            _StatusBadge(color: Colors.redAccent, label: 'Inactifs'),
            const SizedBox(width: 6),
            Text('$inactiveCount', style: const TextStyle(fontWeight: FontWeight.w700)),
          ],
        ),
        const SizedBox(height: 10),
        const Text('Sites visibles', style: TextStyle(fontWeight: FontWeight.w600)),
        const SizedBox(height: 6),
        Expanded(
          child: ListView.builder(
            itemCount: filtered.length,
            itemBuilder: (context, index) {
              final site = filtered[index];
              final isHighlighted = _highlightedSite?.id == site.id;
              return ListTile(
                dense: true,
                leading: Icon(
                  site.status == UnitStatus.active ? Icons.check_circle : Icons.pause_circle,
                  color: site.status == UnitStatus.active ? Colors.green : Colors.redAccent,
                ),
                title: Text(site.name, style: const TextStyle(fontWeight: FontWeight.w600)),
                subtitle: Text('${site.province} • ${site.sector}'),
                trailing: isHighlighted ? const Icon(Icons.location_pin, color: Colors.black54) : null,
                onTap: () => _selectSite(site),
                selected: isHighlighted,
              );
            },
          ),
        ),
        const SizedBox(height: 6),
        Align(
          alignment: Alignment.centerRight,
          child: TextButton(
            onPressed: () {
              setState(() {
                _activeSector = null;
                _activeProvince = null;
              });
            },
            child: const Text('Réinitialiser les filtres'),
          ),
        ),
      ],
    );
  }

  Widget _buildHighlightedInfo(MapSite site) {
    final accent = site.status == UnitStatus.active ? PnpiColors.lagoon : PnpiColors.oceanPulse;
        return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 14),
      decoration: BoxDecoration(
        color: colorWithOpacity(accent, 0.18),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Text(
        '${site.name} · ${site.sector} · ${site.province} · ${site.statusLabel}',
        style: const TextStyle(fontWeight: FontWeight.w600),
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  const _StatusBadge({required this.color, required this.label});

  final Color color;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: colorWithOpacity(color, 0.25),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        label,
        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
      ),
    );
  }
}

class _GabonMapPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final gabonPoints = [
      Offset(0.08, 0.28),
      Offset(0.15, 0.15),
      Offset(0.24, 0.08),
      Offset(0.4, 0.05),
      Offset(0.55, 0.08),
      Offset(0.7, 0.18),
      Offset(0.78, 0.3),
      Offset(0.82, 0.45),
      Offset(0.84, 0.6),
      Offset(0.8, 0.72),
      Offset(0.7, 0.82),
      Offset(0.57, 0.92),
      Offset(0.4, 0.9),
      Offset(0.25, 0.8),
      Offset(0.14, 0.63),
      Offset(0.1, 0.48),
    ];

    final path = Path();
    final first = gabonPoints.first;
    path.moveTo(first.dx * size.width, first.dy * size.height);
    for (final point in gabonPoints.skip(1)) {
      path.lineTo(point.dx * size.width, point.dy * size.height);
    }
    path.close();

    final fillPaint = Paint()
      ..shader = LinearGradient(
        colors: [
          Colors.white24,
          Colors.white10,
        ],
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
      ).createShader(Rect.fromLTWH(0, 0, size.width, size.height));

    final borderPaint = Paint()
      ..color = colorWithOpacity(Colors.white, 0.6)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2;

    canvas.drawPath(path, fillPaint);
    canvas.drawPath(path, borderPaint);

    final linePaint = Paint()
      ..color = colorWithOpacity(Colors.white, 0.38)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.2;

    canvas.drawLine(
      Offset(size.width * 0.34, size.height * 0.14),
      Offset(size.width * 0.34, size.height * 0.86),
      linePaint,
    );
    canvas.drawLine(
      Offset(size.width * 0.57, size.height * 0.12),
      Offset(size.width * 0.57, size.height * 0.88),
      linePaint,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
