import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../models/ati.dart';
import '../models/inspection_conformite.dart';
import '../models/operateur_industriel.dart';
import '../services/api_service.dart';
import '../theme/pnpi_theme.dart';

class BriefingScreen extends StatefulWidget {
  const BriefingScreen({super.key});

  @override
  State<BriefingScreen> createState() => _BriefingScreenState();
}

class _BriefingScreenState extends State<BriefingScreen> {
  late Future<_BriefingData> _future;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<_BriefingData> _load() async {
    final results = await Future.wait([
      ApiService.instance.fetchATIs(),
      ApiService.instance.fetchOperateurs(),
      ApiService.instance.fetchInspections(),
      ApiService.instance.fetchNotifications(),
    ]);
    return _BriefingData(
      atis: results[0] as List<AgrementTechniqueIndustriel>,
      operateurs: results[1] as List<OperateurIndustriel>,
      inspections: results[2] as List<InspectionConformite>,
      notifications: results[3] as List<AppNotification>,
    );
  }

  String _buildClipboardText(_BriefingData d) {
    final now = DateTime.now();
    final dateStr =
        '${now.day.toString().padLeft(2, '0')}/${now.month.toString().padLeft(2, '0')}/${now.year}';

    final actifs = d.atis.where((a) => a.isActive).length;
    final approuves = d.atis.where((a) => a.statut == 'approuve').length;
    final rejetes = d.atis.where((a) => a.statut == 'rejete').length;
    final enRetard = d.atis.where((a) => a.isOverdue).length;
    final slaTaux = d.atis.isEmpty
        ? 0
        : ((approuves / d.atis.length) * 100).round();
    final nonConformes =
        d.inspections.where((i) => i.isNonConforme).length;
    final critiques = d.notifications
        .where((n) => !n.isRead && n.severity == 'critical')
        .length;

    return '''BRIEFING PNPI — $dateStr
Ministère de l'Industrie | République Gabonaise

== ATI ==
En cours      : $actifs
Approuvés     : $approuves
Rejetés       : $rejetes
En retard SLA : $enRetard
Taux SLA      : $slaTaux %

== OPÉRATEURS ==
Total enregistrés : ${d.operateurs.length}
Conformes : ${d.operateurs.where((o) => o.statutConformite == 'conforme').length}
Non conformes : ${d.operateurs.where((o) => o.statutConformite == 'non_conforme').length}

== INSPECTIONS ==
Total : ${d.inspections.length}
Non-conformes : $nonConformes

== ALERTES ==
Notifications critiques non lues : $critiques

== PLAN 30/60/90 ==
J+30 : Réduire à zéro les ATI en retard SLA
J+60 : Atteindre 90 % de taux d'approbation mensuel
J+90 : Couvrir l'ensemble des 9 provinces par des inspections terrain
''';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Briefing Ministériel'),
        flexibleSpace: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [Color(0xFF005C33), Color(0xFFF2CD1B), Color(0xFF0044A8)],
            ),
          ),
        ),
        actions: [
          IconButton(
            tooltip: 'Copier la synthèse',
            icon: const Icon(Icons.copy_rounded),
            onPressed: () async {
              final data = await _future;
              final text = _buildClipboardText(data);
              await Clipboard.setData(ClipboardData(text: text));
              if (!context.mounted) return;
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Synthèse copiée dans le presse-papiers'),
                  backgroundColor: Color(0xFF2E7D32),
                ),
              );
            },
          ),
        ],
      ),
      body: FutureBuilder<_BriefingData>(
        future: _future,
        builder: (context, snap) {
          if (snap.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          if (!snap.hasData) {
            return const Center(
                child: Text('Impossible de charger le briefing.'));
          }
          return _buildContent(snap.data!);
        },
      ),
    );
  }

  Widget _buildContent(_BriefingData d) {
    final now = DateTime.now();
    final dateStr =
        '${now.day.toString().padLeft(2, '0')}/${now.month.toString().padLeft(2, '0')}/${now.year}';

    final actifs = d.atis.where((a) => a.isActive).length;
    final approuves = d.atis.where((a) => a.statut == 'approuve').length;
    final rejetes = d.atis.where((a) => a.statut == 'rejete').length;
    final enRetard = d.atis.where((a) => a.isOverdue).length;
    final slaTaux = d.atis.isEmpty
        ? 0
        : ((approuves / d.atis.length) * 100).round();

    final conformes =
        d.operateurs.where((o) => o.statutConformite == 'conforme').length;
    final nonConformesOp =
        d.operateurs.where((o) => o.statutConformite == 'non_conforme').length;

    final insConformes = d.inspections.where((i) => i.isConforme).length;
    final insNonConformes = d.inspections.where((i) => i.isNonConforme).length;
    final insPartielles = d.inspections.where((i) => i.isPartiel).length;

    final alertesCritiques = d.notifications
        .where((n) => !n.isRead && n.severity == 'critical')
        .toList();
    final alertesHigh = d.notifications
        .where((n) => !n.isRead && n.severity == 'high')
        .toList();

    // Secteur distribution
    final secteurMap = <String, int>{};
    for (final a in d.atis) {
      secteurMap[a.secteur] = (secteurMap[a.secteur] ?? 0) + 1;
    }
    final secteursSorted = secteurMap.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
      children: [
        // ── Hero ──────────────────────────────────────────────────────
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            gradient: PnpiTheme.heroGradient,
            borderRadius: BorderRadius.circular(20),
            boxShadow: PnpiTheme.softShadows,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(Icons.assessment_rounded,
                      color: Colors.white70, size: 18),
                  const SizedBox(width: 8),
                  Text(
                    'Briefing PNPI — $dateStr',
                    style: const TextStyle(
                        color: Colors.white70, fontSize: 12),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              const Text(
                'Plateforme Nationale de Pilotage Industriel',
                style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w800,
                    fontSize: 18),
              ),
              const SizedBox(height: 4),
              Text(
                'Ministère de l\'Industrie — République Gabonaise',
                style: TextStyle(
                    color: Colors.white.withAlpha(180), fontSize: 13),
              ),
              const SizedBox(height: 14),
              // Taux SLA highlight
              Row(
                children: [
                  _heroBadge(
                    '$slaTaux %',
                    'Taux SLA',
                    slaTaux >= 80
                        ? Colors.green.shade300
                        : Colors.orange.shade300,
                  ),
                  const SizedBox(width: 10),
                  _heroBadge(
                    '${d.atis.length}',
                    'ATIs total',
                    Colors.white60,
                  ),
                  const SizedBox(width: 10),
                  _heroBadge(
                    '${d.operateurs.length}',
                    'Opérateurs',
                    Colors.white60,
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // ── ATI pipeline ──────────────────────────────────────────────
        _section('Agréments Techniques Industriels (ATI)'),
        _kpiGrid([
          _KpiEntry('En cours', '$actifs', PnpiColors.lagoon, Icons.hourglass_top_rounded),
          _KpiEntry('Approuvés', '$approuves', Colors.green.shade700, Icons.check_circle_rounded),
          _KpiEntry('En retard', '$enRetard', Colors.red.shade700, Icons.warning_rounded),
          _KpiEntry('Rejetés', '$rejetes', Colors.grey.shade600, Icons.cancel_rounded),
        ]),
        const SizedBox(height: 12),
        _pipelineCard(d.atis),
        const SizedBox(height: 16),

        // ── Opérateurs ────────────────────────────────────────────────
        _section('Opérateurs Industriels'),
        _kpiGrid([
          _KpiEntry('Total', '${d.operateurs.length}', PnpiColors.oceanPulse, Icons.business_rounded),
          _KpiEntry('Conformes', '$conformes', Colors.green.shade700, Icons.verified_rounded),
          _KpiEntry('Non conf.', '$nonConformesOp', Colors.red.shade700, Icons.block_rounded),
          _KpiEntry('En attente', '${d.operateurs.length - conformes - nonConformesOp}',
              Colors.amber.shade700, Icons.pending_rounded),
        ]),
        const SizedBox(height: 16),

        // ── Secteurs ──────────────────────────────────────────────────
        if (secteursSorted.isNotEmpty) ...[
          _section('Répartition sectorielle'),
          _secteurCard(secteursSorted, d.atis.length),
          const SizedBox(height: 16),
        ],

        // ── Inspections ───────────────────────────────────────────────
        _section('Inspections de Conformité'),
        _kpiGrid([
          _KpiEntry('Total', '${d.inspections.length}', PnpiColors.lagoon, Icons.fact_check_rounded),
          _KpiEntry('Conformes', '$insConformes', Colors.green.shade700, Icons.check_rounded),
          _KpiEntry('Non conf.', '$insNonConformes', Colors.red.shade700, Icons.close_rounded),
          _KpiEntry('Partielles', '$insPartielles', Colors.orange.shade700, Icons.remove_rounded),
        ]),
        const SizedBox(height: 16),

        // ── Alertes ───────────────────────────────────────────────────
        _section('Alertes Actives'),
        if (alertesCritiques.isEmpty && alertesHigh.isEmpty)
          _emptyAlerts()
        else ...[
          ...alertesCritiques.map((n) => _alertCard(n, Colors.red.shade700)),
          ...alertesHigh.map((n) => _alertCard(n, Colors.deepOrange)),
        ],
        const SizedBox(height: 16),

        // ── Plan 30/60/90 ─────────────────────────────────────────────
        _section('Plan 30 / 60 / 90 jours'),
        _planCard(),
      ],
    );
  }

  // ── Widget builders ───────────────────────────────────────────────────

  Widget _heroBadge(String value, String label, Color color) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(value,
              style: TextStyle(
                  color: color, fontSize: 22, fontWeight: FontWeight.w800)),
          Text(label,
              style: const TextStyle(color: Colors.white60, fontSize: 11)),
        ],
      );

  Widget _section(String label) => Padding(
        padding: const EdgeInsets.only(bottom: 10),
        child: Row(
          children: [
            Container(
                width: 3,
                height: 16,
                decoration: BoxDecoration(
                    color: PnpiColors.lagoon,
                    borderRadius: BorderRadius.circular(2))),
            const SizedBox(width: 8),
            Text(label,
                style: const TextStyle(
                    fontWeight: FontWeight.w700, fontSize: 15)),
          ],
        ),
      );

  Widget _kpiGrid(List<_KpiEntry> entries) => GridView.count(
        crossAxisCount: 4,
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        mainAxisSpacing: 10,
        crossAxisSpacing: 10,
        childAspectRatio: 0.9,
        children: entries.map((e) => _kpiBox(e)).toList(),
      );

  Widget _kpiBox(_KpiEntry e) => Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          boxShadow: PnpiTheme.softShadows,
        ),
        padding: const EdgeInsets.all(10),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(e.icon, color: e.color, size: 20),
            const SizedBox(height: 4),
            Text(e.value,
                style: TextStyle(
                    color: e.color,
                    fontSize: 18,
                    fontWeight: FontWeight.w800)),
            Text(e.label,
                textAlign: TextAlign.center,
                style: const TextStyle(
                    color: Colors.black54, fontSize: 10, height: 1.2)),
          ],
        ),
      );

  Widget _pipelineCard(List<AgrementTechniqueIndustriel> atis) {
    final steps = [
      ('soumis', 'Soumis', Colors.blue.shade700),
      ('en_instruction', 'Instruction', Colors.orange.shade700),
      ('en_validation', 'Validation', Colors.purple.shade700),
      ('approuve', 'Approuvé', Colors.green.shade700),
    ];
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        boxShadow: PnpiTheme.softShadows,
      ),
      child: Row(
        children: steps.asMap().entries.map((entry) {
          final i = entry.key;
          final s = entry.value;
          final count = atis.where((a) => a.statut == s.$1).length;
          return Expanded(
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    children: [
                      Container(
                        width: 38,
                        height: 38,
                        decoration: BoxDecoration(
                          color: colorWithOpacity(s.$3, 0.12),
                          shape: BoxShape.circle,
                          border: Border.all(
                              color: colorWithOpacity(s.$3, 0.4)),
                        ),
                        child: Center(
                          child: Text(
                            '$count',
                            style: TextStyle(
                                color: s.$3,
                                fontWeight: FontWeight.w800,
                                fontSize: 14),
                          ),
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(s.$2,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                              fontSize: 10, color: Colors.black54)),
                    ],
                  ),
                ),
                if (i < steps.length - 1)
                  Icon(Icons.chevron_right_rounded,
                      color: Colors.grey.shade300, size: 18),
              ],
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _secteurCard(
      List<MapEntry<String, int>> entries, int total) {
    final labels = <String, String>{
      'bois': 'Bois',
      'agroalimentaire': 'Agroalim.',
      'peche': 'Pêche',
      'mines': 'Mines',
      'btp': 'BTP',
      'petrole': 'Pétrole',
      'services': 'Services',
    };
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        boxShadow: PnpiTheme.softShadows,
      ),
      child: Column(
        children: entries.take(6).map((e) {
          final ratio = total == 0 ? 0.0 : e.value / total;
          final color = _secteurColor(e.key);
          return Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Row(
              children: [
                SizedBox(
                  width: 72,
                  child: Text(
                    labels[e.key] ?? e.key,
                    style: const TextStyle(fontSize: 12, color: Colors.black54),
                  ),
                ),
                Expanded(
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(
                      value: ratio,
                      backgroundColor: Colors.grey.shade100,
                      valueColor: AlwaysStoppedAnimation(color),
                      minHeight: 10,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                SizedBox(
                  width: 26,
                  child: Text(
                    '${e.value}',
                    textAlign: TextAlign.right,
                    style: TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 12,
                        color: color),
                  ),
                ),
              ],
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _alertCard(AppNotification n, Color color) => Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: colorWithOpacity(color, 0.06),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: colorWithOpacity(color, 0.3)),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(Icons.warning_rounded, color: color, size: 18),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(n.title,
                      style: TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: 13,
                          color: color)),
                  const SizedBox(height: 3),
                  Text(n.message,
                      style: const TextStyle(
                          fontSize: 12.5, color: Colors.black54, height: 1.3)),
                ],
              ),
            ),
          ],
        ),
      );

  Widget _emptyAlerts() => Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: colorWithOpacity(Colors.green.shade700, 0.07),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
              color: colorWithOpacity(Colors.green.shade700, 0.3)),
        ),
        child: Row(
          children: [
            Icon(Icons.check_circle_rounded,
                color: Colors.green.shade700, size: 20),
            const SizedBox(width: 10),
            Text('Aucune alerte critique active.',
                style: TextStyle(
                    color: Colors.green.shade700,
                    fontWeight: FontWeight.w600,
                    fontSize: 13)),
          ],
        ),
      );

  Widget _planCard() {
    final plans = [
      (
        30,
        'Réduire à zéro les ATI dépassant le SLA — relance instructeurs',
        Colors.red.shade700
      ),
      (
        60,
        'Atteindre 90 % de taux d\'approbation mensuel — optimiser instruction',
        Colors.orange.shade700
      ),
      (
        90,
        'Couvrir les 9 provinces avec au moins une inspection terrain chacune',
        Colors.green.shade700
      ),
    ];
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        boxShadow: PnpiTheme.softShadows,
      ),
      child: Column(
        children: plans.map((p) => Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 42,
                    height: 42,
                    decoration: BoxDecoration(
                      color: colorWithOpacity(p.$3, 0.12),
                      shape: BoxShape.circle,
                    ),
                    child: Center(
                      child: Text(
                        'J+${p.$1}',
                        style: TextStyle(
                            color: p.$3,
                            fontWeight: FontWeight.w800,
                            fontSize: 11),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Text(p.$2,
                          style: const TextStyle(
                              fontSize: 13, color: Colors.black87, height: 1.4)),
                    ),
                  ),
                ],
              ),
            )).toList(),
      ),
    );
  }

  Color _secteurColor(String s) => switch (s) {
        'bois' => Colors.brown.shade600,
        'agroalimentaire' => Colors.green.shade600,
        'peche' => Colors.blue.shade600,
        'mines' => Colors.grey.shade600,
        'btp' => Colors.deepOrange.shade600,
        'petrole' => Colors.blueGrey.shade700,
        _ => PnpiColors.lagoon,
      };
}

class _KpiEntry {
  final String label;
  final String value;
  final Color color;
  final IconData icon;

  const _KpiEntry(this.label, this.value, this.color, this.icon);
}

class _BriefingData {
  final List<AgrementTechniqueIndustriel> atis;
  final List<OperateurIndustriel> operateurs;
  final List<InspectionConformite> inspections;
  final List<AppNotification> notifications;

  const _BriefingData({
    required this.atis,
    required this.operateurs,
    required this.inspections,
    required this.notifications,
  });
}
