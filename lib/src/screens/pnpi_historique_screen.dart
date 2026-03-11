import 'package:flutter/material.dart';

import '../models/ati_transition.dart';
import '../services/api_service.dart';
import '../theme/pnpi_theme.dart';

class PnpiHistoriqueScreen extends StatefulWidget {
  const PnpiHistoriqueScreen({super.key});

  @override
  State<PnpiHistoriqueScreen> createState() => _PnpiHistoriqueScreenState();
}

class _PnpiHistoriqueScreenState extends State<PnpiHistoriqueScreen> {
  List<ATITransition> _transitions = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final transitions = await ApiService.instance.fetchPnpiHistorique(limit: 80);
    if (!mounted) return;
    setState(() {
      _transitions = transitions;
      _loading = false;
    });
  }

  Color _statutColor(String? statut) => switch (statut) {
        'soumis' => const Color(0xFFF59E0B),
        'en_instruction' => const Color(0xFF3B82F6),
        'en_validation' => const Color(0xFF8B5CF6),
        'approuve' => const Color(0xFF10B981),
        'rejete' => const Color(0xFFEF4444),
        'expire' => const Color(0xFF9CA3AF),
        _ => PnpiColors.oceanPulse,
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
    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            const Text('Historique PNPI'),
            if (_transitions.isNotEmpty) ...[
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: PnpiColors.oceanPulse,
                  borderRadius: BorderRadius.circular(99),
                ),
                child: Text(
                  '${_transitions.length}',
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
          : _transitions.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.history, size: 64, color: Colors.grey.shade400),
                      const SizedBox(height: 14),
                      Text(
                        'Aucune transition enregistree',
                        style: TextStyle(fontSize: 16, color: Colors.grey.shade600, fontWeight: FontWeight.w600),
                      ),
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
                              '${_transitions.length} transitions',
                              style: const TextStyle(color: Colors.white70, fontSize: 13),
                            ),
                            const Spacer(),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(
                                color: const Color(0xFF10B981),
                                borderRadius: BorderRadius.circular(99),
                              ),
                              child: Text(
                                '${_transitions.where((t) => t.newStatut == 'approuve').length} approuves',
                                style: const TextStyle(fontSize: 11, color: Colors.white, fontWeight: FontWeight.w700),
                              ),
                            ),
                          ],
                        ),
                      ),
                      // Timeline list
                      Expanded(
                        child: ListView.builder(
                          padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 14),
                          itemCount: _transitions.length,
                          itemBuilder: (context, index) {
                            final t = _transitions[index];
                            final color = _statutColor(t.newStatut);
                            final isLast = index == _transitions.length - 1;

                            return IntrinsicHeight(
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  // Timeline line + dot
                                  SizedBox(
                                    width: 28,
                                    child: Column(
                                      children: [
                                        Container(
                                          width: 12,
                                          height: 12,
                                          decoration: BoxDecoration(
                                            color: color,
                                            shape: BoxShape.circle,
                                            border: Border.all(color: Colors.white, width: 2),
                                            boxShadow: [BoxShadow(color: colorWithOpacity(color, 0.3), blurRadius: 4)],
                                          ),
                                        ),
                                        if (!isLast)
                                          Expanded(
                                            child: Container(
                                              width: 1.5,
                                              color: Colors.grey.shade300,
                                            ),
                                          ),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  // Card
                                  Expanded(
                                    child: Container(
                                      margin: const EdgeInsets.only(bottom: 10),
                                      padding: const EdgeInsets.all(12),
                                      decoration: BoxDecoration(
                                        color: colorWithOpacity(color, 0.06),
                                        borderRadius: BorderRadius.circular(14),
                                        border: Border.all(color: colorWithOpacity(color, 0.25)),
                                        boxShadow: PnpiTheme.softShadows,
                                      ),
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          // Status change
                                          Row(
                                            children: [
                                              if (t.oldStatut != null) ...[
                                                _statutChip(t.oldStatut!, _statutColor(t.oldStatut)),
                                                const Padding(
                                                  padding: EdgeInsets.symmetric(horizontal: 4),
                                                  child: Icon(Icons.arrow_forward_rounded, size: 14, color: Colors.black45),
                                                ),
                                              ],
                                              _statutChip(t.newStatut, color),
                                            ],
                                          ),
                                          const SizedBox(height: 6),
                                          // ATI ID
                                          Text(
                                            t.atiId,
                                            style: TextStyle(
                                              fontSize: 12,
                                              fontFamily: 'monospace',
                                              color: Colors.grey.shade600,
                                              fontWeight: FontWeight.w600,
                                            ),
                                          ),
                                          const SizedBox(height: 4),
                                          // Actor + date
                                          Row(
                                            children: [
                                              Icon(Icons.person_outline, size: 13, color: Colors.grey.shade500),
                                              const SizedBox(width: 4),
                                              Text(
                                                t.changedBy,
                                                style: TextStyle(fontSize: 12.5, color: Colors.grey.shade700, fontWeight: FontWeight.w500),
                                              ),
                                              const Spacer(),
                                              Text(
                                                _formatDate(t.changedAt),
                                                style: TextStyle(fontSize: 11.5, color: Colors.grey.shade500),
                                              ),
                                            ],
                                          ),
                                          // Note
                                          if (t.note != null && t.note!.isNotEmpty) ...[
                                            const SizedBox(height: 4),
                                            Text(
                                              t.note!,
                                              style: TextStyle(fontSize: 12, color: Colors.grey.shade500, fontStyle: FontStyle.italic),
                                            ),
                                          ],
                                        ],
                                      ),
                                    ),
                                  ),
                                ],
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

  Widget _statutChip(String statut, Color color) {
    final label = switch (statut) {
      'soumis' => 'Soumis',
      'en_instruction' => 'Instruction',
      'en_validation' => 'Validation',
      'approuve' => 'Approuve',
      'rejete' => 'Rejete',
      'expire' => 'Expire',
      _ => statut,
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: colorWithOpacity(color, 0.15),
        borderRadius: BorderRadius.circular(99),
      ),
      child: Text(
        label,
        style: TextStyle(fontSize: 11, color: color, fontWeight: FontWeight.w700),
      ),
    );
  }
}
