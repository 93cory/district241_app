import 'package:flutter/material.dart';

import '../models/inspection_conformite.dart';
import '../services/api_service.dart';
import '../theme/pnpi_theme.dart';
import 'inspection_create_screen.dart';

/// Liste des inspections de conformité industrielle (PNPI).
class InspectionConformiteScreen extends StatefulWidget {
  const InspectionConformiteScreen({super.key});

  @override
  State<InspectionConformiteScreen> createState() =>
      _InspectionConformiteScreenState();
}

class _InspectionConformiteScreenState
    extends State<InspectionConformiteScreen> {
  List<InspectionConformite> _all = [];
  bool _loading = true;
  String? _activeStatut;
  String? _activeSecteur;

  static const _statuts = [
    (value: 'conforme', label: 'Conformes', color: Color(0xFF2E7D32)),
    (value: 'partiel', label: 'Partiels', color: Color(0xFFF57F17)),
    (value: 'non_conforme', label: 'Non conformes', color: Color(0xFFC62828)),
  ];

  static const _secteurs = [
    'bois', 'agroalimentaire', 'peche', 'mines', 'btp', 'petrole', 'services',
  ];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final data = await ApiService.instance.fetchInspections();
    if (!mounted) return;
    setState(() {
      _all = data..sort((a, b) => b.dateInspection.compareTo(a.dateInspection));
      _loading = false;
    });
  }

  List<InspectionConformite> get _filtered {
    var list = _all;
    if (_activeStatut != null) {
      list = list.where((i) => i.statutConformite == _activeStatut).toList();
    }
    if (_activeSecteur != null) {
      list = list.where((i) => i.secteur == _activeSecteur).toList();
    }
    return list;
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator());

    final filtered = _filtered;
    final conformes = _all.where((i) => i.isConforme).length;
    final nonConformes = _all.where((i) => i.isNonConforme).length;
    final partiels = _all.where((i) => i.isPartiel).length;

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        children: [
          // ── KPI band ────────────────────────────────────────────────────
          Row(
            children: [
              _kpi('${_all.length}', 'Total', PnpiColors.deepSpace),
              const SizedBox(width: 6),
              _kpi('$conformes', 'Conformes', const Color(0xFF2E7D32)),
              const SizedBox(width: 6),
              _kpi('$partiels', 'Partiels', const Color(0xFFF57F17)),
              const SizedBox(width: 6),
              _kpi('$nonConformes', 'Non conf.', const Color(0xFFC62828)),
            ],
          ),
          const SizedBox(height: 12),

          // ── Bouton nouvelle inspection ───────────────────────────────────
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: () async {
                final result = await Navigator.push<InspectionConformite>(
                  context,
                  MaterialPageRoute(
                    builder: (_) => const InspectionCreateScreen(),
                  ),
                );
                if (result != null) _load();
              },
              icon: const Icon(Icons.add_task_rounded, size: 18),
              label: const Text('Nouvelle inspection'),
              style: FilledButton.styleFrom(
                backgroundColor: PnpiColors.lagoon,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14)),
                padding: const EdgeInsets.symmetric(vertical: 13),
              ),
            ),
          ),
          const SizedBox(height: 14),

          // ── Filtre statut ────────────────────────────────────────────────
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _filterChip('Tous', null, _activeStatut == null,
                    PnpiColors.deepSpace, () {
                  setState(() => _activeStatut = null);
                }),
                const SizedBox(width: 6),
                ..._statuts.map((s) => Padding(
                      padding: const EdgeInsets.only(right: 6),
                      child: _filterChip(s.label, s.value,
                          _activeStatut == s.value, s.color, () {
                        setState(() => _activeStatut =
                            _activeStatut == s.value ? null : s.value);
                      }),
                    )),
              ],
            ),
          ),
          const SizedBox(height: 8),

          // ── Filtre secteur ───────────────────────────────────────────────
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: _secteurs
                  .map((s) => Padding(
                        padding: const EdgeInsets.only(right: 6),
                        child: FilterChip(
                          label: Text(_secteurLabel(s),
                              style: const TextStyle(fontSize: 11)),
                          selected: _activeSecteur == s,
                          onSelected: (_) => setState(() =>
                              _activeSecteur = _activeSecteur == s ? null : s),
                          selectedColor:
                              colorWithOpacity(_secteurColor(s), 0.18),
                          checkmarkColor: _secteurColor(s),
                          labelStyle: TextStyle(
                            color: _activeSecteur == s
                                ? _secteurColor(s)
                                : Colors.black54,
                          ),
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(20)),
                          padding: EdgeInsets.zero,
                          visualDensity: VisualDensity.compact,
                        ),
                      ))
                  .toList(),
            ),
          ),
          const SizedBox(height: 10),

          // ── Liste inspections ────────────────────────────────────────────
          if (filtered.isEmpty)
            const Padding(
              padding: EdgeInsets.only(top: 40),
              child: Center(
                child: Text(
                  'Aucune inspection pour ce filtre',
                  style: TextStyle(color: Colors.black38),
                ),
              ),
            )
          else
            ...filtered.map((ins) => _InspectionCard(
                  inspection: ins,
                  onTap: () => _showDetail(ins),
                )),
        ],
      ),
    );
  }

  void _showDetail(InspectionConformite ins) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => DraggableScrollableSheet(
        initialChildSize: 0.65,
        minChildSize: 0.4,
        maxChildSize: 0.92,
        builder: (_, ctrl) => Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: ListView(
            controller: ctrl,
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
            children: [
              // Drag handle
              Center(
                child: Container(
                  width: 38,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 14),
              // En-tête
              Row(
                children: [
                  _statutBadge(ins, large: true),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          ins.operateurNom,
                          style: const TextStyle(
                              fontWeight: FontWeight.w700, fontSize: 15),
                        ),
                        Text(
                          ins.id,
                          style: const TextStyle(
                              fontSize: 11, color: Colors.black38),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              _detailRow(Icons.calendar_today_outlined, 'Date',
                  _fmtDate(ins.dateInspection)),
              _detailRow(
                  Icons.person_outline, 'Inspecteur', ins.inspecteurNom),
              _detailRow(Icons.map_outlined, 'Province', ins.province),
              _detailRow(Icons.category_outlined, 'Secteur',
                  _secteurLabel(ins.secteur)),
              if (ins.atiNumero != null)
                _detailRow(
                    Icons.approval_rounded, 'ATI lié', ins.atiNumero!),
              const Divider(height: 24),
              const Text(
                'Observations',
                style:
                    TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
              ),
              const SizedBox(height: 6),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.grey.shade50,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.grey.shade200),
                ),
                child: Text(
                  ins.observations,
                  style: const TextStyle(fontSize: 13, height: 1.5),
                ),
              ),
              if (ins.mesuresCorrectives != null) ...[
                const SizedBox(height: 14),
                const Text(
                  'Mesures correctives',
                  style: TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 13,
                      color: Color(0xFFC62828)),
                ),
                const SizedBox(height: 6),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: colorWithOpacity(const Color(0xFFC62828), 0.05),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                        color:
                            colorWithOpacity(const Color(0xFFC62828), 0.2)),
                  ),
                  child: Text(
                    ins.mesuresCorrectives!,
                    style: const TextStyle(
                        fontSize: 13, height: 1.5, color: Color(0xFFC62828)),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _kpi(String value, String label, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          color: colorWithOpacity(color, 0.09),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: colorWithOpacity(color, 0.2)),
        ),
        child: Column(
          children: [
            Text(value,
                style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    color: color)),
            Text(label,
                style:
                    const TextStyle(fontSize: 10, color: Colors.black45)),
          ],
        ),
      ),
    );
  }

  Widget _filterChip(String label, String? value, bool selected, Color color,
      VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
        decoration: BoxDecoration(
          color: selected ? colorWithOpacity(color, 0.14) : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: selected ? colorWithOpacity(color, 0.5) : Colors.grey.shade300,
            width: selected ? 1.5 : 1,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: selected ? FontWeight.w700 : FontWeight.normal,
            color: selected ? color : Colors.black54,
          ),
        ),
      ),
    );
  }

  Widget _detailRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Icon(icon, size: 15, color: Colors.black38),
          const SizedBox(width: 8),
          SizedBox(
            width: 90,
            child: Text(label,
                style:
                    const TextStyle(fontSize: 12, color: Colors.black45)),
          ),
          Expanded(
            child: Text(value,
                style: const TextStyle(
                    fontSize: 12, fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );
  }

  String _fmtDate(DateTime d) =>
      '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}/${d.year}';

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

  Color _secteurColor(String s) => switch (s) {
        'bois' => const Color(0xFF5D4037),
        'agroalimentaire' => const Color(0xFF388E3C),
        'peche' => const Color(0xFF0288D1),
        'mines' => const Color(0xFF757575),
        'btp' => const Color(0xFFEF6C00),
        'petrole' => const Color(0xFF1565C0),
        'services' => const Color(0xFF7B1FA2),
        _ => Colors.blueGrey,
      };
}

// ─────────────────────────────────────────────────────────────────────────────
// Card d'inspection
// ─────────────────────────────────────────────────────────────────────────────

class _InspectionCard extends StatelessWidget {
  final InspectionConformite inspection;
  final VoidCallback onTap;

  const _InspectionCard({required this.inspection, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final ins = inspection;
    final statutColor = switch (ins.statutConformite) {
      'conforme' => const Color(0xFF2E7D32),
      'non_conforme' => const Color(0xFFC62828),
      _ => const Color(0xFFF57F17),
    };

    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: colorWithOpacity(Colors.black, 0.05),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    ins.operateurNom,
                    style: const TextStyle(
                        fontWeight: FontWeight.w700, fontSize: 13.5),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                _statutBadge(ins),
              ],
            ),
            const SizedBox(height: 6),
            Row(
              children: [
                Icon(Icons.person_outline,
                    size: 12, color: Colors.black38),
                const SizedBox(width: 4),
                Expanded(
                  child: Text(
                    ins.inspecteurNom,
                    style: const TextStyle(
                        fontSize: 11, color: Colors.black45),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                Text(
                  '${ins.ageJours}j',
                  style:
                      const TextStyle(fontSize: 11, color: Colors.black38),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Row(
              children: [
                Icon(Icons.map_outlined,
                    size: 12, color: Colors.black38),
                const SizedBox(width: 4),
                Text(
                  '${ins.province} · ${_secteurLabel(ins.secteur)}',
                  style: const TextStyle(
                      fontSize: 11, color: Colors.black45),
                ),
                if (ins.atiNumero != null) ...[
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 7, vertical: 2),
                    decoration: BoxDecoration(
                      color: colorWithOpacity(
                          PnpiColors.lagoon, 0.1),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      ins.atiNumero!,
                      style: TextStyle(
                          fontSize: 10,
                          color: PnpiColors.lagoon,
                          fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
              ],
            ),
            if (ins.isNonConforme && ins.mesuresCorrectives != null) ...[
              const SizedBox(height: 8),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: colorWithOpacity(statutColor, 0.07),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    Icon(Icons.warning_amber_rounded,
                        size: 13, color: statutColor),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        ins.mesuresCorrectives!,
                        style: TextStyle(
                            fontSize: 11,
                            color: statutColor,
                            height: 1.3),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
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
}

// ─────────────────────────────────────────────────────────────────────────────
// Badge statut partagé
// ─────────────────────────────────────────────────────────────────────────────

Widget _statutBadge(InspectionConformite ins, {bool large = false}) {
  final color = switch (ins.statutConformite) {
    'conforme' => const Color(0xFF2E7D32),
    'non_conforme' => const Color(0xFFC62828),
    _ => const Color(0xFFF57F17),
  };
  final icon = switch (ins.statutConformite) {
    'conforme' => Icons.check_circle_rounded,
    'non_conforme' => Icons.cancel_rounded,
    _ => Icons.warning_rounded,
  };
  return Container(
    padding: EdgeInsets.symmetric(
        horizontal: large ? 12 : 8, vertical: large ? 6 : 4),
    decoration: BoxDecoration(
      color: colorWithOpacity(color, 0.12),
      borderRadius: BorderRadius.circular(20),
      border: Border.all(color: colorWithOpacity(color, 0.35)),
    ),
    child: Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: large ? 14 : 11, color: color),
        const SizedBox(width: 4),
        Text(
          ins.statutLabel,
          style: TextStyle(
            fontSize: large ? 12 : 10,
            fontWeight: FontWeight.w700,
            color: color,
          ),
        ),
      ],
    ),
  );
}
