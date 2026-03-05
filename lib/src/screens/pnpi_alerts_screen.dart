import 'package:flutter/material.dart';

import '../services/api_service.dart';
import '../theme/pnpi_theme.dart';

class PnpiAlertsScreen extends StatefulWidget {
  const PnpiAlertsScreen({super.key});

  @override
  State<PnpiAlertsScreen> createState() => _PnpiAlertsScreenState();
}

class _PnpiAlertsScreenState extends State<PnpiAlertsScreen> {
  List<PnpiAlert> _alerts = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final alerts = await ApiService.instance.fetchPnpiAlerts();
    if (!mounted) return;
    setState(() {
      _alerts = alerts;
      _loading = false;
    });
  }

  Color _severityColor(String severity) => switch (severity) {
        'critical' => Colors.red.shade700,
        'high' => Colors.deepOrange,
        'medium' => Colors.amber.shade700,
        _ => PnpiColors.oceanPulse,
      };

  IconData _severityIcon(String severity) => switch (severity) {
        'critical' => Icons.error_rounded,
        'high' => Icons.warning_rounded,
        'medium' => Icons.info_rounded,
        _ => Icons.notifications_rounded,
      };

  String _typeLabel(String type) => switch (type) {
        'sla_overdue' => 'Retard SLA',
        'non_conforme' => 'Non conforme',
        'expiring_soon' => 'Expiration ATI',
        _ => type,
      };

  String _formatDate(DateTime dt) {
    final now = DateTime.now();
    final diff = now.difference(dt);
    if (diff.inMinutes < 60) return 'Il y a ${diff.inMinutes} min';
    if (diff.inHours < 24) return 'Il y a ${diff.inHours} h';
    if (diff.inDays < 7) return 'Il y a ${diff.inDays} j';
    return '${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')}/${dt.year}';
  }

  @override
  Widget build(BuildContext context) {
    final criticalCount = _alerts.where((a) => a.severity == 'critical').length;
    final highCount = _alerts.where((a) => a.severity == 'high').length;

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            const Text('Alertes PNPI'),
            if (_alerts.isNotEmpty) ...[
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: criticalCount > 0 ? Colors.redAccent : Colors.orangeAccent,
                  borderRadius: BorderRadius.circular(99),
                ),
                child: Text(
                  '${_alerts.length}',
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Colors.white),
                ),
              ),
            ],
          ],
        ),
        flexibleSpace: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [Color(0xFF005C33), Color(0xFFF2CD1B), Color(0xFF0044A8)],
            ),
          ),
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _alerts.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.check_circle_outline, size: 64, color: Colors.green.shade400),
                      const SizedBox(height: 14),
                      Text(
                        'Aucune alerte',
                        style: TextStyle(fontSize: 16, color: Colors.grey.shade600, fontWeight: FontWeight.w600),
                      ),
                      const SizedBox(height: 6),
                      Text('Tout est en ordre.', style: TextStyle(color: Colors.grey.shade500)),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _load,
                  child: Column(
                    children: [
                      // Summary bar
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 16),
                        color: const Color(0xFF051B36),
                        child: Row(
                          children: [
                            Text(
                              '${_alerts.length} alertes',
                              style: const TextStyle(color: Colors.white70, fontSize: 13),
                            ),
                            const Spacer(),
                            if (criticalCount > 0)
                              Container(
                                margin: const EdgeInsets.only(right: 8),
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                decoration: BoxDecoration(
                                  color: Colors.red.shade700,
                                  borderRadius: BorderRadius.circular(99),
                                ),
                                child: Text('$criticalCount critiques', style: const TextStyle(fontSize: 11, color: Colors.white, fontWeight: FontWeight.w700)),
                              ),
                            if (highCount > 0)
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                decoration: BoxDecoration(
                                  color: Colors.deepOrange,
                                  borderRadius: BorderRadius.circular(99),
                                ),
                                child: Text('$highCount hautes', style: const TextStyle(fontSize: 11, color: Colors.white, fontWeight: FontWeight.w700)),
                              ),
                          ],
                        ),
                      ),
                      // Alert list
                      Expanded(
                        child: ListView.builder(
                          padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 14),
                          itemCount: _alerts.length,
                          itemBuilder: (context, index) {
                            final alert = _alerts[index];
                            final color = _severityColor(alert.severity);
                            final icon = _severityIcon(alert.severity);

                            return Container(
                              margin: const EdgeInsets.only(bottom: 10),
                              decoration: BoxDecoration(
                                color: colorWithOpacity(color, 0.07),
                                borderRadius: BorderRadius.circular(18),
                                border: Border.all(color: colorWithOpacity(color, 0.4), width: 1.4),
                                boxShadow: PnpiTheme.softShadows,
                              ),
                              child: Padding(
                                padding: const EdgeInsets.all(14),
                                child: Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.all(9),
                                      decoration: BoxDecoration(
                                        color: colorWithOpacity(color, 0.16),
                                        shape: BoxShape.circle,
                                      ),
                                      child: Icon(icon, color: color, size: 20),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Row(
                                            children: [
                                              Expanded(
                                                child: Text(
                                                  alert.title,
                                                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14.5),
                                                ),
                                              ),
                                            ],
                                          ),
                                          const SizedBox(height: 4),
                                          Text(
                                            alert.message,
                                            style: const TextStyle(color: Colors.black87, height: 1.35),
                                          ),
                                          const SizedBox(height: 6),
                                          Row(
                                            children: [
                                              Container(
                                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                                decoration: BoxDecoration(
                                                  color: colorWithOpacity(color, 0.15),
                                                  borderRadius: BorderRadius.circular(99),
                                                ),
                                                child: Text(
                                                  alert.severity.toUpperCase(),
                                                  style: TextStyle(fontSize: 11, color: color, fontWeight: FontWeight.w700),
                                                ),
                                              ),
                                              const SizedBox(width: 8),
                                              Container(
                                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                                decoration: BoxDecoration(
                                                  color: Colors.grey.shade200,
                                                  borderRadius: BorderRadius.circular(99),
                                                ),
                                                child: Text(
                                                  _typeLabel(alert.type),
                                                  style: TextStyle(fontSize: 11, color: Colors.grey.shade700, fontWeight: FontWeight.w600),
                                                ),
                                              ),
                                              const SizedBox(width: 8),
                                              Text(
                                                _formatDate(alert.createdAt),
                                                style: const TextStyle(fontSize: 12, color: Colors.black45),
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
                          },
                        ),
                      ),
                    ],
                  ),
                ),
    );
  }
}
