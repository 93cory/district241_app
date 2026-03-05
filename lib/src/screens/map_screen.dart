import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

import '../models/industrial_unit.dart';
import '../models/operateur_industriel.dart';
import '../services/api_service.dart';
import '../theme/pnpi_theme.dart';

// ─────────────────────────────────────────────────────────────────────────────
// Sites industriels (couche "Unités") — données géo fixes
// ─────────────────────────────────────────────────────────────────────────────

class _GeoSite {
  final String id;
  final String name;
  final String sector;
  final String province;
  final double lat;
  final double lng;
  final UnitStatus status;

  const _GeoSite({
    required this.id,
    required this.name,
    required this.sector,
    required this.province,
    required this.lat,
    required this.lng,
    required this.status,
  });

  String get statusLabel => status == UnitStatus.active ? 'Actif' : 'Inactif';
}

const _kGabonSites = <_GeoSite>[
  _GeoSite(
    id: 'UI002', name: 'AgroDomaine Libreville', sector: 'Agroalimentaire',
    province: 'Estuaire', lat: 0.393, lng: 9.452, status: UnitStatus.active,
  ),
  _GeoSite(
    id: 'UI001', name: 'Société Bois Gabonais', sector: 'Bois',
    province: 'Ogooué-Maritime', lat: -0.719, lng: 8.781, status: UnitStatus.active,
  ),
  _GeoSite(
    id: 'UI004', name: 'Pôle de Transformation Pêche', sector: 'Pêche',
    province: 'Ogooué-Maritime', lat: -0.741, lng: 8.803, status: UnitStatus.active,
  ),
  _GeoSite(
    id: 'UI003', name: 'Manioc et céréales Nyanga', sector: 'Manioc',
    province: 'Nyanga', lat: -2.862, lng: 11.024, status: UnitStatus.inactive,
  ),
  _GeoSite(
    id: 'UI005', name: 'Société Cacao Ogooué-Lolo', sector: 'Cacao',
    province: 'Ogooué-Lolo', lat: -1.136, lng: 12.473, status: UnitStatus.active,
  ),
  _GeoSite(
    id: 'UI006', name: 'Filière Minerais Haut-Ogooué', sector: 'Minerais',
    province: 'Haut-Ogooué', lat: -1.632, lng: 13.584, status: UnitStatus.active,
  ),
  _GeoSite(
    id: 'UI007', name: 'Huile de Palme Woleu-Ntem', sector: 'Agroalimentaire',
    province: 'Woleu-Ntem', lat: 1.628, lng: 11.579, status: UnitStatus.active,
  ),
  _GeoSite(
    id: 'UI008', name: 'Pêcheries Ogooué-Maritime Nord', sector: 'Pêche',
    province: 'Ogooué-Maritime', lat: -1.001, lng: 9.001, status: UnitStatus.inactive,
  ),
];

// ─────────────────────────────────────────────────────────────────────────────
// MapScreen
// ─────────────────────────────────────────────────────────────────────────────

/// Mode de la carte : opérateurs PNPI ou unités industrielles.
enum _MapMode { operateurs, unites }

class MapScreen extends StatefulWidget {
  const MapScreen({super.key});

  @override
  State<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends State<MapScreen> {
  final MapController _mapController = MapController();

  _MapMode _mode = _MapMode.operateurs;
  String? _activeSecteur;
  String? _selectedId;

  // Couche opérateurs PNPI
  List<OperateurIndustriel> _operateurs = [];
  bool _loadingOps = true;

  @override
  void initState() {
    super.initState();
    _loadOperateurs();
  }

  Future<void> _loadOperateurs() async {
    final ops = await ApiService.instance.fetchOperateurs();
    if (!mounted) return;
    setState(() {
      _operateurs = ops.where((o) => o.latitude != null && o.longitude != null).toList();
      _loadingOps = false;
    });
  }

  // ── Couleurs par secteur ────────────────────────────────────────────────────

  Color _secteurColor(String s) => switch (s) {
        'bois' || 'Bois' => const Color(0xFF5D4037),
        'agroalimentaire' || 'Agroalimentaire' => const Color(0xFF388E3C),
        'peche' || 'Pêche' => const Color(0xFF0288D1),
        'mines' || 'Minerais' => const Color(0xFF757575),
        'btp' || 'BTP' => const Color(0xFFEF6C00),
        'petrole' || 'Pétrole & Gaz' => const Color(0xFF1565C0),
        'services' || 'Services' => const Color(0xFF7B1FA2),
        'Cacao' || 'Manioc' => Colors.orange.shade700,
        _ => PnpiColors.lagoon,
      };

  // ── Listes filtrées ─────────────────────────────────────────────────────────

  List<OperateurIndustriel> get _filteredOps {
    if (_activeSecteur == null) return _operateurs;
    return _operateurs.where((o) => o.secteur == _activeSecteur).toList();
  }

  List<_GeoSite> get _filteredSites {
    if (_activeSecteur == null) return _kGabonSites;
    return _kGabonSites.where((s) => s.sector == _activeSecteur).toList();
  }

  List<String> get _currentSecteurs {
    if (_mode == _MapMode.operateurs) {
      return _operateurs.map((o) => o.secteur).toSet().toList()..sort();
    }
    return _kGabonSites.map((s) => s.sector).toSet().toList()..sort();
  }

  String _secteurLabel(String s) => switch (s) {
        'bois' => 'Bois',
        'agroalimentaire' => 'Agroalimentaire',
        'peche' => 'Pêche',
        'mines' => 'Mines',
        'btp' => 'BTP',
        'petrole' => 'Pétrole & Gaz',
        'services' => 'Services',
        _ => s,
      };

  // ── Popups ──────────────────────────────────────────────────────────────────

  void _showOperateurSheet(OperateurIndustriel op) {
    setState(() => _selectedId = op.id);
    _mapController.move(LatLng(op.latitude!, op.longitude!), 9.5);
    final color = _secteurColor(op.secteur);
    final conformiteColor = switch (op.statutConformite) {
      'conforme' => const Color(0xFF2E7D32),
      'non_conforme' => const Color(0xFFC62828),
      _ => const Color(0xFFF57F17),
    };

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) => Container(
        margin: const EdgeInsets.fromLTRB(12, 0, 12, 12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(24),
          boxShadow: PnpiTheme.softShadows,
        ),
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Handle
            Center(
              child: Container(
                width: 36, height: 4,
                margin: const EdgeInsets.only(bottom: 14),
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            Row(
              children: [
                CircleAvatar(
                  radius: 22,
                  backgroundColor: colorWithOpacity(color, 0.15),
                  child: Icon(_secteurIcon(op.secteur), color: color, size: 22),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        op.raisonSociale,
                        style: const TextStyle(
                            fontWeight: FontWeight.w700, fontSize: 15),
                        overflow: TextOverflow.ellipsis,
                      ),
                      Text(
                        op.nifGabon,
                        style: const TextStyle(
                            fontSize: 12, color: Colors.black45),
                      ),
                    ],
                  ),
                ),
                // Conformité badge
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: colorWithOpacity(conformiteColor, 0.12),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                        color: colorWithOpacity(conformiteColor, 0.4)),
                  ),
                  child: Text(
                    op.statutConformiteLabel,
                    style: TextStyle(
                      color: conformiteColor,
                      fontWeight: FontWeight.w700,
                      fontSize: 11,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            const Divider(),
            const SizedBox(height: 10),
            _detailRow(Icons.map_outlined, 'Province', op.province),
            const SizedBox(height: 6),
            _detailRow(Icons.location_city_rounded, 'Ville', op.ville),
            const SizedBox(height: 6),
            _detailRow(Icons.category_outlined, 'Secteur',
                _secteurLabel(op.secteur)),
            const SizedBox(height: 6),
            _detailRow(Icons.approval_rounded, 'ATI',
                '${op.nombreAtiTotal} total · ${op.nombreAtiActifs} actif(s)'),
            if (op.latitude != null) ...[
              const SizedBox(height: 6),
              _detailRow(
                Icons.location_on_outlined,
                'GPS',
                '${op.latitude!.toStringAsFixed(4)}°, '
                    '${op.longitude!.toStringAsFixed(4)}°',
              ),
            ],
          ],
        ),
      ),
    ).whenComplete(() => setState(() => _selectedId = null));
  }

  void _showSiteSheet(_GeoSite site) {
    setState(() => _selectedId = site.id);
    _mapController.move(LatLng(site.lat, site.lng), 9.5);
    final color = site.status == UnitStatus.active
        ? Colors.green.shade700
        : Colors.red.shade600;
    final sectorColor = _secteurColor(site.sector);

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) => Container(
        margin: const EdgeInsets.fromLTRB(12, 0, 12, 12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(24),
          boxShadow: PnpiTheme.softShadows,
        ),
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 36, height: 4,
                margin: const EdgeInsets.only(bottom: 14),
                decoration: BoxDecoration(
                    color: Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(2)),
              ),
            ),
            Row(
              children: [
                CircleAvatar(
                  backgroundColor: colorWithOpacity(sectorColor, 0.18),
                  child: Icon(Icons.factory_rounded, color: sectorColor),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(site.name,
                          style: const TextStyle(
                              fontWeight: FontWeight.w700, fontSize: 15)),
                      Text('${site.province} · ${site.sector}',
                          style: const TextStyle(
                              color: Colors.black54, fontSize: 12)),
                    ],
                  ),
                ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: colorWithOpacity(color, 0.14),
                    borderRadius: BorderRadius.circular(99),
                    border: Border.all(color: colorWithOpacity(color, 0.5)),
                  ),
                  child: Text(site.statusLabel,
                      style: TextStyle(
                          color: color,
                          fontWeight: FontWeight.w700,
                          fontSize: 12)),
                ),
              ],
            ),
            const SizedBox(height: 14),
            const Divider(),
            const SizedBox(height: 10),
            _detailRow(Icons.location_on_outlined, 'GPS',
                '${site.lat.toStringAsFixed(4)}°N, ${site.lng.toStringAsFixed(4)}°E'),
            const SizedBox(height: 6),
            _detailRow(Icons.map_outlined, 'Province', site.province),
            const SizedBox(height: 6),
            _detailRow(Icons.category_outlined, 'Secteur', site.sector),
          ],
        ),
      ),
    ).whenComplete(() => setState(() => _selectedId = null));
  }

  Widget _detailRow(IconData icon, String label, String value) {
    return Row(
      children: [
        Icon(icon, size: 16, color: PnpiColors.lagoon),
        const SizedBox(width: 8),
        Text('$label : ',
            style: const TextStyle(color: Colors.black54, fontSize: 12)),
        Expanded(
          child: Text(value,
              style: const TextStyle(
                  fontWeight: FontWeight.w600, fontSize: 12),
              overflow: TextOverflow.ellipsis),
        ),
      ],
    );
  }

  IconData _secteurIcon(String s) => switch (s) {
        'bois' => Icons.forest_rounded,
        'agroalimentaire' => Icons.agriculture_rounded,
        'peche' => Icons.water_rounded,
        'mines' => Icons.terrain_rounded,
        'btp' => Icons.construction_rounded,
        'petrole' => Icons.local_gas_station_rounded,
        _ => Icons.miscellaneous_services_rounded,
      };

  // ── Build ───────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final opMarkers = _buildOpMarkers();
    final siteMarkers = _buildSiteMarkers();
    final visibleCount = _mode == _MapMode.operateurs
        ? _filteredOps.length
        : _filteredSites.length;

    return Stack(
      children: [
        // ── Carte OSM ─────────────────────────────────────────────────────────
        FlutterMap(
          mapController: _mapController,
          options: const MapOptions(
            initialCenter: LatLng(-0.6, 11.8),
            initialZoom: 6.2,
            minZoom: 4.5,
            maxZoom: 16,
          ),
          children: [
            TileLayer(
              urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
              userAgentPackageName: 'com.pnpi.app',
            ),
            MarkerLayer(
              markers: _mode == _MapMode.operateurs
                  ? opMarkers
                  : siteMarkers,
            ),
          ],
        ),

        // ── Overlay supérieur ─────────────────────────────────────────────────
        Positioned(
          top: 12,
          left: 12,
          right: 12,
          child: Column(
            children: [
              // Stats + toggle
              Container(
                padding: const EdgeInsets.symmetric(
                    horizontal: 14, vertical: 10),
                decoration: BoxDecoration(
                  color: PnpiColors.deepSpace.withAlpha(220),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.map_rounded,
                        color: Colors.white70, size: 16),
                    const SizedBox(width: 8),
                    Text(
                      '$visibleCount ${_mode == _MapMode.operateurs ? 'opérateurs' : 'sites'}',
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w600,
                        fontSize: 13,
                      ),
                    ),
                    const Spacer(),
                    // Toggle mode
                    _ModeToggle(
                      mode: _mode,
                      onChanged: (m) => setState(() {
                        _mode = m;
                        _activeSecteur = null;
                        _selectedId = null;
                      }),
                    ),
                    const SizedBox(width: 8),
                    // Reset
                    GestureDetector(
                      onTap: () {
                        _mapController.move(
                            const LatLng(-0.6, 11.8), 6.2);
                        setState(() {
                          _activeSecteur = null;
                          _selectedId = null;
                        });
                      },
                      child: const Icon(Icons.refresh,
                          color: Colors.white70, size: 18),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 8),

              // Filtres secteur
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: _currentSecteurs.map((s) {
                    final selected = _activeSecteur == s;
                    final color = _secteurColor(s);
                    final label = _secteurLabel(s);
                    return GestureDetector(
                      onTap: () => setState(() =>
                          _activeSecteur = selected ? null : s),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        margin: const EdgeInsets.only(right: 8),
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 7),
                        decoration: BoxDecoration(
                          color: selected
                              ? color
                              : Colors.white.withAlpha(220),
                          borderRadius: BorderRadius.circular(99),
                          border: Border.all(
                              color: selected ? color : Colors.white),
                        ),
                        child: Text(
                          label,
                          style: TextStyle(
                            color: selected ? Colors.white : color,
                            fontWeight: FontWeight.w700,
                            fontSize: 12,
                          ),
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ),
            ],
          ),
        ),

        // ── Légende ───────────────────────────────────────────────────────────
        Positioned(
          bottom: 24,
          left: 14,
          child: Container(
            padding:
                const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: Colors.white.withAlpha(230),
              borderRadius: BorderRadius.circular(14),
              boxShadow: PnpiTheme.softShadows,
            ),
            child: _mode == _MapMode.operateurs
                ? _opLegend()
                : _siteLegend(),
          ),
        ),

        // ── Spinner chargement ────────────────────────────────────────────────
        if (_loadingOps && _mode == _MapMode.operateurs)
          const Positioned(
            top: 110,
            left: 0,
            right: 0,
            child: Center(
              child: SizedBox(
                width: 28,
                height: 28,
                child: CircularProgressIndicator(
                    strokeWidth: 2.5, color: Colors.white),
              ),
            ),
          ),
      ],
    );
  }

  // ── Markers ─────────────────────────────────────────────────────────────────

  List<Marker> _buildOpMarkers() {
    return _filteredOps.map((op) {
      final color = _secteurColor(op.secteur);
      final isSelected = _selectedId == op.id;
      final conformiteIcon = switch (op.statutConformite) {
        'conforme' => Icons.check_circle_rounded,
        'non_conforme' => Icons.cancel_rounded,
        _ => Icons.warning_rounded,
      };

      return Marker(
        point: LatLng(op.latitude!, op.longitude!),
        width: isSelected ? 56 : 44,
        height: isSelected ? 56 : 44,
        child: GestureDetector(
          onTap: () => _showOperateurSheet(op),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            decoration: BoxDecoration(
              color: color,
              shape: BoxShape.circle,
              border: Border.all(
                  color: Colors.white, width: isSelected ? 3 : 2),
              boxShadow: [
                BoxShadow(
                  color: colorWithOpacity(color, 0.5),
                  blurRadius: isSelected ? 14 : 6,
                  spreadRadius: isSelected ? 3 : 0,
                ),
              ],
            ),
            child: Stack(
              alignment: Alignment.center,
              children: [
                Icon(
                  _secteurIcon(op.secteur),
                  color: Colors.white,
                  size: isSelected ? 24 : 18,
                ),
                // Badge conformité (coin supérieur droit)
                Positioned(
                  top: 2,
                  right: 2,
                  child: Container(
                    width: 12,
                    height: 12,
                    decoration: BoxDecoration(
                      color: switch (op.statutConformite) {
                        'conforme' => const Color(0xFF2E7D32),
                        'non_conforme' => const Color(0xFFC62828),
                        _ => const Color(0xFFF57F17),
                      },
                      shape: BoxShape.circle,
                      border:
                          Border.all(color: Colors.white, width: 1),
                    ),
                    child: Icon(conformiteIcon,
                        size: 8, color: Colors.white),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }).toList();
  }

  List<Marker> _buildSiteMarkers() {
    return _filteredSites.map((site) {
      final isActive = site.status == UnitStatus.active;
      final sectorColor = _secteurColor(site.sector);
      final isSelected = _selectedId == site.id;

      return Marker(
        point: LatLng(site.lat, site.lng),
        width: isSelected ? 50 : 40,
        height: isSelected ? 50 : 40,
        child: GestureDetector(
          onTap: () => _showSiteSheet(site),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            decoration: BoxDecoration(
              color: isActive ? sectorColor : Colors.red.shade600,
              shape: BoxShape.circle,
              border: Border.all(
                  color: Colors.white, width: isSelected ? 3 : 2),
              boxShadow: [
                BoxShadow(
                  color: colorWithOpacity(
                      isActive ? sectorColor : Colors.red, 0.5),
                  blurRadius: isSelected ? 12 : 6,
                  spreadRadius: isSelected ? 2 : 0,
                ),
              ],
            ),
            child: Icon(
              isActive ? Icons.factory_rounded : Icons.pause_rounded,
              color: Colors.white,
              size: isSelected ? 22 : 18,
            ),
          ),
        ),
      );
    }).toList();
  }

  // ── Légendes ────────────────────────────────────────────────────────────────

  Widget _opLegend() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        const Text('Conformité',
            style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w700,
                color: Colors.black54)),
        const SizedBox(height: 4),
        _legendDot(const Color(0xFF2E7D32), 'Conforme'),
        const SizedBox(height: 3),
        _legendDot(const Color(0xFFF57F17), 'Partiel'),
        const SizedBox(height: 3),
        _legendDot(const Color(0xFFC62828), 'Non conforme'),
        const SizedBox(height: 6),
        const Text('© OSM',
            style: TextStyle(fontSize: 9, color: Colors.black38)),
      ],
    );
  }

  Widget _siteLegend() {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        _legendDot(Colors.green.shade700, 'Actif'),
        const SizedBox(width: 10),
        _legendDot(Colors.red.shade600, 'Inactif'),
        const SizedBox(width: 10),
        const Text('© OSM',
            style: TextStyle(fontSize: 10, color: Colors.black38)),
      ],
    );
  }

  Widget _legendDot(Color color, String label) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 9,
          height: 9,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 5),
        Text(label,
            style: const TextStyle(
                fontSize: 11, fontWeight: FontWeight.w600)),
      ],
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Toggle de mode
// ─────────────────────────────────────────────────────────────────────────────

class _ModeToggle extends StatelessWidget {
  final _MapMode mode;
  final ValueChanged<_MapMode> onChanged;

  const _ModeToggle({required this.mode, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 28,
      decoration: BoxDecoration(
        color: Colors.white12,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _tab(_MapMode.operateurs, Icons.business_rounded, 'PNPI'),
          _tab(_MapMode.unites, Icons.factory_rounded, 'Unités'),
        ],
      ),
    );
  }

  Widget _tab(_MapMode m, IconData icon, String label) {
    final selected = mode == m;
    return GestureDetector(
      onTap: () => onChanged(m),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding:
            const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          color: selected ? Colors.white : Colors.transparent,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Row(
          children: [
            Icon(icon,
                size: 13,
                color: selected
                    ? PnpiColors.deepSpace
                    : Colors.white70),
            const SizedBox(width: 4),
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                color: selected ? PnpiColors.deepSpace : Colors.white70,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
