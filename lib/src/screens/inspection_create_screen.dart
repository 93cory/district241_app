import 'package:flutter/material.dart';

import '../models/operateur_industriel.dart';
import '../services/api_service.dart';
import '../theme/pnpi_theme.dart';

/// Formulaire de saisie d'une nouvelle inspection de conformité industrielle.
class InspectionCreateScreen extends StatefulWidget {
  /// Si fourni, l'opérateur est pré-sélectionné.
  final OperateurIndustriel? preselectedOperateur;

  const InspectionCreateScreen({super.key, this.preselectedOperateur});

  @override
  State<InspectionCreateScreen> createState() => _InspectionCreateScreenState();
}

class _InspectionCreateScreenState extends State<InspectionCreateScreen> {
  final _formKey = GlobalKey<FormState>();
  final _observationsCtrl = TextEditingController();
  final _mesuresCtrl = TextEditingController();

  List<OperateurIndustriel> _operateurs = [];
  bool _loadingOps = true;
  bool _submitting = false;

  OperateurIndustriel? _selectedOp;
  String _statut = 'conforme';
  String _province = 'Estuaire';
  String _secteur = 'agroalimentaire';

  static const _statuts = [
    (
      value: 'conforme',
      label: 'Conforme',
      icon: Icons.check_circle_rounded,
      color: Color(0xFF2E7D32),
    ),
    (
      value: 'partiel',
      label: 'Partiel',
      icon: Icons.warning_rounded,
      color: Color(0xFFF57F17),
    ),
    (
      value: 'non_conforme',
      label: 'Non conforme',
      icon: Icons.cancel_rounded,
      color: Color(0xFFC62828),
    ),
  ];

  static const _secteurs = [
    (value: 'bois', label: 'Bois'),
    (value: 'agroalimentaire', label: 'Agroalimentaire'),
    (value: 'peche', label: 'Pêche'),
    (value: 'mines', label: 'Mines'),
    (value: 'btp', label: 'BTP'),
    (value: 'petrole', label: 'Pétrole & Gaz'),
    (value: 'services', label: 'Services'),
  ];

  static const _provinces = [
    'Estuaire',
    'Haut-Ogooué',
    'Moyen-Ogooué',
    'Ngounié',
    'Nyanga',
    'Ogooué-Ivindo',
    'Ogooué-Lolo',
    'Ogooué-Maritime',
    'Woleu-Ntem',
  ];

  @override
  void initState() {
    super.initState();
    _loadOperateurs();
  }

  @override
  void dispose() {
    _observationsCtrl.dispose();
    _mesuresCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadOperateurs() async {
    final ops = await ApiService.instance.fetchOperateurs();
    if (!mounted) return;
    setState(() {
      _operateurs = ops;
      _loadingOps = false;
      if (widget.preselectedOperateur != null) {
        _selectedOp = ops.firstWhere(
          (o) => o.id == widget.preselectedOperateur!.id,
          orElse: () =>
              ops.isNotEmpty ? ops.first : widget.preselectedOperateur!,
        );
      } else if (ops.isNotEmpty) {
        _selectedOp = ops.first;
      }
      if (_selectedOp != null) {
        _secteur = _selectedOp!.secteur;
        _province = _selectedOp!.province;
      }
    });
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedOp == null) return;

    setState(() => _submitting = true);
    try {
      final inspection = await ApiService.instance.createInspection(
        operateurId: _selectedOp!.id,
        statutConformite: _statut,
        observations: _observationsCtrl.text.trim(),
        mesuresCorrectives: _mesuresCtrl.text.trim().isEmpty
            ? null
            : _mesuresCtrl.text.trim(),
        province: _province,
        secteur: _secteur,
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Inspection ${inspection.id} enregistrée'),
          backgroundColor: Colors.green.shade700,
        ),
      );
      Navigator.of(context).pop(inspection);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Enregistrement échoué : $e'),
          backgroundColor: Colors.red.shade700,
        ),
      );
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Nouvelle inspection'),
        flexibleSpace: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [Color(0xFF005C33), Color(0xFFF2CD1B), Color(0xFF0044A8)],
            ),
          ),
        ),
      ),
      body: _loadingOps
          ? const Center(child: CircularProgressIndicator())
          : Form(
              key: _formKey,
              child: ListView(
                padding:
                    const EdgeInsets.symmetric(horizontal: 18, vertical: 20),
                children: [
                  // ── Opérateur ─────────────────────────────────────────────
                  _sectionHeader('Opérateur inspecté', Icons.business_rounded),
                  const SizedBox(height: 10),
                  DropdownButtonFormField<OperateurIndustriel>(
                    initialValue: _selectedOp,
                    isExpanded: true,
                    decoration: _inputDeco('Sélectionner un opérateur'),
                    items: _operateurs.map((op) {
                      return DropdownMenuItem(
                        value: op,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              op.raisonSociale,
                              style: const TextStyle(
                                  fontWeight: FontWeight.w600, fontSize: 13),
                              overflow: TextOverflow.ellipsis,
                            ),
                            Text(
                              '${op.nifGabon} · ${op.province}',
                              style: const TextStyle(
                                  fontSize: 11, color: Colors.black45),
                            ),
                          ],
                        ),
                      );
                    }).toList(),
                    onChanged: (op) {
                      if (op == null) return;
                      setState(() {
                        _selectedOp = op;
                        _secteur = op.secteur;
                        _province = op.province;
                      });
                    },
                    validator: (v) =>
                        v == null ? 'Sélectionnez un opérateur' : null,
                  ),
                  const SizedBox(height: 20),

                  // ── Résultat de conformité ────────────────────────────────
                  _sectionHeader(
                      'Résultat de l\'inspection', Icons.fact_check_outlined),
                  const SizedBox(height: 10),
                  Row(
                    children: _statuts.map((s) {
                      final selected = _statut == s.value;
                      return Expanded(
                        child: GestureDetector(
                          onTap: () => setState(() => _statut = s.value),
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 180),
                            margin: const EdgeInsets.only(right: 8),
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            decoration: BoxDecoration(
                              color: selected
                                  ? colorWithOpacity(s.color, 0.12)
                                  : Colors.grey.shade100,
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(
                                color: selected
                                    ? colorWithOpacity(s.color, 0.55)
                                    : Colors.grey.shade300,
                                width: selected ? 1.5 : 1,
                              ),
                            ),
                            child: Column(
                              children: [
                                Icon(s.icon,
                                    color: selected ? s.color : Colors.grey,
                                    size: 22),
                                const SizedBox(height: 5),
                                Text(
                                  s.label,
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: selected
                                        ? FontWeight.w700
                                        : FontWeight.normal,
                                    color: selected ? s.color : Colors.black54,
                                  ),
                                  textAlign: TextAlign.center,
                                ),
                              ],
                            ),
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 20),

                  // ── Secteur + Province ────────────────────────────────────
                  _sectionHeader('Localisation', Icons.location_on_outlined),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: DropdownButtonFormField<String>(
                          initialValue: _secteur,
                          decoration: _inputDeco('Secteur'),
                          items: _secteurs
                              .map((s) => DropdownMenuItem(
                                  value: s.value, child: Text(s.label)))
                              .toList(),
                          onChanged: (v) => setState(() => _secteur = v!),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: DropdownButtonFormField<String>(
                          initialValue: _province,
                          decoration: _inputDeco('Province'),
                          items: _provinces
                              .map((p) =>
                                  DropdownMenuItem(value: p, child: Text(p)))
                              .toList(),
                          onChanged: (v) => setState(() => _province = v!),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),

                  // ── Observations ──────────────────────────────────────────
                  _sectionHeader('Observations', Icons.notes_rounded),
                  const SizedBox(height: 10),
                  TextFormField(
                    controller: _observationsCtrl,
                    maxLines: 4,
                    decoration: _inputDeco(
                        'Décrivez les constats de l\'inspection…'),
                    validator: (v) {
                      if (v == null || v.trim().length < 20) {
                        return 'Observations requises (min. 20 caractères)';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 20),

                  // ── Mesures correctives (si non conforme / partiel) ───────
                  AnimatedCrossFade(
                    duration: const Duration(milliseconds: 250),
                    crossFadeState: _statut == 'conforme'
                        ? CrossFadeState.showFirst
                        : CrossFadeState.showSecond,
                    firstChild: const SizedBox.shrink(),
                    secondChild: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _sectionHeader('Mesures correctives',
                            Icons.build_circle_outlined),
                        const SizedBox(height: 10),
                        TextFormField(
                          controller: _mesuresCtrl,
                          maxLines: 3,
                          decoration: _inputDeco(
                              'Actions correctives prescrites à l\'opérateur…'),
                        ),
                        const SizedBox(height: 20),
                      ],
                    ),
                  ),

                  // ── Récapitulatif ─────────────────────────────────────────
                  if (_selectedOp != null)
                    _RecapInspection(
                      op: _selectedOp!,
                      statut: _statut,
                      statuts: _statuts,
                      province: _province,
                      secteur: _secteur,
                    ),
                  const SizedBox(height: 24),

                  // ── Submit ────────────────────────────────────────────────
                  SizedBox(
                    height: 52,
                    child: ElevatedButton.icon(
                      onPressed: _submitting ? null : _submit,
                      icon: _submitting
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(
                                  strokeWidth: 2, color: Colors.white),
                            )
                          : const Icon(Icons.assignment_turned_in_rounded),
                      label: Text(_submitting
                          ? 'Enregistrement…'
                          : 'Valider l\'inspection'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: PnpiColors.lagoon,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                ],
              ),
            ),
    );
  }

  Widget _sectionHeader(String title, IconData icon) {
    return Row(
      children: [
        Icon(icon, size: 16, color: PnpiColors.deepSpace),
        const SizedBox(width: 6),
        Text(
          title,
          style: const TextStyle(
            fontWeight: FontWeight.w700,
            fontSize: 13.5,
            color: Colors.black87,
          ),
        ),
      ],
    );
  }

  InputDecoration _inputDeco(String hint) {
    return InputDecoration(
      hintText: hint,
      filled: true,
      fillColor: Colors.white,
      contentPadding:
          const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide(color: Colors.grey.shade300),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide(color: Colors.grey.shade300),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide(color: PnpiColors.lagoon, width: 1.5),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Récapitulatif
// ─────────────────────────────────────────────────────────────────────────────

class _RecapInspection extends StatelessWidget {
  final OperateurIndustriel op;
  final String statut;
  final List<({String value, String label, IconData icon, Color color})>
      statuts;
  final String province;
  final String secteur;

  const _RecapInspection({
    required this.op,
    required this.statut,
    required this.statuts,
    required this.province,
    required this.secteur,
  });

  @override
  Widget build(BuildContext context) {
    final statutEntry = statuts.firstWhere((s) => s.value == statut);
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: colorWithOpacity(PnpiColors.deepSpace, 0.05),
        borderRadius: BorderRadius.circular(14),
        border:
            Border.all(color: colorWithOpacity(PnpiColors.deepSpace, 0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Récapitulatif',
            style: TextStyle(
                fontWeight: FontWeight.w700,
                color: Colors.black54,
                fontSize: 12),
          ),
          const SizedBox(height: 8),
          _row('Opérateur', op.raisonSociale),
          _row('NIF', op.nifGabon),
          _row('Résultat', statutEntry.label),
          _row('Province', province),
          _row('Secteur', _secteurLabel(secteur)),
        ],
      ),
    );
  }

  Widget _row(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(
        children: [
          SizedBox(
            width: 80,
            child: Text('$label :',
                style:
                    const TextStyle(fontSize: 12, color: Colors.black45)),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                  fontSize: 12, fontWeight: FontWeight.w600),
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }

  String _secteurLabel(String s) => switch (s) {
        'bois' => 'Bois',
        'agroalimentaire' => 'Agroalimentaire',
        'peche' => 'Pêche',
        'mines' => 'Mines',
        'btp' => 'BTP',
        'petrole' => 'Pétrole & Gaz',
        'services' => 'Services',
        _ => s,
      };
}
