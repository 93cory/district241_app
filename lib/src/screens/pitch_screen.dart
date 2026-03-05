import 'package:flutter/material.dart';

import '../models/forecast_point.dart';
import '../services/api_service.dart';
import '../theme/pnpi_theme.dart';

class PitchScreen extends StatelessWidget {
  final DashboardSnapshot snapshot;
  final List<DashboardAlert> alerts;
  final List<ForecastPoint> forecast;

  const PitchScreen({
    super.key,
    required this.snapshot,
    required this.alerts,
    required this.forecast,
  });

  @override
  Widget build(BuildContext context) {
    final forecastDelta = forecast.isNotEmpty
        ? forecast.last.volumeTons - forecast.first.volumeTons
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
                  children: alerts.take(4).map((alert) {
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
