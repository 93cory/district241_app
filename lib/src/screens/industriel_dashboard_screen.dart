import 'package:flutter/material.dart';

import '../models/ati.dart';
import '../models/inspection_conformite.dart';
import '../models/operateur_industriel.dart';
import '../services/api_service.dart';
import '../theme/pnpi_theme.dart';
import 'inspection_create_screen.dart';
import 'submit_ati_screen.dart';

/// Tableau de bord personnalisé pour un opérateur industriel (rôle industriel).
class IndustrielDashboardScreen extends StatefulWidget {
  const IndustrielDashboardScreen({super.key});

  @override
  State<IndustrielDashboardScreen> createState() =>
      _IndustrielDashboardScreenState();
}

class _IndustrielDashboardScreenState
    extends State<IndustrielDashboardScreen> {
  OperateurIndustriel? _operateur;
  List<AgrementTechniqueIndustriel> _atis = [];
  List<InspectionConformite> _inspections = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final ops = await ApiService.instance.fetchOperateurs();
    final atis = await ApiService.instance.fetchATIs();
    final inspections = await ApiService.instance.fetchInspections();
    if (!mounted) return;

    // En mode démo, on utilise le premier opérateur comme "mon entreprise".
    final op = ops.isNotEmpty ? ops.first : null;
    final myAtis = op != null
        ? atis.where((a) => a.operateurId == op.id).toList()
        : atis.take(4).toList();
    final myInspections = op != null
        ? inspections.where((i) => i.operateurId == op.id).toList()
        : inspections.take(2).toList();

    setState(() {
      _operateur = op;
      _atis = myAtis
        ..sort((a, b) => b.dateSoumission.compareTo(a.dateSoumission));
      _inspections = myInspections
        ..sort(
            (a, b) => b.dateInspection.compareTo(a.dateInspection));
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator());
    if (_operateur == null) {
      return const Center(child: Text('Aucun dossier industriel trouvé.'));
    }
    final op = _operateur!;

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        children: [
          // ── Carte identité opérateur ──────────────────────────────────────
          _OperateurIdentityCard(op: op),
          const SizedBox(height: 16),

          // ── Pipeline ATI ──────────────────────────────────────────────────
          _sectionTitle('Mes agréments (ATI)', Icons.approval_rounded),
          const SizedBox(height: 10),
          if (_atis.isEmpty)
            _emptyHint('Aucun ATI enregistré pour votre dossier.')
          else ...[
            _AtiPipeline(atis: _atis),
            const SizedBox(height: 10),
            ..._atis.take(3).map((a) => _AtiMiniCard(ati: a)),
          ],
          const SizedBox(height: 8),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: () async {
                final result = await Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => SubmitATIScreen(
                      preselectedOperateur: op,
                    ),
                  ),
                );
                if (result == true) _load();
              },
              icon: const Icon(Icons.add_circle_outline_rounded, size: 18),
              label: const Text('Soumettre un nouvel ATI'),
              style: OutlinedButton.styleFrom(
                foregroundColor: PnpiColors.lagoon,
                side: BorderSide(color: PnpiColors.lagoon),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14)),
                padding: const EdgeInsets.symmetric(vertical: 13),
              ),
            ),
          ),
          const SizedBox(height: 20),

          // ── Dernières inspections ─────────────────────────────────────────
          _sectionTitle(
              'Mes inspections de conformité', Icons.fact_check_rounded),
          const SizedBox(height: 10),
          if (_inspections.isEmpty)
            _emptyHint('Aucune inspection enregistrée.')
          else
            ..._inspections.take(3).map(
                  (ins) => _InspectionMiniCard(inspection: ins),
                ),
          const SizedBox(height: 8),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: () async {
                final result = await Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => InspectionCreateScreen(
                      preselectedOperateur: op,
                    ),
                  ),
                );
                if (result != null) _load();
              },
              icon: const Icon(Icons.assignment_add, size: 18),
              label: const Text('Déclarer une auto-inspection'),
              style: OutlinedButton.styleFrom(
                foregroundColor: PnpiColors.deepSpace,
                side: BorderSide(color: PnpiColors.deepSpace),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14)),
                padding: const EdgeInsets.symmetric(vertical: 13),
              ),
            ),
          ),
          const SizedBox(height: 20),

          // ── Contacts utiles ────────────────────────────────────────────────
          _sectionTitle('Contacts PNPI', Icons.contacts_outlined),
          const SizedBox(height: 10),
          _ContactCard(
            nom: 'Direction des Agréments Industriels',
            role: 'Traitement des dossiers ATI',
            tel: '+241 01 72 12 00',
            email: 'ati@industrie.gouv.ga',
          ),
          _ContactCard(
            nom: 'Service Inspection Conformité',
            role: 'Inspections terrain et conformité',
            tel: '+241 01 74 55 30',
            email: 'inspection@pnpi.gouv.ga',
          ),
          const SizedBox(height: 12),
        ],
      ),
    );
  }

  Widget _sectionTitle(String title, IconData icon) {
    return Row(
      children: [
        Icon(icon, size: 16, color: PnpiColors.deepSpace),
        const SizedBox(width: 6),
        Text(
          title,
          style: const TextStyle(
            fontWeight: FontWeight.w700,
            fontSize: 14,
            color: Colors.black87,
          ),
        ),
      ],
    );
  }

  Widget _emptyHint(String text) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Text(text,
          style: const TextStyle(color: Colors.black38, fontSize: 13)),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Carte identité opérateur
// ─────────────────────────────────────────────────────────────────────────────

class _OperateurIdentityCard extends StatelessWidget {
  final OperateurIndustriel op;

  const _OperateurIdentityCard({required this.op});

  @override
  Widget build(BuildContext context) {
    final conformiteColor = switch (op.statutConformite) {
      'conforme' => const Color(0xFF2E7D32),
      'non_conforme' => const Color(0xFFC62828),
      _ => const Color(0xFFF57F17),
    };

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            PnpiColors.deepSpace,
            colorWithOpacity(PnpiColors.deepSpace, 0.75),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: colorWithOpacity(PnpiColors.deepSpace, 0.3),
            blurRadius: 16,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.white12,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(_secteurIcon(op.secteur),
                    color: Colors.white, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      op.raisonSociale,
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w700,
                        fontSize: 15,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                    Text(
                      op.nifGabon,
                      style: const TextStyle(
                          color: Colors.white60, fontSize: 12),
                    ),
                  ],
                ),
              ),
              // Badge conformité
              Container(
                padding: const EdgeInsets.symmetric(
                    horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: colorWithOpacity(conformiteColor, 0.2),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                      color: colorWithOpacity(conformiteColor, 0.5)),
                ),
                child: Text(
                  op.statutConformiteLabel,
                  style: TextStyle(
                    color: conformiteColor,
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          const Divider(color: Colors.white24, height: 1),
          const SizedBox(height: 12),
          Row(
            children: [
              _infoChip(Icons.map_outlined, op.province),
              const SizedBox(width: 10),
              _infoChip(Icons.location_city_rounded, op.ville),
              const SizedBox(width: 10),
              _infoChip(
                  Icons.category_outlined, _secteurLabel(op.secteur)),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              _infoChip(
                  Icons.approval_rounded, '${op.nombreAtiTotal} ATI total'),
              const SizedBox(width: 10),
              _infoChip(Icons.pending_actions_rounded,
                  '${op.nombreAtiActifs} actif(s)'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _infoChip(IconData icon, String label) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 12, color: Colors.white60),
        const SizedBox(width: 4),
        Text(label,
            style:
                const TextStyle(color: Colors.white70, fontSize: 11)),
      ],
    );
  }

  IconData _secteurIcon(String s) => switch (s) {
        'bois' => Icons.forest_rounded,
        'agroalimentaire' => Icons.agriculture_rounded,
        'peche' => Icons.water_rounded,
        'mines' => Icons.terrain_rounded,
        'btp' => Icons.construction_rounded,
        'petrole' => Icons.local_gas_station_rounded,
        _ => Icons.factory_rounded,
      };

  String _secteurLabel(String s) => switch (s) {
        'bois' => 'Bois',
        'agroalimentaire' => 'Agroalimentaire',
        'peche' => 'Pêche',
        'mines' => 'Mines',
        'btp' => 'BTP',
        'petrole' => 'Pétrole & Gaz',
        _ => 'Services',
      };
}

// ─────────────────────────────────────────────────────────────────────────────
// Pipeline ATI mini (4 étapes)
// ─────────────────────────────────────────────────────────────────────────────

class _AtiPipeline extends StatelessWidget {
  final List<AgrementTechniqueIndustriel> atis;

  const _AtiPipeline({required this.atis});

  @override
  Widget build(BuildContext context) {
    final counts = {
      'soumis': atis.where((a) => a.statut == 'soumis').length,
      'en_instruction':
          atis.where((a) => a.statut == 'en_instruction').length,
      'en_validation':
          atis.where((a) => a.statut == 'en_validation').length,
      'approuve': atis.where((a) => a.statut == 'approuve').length,
    };

    final steps = [
      (key: 'soumis', label: 'Soumis', color: Colors.blue),
      (key: 'en_instruction', label: 'Instruction', color: Colors.orange),
      (key: 'en_validation', label: 'Validation', color: Colors.purple),
      (key: 'approuve', label: 'Approuvé', color: const Color(0xFF2E7D32)),
    ];

    return Container(
      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 8),
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
      child: Row(
        children: steps.indexed.map((entry) {
          final idx = entry.$1;
          final s = entry.$2;
          final count = counts[s.key] ?? 0;
          return Expanded(
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    children: [
                      Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          color: count > 0
                              ? colorWithOpacity(s.color, 0.15)
                              : Colors.grey.shade100,
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: count > 0
                                ? colorWithOpacity(s.color, 0.5)
                                : Colors.grey.shade300,
                          ),
                        ),
                        child: Center(
                          child: Text(
                            '$count',
                            style: TextStyle(
                              fontWeight: FontWeight.w800,
                              fontSize: 15,
                              color: count > 0 ? s.color : Colors.grey,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 5),
                      Text(
                        s.label,
                        style: TextStyle(
                          fontSize: 10,
                          color: count > 0 ? s.color : Colors.black38,
                          fontWeight: count > 0
                              ? FontWeight.w700
                              : FontWeight.normal,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),
                if (idx < steps.length - 1)
                  Icon(Icons.chevron_right,
                      size: 16, color: Colors.grey.shade300),
              ],
            ),
          );
        }).toList(),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Mini-card ATI
// ─────────────────────────────────────────────────────────────────────────────

class _AtiMiniCard extends StatelessWidget {
  final AgrementTechniqueIndustriel ati;

  const _AtiMiniCard({required this.ati});

  @override
  Widget build(BuildContext context) {
    final statusColor = switch (ati.statut) {
      'approuve' => const Color(0xFF2E7D32),
      'rejete' => const Color(0xFFC62828),
      'en_validation' => Colors.purple,
      'en_instruction' => Colors.orange,
      _ => Colors.blue,
    };

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: colorWithOpacity(statusColor, 0.04),
        borderRadius: BorderRadius.circular(12),
        border:
            Border.all(color: colorWithOpacity(statusColor, 0.2)),
      ),
      child: Row(
        children: [
          Container(
            width: 6,
            height: 36,
            decoration: BoxDecoration(
              color: statusColor,
              borderRadius: BorderRadius.circular(3),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  ati.numeroAti,
                  style: const TextStyle(
                      fontWeight: FontWeight.w700, fontSize: 13),
                ),
                Text(
                  ati.typeActivite,
                  style: const TextStyle(
                      fontSize: 11, color: Colors.black45),
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(
                    horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: colorWithOpacity(statusColor, 0.12),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  ati.statutLabel,
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    color: statusColor,
                  ),
                ),
              ),
              const SizedBox(height: 4),
              Text(
                '${ati.slaDaysRemaining}j restants',
                style: TextStyle(
                  fontSize: 10,
                  color: ati.isOverdue
                      ? Colors.red
                      : Colors.black38,
                  fontWeight: ati.isOverdue
                      ? FontWeight.w700
                      : FontWeight.normal,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Mini-card Inspection
// ─────────────────────────────────────────────────────────────────────────────

class _InspectionMiniCard extends StatelessWidget {
  final InspectionConformite inspection;

  const _InspectionMiniCard({required this.inspection});

  @override
  Widget build(BuildContext context) {
    final ins = inspection;
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
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: colorWithOpacity(Colors.black, 0.04),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          Icon(icon, color: color, size: 22),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  ins.statutLabel,
                  style: TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 13,
                      color: color),
                ),
                Text(
                  ins.observations,
                  style: const TextStyle(
                      fontSize: 11, color: Colors.black45),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          Text(
            '${ins.ageJours}j',
            style: const TextStyle(fontSize: 11, color: Colors.black38),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Card contact
// ─────────────────────────────────────────────────────────────────────────────

class _ContactCard extends StatelessWidget {
  final String nom;
  final String role;
  final String tel;
  final String email;

  const _ContactCard({
    required this.nom,
    required this.role,
    required this.tel,
    required this.email,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        boxShadow: [
          BoxShadow(
            color: colorWithOpacity(Colors.black, 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: colorWithOpacity(PnpiColors.deepSpace, 0.08),
              shape: BoxShape.circle,
            ),
            child: Icon(Icons.phone_in_talk_rounded,
                color: PnpiColors.deepSpace, size: 18),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(nom,
                    style: const TextStyle(
                        fontWeight: FontWeight.w700, fontSize: 13)),
                Text(role,
                    style: const TextStyle(
                        fontSize: 11, color: Colors.black45)),
                const SizedBox(height: 3),
                Text(tel,
                    style: TextStyle(
                        fontSize: 11, color: PnpiColors.lagoon)),
                Text(email,
                    style: const TextStyle(
                        fontSize: 11, color: Colors.black45)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
