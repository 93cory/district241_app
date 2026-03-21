import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';

import '../models/ati.dart';
import '../services/api_service.dart';
import '../theme/pnpi_theme.dart';
import '../widgets/skeleton_loader.dart';

class PNPIDashboardScreen extends StatefulWidget {
  const PNPIDashboardScreen({super.key});

  @override
  State<PNPIDashboardScreen> createState() => _PNPIDashboardScreenState();
}

class _PNPIDashboardScreenState extends State<PNPIDashboardScreen> {
  late Future<_PNPIData> _future;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<_PNPIData> _load() async {
    final results = await Future.wait([
      ApiService.instance.fetchPNPIDashboardKpis(),
      ApiService.instance.fetchPNPITendances(),
      ApiService.instance.fetchATIs(),
    ]);
    return _PNPIData(
      kpis: results[0] as PNPIDashboardKpis,
      tendances: results[1] as List<MensuelStats>,
      atis: results[2] as List<AgrementTechniqueIndustriel>,
    );
  }

  Future<void> _refresh() async {
    setState(() => _future = _load());
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<_PNPIData>(
      future: _future,
      builder: (context, snap) {
        if (snap.connectionState != ConnectionState.done) {
          return const SkeletonDashboard();
        }
        if (!snap.hasData) {
          return const Center(child: Text('Impossible de charger le tableau de bord'));
        }
        final data = snap.data!;
        return RefreshIndicator(
          onRefresh: _refresh,
          child: ListView(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
            children: [
              _buildHero(data),
              const SizedBox(height: 18),
              _buildPipeline(data),
              const SizedBox(height: 18),
              _buildSecteurChart(data),
              const SizedBox(height: 18),
              _buildProvinceBreakdown(data),
              const SizedBox(height: 18),
              _buildTendances(data),
              const SizedBox(height: 18),
              _buildRecentATIs(data),
              const SizedBox(height: 8),
            ],
          ),
        );
      },
    );
  }

  // ─── Hero KPI card ────────────────────────────────────────────────────────

  Widget _buildHero(_PNPIData data) {
    final kpis = data.kpis;
    final enCours = kpis.atisEnCours;
    final overdueCount = kpis.atisEnRetard;
    final delaiMoyen = kpis.delaiMoyenJours.round();
    final tauxSLA = kpis.tauxSlaPct.round();
    final opsActifs = kpis.operateursActifs;

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: PnpiTheme.heroGradient,
        borderRadius: BorderRadius.circular(24),
        boxShadow: PnpiTheme.softShadows,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.approval_rounded, color: Colors.white70, size: 20),
              const SizedBox(width: 8),
              const Expanded(
                child: Text(
                  'Tableau de bord ATI — PNPI',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                    fontSize: 16,
                  ),
                ),
              ),
              Semantics(
                button: true,
                label: 'Rafraîchir le tableau de bord',
                child: GestureDetector(
                  onTap: _refresh,
                  child: const Icon(Icons.refresh, color: Colors.white70, size: 20),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          const Text(
            'Agréments Techniques Industriels — Gabon',
            style: TextStyle(color: Colors.white60, fontSize: 12),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              _heroKpi('En cours', '$enCours', Icons.pending_actions_rounded),
              const SizedBox(width: 8),
              _heroKpi('Délai moyen', '$delaiMoyen j', Icons.timer_rounded),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              _heroKpiColored(
                'Taux SLA',
                '$tauxSLA %',
                Icons.verified_rounded,
                tauxSLA >= 80 ? Colors.greenAccent : Colors.orangeAccent,
              ),
              const SizedBox(width: 8),
              _heroKpiColored(
                'Hors délai',
                '$overdueCount',
                Icons.warning_amber_rounded,
                overdueCount == 0 ? Colors.greenAccent : Colors.redAccent,
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              _heroKpi(
                  'Opérateurs actifs', '$opsActifs', Icons.business_rounded),
              const SizedBox(width: 8),
              _heroKpi(
                  'Taux conformité',
                  '${kpis.tauxConformitePct.toStringAsFixed(0)} %',
                  Icons.factory_rounded),
            ],
          ),
        ],
      ),
    );
  }

  Widget _heroKpi(String label, String value, IconData icon) {
    return Expanded(
      child: Semantics(
        label: '$label: $value',
        child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: Colors.white24,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: Colors.white38),
        ),
        child: Row(
          children: [
            Icon(icon, color: Colors.white70, size: 18),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label,
                      style: const TextStyle(
                          color: Colors.white60, fontSize: 10)),
                  Text(value,
                      style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w800,
                          fontSize: 15)),
                ],
              ),
            ),
          ],
        ),
      ),
      ),
    );
  }

  Widget _heroKpiColored(
      String label, String value, IconData icon, Color accent) {
    return Expanded(
      child: Semantics(
        label: '$label: $value',
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            color: Colors.white24,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: Colors.white38),
          ),
          child: Row(
            children: [
              Icon(icon, color: accent, size: 18),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(label,
                        style:
                            const TextStyle(color: Colors.white60, fontSize: 10)),
                    Text(value,
                        style: TextStyle(
                            color: accent,
                            fontWeight: FontWeight.w800,
                            fontSize: 15)),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ─── Pipeline funnel ──────────────────────────────────────────────────────

  Widget _buildPipeline(_PNPIData data) {
    final soumis = data.atis.where((a) => a.statut == 'soumis').length;
    final instruction =
        data.atis.where((a) => a.statut == 'en_instruction').length;
    final validation =
        data.atis.where((a) => a.statut == 'en_validation').length;
    final approuves =
        data.atis.where((a) => a.statut == 'approuve').length;

    final stages = [
      (label: 'Soumis', count: soumis, color: Colors.blue.shade600),
      (label: 'Instruction', count: instruction, color: Colors.orange.shade700),
      (
        label: 'Validation',
        count: validation,
        color: Colors.purple.shade700
      ),
      (label: 'Approuvés', count: approuves, color: Colors.green.shade700),
    ];

    return _sectionCard(
      title: 'Pipeline ATI',
      subtitle: 'Flux de traitement des agréments',
      icon: Icons.account_tree_rounded,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          for (int i = 0; i < stages.length; i++) ...[
            Expanded(child: _pipelineStep(stages[i].label, stages[i].count, stages[i].color)),
            if (i < stages.length - 1)
              Icon(Icons.arrow_forward_ios_rounded,
                  size: 14, color: Colors.black26),
          ],
        ],
      ),
    );
  }

  Widget _pipelineStep(String label, int count, Color color) {
    return Column(
      children: [
        Container(
          width: 52,
          height: 52,
          decoration: BoxDecoration(
            color: colorWithOpacity(color, 0.15),
            shape: BoxShape.circle,
            border: Border.all(color: colorWithOpacity(color, 0.5), width: 2),
          ),
          alignment: Alignment.center,
          child: Text(
            '$count',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w800,
              color: color,
            ),
          ),
        ),
        const SizedBox(height: 6),
        Text(
          label,
          style: const TextStyle(fontSize: 11, color: Colors.black54),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }

  // ─── Secteur BarChart ─────────────────────────────────────────────────────

  Widget _buildSecteurChart(_PNPIData data) {
    final secteurCounts = <String, int>{};
    for (final ati in data.atis) {
      secteurCounts[ati.secteur] = (secteurCounts[ati.secteur] ?? 0) + 1;
    }
    final entries = secteurCounts.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));

    if (entries.isEmpty) return const SizedBox.shrink();

    final colors = [
      Colors.brown.shade600,
      Colors.green.shade600,
      Colors.blue.shade600,
      Colors.grey.shade700,
      Colors.deepOrange.shade600,
      Colors.blueGrey.shade700,
    ];

    final maxVal = entries.first.value.toDouble();

    String secteurLabel(String s) => switch (s) {
          'bois' => 'Bois',
          'agroalimentaire' => 'Agro',
          'peche' => 'Pêche',
          'mines' => 'Mines',
          'btp' => 'BTP',
          'petrole' => 'Pétrole',
          _ => s,
        };

    final barGroups = entries.indexed.map((entry) {
      final idx = entry.$1;
      final e = entry.$2;
      return BarChartGroupData(
        x: idx,
        barRods: [
          BarChartRodData(
            toY: e.value.toDouble(),
            color: colors[idx % colors.length],
            width: 22,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(6)),
          ),
        ],
      );
    }).toList();

    return _sectionCard(
      title: 'ATIs par secteur',
      subtitle: 'Répartition des agréments par filière industrielle',
      icon: Icons.bar_chart_rounded,
      child: SizedBox(
        height: 160,
        child: BarChart(
          BarChartData(
            maxY: maxVal + 1,
            barGroups: barGroups,
            titlesData: FlTitlesData(
              leftTitles: AxisTitles(
                sideTitles: SideTitles(showTitles: false),
              ),
              rightTitles: AxisTitles(
                sideTitles: SideTitles(showTitles: false),
              ),
              topTitles: AxisTitles(
                sideTitles: SideTitles(showTitles: false),
              ),
              bottomTitles: AxisTitles(
                sideTitles: SideTitles(
                  showTitles: true,
                  getTitlesWidget: (value, meta) {
                    final idx = value.toInt();
                    if (idx < 0 || idx >= entries.length) {
                      return const SizedBox.shrink();
                    }
                    return Padding(
                      padding: const EdgeInsets.only(top: 6),
                      child: Text(
                        secteurLabel(entries[idx].key),
                        style: const TextStyle(
                            fontSize: 10, color: Colors.black54),
                      ),
                    );
                  },
                ),
              ),
            ),
            gridData: FlGridData(
              drawVerticalLine: false,
              getDrawingHorizontalLine: (value) => FlLine(
                color: Colors.grey.shade200,
                strokeWidth: 1,
              ),
            ),
            borderData: FlBorderData(show: false),
            barTouchData: BarTouchData(
              touchTooltipData: BarTouchTooltipData(
                getTooltipItem: (group, groupIndex, rod, rodIndex) {
                  final entry = entries[group.x];
                  return BarTooltipItem(
                    '${secteurLabel(entry.key)}\n${rod.toY.toInt()} ATI(s)',
                    const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w700,
                        fontSize: 12),
                  );
                },
              ),
            ),
          ),
        ),
      ),
    );
  }

  // ─── Province breakdown ───────────────────────────────────────────────────

  Widget _buildProvinceBreakdown(_PNPIData data) {
    final provinceCounts = <String, int>{};
    for (final ati in data.atis) {
      if (ati.province.isNotEmpty) {
        provinceCounts[ati.province] =
            (provinceCounts[ati.province] ?? 0) + 1;
      }
    }
    final entries = provinceCounts.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));

    final total = data.atis.length;
    if (entries.isEmpty || total == 0) return const SizedBox.shrink();

    return _sectionCard(
      title: 'Répartition provinciale',
      subtitle: 'ATIs par province du Gabon',
      icon: Icons.map_outlined,
      child: Column(
        children: entries.map((e) {
          final ratio = e.value / total;
          return Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: Row(
              children: [
                SizedBox(
                  width: 110,
                  child: Text(
                    e.key,
                    style: const TextStyle(
                        fontSize: 12, fontWeight: FontWeight.w600),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                Expanded(
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(99),
                    child: LinearProgressIndicator(
                      value: ratio,
                      minHeight: 10,
                      backgroundColor: Colors.grey.shade100,
                      color: PnpiColors.oceanPulse,
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                SizedBox(
                  width: 28,
                  child: Text(
                    '${e.value}',
                    style: const TextStyle(
                        fontSize: 12, fontWeight: FontWeight.w700),
                    textAlign: TextAlign.right,
                  ),
                ),
              ],
            ),
          );
        }).toList(),
      ),
    );
  }

  // ─── Recent ATIs table ────────────────────────────────────────────────────

  // ─── Tendances mensuelles (LineChart) ─────────────────────────────────────

  Widget _buildTendances(_PNPIData data) {
    final tendances = data.tendances;
    if (tendances.isEmpty) return const SizedBox.shrink();

    // Keep last 8 months max
    final items = tendances.length > 8
        ? tendances.sublist(tendances.length - 8)
        : tendances;
    final n = items.length;

    String moisAbbr(String mois) {
      final parts = mois.split('-');
      if (parts.length < 2) return mois;
      const abbr = ['', 'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun',
        'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
      final m = int.tryParse(parts[1]) ?? 0;
      return abbr[m.clamp(0, 12)];
    }

    final labels = items.map((e) => moisAbbr(e.mois)).toList();
    final soumisData = items.map((e) => e.nbSoumis.toDouble()).toList();
    final approuvesData = items.map((e) => e.nbApprouves.toDouble()).toList();

    final allVals = [...soumisData, ...approuvesData];
    final maxY = (allVals.reduce((a, b) => a > b ? a : b) + 2).clamp(4.0, double.infinity);

    return _sectionCard(
      title: 'Tendances mensuelles',
      subtitle: 'Soumissions vs approbations (${items.first.mois} → ${items.last.mois})',
      icon: Icons.trending_up_rounded,
      child: SizedBox(
        height: 160,
        child: LineChart(
          LineChartData(
            gridData: FlGridData(
              show: true,
              drawVerticalLine: false,
              horizontalInterval: 2,
              getDrawingHorizontalLine: (_) => FlLine(
                color: Colors.grey.shade200,
                strokeWidth: 1,
              ),
            ),
            borderData: FlBorderData(show: false),
            titlesData: FlTitlesData(
              leftTitles: AxisTitles(
                sideTitles: SideTitles(
                  showTitles: true,
                  reservedSize: 24,
                  interval: 2,
                  getTitlesWidget: (v, _) => Text(
                    v.toInt().toString(),
                    style: const TextStyle(fontSize: 10, color: Colors.black38),
                  ),
                ),
              ),
              bottomTitles: AxisTitles(
                sideTitles: SideTitles(
                  showTitles: true,
                  reservedSize: 22,
                  getTitlesWidget: (v, _) {
                    final i = v.toInt();
                    if (i < 0 || i >= labels.length) return const SizedBox.shrink();
                    return Text(labels[i],
                        style: const TextStyle(fontSize: 10, color: Colors.black45));
                  },
                ),
              ),
              topTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
              rightTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
            ),
            minX: 0,
            maxX: (n - 1).toDouble(),
            minY: 0,
            maxY: maxY,
            lineTouchData: LineTouchData(
              touchTooltipData: LineTouchTooltipData(
                getTooltipItems: (spots) => spots.map((s) {
                  final isSubmis = s.barIndex == 0;
                  return LineTooltipItem(
                    '${s.y.toInt()} ${isSubmis ? 'soumis' : 'approuvés'}',
                    TextStyle(
                      color: isSubmis ? PnpiColors.lagoon : const Color(0xFF2E7D32),
                      fontWeight: FontWeight.w700,
                      fontSize: 11,
                    ),
                  );
                }).toList(),
              ),
            ),
            lineBarsData: [
              LineChartBarData(
                spots: List.generate(n, (i) => FlSpot(i.toDouble(), soumisData[i])),
                isCurved: true,
                color: PnpiColors.lagoon,
                barWidth: 2.5,
                dotData: FlDotData(
                  show: true,
                  getDotPainter: (s, x, b, i) => FlDotCirclePainter(
                    radius: 3.5,
                    color: PnpiColors.lagoon,
                    strokeWidth: 1.5,
                    strokeColor: Colors.white,
                  ),
                ),
                belowBarData: BarAreaData(
                  show: true,
                  color: colorWithOpacity(PnpiColors.lagoon, 0.07),
                ),
              ),
              LineChartBarData(
                spots: List.generate(n, (i) => FlSpot(i.toDouble(), approuvesData[i])),
                isCurved: true,
                color: const Color(0xFF2E7D32),
                barWidth: 2.5,
                dotData: FlDotData(
                  show: true,
                  getDotPainter: (s, x, b, i) => FlDotCirclePainter(
                    radius: 3.5,
                    color: const Color(0xFF2E7D32),
                    strokeWidth: 1.5,
                    strokeColor: Colors.white,
                  ),
                ),
                belowBarData: BarAreaData(
                  show: true,
                  color: colorWithOpacity(const Color(0xFF2E7D32), 0.06),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildRecentATIs(_PNPIData data) {
    final sorted = [...data.atis]
      ..sort((a, b) => b.dateSoumission.compareTo(a.dateSoumission));
    final recent = sorted.take(6).toList();

    return _sectionCard(
      title: 'ATIs récents',
      subtitle: 'Dernières demandes soumises',
      icon: Icons.receipt_long_rounded,
      child: Column(
        children: recent.map((ati) => _recentATIRow(ati)).toList(),
      ),
    );
  }

  Widget _recentATIRow(AgrementTechniqueIndustriel ati) {
    final color = _statutColor(ati.statut);
    return Semantics(
      label: '${ati.numeroAti} — ${ati.operateurNom} — ${ati.statutLabel}',
      child: Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: colorWithOpacity(color, 0.05),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: colorWithOpacity(color, 0.2)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  ati.numeroAti,
                  style: const TextStyle(
                      fontWeight: FontWeight.w700, fontSize: 12.5),
                ),
                const SizedBox(height: 2),
                Text(
                  ati.operateurNom,
                  style: const TextStyle(color: Colors.black54, fontSize: 11.5),
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: colorWithOpacity(color, 0.15),
                  borderRadius: BorderRadius.circular(99),
                ),
                child: Text(
                  ati.statutLabel,
                  style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w700,
                      color: color),
                ),
              ),
              const SizedBox(height: 3),
              Text(
                _formatDate(ati.dateSoumission),
                style:
                    const TextStyle(fontSize: 10.5, color: Colors.black38),
              ),
            ],
          ),
        ],
      ),
      ),
    );
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  Color _statutColor(String statut) => switch (statut) {
        'soumis' => Colors.blue.shade700,
        'en_instruction' => Colors.orange.shade700,
        'en_validation' => Colors.purple.shade700,
        'approuve' => Colors.green.shade700,
        'rejete' => Colors.red.shade700,
        'expire' => Colors.grey.shade600,
        _ => PnpiColors.lagoon,
      };

  String _formatDate(DateTime dt) =>
      '${dt.day.toString().padLeft(2, '0')}/'
      '${dt.month.toString().padLeft(2, '0')}/'
      '${dt.year}';

  Widget _sectionCard({
    required String title,
    required String subtitle,
    required IconData icon,
    required Widget child,
  }) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: PnpiTheme.softShadows,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 18, color: PnpiColors.deepSpace),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                          fontWeight: FontWeight.w700, fontSize: 14),
                    ),
                    Text(
                      subtitle,
                      style: const TextStyle(
                          color: Colors.black45, fontSize: 11),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          child,
        ],
      ),
    );
  }
}

class _PNPIData {
  final PNPIDashboardKpis kpis;
  final List<MensuelStats> tendances;
  final List<AgrementTechniqueIndustriel> atis;

  const _PNPIData({
    required this.kpis,
    required this.tendances,
    required this.atis,
  });
}
