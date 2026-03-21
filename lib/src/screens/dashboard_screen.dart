import 'package:flutter/material.dart';

import '../models/forecast_point.dart';
import '../models/sector_indicator.dart';
import '../services/api_service.dart';
import '../theme/pnpi_theme.dart';
import '../widgets/skeleton_loader.dart';
import '../widgets/metric_card.dart';
import '../widgets/section_title.dart';
import 'pitch_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  late Future<_DashboardData> _future;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<_DashboardData> _load() async {
    final snapshot = await ApiService.instance.fetchDashboardSnapshot();
    final forecast = await ApiService.instance.fetchForecast();
    final alerts = await ApiService.instance.fetchDashboardAlerts();
    return _DashboardData(snapshot: snapshot, forecast: forecast, alerts: alerts);
  }

  Future<void> _refresh() async {
    final data = await _load();
    if (!mounted) return;
    setState(() => _future = Future.value(data));
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<_DashboardData>(
      future: _future,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const SkeletonDashboard();
        }
        if (!snapshot.hasData) {
          return const Center(child: Text('Impossible de charger le dashboard'));
        }

        final data = snapshot.data!;
        return RefreshIndicator(
          onRefresh: _refresh,
          child: ListView(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
            children: [
              _AnimatedBlock(
                delayMs: 0,
                child: _buildHero(context, data),
              ),
              const SizedBox(height: 16),
              _AnimatedBlock(
                delayMs: 90,
                child: _buildKpiGrid(data.snapshot),
              ),
              const SizedBox(height: 20),
              _AnimatedBlock(
                delayMs: 180,
                child: _buildAlerts(data.alerts),
              ),
              const SizedBox(height: 20),
              _AnimatedBlock(
                delayMs: 270,
                child: _buildForecast(data.forecast),
              ),
              const SizedBox(height: 20),
              _AnimatedBlock(
                delayMs: 360,
                child: _buildSectorPanel(data.snapshot.indicators),
              ),
              const SizedBox(height: 20),
              _AnimatedBlock(
                delayMs: 450,
                child: _buildRoadmapCards(),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildHero(BuildContext context, _DashboardData data) {
    final index = (data.snapshot.nationalIndex * 100).toStringAsFixed(1);
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
          const Text(
            'PNPI - Pilotage National',
            style: TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.w700,
              fontSize: 20,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Souverainete economique par la transformation locale et la tracabilite industrielle.',
            style: TextStyle(color: Colors.white70, height: 1.35),
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              _heroBadge('Indice national', '$index %'),
              const SizedBox(width: 10),
              _heroBadge('Import gap', '${data.snapshot.importGapTons.toStringAsFixed(0)} T'),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => PitchScreen(
                          snapshot: data.snapshot,
                          alerts: data.alerts,
                          forecast: data.forecast,
                        ),
                      ),
                    );
                  },
                  icon: const Icon(Icons.present_to_all),
                  label: const Text('Mode Pitch'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: PnpiColors.deepSpace,
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _refresh,
                  icon: const Icon(Icons.refresh, color: Colors.white),
                  label: const Text('Rafraichir', style: TextStyle(color: Colors.white)),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: Colors.white54),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _heroBadge(String label, String value) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: Colors.white24,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: Colors.white38),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: const TextStyle(color: Colors.white70, fontSize: 11)),
            const SizedBox(height: 3),
            Text(
              value,
              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildKpiGrid(DashboardSnapshot snapshot) {
    return Column(
      children: [
        Row(
          children: [
            Expanded(
              child: MetricCard(
                label: 'Emplois industriels',
                value: snapshot.jobsCreated.toString(),
                icon: Icons.groups_2,
                color: PnpiColors.lagoon,
                footnote: 'Crees sur les chaines locales',
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: MetricCard(
                label: 'Unites actives',
                value: snapshot.activeUnits.toString(),
                icon: Icons.factory,
                color: PnpiColors.oceanPulse,
                footnote: 'Production en cours',
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(
              child: MetricCard(
                label: 'Zones actives',
                value: snapshot.activeZones.toString(),
                icon: Icons.map,
                color: PnpiColors.deepSpace,
                footnote: 'Territoires industrialises',
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: MetricCard(
                label: 'Lots traces',
                value: snapshot.tracedBatches.toString(),
                icon: Icons.qr_code_2,
                color: PnpiColors.luminousGold,
                footnote: 'Tracabilite lot par lot',
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildAlerts(List<DashboardAlert> alerts) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SectionTitle(
          title: 'Alertes Prioritaires',
          subtitle: 'Signaux critiques a traiter immediatement',
        ),
        const SizedBox(height: 10),
        if (alerts.isEmpty)
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              boxShadow: PnpiTheme.softShadows,
            ),
            child: const Text('Aucune alerte ouverte sur le cycle en cours.'),
          )
        else
          ...alerts.take(4).map((alert) {
            final color = switch (alert.severity) {
              'critical' => Colors.red.shade900,
              'high' => Colors.redAccent,
              'medium' => Colors.orange,
              _ => PnpiColors.oceanPulse,
            };
            return Container(
              margin: const EdgeInsets.only(bottom: 10),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: colorWithOpacity(color, 0.5)),
                boxShadow: PnpiTheme.softShadows,
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Icons.warning_amber_rounded, color: color),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          alert.title,
                          style: const TextStyle(fontWeight: FontWeight.w700),
                        ),
                        const SizedBox(height: 4),
                        Text(alert.detail, style: const TextStyle(color: Colors.black87)),
                        const SizedBox(height: 2),
                        Text(
                          '${alert.source} - ${alert.severity.toUpperCase()}',
                          style: const TextStyle(fontSize: 12, color: Colors.black54),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            );
          }),
      ],
    );
  }

  Widget _buildForecast(List<ForecastPoint> forecast) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SectionTitle(
          title: 'Trajectoire de Production',
          subtitle: 'Projection sur les prochains mois',
        ),
        const SizedBox(height: 10),
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            boxShadow: PnpiTheme.softShadows,
          ),
          child: Column(
            children: forecast.map((point) {
              return Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Row(
                  children: [
                    SizedBox(
                      width: 74,
                      child: Text(
                        point.month,
                        style: const TextStyle(fontWeight: FontWeight.w700),
                      ),
                    ),
                    Expanded(
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(99),
                        child: LinearProgressIndicator(
                          value: (point.volumeTons / 1200).clamp(0, 1),
                          minHeight: 10,
                          backgroundColor: const Color(0xFFE8EDF4),
                          color: PnpiColors.oceanPulse,
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Text('${point.volumeTons.toStringAsFixed(0)} T'),
                  ],
                ),
              );
            }).toList(),
          ),
        ),
      ],
    );
  }

  Widget _buildSectorPanel(List<SectorIndicator> indicators) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SectionTitle(
          title: 'Secteurs Strategiques',
          subtitle: 'Comparaison local vs import et emplois',
        ),
        const SizedBox(height: 10),
        ...indicators.map((indicator) {
          final dominantLocal = indicator.localVolumeTons >= indicator.importVolumeTons;
          final accent = dominantLocal ? PnpiColors.lagoon : PnpiColors.oceanPulse;
          return Container(
            margin: const EdgeInsets.only(bottom: 10),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [colorWithOpacity(accent, 0.16), Colors.white],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: colorWithOpacity(accent, 0.4)),
            ),
            child: Row(
              children: [
                CircleAvatar(
                  backgroundColor: accent,
                  child: Text(
                    indicator.sector.substring(0, 1),
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        indicator.sector,
                        style: const TextStyle(fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Local ${indicator.localVolumeTons.toStringAsFixed(0)} T / Import ${indicator.importVolumeTons.toStringAsFixed(0)} T',
                        style: const TextStyle(color: Colors.black54),
                      ),
                    ],
                  ),
                ),
                Text('${indicator.jobs} emplois', style: TextStyle(color: accent)),
              ],
            ),
          );
        }),
      ],
    );
  }

  Widget _buildRoadmapCards() {
    final cards = [
      ('30 jours', 'Valider toutes les declarations et cloturer les alertes critiques.'),
      ('60 jours', 'Augmenter la capacite active et reduire l ecart import par secteur.'),
      ('90 jours', 'Generaliser la tracabilite QR et publier le rapport national PNPI.'),
    ];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SectionTitle(
          title: 'Plan d Action',
          subtitle: 'Execution ministerielle 30/60/90 jours',
        ),
        const SizedBox(height: 10),
        ...cards.map((entry) {
          return Container(
            width: double.infinity,
            margin: const EdgeInsets.only(bottom: 10),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              boxShadow: PnpiTheme.softShadows,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(entry.$1, style: const TextStyle(fontWeight: FontWeight.w700)),
                const SizedBox(height: 4),
                Text(entry.$2, style: const TextStyle(color: Colors.black87)),
              ],
            ),
          );
        }),
      ],
    );
  }
}

class _AnimatedBlock extends StatelessWidget {
  final Widget child;
  final int delayMs;

  const _AnimatedBlock({required this.child, required this.delayMs});

  @override
  Widget build(BuildContext context) {
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: 1),
      duration: Duration(milliseconds: 450 + delayMs),
      curve: Curves.easeOutCubic,
      builder: (context, value, child) {
        final dy = (1 - value) * 16;
        return Opacity(
          opacity: value,
          child: Transform.translate(offset: Offset(0, dy), child: child),
        );
      },
      child: child,
    );
  }
}

class _DashboardData {
  final DashboardSnapshot snapshot;
  final List<ForecastPoint> forecast;
  final List<DashboardAlert> alerts;

  const _DashboardData({
    required this.snapshot,
    required this.forecast,
    required this.alerts,
  });
}
