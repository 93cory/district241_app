import 'package:flutter/material.dart';

import '../models/inspection_conformite.dart';
import '../services/api_service.dart';
import '../theme/pnpi_theme.dart';
import 'inspection_conformite_screen.dart';
import 'inspection_create_screen.dart';
import 'qr_scanner_screen.dart';

/// Vue terrain quotidienne de l'inspecteur PNPI.
class InspectorsScreen extends StatefulWidget {
  const InspectorsScreen({super.key});

  @override
  State<InspectorsScreen> createState() => _InspectorsScreenState();
}

class _InspectorsScreenState extends State<InspectorsScreen> {
  List<InspectionConformite> _inspections = [];
  AuthUserProfile? _profile;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final results = await Future.wait([
      ApiService.instance.fetchInspections(),
      ApiService.instance.fetchCurrentUser(),
    ]);
    if (!mounted) return;
    setState(() {
      _inspections = results[0] as List<InspectionConformite>;
      _profile = results[1] as AuthUserProfile;
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator());

    final today = DateTime.now();
    final todayInspections = _inspections.where((i) {
      final d = i.dateInspection;
      return d.year == today.year &&
          d.month == today.month &&
          d.day == today.day;
    }).toList();

    final nonConformes =
        _inspections.where((i) => i.isNonConforme).length;
    final partielles = _inspections.where((i) => i.isPartiel).length;
    final recent = _inspections.take(8).toList();

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 80),
        children: [
          // ── Header ────────────────────────────────────────────────
          _buildHeader(today),
          const SizedBox(height: 16),

          // ── KPI strip ────────────────────────────────────────────
          _buildKpiStrip(todayInspections.length, nonConformes, partielles),
          const SizedBox(height: 18),

          // ── Quick actions ─────────────────────────────────────────
          _buildQuickActions(),
          const SizedBox(height: 20),

          // ── Récentes ─────────────────────────────────────────────
          _sectionHeader('Inspections récentes', onViewAll: () {
            Navigator.push(
              context,
              MaterialPageRoute(
                  builder: (_) => const InspectionConformiteScreen()),
            );
          }),
          const SizedBox(height: 10),
          if (recent.isEmpty)
            _emptyState()
          else
            ...recent.map((i) => _InspectionTerrainCard(
                  inspection: i,
                  isToday: i.dateInspection.year == today.year &&
                      i.dateInspection.month == today.month &&
                      i.dateInspection.day == today.day,
                )),
        ],
      ),
    );
  }

  // ── Header ─────────────────────────────────────────────────────────────

  Widget _buildHeader(DateTime now) {
    final days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    final months = [
      'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
      'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
    ];
    final dayName = days[now.weekday - 1];
    final dateStr = '$dayName ${now.day} ${months[now.month - 1]} ${now.year}';

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [PnpiColors.deepSpace, Colors.teal.shade800],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: PnpiTheme.softShadows,
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Bonjour, ${_profile?.fullName.split(' ').first ?? 'Inspecteur'} 👋',
                  style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w700,
                      fontSize: 17),
                ),
                const SizedBox(height: 4),
                Text(
                  dateStr,
                  style:
                      const TextStyle(color: Colors.white60, fontSize: 13),
                ),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: Colors.teal.shade700,
                    borderRadius: BorderRadius.circular(99),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.shield_rounded,
                          color: Colors.white70, size: 13),
                      SizedBox(width: 5),
                      Text(
                        'Inspecteur terrain PNPI',
                        style:
                            TextStyle(color: Colors.white70, fontSize: 11),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: Colors.white12,
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.fact_check_rounded,
                color: Colors.white, size: 28),
          ),
        ],
      ),
    );
  }

  // ── KPI strip ──────────────────────────────────────────────────────────

  Widget _buildKpiStrip(int today, int nonConformes, int partielles) {
    return Row(
      children: [
        _kpi('Aujourd\'hui', '$today', Colors.teal.shade700,
            Icons.today_rounded),
        const SizedBox(width: 10),
        _kpi('Total', '${_inspections.length}', PnpiColors.lagoon,
            Icons.fact_check_rounded),
        const SizedBox(width: 10),
        _kpi('Non conf.', '$nonConformes', Colors.red.shade700,
            Icons.cancel_rounded),
        const SizedBox(width: 10),
        _kpi('Partielles', '$partielles', Colors.orange.shade700,
            Icons.remove_circle_rounded),
      ],
    );
  }

  Widget _kpi(String label, String value, Color color, IconData icon) =>
      Expanded(
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 6),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            boxShadow: PnpiTheme.softShadows,
          ),
          child: Column(
            children: [
              Icon(icon, color: color, size: 18),
              const SizedBox(height: 4),
              Text(value,
                  style: TextStyle(
                      color: color,
                      fontWeight: FontWeight.w800,
                      fontSize: 18)),
              Text(label,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                      color: Colors.black45,
                      fontSize: 9,
                      height: 1.2)),
            ],
          ),
        ),
      );

  // ── Quick actions ──────────────────────────────────────────────────────

  Widget _buildQuickActions() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Actions rapides',
            style:
                TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(
              child: _actionCard(
                icon: Icons.add_circle_rounded,
                label: 'Nouvelle\ninspection',
                color: Colors.teal.shade700,
                onTap: () async {
                  await Navigator.push(
                    context,
                    MaterialPageRoute(
                        builder: (_) =>
                            const InspectionCreateScreen()),
                  );
                  _load();
                },
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _actionCard(
                icon: Icons.qr_code_scanner_rounded,
                label: 'Scanner\nATI / Lot',
                color: PnpiColors.lagoon,
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(
                      builder: (_) => const QrScannerScreen()),
                ),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _actionCard(
                icon: Icons.list_alt_rounded,
                label: 'Toutes les\ninspections',
                color: Colors.indigo.shade700,
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(
                      builder: (_) =>
                          const InspectionConformiteScreen()),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _actionCard({
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback onTap,
  }) =>
      GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 16),
          decoration: BoxDecoration(
            color: colorWithOpacity(color, 0.09),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: colorWithOpacity(color, 0.3)),
          ),
          child: Column(
            children: [
              Icon(icon, color: color, size: 28),
              const SizedBox(height: 8),
              Text(
                label,
                textAlign: TextAlign.center,
                style: TextStyle(
                    color: color,
                    fontWeight: FontWeight.w600,
                    fontSize: 11,
                    height: 1.3),
              ),
            ],
          ),
        ),
      );

  // ── Section header ────────────────────────────────────────────────────

  Widget _sectionHeader(String label, {VoidCallback? onViewAll}) => Row(
        children: [
          Container(
              width: 3,
              height: 16,
              decoration: BoxDecoration(
                  color: Colors.teal.shade700,
                  borderRadius: BorderRadius.circular(2))),
          const SizedBox(width: 8),
          Expanded(
            child: Text(label,
                style: const TextStyle(
                    fontWeight: FontWeight.w700, fontSize: 14)),
          ),
          if (onViewAll != null)
            GestureDetector(
              onTap: onViewAll,
              child: Text(
                'Voir tout →',
                style: TextStyle(
                    color: Colors.teal.shade700,
                    fontSize: 12,
                    fontWeight: FontWeight.w600),
              ),
            ),
        ],
      );

  Widget _emptyState() => Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: PnpiTheme.softShadows,
        ),
        child: Column(
          children: [
            Icon(Icons.fact_check_outlined,
                size: 44, color: Colors.grey.shade300),
            const SizedBox(height: 10),
            Text('Aucune inspection enregistrée',
                style: TextStyle(
                    color: Colors.grey.shade500,
                    fontWeight: FontWeight.w600)),
            const SizedBox(height: 6),
            Text('Créez votre première inspection terrain.',
                style: TextStyle(
                    color: Colors.grey.shade400, fontSize: 13)),
          ],
        ),
      );
}

// ── Inspection terrain card ──────────────────────────────────────────────

class _InspectionTerrainCard extends StatelessWidget {
  final InspectionConformite inspection;
  final bool isToday;

  const _InspectionTerrainCard({
    required this.inspection,
    required this.isToday,
  });

  Color get _color => switch (inspection.statutConformite) {
        'conforme' => Colors.green.shade700,
        'non_conforme' => Colors.red.shade700,
        _ => Colors.orange.shade700,
      };

  IconData get _icon => switch (inspection.statutConformite) {
        'conforme' => Icons.check_circle_rounded,
        'non_conforme' => Icons.cancel_rounded,
        _ => Icons.remove_circle_rounded,
      };

  @override
  Widget build(BuildContext context) {
    final diff = DateTime.now().difference(inspection.dateInspection);
    final ago = diff.inMinutes < 60
        ? 'Il y a ${diff.inMinutes} min'
        : diff.inHours < 24
            ? 'Il y a ${diff.inHours} h'
            : diff.inDays == 1
                ? 'Hier'
                : 'Il y a ${diff.inDays} j';

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: PnpiTheme.softShadows,
        border: Border(left: BorderSide(color: _color, width: 4)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Icon
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: colorWithOpacity(_color, 0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(_icon, color: _color, size: 20),
            ),
            const SizedBox(width: 12),
            // Content
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          inspection.operateurNom,
                          style: const TextStyle(
                              fontWeight: FontWeight.w700, fontSize: 13.5),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      if (isToday)
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: colorWithOpacity(
                                Colors.teal.shade700, 0.12),
                            borderRadius: BorderRadius.circular(99),
                          ),
                          child: Text(
                            'Aujourd\'hui',
                            style: TextStyle(
                                color: Colors.teal.shade700,
                                fontSize: 10,
                                fontWeight: FontWeight.w700),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    inspection.observations,
                    style: const TextStyle(
                        color: Colors.black54,
                        fontSize: 12.5,
                        height: 1.35),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      // Statut badge
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: colorWithOpacity(_color, 0.1),
                          borderRadius: BorderRadius.circular(99),
                          border: Border.all(
                              color: colorWithOpacity(_color, 0.4)),
                        ),
                        child: Text(
                          inspection.statutLabel,
                          style: TextStyle(
                              color: _color,
                              fontSize: 10,
                              fontWeight: FontWeight.w700),
                        ),
                      ),
                      const SizedBox(width: 8),
                      // Province
                      Icon(Icons.location_on_outlined,
                          size: 12, color: Colors.black38),
                      const SizedBox(width: 2),
                      Text(
                        inspection.province,
                        style: const TextStyle(
                            fontSize: 11, color: Colors.black38),
                      ),
                      const Spacer(),
                      Text(
                        ago,
                        style: const TextStyle(
                            fontSize: 11, color: Colors.black38),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
