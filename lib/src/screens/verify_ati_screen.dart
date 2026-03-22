import 'package:flutter/material.dart';
import '../services/api_service.dart';

class VerifyAtiScreen extends StatefulWidget {
  final String numeroAti;
  const VerifyAtiScreen({super.key, required this.numeroAti});

  @override
  State<VerifyAtiScreen> createState() => _VerifyAtiScreenState();
}

class _VerifyAtiScreenState extends State<VerifyAtiScreen> {
  late Future<Map<String, dynamic>> _future;

  @override
  void initState() {
    super.initState();
    _future = ApiService.instance.verifyAtiPublic(widget.numeroAti);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Verification ATI')),
      body: FutureBuilder<Map<String, dynamic>>(
        future: _future,
        builder: (context, snap) {
          if (snap.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snap.hasError) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.error_outline, size: 56, color: Colors.red.shade300),
                    const SizedBox(height: 12),
                    Text('ATI introuvable', style: Theme.of(context).textTheme.titleLarge),
                    const SizedBox(height: 6),
                    Text('Aucun agrement ne correspond a ce numero.',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: Colors.grey.shade600)),
                  ],
                ),
              ),
            );
          }

          final data = snap.data!;
          final valid = data['valid'] == true;
          final statut = data['statut'] ?? '';

          Color statusColor;
          IconData statusIcon;
          String statusLabel;

          if (valid) {
            statusColor = const Color(0xFF006233);
            statusIcon = Icons.verified_rounded;
            statusLabel = 'VALIDE';
          } else if (statut == 'expire') {
            statusColor = const Color(0xFFD97706);
            statusIcon = Icons.schedule_rounded;
            statusLabel = 'EXPIRE';
          } else {
            statusColor = const Color(0xFFB42318);
            statusIcon = Icons.cancel_rounded;
            statusLabel = statut.toUpperCase();
          }

          return SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              children: [
                // Status badge
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 28),
                  decoration: BoxDecoration(
                    color: statusColor.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: statusColor, width: 2),
                  ),
                  child: Column(
                    children: [
                      Icon(statusIcon, size: 56, color: statusColor),
                      const SizedBox(height: 8),
                      Text(statusLabel,
                          style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: statusColor)),
                      if (valid)
                        Padding(
                          padding: const EdgeInsets.only(top: 4),
                          child: Text('Cet agrement est valide.',
                              style: TextStyle(fontSize: 13, color: statusColor)),
                        ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                // Detail rows
                _detailCard(context, [
                  _row('N\u00b0 ATI', data['numero_ati']),
                  _row('Operateur', data['operateur']),
                  _row('NIF', data['nif']),
                  _row('Secteur', data['secteur']),
                  _row('Activite', data['type_activite']),
                  _row('Approbation', _formatDate(data['date_approbation'])),
                  _row('Expiration', _formatDate(data['date_expiration']) ?? 'Illimitee'),
                ]),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _detailCard(BuildContext context, List<Widget> rows) {
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [BoxShadow(color: Color(0x10000000), blurRadius: 12, offset: Offset(0, 4))],
      ),
      child: Column(children: rows),
    );
  }

  Widget _row(String label, dynamic value) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.grey.shade600)),
          Flexible(
            child: Text('${value ?? '\u2014'}',
                textAlign: TextAlign.right,
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );
  }

  String? _formatDate(dynamic iso) {
    if (iso == null) return null;
    try {
      final dt = DateTime.parse(iso.toString());
      return '${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')}/${dt.year}';
    } catch (_) {
      return iso.toString();
    }
  }
}
