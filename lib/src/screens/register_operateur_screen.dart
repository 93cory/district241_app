import 'package:flutter/material.dart';

import '../services/api_service.dart';
import '../theme/pnpi_theme.dart';

/// Formulaire d'enregistrement d'un nouvel opérateur industriel.
class RegisterOperateurScreen extends StatefulWidget {
  const RegisterOperateurScreen({super.key});

  @override
  State<RegisterOperateurScreen> createState() =>
      _RegisterOperateurScreenState();
}

class _RegisterOperateurScreenState extends State<RegisterOperateurScreen> {
  final _formKey = GlobalKey<FormState>();
  final _raisonSocialeCtrl = TextEditingController();
  final _nifCtrl = TextEditingController();
  final _villeCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _telCtrl = TextEditingController();

  bool _submitting = false;
  String _secteur = 'agroalimentaire';
  String _province = 'Estuaire';

  static const _secteurs = [
    (value: 'bois', label: 'Bois & Forêt', icon: Icons.forest_rounded),
    (value: 'agroalimentaire', label: 'Agroalimentaire', icon: Icons.agriculture_rounded),
    (value: 'peche', label: 'Pêche & Aquaculture', icon: Icons.water_rounded),
    (value: 'mines', label: 'Mines & Carrières', icon: Icons.terrain_rounded),
    (value: 'btp', label: 'BTP & Construction', icon: Icons.construction_rounded),
    (value: 'petrole', label: 'Pétrole & Gaz', icon: Icons.local_gas_station_rounded),
    (value: 'services', label: 'Services Industriels', icon: Icons.miscellaneous_services_rounded),
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
  void dispose() {
    _raisonSocialeCtrl.dispose();
    _nifCtrl.dispose();
    _villeCtrl.dispose();
    _emailCtrl.dispose();
    _telCtrl.dispose();
    super.dispose();
  }

  String? _validateNif(String? v) {
    if (v == null || v.trim().isEmpty) return 'Le NIF Gabon est requis';
    final cleaned = v.trim().toUpperCase();
    // Accept common formats: alphanumeric, 6-20 chars
    if (cleaned.length < 5 || cleaned.length > 25) {
      return 'NIF invalide (5 à 25 caractères)';
    }
    return null;
  }

  String? _validateEmail(String? v) {
    if (v == null || v.trim().isEmpty) return null; // optional
    final emailRegex = RegExp(r'^[\w\.-]+@[\w\.-]+\.\w{2,}$');
    if (!emailRegex.hasMatch(v.trim())) return 'Email invalide';
    return null;
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _submitting = true);
    try {
      final op = await ApiService.instance.createOperateur(
        nifGabon: _nifCtrl.text.trim().toUpperCase(),
        raisonSociale: _raisonSocialeCtrl.text.trim(),
        secteur: _secteur,
        province: _province,
        ville: _villeCtrl.text.trim(),
        contactEmail: _emailCtrl.text.trim().isEmpty
            ? null
            : _emailCtrl.text.trim(),
        contactTelephone: _telCtrl.text.trim().isEmpty
            ? null
            : _telCtrl.text.trim(),
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Opérateur « ${op.raisonSociale} » enregistré'),
          backgroundColor: Colors.green.shade700,
        ),
      );
      Navigator.of(context).pop(op);
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
        title: const Text('Nouvel opérateur industriel'),
        flexibleSpace: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [Color(0xFF005C33), Color(0xFFF2CD1B), Color(0xFF0044A8)],
            ),
          ),
        ),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 20),
          children: [
            // Banner info
            _infoBanner(
              'Les informations saisies seront enregistrées dans le registre '
              'national des opérateurs industriels (PNPI).',
            ),
            const SizedBox(height: 20),

            // ── Section identité ──────────────────────────────────────────
            _sectionHeader('Identité légale', Icons.business_rounded),
            const SizedBox(height: 10),
            TextFormField(
              controller: _raisonSocialeCtrl,
              textCapitalization: TextCapitalization.words,
              decoration: _inputDeco('Raison sociale *', Icons.store_rounded),
              validator: (v) {
                if (v == null || v.trim().length < 3) {
                  return 'Raison sociale requise (min. 3 caractères)';
                }
                return null;
              },
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _nifCtrl,
              textCapitalization: TextCapitalization.characters,
              decoration: _inputDeco('NIF Gabon *', Icons.badge_rounded),
              validator: _validateNif,
            ),

            const SizedBox(height: 20),

            // ── Section secteur ───────────────────────────────────────────
            _sectionHeader('Secteur d\'activité', Icons.category_outlined),
            const SizedBox(height: 10),
            _SecteurPicker(
              selected: _secteur,
              secteurs: _secteurs,
              onChanged: (v) => setState(() => _secteur = v),
            ),

            const SizedBox(height: 20),

            // ── Section localisation ──────────────────────────────────────
            _sectionHeader('Localisation', Icons.location_on_outlined),
            const SizedBox(height: 10),
            DropdownButtonFormField<String>(
              initialValue: _province,
              decoration: _inputDeco('Province *', Icons.map_outlined),
              items: _provinces
                  .map((p) => DropdownMenuItem(value: p, child: Text(p)))
                  .toList(),
              onChanged: (v) => setState(() => _province = v!),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _villeCtrl,
              textCapitalization: TextCapitalization.words,
              decoration: _inputDeco('Ville / Localité *', Icons.location_city_rounded),
              validator: (v) {
                if (v == null || v.trim().isEmpty) return 'Ville requise';
                return null;
              },
            ),

            const SizedBox(height: 20),

            // ── Section contact ───────────────────────────────────────────
            _sectionHeader('Contact (optionnel)', Icons.contact_phone_outlined),
            const SizedBox(height: 10),
            TextFormField(
              controller: _emailCtrl,
              keyboardType: TextInputType.emailAddress,
              decoration: _inputDeco('Email de contact', Icons.email_outlined),
              validator: _validateEmail,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _telCtrl,
              keyboardType: TextInputType.phone,
              decoration: _inputDeco('Téléphone (+241…)', Icons.phone_outlined),
            ),

            const SizedBox(height: 28),

            // ── Récapitulatif ─────────────────────────────────────────────
            _RecapCard(
              secteur: _secteur,
              secteurs: _secteurs,
              province: _province,
              raisonSocialeCtrl: _raisonSocialeCtrl,
              nifCtrl: _nifCtrl,
              villeCtrl: _villeCtrl,
            ),

            const SizedBox(height: 24),

            // ── Submit ────────────────────────────────────────────────────
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
                    : const Icon(Icons.how_to_reg_rounded),
                label: Text(_submitting
                    ? 'Enregistrement…'
                    : 'Enregistrer l\'opérateur'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: PnpiColors.deepSpace,
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

  Widget _infoBanner(String message) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: colorWithOpacity(PnpiColors.deepSpace, 0.07),
        borderRadius: BorderRadius.circular(14),
        border:
            Border.all(color: colorWithOpacity(PnpiColors.deepSpace, 0.25)),
      ),
      child: Row(
        children: [
          Icon(Icons.info_outline, color: PnpiColors.deepSpace, size: 18),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              message,
              style: const TextStyle(fontSize: 13, color: Colors.black87),
            ),
          ),
        ],
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

  InputDecoration _inputDeco(String hint, [IconData? prefixIcon]) {
    return InputDecoration(
      hintText: hint,
      prefixIcon: prefixIcon != null
          ? Icon(prefixIcon, size: 18, color: Colors.black38)
          : null,
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
        borderSide: BorderSide(color: PnpiColors.deepSpace, width: 1.5),
      ),
    );
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Secteur picker — grille 2 colonnes avec icône + label
// ────────────────────────────────────────────────────────────────────────────

class _SecteurPicker extends StatelessWidget {
  final String selected;
  final List<({String value, String label, IconData icon})> secteurs;
  final ValueChanged<String> onChanged;

  const _SecteurPicker({
    required this.selected,
    required this.secteurs,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 8,
      crossAxisSpacing: 8,
      childAspectRatio: 3.0,
      children: secteurs.map((s) {
        final isSelected = selected == s.value;
        return GestureDetector(
          onTap: () => onChanged(s.value),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 160),
            decoration: BoxDecoration(
              color: isSelected
                  ? colorWithOpacity(PnpiColors.lagoon, 0.12)
                  : Colors.grey.shade100,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: isSelected
                    ? colorWithOpacity(PnpiColors.lagoon, 0.55)
                    : Colors.grey.shade300,
                width: isSelected ? 1.5 : 1,
              ),
            ),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
            child: Row(
              children: [
                Icon(
                  s.icon,
                  size: 18,
                  color: isSelected ? PnpiColors.lagoon : Colors.black38,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    s.label,
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight:
                          isSelected ? FontWeight.w700 : FontWeight.normal,
                      color: isSelected ? PnpiColors.lagoon : Colors.black54,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ),
        );
      }).toList(),
    );
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Récapitulatif dynamique
// ────────────────────────────────────────────────────────────────────────────

class _RecapCard extends StatelessWidget {
  final String secteur;
  final List<({String value, String label, IconData icon})> secteurs;
  final String province;
  final TextEditingController raisonSocialeCtrl;
  final TextEditingController nifCtrl;
  final TextEditingController villeCtrl;

  const _RecapCard({
    required this.secteur,
    required this.secteurs,
    required this.province,
    required this.raisonSocialeCtrl,
    required this.nifCtrl,
    required this.villeCtrl,
  });

  @override
  Widget build(BuildContext context) {
    final secteurLabel =
        secteurs.firstWhere((s) => s.value == secteur).label;
    return ListenableBuilder(
      listenable: Listenable.merge(
          [raisonSocialeCtrl, nifCtrl, villeCtrl]),
      builder: (context, _) {
        final rs = raisonSocialeCtrl.text.trim();
        final nif = nifCtrl.text.trim().toUpperCase();
        final ville = villeCtrl.text.trim();
        return Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: colorWithOpacity(PnpiColors.lagoon, 0.05),
            borderRadius: BorderRadius.circular(14),
            border:
                Border.all(color: colorWithOpacity(PnpiColors.lagoon, 0.2)),
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
              _row('Raison sociale',
                  rs.isEmpty ? '—' : rs),
              _row('NIF', nif.isEmpty ? '—' : nif),
              _row('Secteur', secteurLabel),
              _row('Province', province),
              _row('Ville', ville.isEmpty ? '—' : ville),
            ],
          ),
        );
      },
    );
  }

  Widget _row(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(
        children: [
          SizedBox(
            width: 100,
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
}
