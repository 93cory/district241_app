import 'package:flutter/material.dart';

import '../models/operateur_industriel.dart';
import '../services/api_service.dart';
import '../theme/pnpi_theme.dart';
import '../widgets/adaptive_layout.dart';
import '../widgets/skeleton_loader.dart';
import 'operateur_detail_screen.dart';
import 'register_operateur_screen.dart';
import 'submit_ati_screen.dart';

class OperateursScreen extends StatefulWidget {
  const OperateursScreen({super.key});

  @override
  State<OperateursScreen> createState() => _OperateursScreenState();
}

class _OperateursScreenState extends State<OperateursScreen> {
  List<OperateurIndustriel> _all = [];
  bool _loading = true;
  String _query = '';
  String? _activeSecteur;
  String? _activeProvince;
  String? _selectedOperateurId;

  final TextEditingController _searchCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final data = await ApiService.instance.fetchOperateurs();
    if (!mounted) return;
    setState(() {
      _all = data;
      _loading = false;
    });
  }

  List<OperateurIndustriel> get _filtered {
    var list = _all;
    if (_activeSecteur != null) {
      list = list.where((o) => o.secteur == _activeSecteur).toList();
    }
    if (_activeProvince != null) {
      list = list.where((o) => o.province == _activeProvince).toList();
    }
    if (_query.isNotEmpty) {
      final q = _query.toLowerCase();
      list = list
          .where((o) =>
              o.raisonSociale.toLowerCase().contains(q) ||
              o.nifGabon.toLowerCase().contains(q) ||
              o.ville.toLowerCase().contains(q))
          .toList();
    }
    return list;
  }

  List<String> get _secteurs =>
      _all.map((o) => o.secteur).toSet().toList()..sort();

  List<String> get _provinces =>
      _all.map((o) => o.province).toSet().toList()..sort();

  Color _conformiteColor(String statut) => switch (statut) {
        'conforme' => Colors.green.shade700,
        'non_conforme' => Colors.red.shade700,
        _ => Colors.orange.shade700,
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
        'agroalimentaire' => 'Agroalimentaire',
        'peche' => 'Pêche',
        'mines' => 'Mines',
        'btp' => 'BTP',
        'petrole' => 'Pétrole',
        _ => secteur,
      };

  void _showDetail(OperateurIndustriel op) {
    final conformiteColor = _conformiteColor(op.statutConformite);
    final secteurColor = _secteurColor(op.secteur);

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (_) => DraggableScrollableSheet(
        initialChildSize: 0.55,
        minChildSize: 0.4,
        maxChildSize: 0.85,
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
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  CircleAvatar(
                    radius: 26,
                    backgroundColor: colorWithOpacity(secteurColor, 0.15),
                    child: Icon(Icons.factory_rounded, color: secteurColor, size: 26),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          op.raisonSociale,
                          style: const TextStyle(
                            fontWeight: FontWeight.w700,
                            fontSize: 17,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          op.nifGabon,
                          style: const TextStyle(color: Colors.black54, fontSize: 13),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: colorWithOpacity(conformiteColor, 0.12),
                      borderRadius: BorderRadius.circular(99),
                      border: Border.all(color: colorWithOpacity(conformiteColor, 0.5)),
                    ),
                    child: Text(
                      op.statutConformiteLabel,
                      style: TextStyle(
                        color: conformiteColor,
                        fontWeight: FontWeight.w700,
                        fontSize: 12,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              const Divider(),
              const SizedBox(height: 12),
              _detailRow(Icons.category_outlined, 'Secteur', _secteurLabel(op.secteur)),
              const SizedBox(height: 10),
              _detailRow(Icons.location_city_outlined, 'Province', op.province),
              const SizedBox(height: 10),
              _detailRow(Icons.place_outlined, 'Ville', op.ville),
              if (op.contactEmail != null) ...[
                const SizedBox(height: 10),
                _detailRow(Icons.email_outlined, 'Email', op.contactEmail!),
              ],
              if (op.contactTelephone != null) ...[
                const SizedBox(height: 10),
                _detailRow(Icons.phone_outlined, 'Téléphone', op.contactTelephone!),
              ],
              const SizedBox(height: 10),
              _detailRow(
                Icons.calendar_today_outlined,
                'Enregistré le',
                '${op.dateCreation.day.toString().padLeft(2, '0')}/'
                    '${op.dateCreation.month.toString().padLeft(2, '0')}/'
                    '${op.dateCreation.year}',
              ),
              const SizedBox(height: 20),
              const Divider(),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: _statBox(
                      'ATIs total',
                      '${op.nombreAtiTotal}',
                      PnpiColors.deepSpace,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _statBox(
                      'ATIs actifs',
                      '${op.nombreAtiActifs}',
                      PnpiColors.lagoon,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: () {
                    Navigator.pop(context);
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => OperateurDetailScreen(operateur: op),
                      ),
                    );
                  },
                  icon: const Icon(Icons.folder_open_rounded, size: 18),
                  label: const Text('Voir le dossier complet'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: PnpiColors.lagoon,
                    side: BorderSide(color: PnpiColors.lagoon),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14)),
                  ),
                ),
              ),
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: () {
                    Navigator.pop(context);
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) =>
                            SubmitATIScreen(preselectedOperateur: op),
                      ),
                    );
                  },
                  icon: const Icon(Icons.add_rounded, size: 18),
                  label: const Text('Soumettre un ATI pour cet opérateur'),
                  style: FilledButton.styleFrom(
                    backgroundColor: PnpiColors.lagoon,
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14)),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _detailRow(IconData icon, String label, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 18, color: PnpiColors.lagoon),
        const SizedBox(width: 10),
        Text('$label : ', style: const TextStyle(color: Colors.black54, fontSize: 13)),
        Expanded(
          child: Text(
            value,
            style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
          ),
        ),
      ],
    );
  }

  Widget _statBox(String label, String value, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12),
      decoration: BoxDecoration(
        color: colorWithOpacity(color, 0.1),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: colorWithOpacity(color, 0.3)),
      ),
      child: Column(
        children: [
          Text(
            value,
            style: TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w800,
              color: color,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: const TextStyle(fontSize: 12, color: Colors.black54),
          ),
        ],
      ),
    );
  }

  Widget _buildOperateurDetailPanel(OperateurIndustriel op) {
    final conformiteColor = _conformiteColor(op.statutConformite);
    final secteurColor = _secteurColor(op.secteur);

    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            CircleAvatar(
              radius: 26,
              backgroundColor: colorWithOpacity(secteurColor, 0.15),
              child: Icon(Icons.factory_rounded, color: secteurColor, size: 26),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    op.raisonSociale,
                    style: const TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 17,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    op.nifGabon,
                    style: const TextStyle(color: Colors.black54, fontSize: 13),
                  ),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(
                color: colorWithOpacity(conformiteColor, 0.12),
                borderRadius: BorderRadius.circular(99),
                border: Border.all(color: colorWithOpacity(conformiteColor, 0.5)),
              ),
              child: Text(
                op.statutConformiteLabel,
                style: TextStyle(
                  color: conformiteColor,
                  fontWeight: FontWeight.w700,
                  fontSize: 12,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 20),
        const Divider(),
        const SizedBox(height: 12),
        _detailRow(Icons.category_outlined, 'Secteur', _secteurLabel(op.secteur)),
        const SizedBox(height: 10),
        _detailRow(Icons.location_city_outlined, 'Province', op.province),
        const SizedBox(height: 10),
        _detailRow(Icons.place_outlined, 'Ville', op.ville),
        if (op.contactEmail != null) ...[
          const SizedBox(height: 10),
          _detailRow(Icons.email_outlined, 'Email', op.contactEmail!),
        ],
        if (op.contactTelephone != null) ...[
          const SizedBox(height: 10),
          _detailRow(Icons.phone_outlined, 'Telephone', op.contactTelephone!),
        ],
        const SizedBox(height: 10),
        _detailRow(
          Icons.calendar_today_outlined,
          'Enregistre le',
          '${op.dateCreation.day.toString().padLeft(2, '0')}/'
              '${op.dateCreation.month.toString().padLeft(2, '0')}/'
              '${op.dateCreation.year}',
        ),
        const SizedBox(height: 20),
        const Divider(),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _statBox(
                'ATIs total',
                '${op.nombreAtiTotal}',
                PnpiColors.deepSpace,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _statBox(
                'ATIs actifs',
                '${op.nombreAtiActifs}',
                PnpiColors.lagoon,
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        SizedBox(
          width: double.infinity,
          child: OutlinedButton.icon(
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => OperateurDetailScreen(operateur: op),
                ),
              );
            },
            icon: const Icon(Icons.folder_open_rounded, size: 18),
            label: const Text('Voir le dossier complet'),
            style: OutlinedButton.styleFrom(
              foregroundColor: PnpiColors.lagoon,
              side: BorderSide(color: PnpiColors.lagoon),
              padding: const EdgeInsets.symmetric(vertical: 12),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14)),
            ),
          ),
        ),
        const SizedBox(height: 8),
        SizedBox(
          width: double.infinity,
          child: FilledButton.icon(
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) =>
                      SubmitATIScreen(preselectedOperateur: op),
                ),
              );
            },
            icon: const Icon(Icons.add_rounded, size: 18),
            label: const Text('Soumettre un ATI pour cet operateur'),
            style: FilledButton.styleFrom(
              backgroundColor: PnpiColors.lagoon,
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14)),
              padding: const EdgeInsets.symmetric(vertical: 12),
            ),
          ),
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

    final filtered = _filtered;
    final conformes = _all.where((o) => o.statutConformite == 'conforme').length;
    final nonConformes = _all.where((o) => o.statutConformite == 'non_conforme').length;

    return LayoutBuilder(
      builder: (context, constraints) {
        final isTablet = constraints.maxWidth >= kTabletBreakpoint;

        // Selected operateur for tablet detail panel
        OperateurIndustriel? selectedOp;
        if (isTablet && _selectedOperateurId != null) {
          final idx = _all.indexWhere((o) => o.id == _selectedOperateurId);
          if (idx >= 0) selectedOp = _all[idx];
        }

        final listContent = RefreshIndicator(
          onRefresh: _load,
          child: ListView(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
            children: [
              // Stats band
              Row(
                children: [
                  _quickStat('Total', '${_all.length}', PnpiColors.deepSpace),
                  const SizedBox(width: 8),
                  _quickStat('Conformes', '$conformes', Colors.green.shade700),
                  const SizedBox(width: 8),
                  _quickStat('Non conformes', '$nonConformes', Colors.red.shade700),
                ],
              ),
              const SizedBox(height: 10),

              // Bouton enregistrement
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: () async {
                    final result = await Navigator.push<OperateurIndustriel>(
                      context,
                      MaterialPageRoute(
                        builder: (_) => const RegisterOperateurScreen(),
                      ),
                    );
                    if (result != null) _load();
                  },
                  icon: const Icon(Icons.add_business_rounded, size: 18),
                  label: const Text('Enregistrer un operateur'),
                  style: FilledButton.styleFrom(
                    backgroundColor: PnpiColors.deepSpace,
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14)),
                    padding: const EdgeInsets.symmetric(vertical: 13),
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Search
              TextField(
                controller: _searchCtrl,
                decoration: InputDecoration(
                  prefixIcon: const Icon(Icons.search),
                  hintText: 'Rechercher operateur, NIF, ville...',
                  filled: true,
                  fillColor: Colors.white,
                  contentPadding: const EdgeInsets.symmetric(vertical: 14),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(18),
                    borderSide: BorderSide.none,
                  ),
                ),
                onChanged: (v) => setState(() => _query = v),
              ),
              const SizedBox(height: 12),

              // Secteur chips
              if (_secteurs.isNotEmpty) ...[
                const Text(
                  'Secteur',
                  style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                ),
                const SizedBox(height: 6),
                Wrap(
                  spacing: 6,
                  runSpacing: 4,
                  children: _secteurs.map((s) {
                    final selected = _activeSecteur == s;
                    final color = _secteurColor(s);
                    return FilterChip(
                      label: Text(_secteurLabel(s)),
                      selected: selected,
                      onSelected: (_) => setState(
                        () => _activeSecteur = selected ? null : s,
                      ),
                      selectedColor: colorWithOpacity(color, 0.2),
                      backgroundColor: Colors.grey.shade100,
                      labelStyle: TextStyle(
                        color: selected ? color : Colors.black87,
                        fontWeight: selected ? FontWeight.w700 : FontWeight.normal,
                      ),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 10),
              ],

              // Province chips
              if (_provinces.isNotEmpty) ...[
                const Text(
                  'Province',
                  style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                ),
                const SizedBox(height: 6),
                Wrap(
                  spacing: 6,
                  runSpacing: 4,
                  children: _provinces.map((p) {
                    final selected = _activeProvince == p;
                    return ChoiceChip(
                      label: Text(p),
                      selected: selected,
                      onSelected: (_) => setState(
                        () => _activeProvince = selected ? null : p,
                      ),
                      selectedColor: colorWithOpacity(PnpiColors.oceanPulse, 0.25),
                      backgroundColor: Colors.grey.shade100,
                    );
                  }).toList(),
                ),
                const SizedBox(height: 14),
              ],

              // Results count + reset
              Row(
                children: [
                  Text(
                    '${filtered.length} operateur${filtered.length != 1 ? 's' : ''}',
                    style: const TextStyle(
                      fontWeight: FontWeight.w600,
                      color: Colors.black54,
                    ),
                  ),
                  const Spacer(),
                  if (_activeSecteur != null ||
                      _activeProvince != null ||
                      _query.isNotEmpty)
                    TextButton(
                      onPressed: () => setState(() {
                        _activeSecteur = null;
                        _activeProvince = null;
                        _query = '';
                        _searchCtrl.clear();
                      }),
                      child: const Text('Reinitialiser'),
                    ),
                ],
              ),
              const SizedBox(height: 8),

              // Operator cards
              if (filtered.isEmpty)
                Center(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 40),
                    child: Text(
                      'Aucun operateur trouve',
                      style: TextStyle(color: Colors.grey.shade500, fontSize: 15),
                    ),
                  ),
                )
              else
                ...filtered.map((op) => _buildCard(op, isTablet: isTablet)),
            ],
          ),
        );

        final detailContent = selectedOp != null
            ? _buildOperateurDetailPanel(selectedOp)
            : const Center(
                child: Text(
                  'Selectionnez un operateur',
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

  Widget _quickStat(String label, String value, Color color) {
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
                fontSize: 20,
                fontWeight: FontWeight.w800,
                color: color,
              ),
            ),
            Text(label, style: const TextStyle(fontSize: 11, color: Colors.black54)),
          ],
        ),
      ),
    );
  }

  Widget _buildCard(OperateurIndustriel op, {bool isTablet = false}) {
    final conformiteColor = _conformiteColor(op.statutConformite);
    final secteurColor = _secteurColor(op.secteur);
    final isSelected = _selectedOperateurId == op.id;

    return GestureDetector(
      onTap: () {
        if (isTablet) {
          setState(() => _selectedOperateurId = op.id);
        } else {
          _showDetail(op);
        }
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isSelected ? colorWithOpacity(PnpiColors.lagoon, 0.06) : Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: isSelected ? PnpiColors.lagoon : Colors.grey.shade200,
          ),
          boxShadow: PnpiTheme.softShadows,
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            CircleAvatar(
              radius: 22,
              backgroundColor: colorWithOpacity(secteurColor, 0.15),
              child: Icon(Icons.factory_rounded, color: secteurColor, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    op.raisonSociale,
                    style: const TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 14.5,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '${op.nifGabon} • ${op.ville}',
                    style: const TextStyle(color: Colors.black54, fontSize: 12),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      _miniChip(_secteurLabel(op.secteur), secteurColor),
                      const SizedBox(width: 6),
                      _miniChip(op.province, PnpiColors.deepSpace),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: colorWithOpacity(conformiteColor, 0.12),
                    borderRadius: BorderRadius.circular(99),
                  ),
                  child: Text(
                    op.statutConformiteLabel,
                    style: TextStyle(
                      color: conformiteColor,
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  '${op.nombreAtiActifs} ATI actif${op.nombreAtiActifs != 1 ? 's' : ''}',
                  style: const TextStyle(fontSize: 12, color: Colors.black45),
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
