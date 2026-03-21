import 'package:flutter/material.dart';

import '../models/operateur_industriel.dart';
import '../services/api_service.dart';
import '../theme/pnpi_theme.dart';
import '../widgets/pnpi_toast.dart';
import '../widgets/validated_field.dart';
import '../widgets/confirm_dialog.dart';

/// Formulaire de soumission d'un nouvel Agrément Technique Industriel (ATI).
class SubmitATIScreen extends StatefulWidget {
  /// Si fourni, l'opérateur est pré-sélectionné (navigation depuis OperateursScreen).
  final OperateurIndustriel? preselectedOperateur;

  const SubmitATIScreen({super.key, this.preselectedOperateur});

  @override
  State<SubmitATIScreen> createState() => _SubmitATIScreenState();
}

class _SubmitATIScreenState extends State<SubmitATIScreen> {
  final _formKey = GlobalKey<FormState>();
  final _typeActiviteCtrl = TextEditingController();

  List<OperateurIndustriel> _operateurs = [];
  bool _loadingOps = true;
  bool _submitting = false;

  OperateurIndustriel? _selectedOp;
  String _secteur = 'agroalimentaire';
  String _province = 'Estuaire';
  String _priorite = 'normale';
  int _slaDays = 30;

  static const _secteurs = [
    (value: 'bois', label: 'Bois'),
    (value: 'agroalimentaire', label: 'Agroalimentaire'),
    (value: 'peche', label: 'Pêche'),
    (value: 'mines', label: 'Mines'),
    (value: 'btp', label: 'BTP'),
    (value: 'petrole', label: 'Pétrole & Gaz'),
    (value: 'services', label: 'Services industriels'),
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

  static const _priorites = [
    (value: 'normale', label: 'Normale', color: Colors.grey),
    (value: 'elevee', label: 'Élevée', color: Colors.orange),
    (value: 'urgente', label: 'Urgente', color: Colors.red),
  ];

  static const _slaOptions = [14, 21, 30, 45, 60];

  @override
  void initState() {
    super.initState();
    _loadOperateurs();
  }

  @override
  void dispose() {
    _typeActiviteCtrl.dispose();
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
          orElse: () => ops.isNotEmpty ? ops.first : widget.preselectedOperateur!,
        );
        _secteur = _selectedOp!.secteur;
        _province = _selectedOp!.province;
      } else if (ops.isNotEmpty) {
        _selectedOp = ops.first;
        _secteur = ops.first.secteur;
        _province = ops.first.province;
      }
    });
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedOp == null) return;

    final confirmed = await ConfirmDialog.show(
      context,
      title: 'Soumettre cet ATI ?',
      message: 'Cette action va enregistrer la demande d\'agrement. Voulez-vous continuer ?',
      confirmLabel: 'Soumettre',
      icon: Icons.send_rounded,
    );
    if (!confirmed) return;

    setState(() => _submitting = true);
    try {
      await ApiService.instance.submitATI(
        operateurId: _selectedOp!.id,
        typeActivite: _typeActiviteCtrl.text.trim(),
        secteur: _secteur,
        province: _province,
        priorite: _priorite,
        slaDays: _slaDays,
      );
      if (!mounted) return;
      PnpiToast.show(context, message: 'ATI soumis avec succes !', type: ToastType.success);
      Navigator.of(context).pop(true);
    } catch (e) {
      if (!mounted) return;
      PnpiToast.show(context, message: 'Soumission echouee : $e', type: ToastType.error);
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Nouvelle demande ATI'),
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
                padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 20),
                children: [
                  // Info banner
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: colorWithOpacity(PnpiColors.lagoon, 0.1),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(
                          color: colorWithOpacity(PnpiColors.lagoon, 0.3)),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.info_outline,
                            color: PnpiColors.lagoon, size: 18),
                        const SizedBox(width: 10),
                        const Expanded(
                          child: Text(
                            'Le dossier sera enregistré avec le statut « Soumis » '
                            'et traité selon le SLA défini.',
                            style: TextStyle(fontSize: 13, color: Colors.black87),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Section opérateur
                  _sectionHeader('Opérateur industriel', Icons.business_rounded),
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

                  // Section activité
                  _sectionHeader('Activité demandée', Icons.work_outline),
                  const SizedBox(height: 10),
                  ValidatedField(
                    controller: _typeActiviteCtrl,
                    label: 'Activité industrielle',
                    hint: 'Décrivez l\'activité industrielle à agréer...',
                    required: true,
                    maxLines: 3,
                    validator: Validators.minLength(10),
                  ),
                  const SizedBox(height: 20),

                  // Section secteur
                  _sectionHeader('Secteur industriel', Icons.category_outlined),
                  const SizedBox(height: 10),
                  DropdownButtonFormField<String>(
                    initialValue: _secteur,
                    decoration: _inputDeco('Secteur'),
                    items: _secteurs.map((s) {
                      return DropdownMenuItem(
                        value: s.value,
                        child: Text(s.label),
                      );
                    }).toList(),
                    onChanged: (v) => setState(() => _secteur = v!),
                  ),
                  const SizedBox(height: 16),

                  // Section province
                  _sectionHeader('Province d\'implantation', Icons.location_on_outlined),
                  const SizedBox(height: 10),
                  DropdownButtonFormField<String>(
                    initialValue: _province,
                    decoration: _inputDeco('Province'),
                    items: _provinces.map((p) {
                      return DropdownMenuItem(value: p, child: Text(p));
                    }).toList(),
                    onChanged: (v) => setState(() => _province = v!),
                  ),
                  const SizedBox(height: 20),

                  // Section priorité
                  _sectionHeader('Priorité', Icons.flag_outlined),
                  const SizedBox(height: 10),
                  Row(
                    children: _priorites.map((p) {
                      final selected = _priorite == p.value;
                      return Expanded(
                        child: GestureDetector(
                          onTap: () => setState(() => _priorite = p.value),
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 180),
                            margin: const EdgeInsets.only(right: 8),
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            decoration: BoxDecoration(
                              color: selected
                                  ? colorWithOpacity(p.color, 0.15)
                                  : Colors.grey.shade100,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: selected
                                    ? colorWithOpacity(p.color, 0.6)
                                    : Colors.grey.shade300,
                                width: selected ? 1.5 : 1,
                              ),
                            ),
                            child: Column(
                              children: [
                                Icon(
                                  Icons.flag_rounded,
                                  color: selected ? p.color : Colors.grey,
                                  size: 20,
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  p.label,
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: selected
                                        ? FontWeight.w700
                                        : FontWeight.normal,
                                    color: selected ? p.color : Colors.black54,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 20),

                  // Section SLA
                  _sectionHeader('Délai de traitement (SLA)', Icons.timer_outlined),
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 8,
                    children: _slaOptions.map((days) {
                      final selected = _slaDays == days;
                      return ChoiceChip(
                        label: Text('$days jours'),
                        selected: selected,
                        onSelected: (_) => setState(() => _slaDays = days),
                        selectedColor: colorWithOpacity(PnpiColors.lagoon, 0.2),
                        backgroundColor: Colors.grey.shade100,
                        labelStyle: TextStyle(
                          color: selected ? PnpiColors.lagoon : Colors.black54,
                          fontWeight:
                              selected ? FontWeight.w700 : FontWeight.normal,
                        ),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 32),

                  // Recap card
                  if (_selectedOp != null)
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: colorWithOpacity(PnpiColors.deepSpace, 0.05),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                            color: colorWithOpacity(PnpiColors.deepSpace, 0.2)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Récapitulatif',
                            style: TextStyle(
                              fontWeight: FontWeight.w700,
                              color: Colors.black54,
                              fontSize: 12,
                            ),
                          ),
                          const SizedBox(height: 8),
                          _recapRow('Opérateur', _selectedOp!.raisonSociale),
                          _recapRow('Secteur', _secteurLabel(_secteur)),
                          _recapRow('Province', _province),
                          _recapRow('Priorité',
                              _priorites.firstWhere((p) => p.value == _priorite).label),
                          _recapRow('SLA', '$_slaDays jours'),
                        ],
                      ),
                    ),
                  const SizedBox(height: 24),

                  // Submit button
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
                          : const Icon(Icons.send_rounded),
                      label: Text(
                          _submitting ? 'Soumission en cours…' : 'Soumettre l\'ATI'),
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

  Widget _recapRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(
        children: [
          SizedBox(
            width: 78,
            child: Text(
              '$label :',
              style: const TextStyle(fontSize: 12, color: Colors.black45),
            ),
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
        'services' => 'Services industriels',
        _ => s,
      };
}
