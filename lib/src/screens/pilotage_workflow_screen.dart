import 'package:flutter/material.dart';

import '../models/ati.dart';
import '../services/api_service.dart';
import '../theme/pnpi_theme.dart';
import 'ati_screen.dart';

/// Vue pilotage ATI — tableau de bord opérationnel pour le rôle Ministère.
class PilotageWorkflowScreen extends StatefulWidget {
  const PilotageWorkflowScreen({super.key});

  @override
  State<PilotageWorkflowScreen> createState() => _PilotageWorkflowScreenState();
}

class _PilotageWorkflowScreenState extends State<PilotageWorkflowScreen> {
  List<AgrementTechniqueIndustriel> _atis = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final data = await ApiService.instance.fetchATIs();
    if (!mounted) return;
    setState(() {
      _atis = data;
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator());

    final overdue = _atis.where((a) => a.isOverdue).toList()
      ..sort((a, b) => a.slaDaysRemaining.compareTo(b.slaDaysRemaining));
    final enValidation =
        _atis.where((a) => a.statut == 'en_validation').toList();
    final enInstruction =
        _atis.where((a) => a.statut == 'en_instruction').toList();
    final soumis = _atis.where((a) => a.statut == 'soumis').toList();
    final cutoff = DateTime.now().subtract(const Duration(days: 30));
    final recentes = _atis
        .where((a) =>
            (a.statut == 'approuve' || a.statut == 'rejete') &&
            (a.dateDecision?.isAfter(cutoff) ?? false))
        .toList()
      ..sort((a, b) =>
          (b.dateDecision ?? b.dateSoumission)
              .compareTo(a.dateDecision ?? a.dateSoumission));

    final approuvesTotal =
        _atis.where((a) => a.statut == 'approuve').length;
    final slaTaux = _atis.isEmpty
        ? 0
        : ((approuvesTotal / _atis.length) * 100).round();

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 80),
        children: [
          // ── KPI band ─────────────────────────────────────────────
          _buildKpiBand(overdue.length, enValidation.length, approuvesTotal, slaTaux),
          const SizedBox(height: 16),

          // ── Pipeline funnel ───────────────────────────────────────
          _buildPipeline(soumis.length, enInstruction.length,
              enValidation.length, approuvesTotal),
          const SizedBox(height: 20),

          // ── Urgences SLA ──────────────────────────────────────────
          if (overdue.isNotEmpty) ...[
            _sectionHeader(
              'Urgences SLA',
              '${overdue.length} ATI(s) en retard',
              Colors.red.shade700,
              Icons.warning_rounded,
            ),
            const SizedBox(height: 10),
            ...overdue.take(5).map((a) => _ATIPilotageCard(
                  ati: a,
                  accent: Colors.red.shade700,
                  badge: 'Dépassé ${-a.slaDaysRemaining} j',
                  badgeColor: Colors.red.shade700,
                  onTap: () => _openATI(a),
                )),
            const SizedBox(height: 16),
          ],

          // ── En validation ─────────────────────────────────────────
          if (enValidation.isNotEmpty) ...[
            _sectionHeader(
              'En attente de décision',
              '${enValidation.length} ATI(s) à valider',
              Colors.purple.shade700,
              Icons.pending_actions_rounded,
            ),
            const SizedBox(height: 10),
            ...enValidation.map((a) => _ATIPilotageCard(
                  ati: a,
                  accent: Colors.purple.shade700,
                  badge: '${a.slaDaysRemaining} j restant(s)',
                  badgeColor: a.slaDaysRemaining < 5
                      ? Colors.orange.shade700
                      : Colors.green.shade700,
                  onTap: () => _openATI(a),
                )),
            const SizedBox(height: 16),
          ],

          // ── En instruction ────────────────────────────────────────
          if (enInstruction.isNotEmpty) ...[
            _sectionHeader(
              'En instruction',
              '${enInstruction.length} ATI(s)',
              Colors.orange.shade700,
              Icons.manage_search_rounded,
            ),
            const SizedBox(height: 10),
            ...enInstruction.map((a) => _ATIPilotageCard(
                  ati: a,
                  accent: Colors.orange.shade700,
                  badge: '${a.slaDaysRemaining} j restant(s)',
                  badgeColor: a.slaDaysRemaining < 7
                      ? Colors.orange.shade700
                      : Colors.green.shade700,
                  onTap: () => _openATI(a),
                )),
            const SizedBox(height: 16),
          ],

          // ── Nouvelles soumissions ─────────────────────────────────
          if (soumis.isNotEmpty) ...[
            _sectionHeader(
              'Nouvelles soumissions',
              '${soumis.length} ATI(s) en attente d\'instruction',
              Colors.blue.shade700,
              Icons.inbox_rounded,
            ),
            const SizedBox(height: 10),
            ...soumis.map((a) => _ATIPilotageCard(
                  ati: a,
                  accent: Colors.blue.shade700,
                  badge: 'Soumis il y a ${a.ageJours} j',
                  badgeColor: Colors.blue.shade700,
                  onTap: () => _openATI(a),
                )),
            const SizedBox(height: 16),
          ],

          // ── Décisions récentes ────────────────────────────────────
          if (recentes.isNotEmpty) ...[
            _sectionHeader(
              'Décisions récentes',
              '30 derniers jours',
              Colors.grey.shade600,
              Icons.history_rounded,
            ),
            const SizedBox(height: 10),
            ...recentes.take(6).map((a) {
              final isApprove = a.statut == 'approuve';
              return _ATIPilotageCard(
                ati: a,
                accent: isApprove
                    ? Colors.green.shade700
                    : Colors.grey.shade500,
                badge: isApprove ? 'Approuvé' : 'Rejeté',
                badgeColor: isApprove
                    ? Colors.green.shade700
                    : Colors.red.shade700,
                onTap: () => _openATI(a),
              );
            }),
          ],
        ],
      ),
    );
  }

  void _openATI(AgrementTechniqueIndustriel ati) {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const ATIScreen()),
    );
  }

  // ── KPI band ──────────────────────────────────────────────────────────

  Widget _buildKpiBand(
      int retard, int validation, int approuves, int slaTaux) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [PnpiColors.deepSpace, const Color(0xFF1A237E)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: PnpiTheme.softShadows,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.account_tree_rounded, color: Colors.white60, size: 16),
              SizedBox(width: 6),
              Text('Pilotage ATI — Vue opérationnelle',
                  style: TextStyle(color: Colors.white60, fontSize: 12)),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              _kpi('Total ATI', '${_atis.length}', Colors.white),
              _kpi('En cours', '${_atis.where((a) => a.isActive).length}',
                  PnpiColors.lagoon),
              _kpi('En retard', '$retard', Colors.red.shade300),
              _kpi('Taux SLA', '$slaTaux %',
                  slaTaux >= 80 ? Colors.green.shade300 : Colors.orange.shade300),
            ],
          ),
        ],
      ),
    );
  }

  Widget _kpi(String label, String value, Color color) => Expanded(
        child: Column(
          children: [
            Text(value,
                style: TextStyle(
                    color: color,
                    fontSize: 20,
                    fontWeight: FontWeight.w800)),
            Text(label,
                style:
                    const TextStyle(color: Colors.white60, fontSize: 10)),
          ],
        ),
      );

  // ── Pipeline funnel ───────────────────────────────────────────────────

  Widget _buildPipeline(
      int soumis, int instruction, int validation, int approuves) {
    final steps = [
      ('Soumis', soumis, Colors.blue.shade700),
      ('Instruction', instruction, Colors.orange.shade700),
      ('Validation', validation, Colors.purple.shade700),
      ('Approuvés', approuves, Colors.green.shade700),
    ];
    final maxVal = steps.map((s) => s.$2).fold(0, (a, b) => a > b ? a : b);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: PnpiTheme.softShadows,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Pipeline ATI',
              style:
                  TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
          const SizedBox(height: 12),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: steps.asMap().entries.map((entry) {
              final i = entry.key;
              final s = entry.value;
              final barH = maxVal == 0 ? 0.0 : (s.$2 / maxVal) * 64.0;
              return Expanded(
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Expanded(
                      child: Column(
                        children: [
                          Text('${s.$2}',
                              style: TextStyle(
                                  color: s.$3,
                                  fontWeight: FontWeight.w800,
                                  fontSize: 16)),
                          const SizedBox(height: 4),
                          AnimatedContainer(
                            duration: const Duration(milliseconds: 600),
                            height: barH.clamp(6.0, 64.0),
                            decoration: BoxDecoration(
                              color: colorWithOpacity(s.$3, 0.75),
                              borderRadius: const BorderRadius.vertical(
                                  top: Radius.circular(6)),
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(s.$1,
                              textAlign: TextAlign.center,
                              style: const TextStyle(
                                  fontSize: 10, color: Colors.black54)),
                        ],
                      ),
                    ),
                    if (i < steps.length - 1)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 28),
                        child: Icon(Icons.chevron_right_rounded,
                            color: Colors.grey.shade300, size: 16),
                      ),
                  ],
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  // ── Section header ─────────────────────────────────────────────────────

  Widget _sectionHeader(
      String title, String subtitle, Color color, IconData icon) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(7),
          decoration: BoxDecoration(
            color: colorWithOpacity(color, 0.1),
            shape: BoxShape.circle,
          ),
          child: Icon(icon, color: color, size: 16),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title,
                  style: TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 14,
                      color: color)),
              Text(subtitle,
                  style: const TextStyle(
                      fontSize: 11, color: Colors.black45)),
            ],
          ),
        ),
      ],
    );
  }
}

// ── ATI pilotage card ─────────────────────────────────────────────────────

class _ATIPilotageCard extends StatelessWidget {
  final AgrementTechniqueIndustriel ati;
  final Color accent;
  final String badge;
  final Color badgeColor;
  final VoidCallback onTap;

  const _ATIPilotageCard({
    required this.ati,
    required this.accent,
    required this.badge,
    required this.badgeColor,
    required this.onTap,
  });

  String get _secteurLabel => switch (ati.secteur) {
        'bois' => 'Bois',
        'agroalimentaire' => 'Agro',
        'peche' => 'Pêche',
        'mines' => 'Mines',
        'btp' => 'BTP',
        'petrole' => 'Pétrole',
        _ => ati.secteur,
      };

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 9),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          boxShadow: PnpiTheme.softShadows,
          border: Border(left: BorderSide(color: accent, width: 4)),
        ),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          child: Row(
            children: [
              // Left: ATI info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      ati.numeroAti,
                      style: const TextStyle(
                          fontWeight: FontWeight.w700, fontSize: 13.5),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      ati.operateurNom,
                      style: const TextStyle(
                          color: Colors.black54, fontSize: 12.5),
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 5),
                    Row(
                      children: [
                        _chip(_secteurLabel, accent),
                        const SizedBox(width: 6),
                        _chip(ati.province, Colors.grey.shade600),
                        if (ati.priorite != 'normale') ...[
                          const SizedBox(width: 6),
                          _chip(
                            ati.priorite == 'urgente' ? 'URGENT' : 'ÉLEVÉ',
                            ati.priorite == 'urgente'
                                ? Colors.red.shade700
                                : Colors.orange.shade700,
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 10),
              // Right: SLA badge + arrow
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 9, vertical: 4),
                    decoration: BoxDecoration(
                      color: colorWithOpacity(badgeColor, 0.1),
                      borderRadius: BorderRadius.circular(99),
                      border: Border.all(
                          color: colorWithOpacity(badgeColor, 0.4)),
                    ),
                    child: Text(
                      badge,
                      style: TextStyle(
                          color: badgeColor,
                          fontWeight: FontWeight.w700,
                          fontSize: 10.5),
                    ),
                  ),
                  const SizedBox(height: 6),
                  Icon(Icons.chevron_right_rounded,
                      color: Colors.grey.shade400, size: 18),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _chip(String label, Color color) => Container(
        padding:
            const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
        decoration: BoxDecoration(
          color: colorWithOpacity(color, 0.1),
          borderRadius: BorderRadius.circular(99),
        ),
        child: Text(label,
            style: TextStyle(
                color: color,
                fontSize: 10,
                fontWeight: FontWeight.w600)),
      );
}
