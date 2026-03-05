import 'package:flutter/material.dart';

import '../models/industrial_unit.dart';
import '../services/api_service.dart';
import '../theme/pnpi_theme.dart';

class UnitsScreen extends StatefulWidget {
  const UnitsScreen({super.key});

  @override
  State<UnitsScreen> createState() => _UnitsScreenState();
}

class _UnitsScreenState extends State<UnitsScreen> {
  List<IndustrialUnit> _units = [];
  bool _loading = true;
  bool _submitting = false;
  String _query = '';
  String? _secteurFilter;  // null = tous
  UnitStatus? _statusFilter; // null = tous

  List<IndustrialUnit> get _filtered {
    var list = _units;
    if (_statusFilter != null) {
      list = list.where((u) => u.status == _statusFilter).toList();
    }
    if (_secteurFilter != null) {
      list = list
          .where((u) =>
              u.sector.toLowerCase() == _secteurFilter!.toLowerCase())
          .toList();
    }
    if (_query.isNotEmpty) {
      final q = _query.toLowerCase();
      list = list
          .where((u) =>
              u.name.toLowerCase().contains(q) ||
              u.sector.toLowerCase().contains(q) ||
              u.location.toLowerCase().contains(q))
          .toList();
    }
    return list;
  }

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final data = await ApiService.instance.fetchUnits();
    if (!mounted) return;
    setState(() {
      _units = data;
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator());

    final active = _units.where((u) => u.status == UnitStatus.active).length;
    final totalCap = _units.fold(0.0, (s, u) => s + u.capacity);
    final totalProd = _units.fold(0.0, (s, u) => s + u.latestVolume);
    final totalJobs = _units.fold(0, (s, u) => s + u.latestJobs);
    final secteurs = _units.map((u) => u.sector).toSet().toList()..sort();

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 80),
        children: [
          // ── Header card ────────────────────────────────────────────
          _buildHeader(active, totalCap, totalProd, totalJobs),
          const SizedBox(height: 16),

          // ── Search ─────────────────────────────────────────────────
          TextField(
            onChanged: (v) => setState(() => _query = v),
            decoration: InputDecoration(
              prefixIcon:
                  const Icon(Icons.search, size: 20, color: Colors.black38),
              hintText: 'Rechercher une unité, secteur, ville…',
              filled: true,
              fillColor: Colors.white,
              isDense: true,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: BorderSide.none,
              ),
              contentPadding: const EdgeInsets.symmetric(vertical: 12),
            ),
          ),
          const SizedBox(height: 10),

          // ── Statut filter ──────────────────────────────────────────
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _statusChip(null, 'Tous', Colors.grey.shade600),
                const SizedBox(width: 6),
                _statusChip(UnitStatus.active, 'Actives', PnpiColors.lagoon),
                const SizedBox(width: 6),
                _statusChip(UnitStatus.inactive, 'Inactives',
                    Colors.grey.shade500),
                const SizedBox(width: 12),
                Container(
                    width: 1, height: 20, color: Colors.grey.shade300),
                const SizedBox(width: 12),
                ...secteurs.map((s) => Padding(
                      padding: const EdgeInsets.only(right: 6),
                      child: _secteurChip(s),
                    )),
              ],
            ),
          ),
          const SizedBox(height: 14),

          // ── CTA ────────────────────────────────────────────────────
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: _openDeclarationForm,
              icon: const Icon(Icons.add_chart_rounded, size: 18),
              label: const Text('Déclarer la production'),
              style: FilledButton.styleFrom(
                backgroundColor: PnpiColors.lagoon,
                padding: const EdgeInsets.symmetric(vertical: 13),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14)),
              ),
            ),
          ),
          const SizedBox(height: 16),

          // ── Units list ─────────────────────────────────────────────
          if (_filtered.isEmpty)
            _emptyState()
          else
            ..._filtered.map((u) => _UnitCard(
                  unit: u,
                  onDeclare: () => _openDeclarationForm(preselected: u.id),
                )),
        ],
      ),
    );
  }

  // ── Header ─────────────────────────────────────────────────────────────

  Widget _buildHeader(
      int active, double cap, double prod, int jobs) {
    final utilRate =
        cap == 0 ? 0.0 : (prod / cap).clamp(0.0, 1.0);

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [PnpiColors.deepSpace, Colors.blueGrey.shade800],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: PnpiTheme.softShadows,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.factory_rounded, color: Colors.white60, size: 15),
              SizedBox(width: 6),
              Text('Unités industrielles de production',
                  style: TextStyle(color: Colors.white60, fontSize: 12)),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              _kpi('Total', '${_units.length}', Colors.white),
              _kpi('Actives', '$active', PnpiColors.lagoon),
              _kpi('Production', '${prod.toStringAsFixed(0)} T',
                  Colors.amber.shade300),
              _kpi('Emplois', '$jobs', Colors.green.shade300),
            ],
          ),
          const SizedBox(height: 12),
          // Taux utilisation
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Taux d\'utilisation',
                      style:
                          TextStyle(color: Colors.white60, fontSize: 11)),
                  Text(
                    '${(utilRate * 100).toStringAsFixed(0)} %',
                    style: TextStyle(
                        color: utilRate > 0.7
                            ? Colors.green.shade300
                            : Colors.amber.shade300,
                        fontWeight: FontWeight.w700,
                        fontSize: 12),
                  ),
                ],
              ),
              const SizedBox(height: 5),
              ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: LinearProgressIndicator(
                  value: utilRate,
                  backgroundColor: Colors.white12,
                  valueColor: AlwaysStoppedAnimation(
                    utilRate > 0.7
                        ? Colors.green.shade400
                        : Colors.amber.shade400,
                  ),
                  minHeight: 7,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _kpi(String label, String value, Color color) => Expanded(
        child: Column(
          children: [
            Text(value,
                style: TextStyle(
                    color: color,
                    fontWeight: FontWeight.w800,
                    fontSize: 17)),
            Text(label,
                style: const TextStyle(
                    color: Colors.white60, fontSize: 10)),
          ],
        ),
      );

  // ── Filter chips ───────────────────────────────────────────────────────

  Widget _statusChip(UnitStatus? status, String label, Color color) {
    final selected = _statusFilter == status;
    return GestureDetector(
      onTap: () => setState(() => _statusFilter = status),
      child: Container(
        padding:
            const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: selected ? colorWithOpacity(color, 0.15) : Colors.white,
          borderRadius: BorderRadius.circular(99),
          border: Border.all(
              color: selected
                  ? colorWithOpacity(color, 0.6)
                  : Colors.grey.shade300),
        ),
        child: Text(
          label,
          style: TextStyle(
              color: selected ? color : Colors.black54,
              fontWeight:
                  selected ? FontWeight.w700 : FontWeight.w500,
              fontSize: 12),
        ),
      ),
    );
  }

  Widget _secteurChip(String secteur) {
    final selected = _secteurFilter == secteur;
    final color = _secteurColor(secteur);
    return GestureDetector(
      onTap: () =>
          setState(() => _secteurFilter = selected ? null : secteur),
      child: Container(
        padding:
            const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: selected ? colorWithOpacity(color, 0.15) : Colors.white,
          borderRadius: BorderRadius.circular(99),
          border: Border.all(
              color: selected
                  ? colorWithOpacity(color, 0.6)
                  : Colors.grey.shade300),
        ),
        child: Text(
          secteur,
          style: TextStyle(
              color: selected ? color : Colors.black54,
              fontWeight:
                  selected ? FontWeight.w700 : FontWeight.w500,
              fontSize: 12),
        ),
      ),
    );
  }

  // ── Declaration form ───────────────────────────────────────────────────

  void _openDeclarationForm({String? preselected}) {
    if (_units.isEmpty) return;
    final volumeCtrl = TextEditingController();
    final jobsCtrl = TextEditingController();
    String selectedId = preselected ?? _units.first.id;
    DateTime selectedMonth =
        DateTime(DateTime.now().year, DateTime.now().month);

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
            bottom: MediaQuery.of(ctx).viewInsets.bottom),
        child: Container(
          margin: const EdgeInsets.fromLTRB(12, 0, 12, 12),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(24),
            boxShadow: PnpiTheme.softShadows,
          ),
          padding: const EdgeInsets.all(20),
          child: StatefulBuilder(
            builder: (ctx, setLocal) => Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Handle
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
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: colorWithOpacity(PnpiColors.lagoon, 0.12),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(Icons.add_chart_rounded,
                          color: PnpiColors.lagoon, size: 20),
                    ),
                    const SizedBox(width: 10),
                    const Text('Déclaration de production',
                        style: TextStyle(
                            fontWeight: FontWeight.w700, fontSize: 16)),
                  ],
                ),
                const SizedBox(height: 18),
                DropdownButtonFormField<String>(
                  value: selectedId,
                  items: _units
                      .map((u) => DropdownMenuItem(
                          value: u.id, child: Text(u.name)))
                      .toList(),
                  onChanged: (v) =>
                      setLocal(() => selectedId = v ?? selectedId),
                  decoration: InputDecoration(
                    labelText: 'Unité industrielle',
                    border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12)),
                    contentPadding: const EdgeInsets.symmetric(
                        horizontal: 14, vertical: 12),
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: TextFormField(
                        controller: volumeCtrl,
                        keyboardType: TextInputType.number,
                        decoration: InputDecoration(
                          labelText: 'Volume produit (T)',
                          border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12)),
                          contentPadding: const EdgeInsets.symmetric(
                              horizontal: 14, vertical: 12),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: TextFormField(
                        controller: jobsCtrl,
                        keyboardType: TextInputType.number,
                        decoration: InputDecoration(
                          labelText: 'Emplois créés',
                          border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12)),
                          contentPadding: const EdgeInsets.symmetric(
                              horizontal: 14, vertical: 12),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                // Month picker
                GestureDetector(
                  onTap: () async {
                    final picked = await showDatePicker(
                      context: ctx,
                      initialDate: selectedMonth,
                      firstDate: DateTime(DateTime.now().year - 1),
                      lastDate: DateTime.now(),
                      helpText: 'Mois de production',
                    );
                    if (picked != null) {
                      setLocal(() => selectedMonth =
                          DateTime(picked.year, picked.month));
                    }
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 14, vertical: 12),
                    decoration: BoxDecoration(
                      border: Border.all(color: Colors.grey.shade400),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.calendar_month_outlined,
                            size: 18, color: Colors.black45),
                        const SizedBox(width: 8),
                        Text(
                          '${_monthLabel(selectedMonth.month)} ${selectedMonth.year}',
                          style: const TextStyle(fontSize: 14),
                        ),
                        const Spacer(),
                        const Icon(Icons.arrow_drop_down,
                            color: Colors.black38),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 18),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    onPressed: _submitting
                        ? null
                        : () async {
                            final vol = double.tryParse(volumeCtrl.text);
                            final jobs = int.tryParse(jobsCtrl.text);
                            if (vol == null || jobs == null) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                    content: Text(
                                        'Valeurs invalides')),
                              );
                              return;
                            }
                            Navigator.pop(ctx);
                            await _submitDeclaration(
                                selectedId, selectedMonth, vol, jobs);
                          },
                    style: FilledButton.styleFrom(
                      backgroundColor: PnpiColors.lagoon,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14)),
                    ),
                    child: _submitting
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white))
                        : const Text('Envoyer la déclaration',
                            style: TextStyle(fontWeight: FontWeight.w700)),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _submitDeclaration(
      String unitId, DateTime month, double vol, int jobs) async {
    setState(() => _submitting = true);
    try {
      await ApiService.instance.submitDeclaration(
          unitId: unitId, month: month, volumeTons: vol, jobs: jobs);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Déclaration envoyée'),
          backgroundColor: Colors.green.shade700,
        ),
      );
      _load();
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('Échec de la déclaration'),
            backgroundColor: Colors.red),
      );
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  String _monthLabel(int m) => [
        '', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
        'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
      ][m];

  Color _secteurColor(String s) => switch (s.toLowerCase()) {
        'bois' => Colors.brown.shade600,
        'agroalimentaire' || 'manioc' => Colors.green.shade600,
        'pêche' || 'peche' => Colors.blue.shade600,
        'mines' => Colors.grey.shade600,
        'btp' => Colors.deepOrange.shade600,
        'pétrole' || 'petrole' => Colors.blueGrey.shade700,
        _ => PnpiColors.lagoon,
      };

  Widget _emptyState() => Container(
        padding: const EdgeInsets.all(28),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: PnpiTheme.softShadows,
        ),
        child: Column(
          children: [
            Icon(Icons.factory_outlined,
                size: 48, color: Colors.grey.shade300),
            const SizedBox(height: 10),
            Text(
              _query.isEmpty
                  ? 'Aucune unité trouvée'
                  : 'Aucun résultat pour "$_query"',
              style: TextStyle(
                  color: Colors.grey.shade500,
                  fontWeight: FontWeight.w600),
            ),
          ],
        ),
      );
}

// ── Unit card ─────────────────────────────────────────────────────────────

class _UnitCard extends StatelessWidget {
  final IndustrialUnit unit;
  final VoidCallback onDeclare;

  const _UnitCard({required this.unit, required this.onDeclare});

  Color get _accent =>
      unit.status == UnitStatus.active ? PnpiColors.lagoon : Colors.grey.shade500;

  Color _secteurColor(String s) => switch (s.toLowerCase()) {
        'bois' => Colors.brown.shade600,
        'agroalimentaire' || 'manioc' => Colors.green.shade600,
        'pêche' || 'peche' => Colors.blue.shade600,
        'mines' => Colors.grey.shade600,
        'btp' => Colors.deepOrange.shade600,
        'pétrole' || 'petrole' => Colors.blueGrey.shade700,
        _ => PnpiColors.lagoon,
      };

  @override
  Widget build(BuildContext context) {
    final utilRate = unit.capacity == 0
        ? 0.0
        : (unit.latestVolume / unit.capacity).clamp(0.0, 1.0);
    final sColor = _secteurColor(unit.sector);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        boxShadow: PnpiTheme.softShadows,
        border: Border(left: BorderSide(color: _accent, width: 4)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: colorWithOpacity(sColor, 0.12),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(Icons.factory_rounded,
                      color: sColor, size: 20),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(unit.name,
                          style: const TextStyle(
                              fontWeight: FontWeight.w700, fontSize: 14)),
                      Text('${unit.sector} · ${unit.location}',
                          style: const TextStyle(
                              color: Colors.black45, fontSize: 12)),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 9, vertical: 4),
                  decoration: BoxDecoration(
                    color: colorWithOpacity(_accent, 0.12),
                    borderRadius: BorderRadius.circular(99),
                    border: Border.all(
                        color: colorWithOpacity(_accent, 0.4)),
                  ),
                  child: Text(
                    unit.status == UnitStatus.active ? 'Actif' : 'Inactif',
                    style: TextStyle(
                        color: _accent,
                        fontWeight: FontWeight.w700,
                        fontSize: 11),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Stats row
            Row(
              children: [
                _stat('Capacité', '${unit.capacity.toStringAsFixed(0)} T',
                    Colors.black54),
                _stat('Production', '${unit.latestVolume.toStringAsFixed(0)} T',
                    PnpiColors.lagoon),
                _stat('Emplois', '${unit.latestJobs}',
                    Colors.green.shade700),
                _stat('Déclarations', '${unit.declarations.length}',
                    Colors.indigo.shade700),
              ],
            ),
            const SizedBox(height: 10),

            // Utilisation bar
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Taux d\'utilisation',
                        style: TextStyle(
                            fontSize: 11, color: Colors.black45)),
                    Text(
                      '${(utilRate * 100).toStringAsFixed(0)} %',
                      style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: utilRate > 0.7
                              ? Colors.green.shade700
                              : Colors.orange.shade700),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: utilRate,
                    backgroundColor: Colors.grey.shade100,
                    valueColor: AlwaysStoppedAnimation(
                      utilRate > 0.7
                          ? Colors.green.shade600
                          : Colors.orange.shade600,
                    ),
                    minHeight: 8,
                  ),
                ),
              ],
            ),

            // Equipment
            if (unit.equipment.isNotEmpty) ...[
              const SizedBox(height: 10),
              Row(
                children: [
                  const Icon(Icons.precision_manufacturing_outlined,
                      size: 13, color: Colors.black38),
                  const SizedBox(width: 5),
                  Expanded(
                    child: Text(
                      unit.equipment,
                      style: const TextStyle(
                          fontSize: 11.5, color: Colors.black45),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ],

            // Actions
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: onDeclare,
                    icon: const Icon(Icons.add_chart_rounded, size: 15),
                    label: const Text('Déclarer'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: PnpiColors.lagoon,
                      side: BorderSide(
                          color: colorWithOpacity(PnpiColors.lagoon, 0.5)),
                      padding: const EdgeInsets.symmetric(vertical: 9),
                      textStyle: const TextStyle(
                          fontSize: 12, fontWeight: FontWeight.w600),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                ),
                if (unit.declarations.isNotEmpty) ...[
                  const SizedBox(width: 8),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () =>
                          _showHistory(context, unit),
                      icon: const Icon(Icons.history_rounded, size: 15),
                      label: const Text('Historique'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.indigo.shade700,
                        side: BorderSide(
                            color: colorWithOpacity(
                                Colors.indigo.shade700, 0.4)),
                        padding:
                            const EdgeInsets.symmetric(vertical: 9),
                        textStyle: const TextStyle(
                            fontSize: 12, fontWeight: FontWeight.w600),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10)),
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _stat(String label, String value, Color color) => Expanded(
        child: Column(
          children: [
            Text(value,
                style: TextStyle(
                    color: color,
                    fontWeight: FontWeight.w700,
                    fontSize: 14)),
            Text(label,
                style: const TextStyle(
                    color: Colors.black38, fontSize: 10)),
          ],
        ),
      );

  void _showHistory(BuildContext context, IndustrialUnit unit) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) => Container(
        margin: const EdgeInsets.fromLTRB(12, 0, 12, 12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(24),
          boxShadow: PnpiTheme.softShadows,
        ),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
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
              Text(unit.name,
                  style: const TextStyle(
                      fontWeight: FontWeight.w700, fontSize: 15)),
              const SizedBox(height: 4),
              Text('Historique des déclarations',
                  style: TextStyle(
                      color: Colors.grey.shade500, fontSize: 12)),
              const SizedBox(height: 14),
              ...unit.declarations.reversed.map((d) => Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF5F7FA),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: Text(
                            '${_monthLabel(d.month.month)} ${d.month.year}',
                            style: const TextStyle(
                                fontWeight: FontWeight.w600,
                                fontSize: 13),
                          ),
                        ),
                        Text(
                          '${d.volumeTons.toStringAsFixed(0)} T',
                          style: TextStyle(
                              color: PnpiColors.lagoon,
                              fontWeight: FontWeight.w700),
                        ),
                        const SizedBox(width: 12),
                        Text(
                          '${d.jobs} emplois',
                          style: const TextStyle(
                              color: Colors.black45, fontSize: 12),
                        ),
                        const SizedBox(width: 8),
                        Icon(
                          d.validated
                              ? Icons.check_circle_rounded
                              : Icons.pending_rounded,
                          size: 16,
                          color: d.validated
                              ? Colors.green.shade700
                              : Colors.orange.shade700,
                        ),
                      ],
                    ),
                  )),
            ],
          ),
        ),
      ),
    );
  }

  String _monthLabel(int m) => [
        '', 'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin',
        'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc',
      ][m];
}
