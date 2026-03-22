import 'dart:async';

import 'package:flutter/material.dart';

import '../models/forecast_point.dart';
import '../services/api_service.dart';
import '../theme/pnpi_theme.dart';

class PitchScreen extends StatefulWidget {
  final DashboardSnapshot? snapshot;
  final List<DashboardAlert>? alerts;
  final List<ForecastPoint>? forecast;

  const PitchScreen({
    super.key,
    this.snapshot,
    this.alerts,
    this.forecast,
  });

  @override
  State<PitchScreen> createState() => _PitchScreenState();
}

class _PitchScreenState extends State<PitchScreen> {
  DashboardSnapshot? _snapshot;
  List<DashboardAlert> _alerts = [];
  List<ForecastPoint> _forecast = [];
  bool _loading = true;
  Timer? _refreshTimer;

  @override
  void initState() {
    super.initState();
    if (widget.snapshot != null) {
      _snapshot = widget.snapshot;
      _alerts = widget.alerts ?? [];
      _forecast = widget.forecast ?? [];
      _loading = false;
    }
    _loadData();
    // Auto-refresh every 60 seconds
    _refreshTimer = Timer.periodic(const Duration(seconds: 60), (_) => _loadData());
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    super.dispose();
  }

  Future<void> _loadData() async {
    try {
      final results = await Future.wait([
        ApiService.instance.fetchDashboardSnapshot(),
        ApiService.instance.fetchDashboardAlerts(),
        ApiService.instance.fetchForecast(),
      ]);
      if (!mounted) return;
      setState(() {
        _snapshot = results[0] as DashboardSnapshot;
        _alerts = results[1] as List<DashboardAlert>;
        _forecast = results[2] as List<ForecastPoint>;
        _loading = false;
      });
    } catch (_) {
      if (mounted && _snapshot == null) {
        setState(() => _loading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading && _snapshot == null) {
      return Scaffold(
        backgroundColor: PnpiColors.deepSpace,
        body: const Center(
          child: CircularProgressIndicator(color: Colors.white),
        ),
      );
    }

    if (_snapshot == null) {
      return Scaffold(
        backgroundColor: PnpiColors.deepSpace,
        body: SafeArea(
          child: Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.cloud_off, color: Colors.white38, size: 48),
                const SizedBox(height: 12),
                const Text(
                  'Impossible de charger les donnees',
                  style: TextStyle(color: Colors.white60, fontSize: 16),
                ),
                const SizedBox(height: 16),
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Retour', style: TextStyle(color: Colors.white)),
                ),
              ],
            ),
          ),
        ),
      );
    }

    final snapshot = _snapshot!;
    final forecastDelta = _forecast.isNotEmpty
        ? _forecast.last.volumeTons - _forecast.first.volumeTons
        : 0.0;
    final direction = forecastDelta >= 0 ? 'hausse' : 'repli';

    return Scaffold(
      backgroundColor: PnpiColors.deepSpace,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Expanded(
                    child: Text(
                      'Mode Pitch PNPI',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 28,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                  IconButton(
                    onPressed: () => _loadData(),
                    icon: const Icon(Icons.refresh, color: Colors.white70),
                    tooltip: 'Rafraichir',
                  ),
                  IconButton(
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(Icons.close, color: Colors.white),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              _item('Indice national', '${(snapshot.nationalIndex * 100).toStringAsFixed(1)} %'),
              _item('Ecart import', '${snapshot.importGapTons.toStringAsFixed(0)} T'),
              _item('Emplois industriels', snapshot.jobsCreated.toString()),
              _item('Unites actives', snapshot.activeUnits.toString()),
              _item('Lots traces', snapshot.tracedBatches.toString()),
              _item('Trajectoire', '$direction (${forecastDelta.toStringAsFixed(1)} T)'),
              const SizedBox(height: 16),
              const Text(
                'Alertes prioritaires',
                style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 18),
              ),
              const SizedBox(height: 10),
              Expanded(
                child: ListView(
                  children: _alerts.take(4).map((alert) {
                    return Container(
                      margin: const EdgeInsets.only(bottom: 10),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.white12,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.white24),
                      ),
                      child: Text(
                        '- ${alert.title}: ${alert.detail}',
                        style: const TextStyle(color: Colors.white),
                      ),
                    );
                  }).toList(),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _item(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: RichText(
        text: TextSpan(
          style: const TextStyle(color: Colors.white, fontSize: 18),
          children: [
            TextSpan(text: '$label: ', style: const TextStyle(fontWeight: FontWeight.w700)),
            TextSpan(text: value),
          ],
        ),
      ),
    );
  }
}
