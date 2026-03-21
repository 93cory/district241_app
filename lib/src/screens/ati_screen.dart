import 'package:flutter/material.dart';

import '../models/ati.dart';
import '../models/ati_transition.dart';
import '../services/api_service.dart';
import '../theme/pnpi_theme.dart';
import '../widgets/adaptive_layout.dart';
import '../widgets/skeleton_loader.dart';
import 'submit_ati_screen.dart';

class ATIScreen extends StatefulWidget {
  const ATIScreen({super.key});

  @override
  State<ATIScreen> createState() => _ATIScreenState();
}

class _ATIScreenState extends State<ATIScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabCtrl;
  List<AgrementTechniqueIndustriel> _all = [];
  bool _loading = true;
  String? _activeSecteur;
  String? _selectedAtiId;

  static const _tabs = ['Tous', 'En cours', 'Approuvés', 'Rejetés'];

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: _tabs.length, vsync: this);
    _load();
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final data = await ApiService.instance.fetchATIs();
    if (!mounted) return;
    setState(() {
      _all = data;
      _loading = false;
    });
  }

  List<String> get _secteurs =>
      _all.map((a) => a.secteur).toSet().toList()..sort();

  List<AgrementTechniqueIndustriel> _forTab(int index) {
    var list = _all;
    if (_activeSecteur != null) {
      list = list.where((a) => a.secteur == _activeSecteur).toList();
    }
    return switch (index) {
      1 => list.where((a) => a.isActive).toList(),
      2 => list.where((a) => a.statut == 'approuve').toList(),
      3 => list.where((a) => a.statut == 'rejete' || a.statut == 'expire').toList(),
      _ => list,
    };
  }

  Color _statutColor(String statut) => switch (statut) {
        'soumis' => Colors.blue.shade700,
        'en_instruction' => Colors.orange.shade700,
        'en_validation' => Colors.purple.shade700,
        'approuve' => Colors.green.shade700,
        'rejete' => Colors.red.shade700,
        'expire' => Colors.grey.shade600,
        _ => PnpiColors.lagoon,
      };

  Color _prioriteColor(String priorite) => switch (priorite) {
        'urgente' => Colors.red.shade700,
        'elevee' => Colors.orange.shade700,
        _ => Colors.grey.shade600,
      };

  Color _secteurColor(String secteur) => switch (secteur) {
        'bois' => Colors.brown.shade600,
        'agroalimentaire' => Colors.green.shade600,
        'peche' => Colors.blue.shade600,
        'mines' => Colors.grey.shade700,
        'btp' => Colors.deepOrange.shade600,
        'petrole' => Colors.blueGrey.shade700,
        _ => PnpiColors.lagoon,
      };

  String _secteurLabel(String secteur) => switch (secteur) {
        'bois' => 'Bois',
        'agroalimentaire' => 'Agro',
        'peche' => 'Pêche',
        'mines' => 'Mines',
        'btp' => 'BTP',
        'petrole' => 'Pétrole',
        _ => secteur,
      };

  void _showDetail(AgrementTechniqueIndustriel ati) {
    final statutColor = _statutColor(ati.statut);
    final secteurColor = _secteurColor(ati.secteur);

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (_) => DraggableScrollableSheet(
        initialChildSize: 0.6,
        minChildSize: 0.45,
        maxChildSize: 0.9,
        builder: (_, scrollCtrl) => Container(
          margin: const EdgeInsets.fromLTRB(12, 0, 12, 12),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(24),
            boxShadow: PnpiTheme.softShadows,
          ),
          child: ListView(
            controller: scrollCtrl,
            padding: const EdgeInsets.all(20),
            children: [
              Center(
                child: Container(
                  width: 36,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(99),
                  ),
                ),
              ),

              // Header
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  CircleAvatar(
                    radius: 24,
                    backgroundColor: colorWithOpacity(secteurColor, 0.15),
                    child: Icon(Icons.description_rounded,
                        color: secteurColor, size: 24),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          ati.numeroAti,
                          style: const TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 16,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          ati.operateurNom,
                          style: const TextStyle(
                              color: Colors.black54, fontSize: 13),
                        ),
                      ],
                    ),
                  ),
                  _statutBadge(ati.statut, statutColor),
                ],
              ),

              const SizedBox(height: 18),
              const Divider(),
              const SizedBox(height: 12),

              // Details
              _row(Icons.work_outline, 'Activité', ati.typeActivite),
              const SizedBox(height: 8),
              _row(Icons.category_outlined, 'Secteur', _secteurLabel(ati.secteur)),
              const SizedBox(height: 8),
              _row(Icons.location_on_outlined, 'Province', ati.province),
              const SizedBox(height: 8),
              _row(
                Icons.calendar_today_outlined,
                'Soumis le',
                _formatDate(ati.dateSoumission),
              ),
              if (ati.dateDecision != null) ...[
                const SizedBox(height: 8),
                _row(Icons.check_circle_outline, 'Décision', _formatDate(ati.dateDecision!)),
              ],
              if (ati.dateExpiration != null) ...[
                const SizedBox(height: 8),
                _row(Icons.event_outlined, 'Expiration', _formatDate(ati.dateExpiration!)),
              ],
              const SizedBox(height: 8),
              _row(Icons.timer_outlined, 'SLA', '${ati.slaDays} jours'),

              if (ati.isActive) ...[
                const SizedBox(height: 8),
                _row(
                  ati.isOverdue ? Icons.warning_amber_rounded : Icons.hourglass_top_rounded,
                  'Délai restant',
                  ati.isOverdue
                      ? 'Dépassé de ${-ati.slaDaysRemaining} j'
                      : '${ati.slaDaysRemaining} j restant(s)',
                  valueColor: ati.isOverdue ? Colors.red.shade700 : Colors.green.shade700,
                ),
              ],

              if (ati.numeroReferenceDecision != null) ...[
                const SizedBox(height: 8),
                _row(Icons.numbers_outlined, 'Référence', ati.numeroReferenceDecision!),
              ],

              if (ati.motifRejet != null) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: colorWithOpacity(Colors.red.shade700, 0.07),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                        color: colorWithOpacity(Colors.red.shade700, 0.3)),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(Icons.cancel_outlined,
                          color: Colors.red.shade700, size: 18),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          ati.motifRejet!,
                          style: TextStyle(
                              color: Colors.red.shade800, fontSize: 13),
                        ),
                      ),
                    ],
                  ),
                ),
              ],

              // Resubmit button for rejected ATIs
              if (ati.statut == 'rejete') ...[
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: () {
                      Navigator.pop(context);
                      _showResubmitDialog(ati);
                    },
                    icon: const Icon(Icons.replay_rounded),
                    label: const Text('Corriger et resoumettre'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF006233),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                  ),
                ),
              ],

              // Certificat pour ATI approuvé
              if (ati.statut == 'approuve') ...[
                const SizedBox(height: 20),
                const Divider(),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: () {
                      Navigator.pop(context);
                      _showCertificat(ati);
                    },
                    icon: const Icon(Icons.workspace_premium_rounded),
                    label: const Text('Voir le certificat ATI'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF2E7D32),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                  ),
                ),
              ],

              // Action buttons for active ATIs
              if (ati.isActive) ...[
                const SizedBox(height: 20),
                const Divider(),
                const SizedBox(height: 12),
                const Text(
                  'Actions',
                  style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
                ),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: _buildActions(ati),
                ),
              ],

              // Historique du workflow
              const SizedBox(height: 20),
              const Divider(),
              const SizedBox(height: 12),
              const Text(
                'Historique',
                style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
              ),
              const SizedBox(height: 10),
              FutureBuilder<List<ATITransition>>(
                future: ApiService.instance.fetchATIHistory(ati.id),
                builder: (context, snap) {
                  if (snap.connectionState != ConnectionState.done) {
                    return const Padding(
                      padding: EdgeInsets.symmetric(vertical: 12),
                      child: Center(
                          child: SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )),
                    );
                  }
                  final history = snap.data ?? [];
                  if (history.isEmpty) {
                    return const Text('Aucun historique disponible.',
                        style:
                            TextStyle(color: Colors.black38, fontSize: 13));
                  }
                  return Column(
                    children: history.reversed
                        .toList()
                        .asMap()
                        .entries
                        .map((entry) {
                      final isFirst = entry.key == 0;
                      return _ATITimelineItem(
                        transition: entry.value,
                        isLast: entry.key == history.length - 1,
                        isFirst: isFirst,
                      );
                    }).toList(),
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  List<Widget> _buildActions(AgrementTechniqueIndustriel ati) {
    final actions = <({String label, String newStatut, Color color})>[];

    if (ati.statut == 'soumis') {
      actions.add((
        label: 'Mettre en instruction',
        newStatut: 'en_instruction',
        color: Colors.orange.shade700,
      ));
    }
    if (ati.statut == 'en_instruction') {
      actions.add((
        label: 'Envoyer en validation',
        newStatut: 'en_validation',
        color: Colors.purple.shade700,
      ));
    }
    if (ati.statut == 'en_validation') {
      actions.add((
        label: 'Approuver',
        newStatut: 'approuve',
        color: Colors.green.shade700,
      ));
      actions.add((
        label: 'Rejeter',
        newStatut: 'rejete',
        color: Colors.red.shade700,
      ));
    }

    return actions
        .map(
          (action) => ElevatedButton(
            onPressed: () => _confirmTransition(ati, action.newStatut, action.label, action.color),
            style: ElevatedButton.styleFrom(
              backgroundColor: action.color,
              foregroundColor: Colors.white,
              padding:
                  const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
              ),
            ),
            child: Text(action.label),
          ),
        )
        .toList();
  }

  void _confirmTransition(
    AgrementTechniqueIndustriel ati,
    String newStatut,
    String actionLabel,
    Color actionColor,
  ) {
    final noteCtrl = TextEditingController();
    final isRejection = newStatut == 'rejete';

    showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: colorWithOpacity(actionColor, 0.12),
                shape: BoxShape.circle,
              ),
              child: Icon(
                newStatut == 'approuve'
                    ? Icons.check_circle_outline
                    : newStatut == 'rejete'
                        ? Icons.cancel_outlined
                        : Icons.swap_horiz_rounded,
                color: actionColor,
                size: 20,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(actionLabel,
                  style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'ATI : ${ati.numeroAti}',
              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
            ),
            Text(
              ati.operateurNom,
              style: const TextStyle(color: Colors.black54, fontSize: 13),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: noteCtrl,
              maxLines: 3,
              decoration: InputDecoration(
                labelText: isRejection ? 'Motif de rejet *' : 'Note (optionnelle)',
                hintText: isRejection
                    ? 'Précisez le motif du rejet…'
                    : 'Ajouter une note de transition…',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                contentPadding: const EdgeInsets.all(12),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Annuler'),
          ),
          FilledButton(
            onPressed: () {
              if (isRejection && noteCtrl.text.trim().isEmpty) return;
              Navigator.pop(ctx, true);
            },
            style: FilledButton.styleFrom(backgroundColor: actionColor),
            child: const Text('Confirmer'),
          ),
        ],
      ),
    ).then((confirmed) {
      if (confirmed == true) {
        _updateStatut(ati, newStatut, note: noteCtrl.text.trim().isEmpty ? null : noteCtrl.text.trim());
      }
      noteCtrl.dispose();
    });
  }

  Future<void> _updateStatut(
    AgrementTechniqueIndustriel ati,
    String newStatut, {
    String? note,
  }) async {
    Navigator.pop(context); // ferme le bottom sheet
    try {
      await ApiService.instance.updateATIStatut(
        atiId: ati.id,
        newStatut: newStatut,
        note: note,
      );
      await _load();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('ATI ${ati.numeroAti} → ${_statutLabel(newStatut)}'),
          backgroundColor: Colors.green.shade700,
        ),
      );
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Mise à jour échouée'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  void _showResubmitDialog(AgrementTechniqueIndustriel ati) {
    final obsCtrl = TextEditingController();

    showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: colorWithOpacity(const Color(0xFF006233), 0.12),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.replay_rounded,
                  color: Color(0xFF006233), size: 20),
            ),
            const SizedBox(width: 10),
            const Expanded(
              child: Text('Resoumettre l\'ATI',
                  style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'ATI : ${ati.numeroAti}',
              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
            ),
            if (ati.motifRejet != null) ...[
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: colorWithOpacity(Colors.red.shade700, 0.07),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  'Motif du rejet : ${ati.motifRejet}',
                  style: TextStyle(color: Colors.red.shade800, fontSize: 12),
                ),
              ),
            ],
            const SizedBox(height: 16),
            TextField(
              controller: obsCtrl,
              maxLines: 4,
              decoration: InputDecoration(
                labelText: 'Corrections apportees',
                hintText: 'Decrivez les corrections apportees suite au rejet...',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                contentPadding: const EdgeInsets.all(12),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Annuler'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: FilledButton.styleFrom(
                backgroundColor: const Color(0xFF006233)),
            child: const Text('Resoumettre'),
          ),
        ],
      ),
    ).then((confirmed) async {
      if (confirmed == true) {
        try {
          await ApiService.instance.resubmitATI(
            ati.id,
            observations: obsCtrl.text.trim(),
          );
          await _load();
          if (!mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('ATI ${ati.numeroAti} resoumis avec succes'),
              backgroundColor: Colors.green.shade700,
            ),
          );
        } catch (_) {
          if (!mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Resoumission echouee'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
      obsCtrl.dispose();
    });
  }

  void _showCertificat(AgrementTechniqueIndustriel ati) {
    showDialog(
      context: context,
      builder: (_) => Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // En-tête vert PNPI
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 18),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF005C33), Color(0xFF00A95C)],
                  ),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: const Column(
                  children: [
                    Icon(Icons.workspace_premium_rounded,
                        color: Colors.white, size: 36),
                    SizedBox(height: 6),
                    Text(
                      'CERTIFICAT ATI',
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w800,
                        fontSize: 16,
                        letterSpacing: 1.5,
                      ),
                    ),
                    Text(
                      'Agrément Technique Industriel',
                      style: TextStyle(
                          color: Colors.white70, fontSize: 11),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 18),

              // Numéro ATI
              Text(
                ati.numeroAti,
                style: const TextStyle(
                  fontWeight: FontWeight.w900,
                  fontSize: 20,
                  color: Color(0xFF005C33),
                  letterSpacing: 1.2,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                ati.operateurNom,
                style: const TextStyle(
                    fontWeight: FontWeight.w700, fontSize: 14),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 2),
              Text(
                ati.typeActivite,
                style: const TextStyle(
                    fontSize: 12, color: Colors.black54),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 14),

              // Grille de métadonnées
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFFF1F8F1),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFFB2DFDB)),
                ),
                child: Column(
                  children: [
                    _certRow('Secteur', _secteurLabel(ati.secteur)),
                    _certRow('Province', ati.province),
                    _certRow('Priorité', ati.prioriteLabel),
                    if (ati.dateDecision != null)
                      _certRow(
                        'Date de décision',
                        '${ati.dateDecision!.day.toString().padLeft(2, '0')}/'
                            '${ati.dateDecision!.month.toString().padLeft(2, '0')}/'
                            '${ati.dateDecision!.year}',
                      ),
                    if (ati.dateExpiration != null)
                      _certRow(
                        'Validité jusqu\'au',
                        '${ati.dateExpiration!.day.toString().padLeft(2, '0')}/'
                            '${ati.dateExpiration!.month.toString().padLeft(2, '0')}/'
                            '${ati.dateExpiration!.year}',
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 14),

              // Pied de page PNPI
              const Text(
                'Ministère de l\'Industrie — République Gabonaise\nPlateforme Nationale de Pilotage Industriel',
                style: TextStyle(
                    fontSize: 10,
                    color: Colors.black38,
                    height: 1.5),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),

              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Fermer'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _certRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        children: [
          SizedBox(
            width: 110,
            child: Text(label,
                style:
                    const TextStyle(fontSize: 12, color: Colors.black45)),
          ),
          Expanded(
            child: Text(value,
                style: const TextStyle(
                    fontSize: 12, fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );
  }

  String _statutLabel(String statut) => switch (statut) {
        'soumis' => 'Soumis',
        'en_instruction' => 'En instruction',
        'en_validation' => 'En validation',
        'approuve' => 'Approuvé',
        'rejete' => 'Rejeté',
        'expire' => 'Expiré',
        _ => statut,
      };

  Widget _statutBadge(String statut, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: colorWithOpacity(color, 0.12),
        borderRadius: BorderRadius.circular(99),
        border: Border.all(color: colorWithOpacity(color, 0.5)),
      ),
      child: Text(
        _statutLabel(statut),
        style: TextStyle(
          color: color,
          fontWeight: FontWeight.w700,
          fontSize: 12,
        ),
      ),
    );
  }

  Widget _row(IconData icon, String label, String value, {Color? valueColor}) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 18, color: PnpiColors.lagoon),
        const SizedBox(width: 10),
        Text('$label : ', style: const TextStyle(color: Colors.black54, fontSize: 13)),
        Expanded(
          child: Text(
            value,
            style: TextStyle(
              fontWeight: FontWeight.w600,
              fontSize: 13,
              color: valueColor ?? Colors.black87,
            ),
          ),
        ),
      ],
    );
  }

  String _formatDate(DateTime dt) =>
      '${dt.day.toString().padLeft(2, '0')}/'
      '${dt.month.toString().padLeft(2, '0')}/'
      '${dt.year}';

  Widget _buildAtiDetailPanel(AgrementTechniqueIndustriel ati) {
    final statutColor = _statutColor(ati.statut);
    final secteurColor = _secteurColor(ati.secteur);

    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        // Header
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            CircleAvatar(
              radius: 24,
              backgroundColor: colorWithOpacity(secteurColor, 0.15),
              child: Icon(Icons.description_rounded,
                  color: secteurColor, size: 24),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    ati.numeroAti,
                    style: const TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 16,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    ati.operateurNom,
                    style: const TextStyle(
                        color: Colors.black54, fontSize: 13),
                  ),
                ],
              ),
            ),
            _statutBadge(ati.statut, statutColor),
          ],
        ),

        const SizedBox(height: 18),
        const Divider(),
        const SizedBox(height: 12),

        // Details
        _row(Icons.work_outline, 'Activite', ati.typeActivite),
        const SizedBox(height: 8),
        _row(Icons.category_outlined, 'Secteur', _secteurLabel(ati.secteur)),
        const SizedBox(height: 8),
        _row(Icons.location_on_outlined, 'Province', ati.province),
        const SizedBox(height: 8),
        _row(
          Icons.calendar_today_outlined,
          'Soumis le',
          _formatDate(ati.dateSoumission),
        ),
        if (ati.dateDecision != null) ...[
          const SizedBox(height: 8),
          _row(Icons.check_circle_outline, 'Decision', _formatDate(ati.dateDecision!)),
        ],
        if (ati.dateExpiration != null) ...[
          const SizedBox(height: 8),
          _row(Icons.event_outlined, 'Expiration', _formatDate(ati.dateExpiration!)),
        ],
        const SizedBox(height: 8),
        _row(Icons.timer_outlined, 'SLA', '${ati.slaDays} jours'),

        if (ati.isActive) ...[
          const SizedBox(height: 8),
          _row(
            ati.isOverdue ? Icons.warning_amber_rounded : Icons.hourglass_top_rounded,
            'Delai restant',
            ati.isOverdue
                ? 'Depasse de ${-ati.slaDaysRemaining} j'
                : '${ati.slaDaysRemaining} j restant(s)',
            valueColor: ati.isOverdue ? Colors.red.shade700 : Colors.green.shade700,
          ),
        ],

        if (ati.motifRejet != null) ...[
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: colorWithOpacity(Colors.red.shade700, 0.07),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                  color: colorWithOpacity(Colors.red.shade700, 0.3)),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(Icons.cancel_outlined,
                    color: Colors.red.shade700, size: 18),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    ati.motifRejet!,
                    style: TextStyle(
                        color: Colors.red.shade800, fontSize: 13),
                  ),
                ),
              ],
            ),
          ),
        ],

        // Resubmit button for rejected ATIs (tablet panel)
        if (ati.statut == 'rejete') ...[
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: () => _showResubmitDialog(ati),
              icon: const Icon(Icons.replay_rounded),
              label: const Text('Corriger et resoumettre'),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF006233),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
            ),
          ),
        ],

        // Action buttons for active ATIs
        if (ati.isActive) ...[
          const SizedBox(height: 20),
          const Divider(),
          const SizedBox(height: 12),
          const Text(
            'Actions',
            style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _buildActions(ati),
          ),
        ],

        // Historique
        const SizedBox(height: 20),
        const Divider(),
        const SizedBox(height: 12),
        const Text(
          'Historique',
          style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
        ),
        const SizedBox(height: 10),
        FutureBuilder<List<ATITransition>>(
          future: ApiService.instance.fetchATIHistory(ati.id),
          builder: (context, snap) {
            if (snap.connectionState != ConnectionState.done) {
              return const Padding(
                padding: EdgeInsets.symmetric(vertical: 12),
                child: Center(
                    child: SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )),
              );
            }
            final history = snap.data ?? [];
            if (history.isEmpty) {
              return const Text('Aucun historique disponible.',
                  style:
                      TextStyle(color: Colors.black38, fontSize: 13));
            }
            return Column(
              children: history.reversed
                  .toList()
                  .asMap()
                  .entries
                  .map((entry) {
                final isFirst = entry.key == 0;
                return _ATITimelineItem(
                  transition: entry.value,
                  isLast: entry.key == history.length - 1,
                  isFirst: isFirst,
                );
              }).toList(),
            );
          },
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: List.generate(6, (_) => const SkeletonListItem()),
        ),
      );
    }

    final enCours = _all.where((a) => a.isActive).length;
    final approuves = _all.where((a) => a.statut == 'approuve').length;
    final overdueList = _all.where((a) => a.isOverdue).toList();

    return LayoutBuilder(
      builder: (context, constraints) {
        final isTablet = constraints.maxWidth >= kTabletBreakpoint;

        // Selected ATI for tablet detail panel
        AgrementTechniqueIndustriel? selectedAti;
        if (isTablet && _selectedAtiId != null) {
          final idx = _all.indexWhere((a) => a.id == _selectedAtiId);
          if (idx >= 0) selectedAti = _all[idx];
        }

        final listContent = Column(
          children: [
            // Stats banner
            Container(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
              child: Column(
                children: [
                  Row(
                    children: [
                      _kpiBox('En cours', '$enCours', PnpiColors.oceanPulse),
                      const SizedBox(width: 8),
                      _kpiBox('Approuves', '$approuves', Colors.green.shade700),
                      const SizedBox(width: 8),
                      _kpiBox(
                        'Hors SLA',
                        '${overdueList.length}',
                        overdueList.isEmpty ? Colors.grey.shade500 : Colors.red.shade700,
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),

                  // Bouton nouvelle demande ATI
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton.icon(
                      onPressed: () async {
                        final submitted = await Navigator.push<bool>(
                          context,
                          MaterialPageRoute(
                              builder: (_) => const SubmitATIScreen()),
                        );
                        if (submitted == true) _load();
                      },
                      icon: const Icon(Icons.add_rounded, size: 18),
                      label: const Text('Nouvelle demande ATI'),
                      style: FilledButton.styleFrom(
                        backgroundColor: PnpiColors.lagoon,
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12)),
                        padding: const EdgeInsets.symmetric(vertical: 11),
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),

                  // Secteur filter
                  if (_secteurs.isNotEmpty)
                    SizedBox(
                      height: 34,
                      child: ListView(
                        scrollDirection: Axis.horizontal,
                        children: [
                          _sectorChip('Tous', null),
                          ..._secteurs.map((s) => _sectorChip(_secteurLabel(s), s)),
                        ],
                      ),
                    ),
                ],
              ),
            ),

            // Tabs
            TabBar(
              controller: _tabCtrl,
              labelColor: PnpiColors.lagoon,
              unselectedLabelColor: Colors.black45,
              indicatorColor: PnpiColors.lagoon,
              padding: const EdgeInsets.symmetric(horizontal: 8),
              tabs: _tabs.map((t) => Tab(text: t)).toList(),
            ),

            // Tab content
            Expanded(
              child: TabBarView(
                controller: _tabCtrl,
                children: List.generate(
                  _tabs.length,
                  (i) => _buildList(_forTab(i), isTablet: isTablet),
                ),
              ),
            ),
          ],
        );

        final detailContent = selectedAti != null
            ? _buildAtiDetailPanel(selectedAti)
            : const Center(
                child: Text(
                  'Selectionnez un ATI',
                  style: TextStyle(color: Colors.black38, fontSize: 15),
                ),
              );

        return AdaptiveLayout(
          sidePanel: isTablet ? listContent : null,
          sidePanelWidth: 380,
          child: isTablet ? detailContent : listContent,
        );
      },
    );
  }

  Widget _kpiBox(String label, String value, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          color: colorWithOpacity(color, 0.1),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: colorWithOpacity(color, 0.25)),
        ),
        child: Column(
          children: [
            Text(
              value,
              style: TextStyle(
                  fontSize: 20, fontWeight: FontWeight.w800, color: color),
            ),
            Text(label,
                style: const TextStyle(fontSize: 11, color: Colors.black54)),
          ],
        ),
      ),
    );
  }

  Widget _sectorChip(String label, String? value) {
    final selected = _activeSecteur == value;
    return GestureDetector(
      onTap: () => setState(() => _activeSecteur = value),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        margin: const EdgeInsets.only(right: 8),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: selected ? PnpiColors.lagoon : Colors.grey.shade100,
          borderRadius: BorderRadius.circular(99),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: selected ? Colors.white : Colors.black54,
          ),
        ),
      ),
    );
  }

  Widget _buildList(List<AgrementTechniqueIndustriel> list, {bool isTablet = false}) {
    if (list.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.inbox_rounded, size: 56, color: Colors.grey.shade300),
            const SizedBox(height: 12),
            Text(
              'Aucun ATI dans cette catégorie',
              style: TextStyle(color: Colors.grey.shade500),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.builder(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
        itemCount: list.length,
        itemBuilder: (_, i) => _buildCard(list[i], isTablet: isTablet),
      ),
    );
  }

  Widget _buildCard(AgrementTechniqueIndustriel ati, {bool isTablet = false}) {
    final statutColor = _statutColor(ati.statut);
    final secteurColor = _secteurColor(ati.secteur);
    final prioriteColor = _prioriteColor(ati.priorite);
    final isSelected = _selectedAtiId == ati.id;

    return GestureDetector(
      onTap: () {
        if (isTablet) {
          setState(() => _selectedAtiId = ati.id);
        } else {
          _showDetail(ati);
        }
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(15),
        decoration: BoxDecoration(
          color: isSelected ? colorWithOpacity(PnpiColors.lagoon, 0.06) : Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: isSelected
                ? PnpiColors.lagoon
                : ati.isOverdue
                    ? colorWithOpacity(Colors.red.shade700, 0.5)
                    : Colors.grey.shade200,
          ),
          boxShadow: PnpiTheme.softShadows,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    ati.numeroAti,
                    style: const TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 14,
                    ),
                  ),
                ),
                if (ati.priorite != 'normale')
                  Container(
                    margin: const EdgeInsets.only(right: 6),
                    padding:
                        const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                    decoration: BoxDecoration(
                      color: colorWithOpacity(prioriteColor, 0.15),
                      borderRadius: BorderRadius.circular(99),
                    ),
                    child: Text(
                      ati.prioriteLabel.toUpperCase(),
                      style: TextStyle(
                        fontSize: 10,
                        color: prioriteColor,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                _statutBadge(ati.statut, statutColor),
              ],
            ),
            const SizedBox(height: 5),
            Text(
              ati.operateurNom,
              style: const TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 13,
                color: Colors.black87,
              ),
            ),
            const SizedBox(height: 3),
            Text(
              ati.typeActivite,
              style: const TextStyle(color: Colors.black54, fontSize: 12),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                _miniChip(_secteurLabel(ati.secteur), secteurColor),
                const SizedBox(width: 6),
                _miniChip(ati.province, PnpiColors.deepSpace),
                const Spacer(),
                if (ati.isActive)
                  Text(
                    ati.isOverdue
                        ? 'Hors SLA +${-ati.slaDaysRemaining} j'
                        : '${ati.slaDaysRemaining} j restant(s)',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: ati.isOverdue
                          ? Colors.red.shade700
                          : Colors.green.shade700,
                    ),
                  )
                else
                  Text(
                    _formatDate(ati.dateSoumission),
                    style: const TextStyle(fontSize: 12, color: Colors.black38),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _miniChip(String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
      decoration: BoxDecoration(
        color: colorWithOpacity(color, 0.12),
        borderRadius: BorderRadius.circular(99),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 11,
          color: color,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Timeline item pour l'historique workflow ATI
// ─────────────────────────────────────────────────────────────────────────────

class _ATITimelineItem extends StatelessWidget {
  final ATITransition transition;
  final bool isFirst;
  final bool isLast;

  const _ATITimelineItem({
    required this.transition,
    required this.isFirst,
    required this.isLast,
  });

  @override
  Widget build(BuildContext context) {
    final t = transition;
    final dotColor = switch (t.newStatut) {
      'approuve' => const Color(0xFF2E7D32),
      'rejete' => const Color(0xFFC62828),
      'en_validation' => Colors.purple,
      'en_instruction' => Colors.orange,
      'expire' => Colors.grey,
      _ => PnpiColors.lagoon,
    };
    final dotIcon = switch (t.newStatut) {
      'approuve' => Icons.check_circle_rounded,
      'rejete' => Icons.cancel_rounded,
      'soumis' => Icons.upload_rounded,
      'en_instruction' => Icons.rate_review_rounded,
      'en_validation' => Icons.fact_check_rounded,
      _ => Icons.circle_outlined,
    };

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Ligne + point
          SizedBox(
            width: 28,
            child: Column(
              children: [
                // Ligne supérieure
                if (!isFirst)
                  Container(
                    width: 2,
                    height: 10,
                    color: Colors.grey.shade300,
                  ),
                Container(
                  width: 26,
                  height: 26,
                  decoration: BoxDecoration(
                    color: colorWithOpacity(dotColor, 0.13),
                    shape: BoxShape.circle,
                    border: Border.all(
                        color: colorWithOpacity(dotColor, 0.55), width: 1.5),
                  ),
                  child: Icon(dotIcon, size: 13, color: dotColor),
                ),
                // Ligne inférieure
                if (!isLast)
                  Expanded(
                    child: Container(
                      width: 2,
                      color: Colors.grey.shade300,
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          // Contenu
          Expanded(
            child: Padding(
              padding: EdgeInsets.only(
                  bottom: isLast ? 0 : 14, top: isFirst ? 4 : 10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          t.newStatutLabel,
                          style: TextStyle(
                            fontWeight: FontWeight.w700,
                            fontSize: 13,
                            color: dotColor,
                          ),
                        ),
                      ),
                      Text(
                        _fmtDate(t.changedAt),
                        style: const TextStyle(
                            fontSize: 11, color: Colors.black38),
                      ),
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Par ${t.changedBy}',
                    style: const TextStyle(
                        fontSize: 11, color: Colors.black45),
                  ),
                  if (t.note != null) ...[
                    const SizedBox(height: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: colorWithOpacity(dotColor, 0.06),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                            color: colorWithOpacity(dotColor, 0.2)),
                      ),
                      child: Text(
                        t.note!,
                        style: TextStyle(
                            fontSize: 11,
                            color: Colors.black54,
                            height: 1.4),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _fmtDate(DateTime d) =>
      '${d.day.toString().padLeft(2, '0')}/'
      '${d.month.toString().padLeft(2, '0')}/'
      '${d.year}';
}
