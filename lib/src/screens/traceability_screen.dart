import 'package:flutter/material.dart';

import '../models/trace_batch.dart';
import '../services/api_service.dart';
import '../theme/pnpi_theme.dart';

class TraceabilityScreen extends StatefulWidget {
  const TraceabilityScreen({super.key});

  @override
  State<TraceabilityScreen> createState() => _TraceabilityScreenState();
}

class _TraceabilityScreenState extends State<TraceabilityScreen> {
  List<TraceBatch> _batches = [];
  final TextEditingController _searchController = TextEditingController();
  bool _loading = true;
  String _query = '';
  String? _selectedCert;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final data = await ApiService.instance.fetchBatches();
    if (!mounted) return;
    setState(() {
      _batches = data;
      _loading = false;
    });
  }

  List<String> get _certifications {
    final certs = _batches.map((b) => b.certification).toSet().toList()..sort();
    return certs;
  }

  List<TraceBatch> get _filtered {
    var list = _batches;
    if (_selectedCert != null) {
      list = list.where((b) => b.certification == _selectedCert).toList();
    }
    if (_query.trim().isNotEmpty) {
      final q = _query.toLowerCase();
      list = list.where((b) =>
          b.batchId.toLowerCase().contains(q) ||
          b.product.toLowerCase().contains(q) ||
          b.factory.toLowerCase().contains(q) ||
          b.origin.toLowerCase().contains(q) ||
          b.certification.toLowerCase().contains(q)).toList();
    }
    return list;
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _filtered;
    final totalVolume = filtered.fold<double>(0, (s, b) => s + b.quantityTons);

    return RefreshIndicator(
      onRefresh: _load,
      child: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // ── Header ──────────────────────────────────────────────
                  _buildHeader(filtered.length, totalVolume),
                  const SizedBox(height: 14),

                  // ── Search ──────────────────────────────────────────────
                  TextField(
                    controller: _searchController,
                    onChanged: (v) => setState(() => _query = v),
                    decoration: InputDecoration(
                      hintText: 'Rechercher lot, produit, usine, origine…',
                      prefixIcon: const Icon(Icons.search, size: 20),
                      suffixIcon: _query.isNotEmpty
                          ? IconButton(
                              icon: const Icon(Icons.clear, size: 18),
                              onPressed: () {
                                _searchController.clear();
                                setState(() => _query = '');
                              },
                            )
                          : null,
                      filled: true,
                      fillColor: Colors.white,
                      contentPadding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 14),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: BorderSide.none,
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),

                  // ── Certification filter chips ───────────────────────────
                  if (_certifications.isNotEmpty)
                    SizedBox(
                      height: 34,
                      child: ListView(
                        scrollDirection: Axis.horizontal,
                        children: [
                          _filterChip('Tous', null),
                          ..._certifications.map((c) => _filterChip(c, c)),
                        ],
                      ),
                    ),
                  const SizedBox(height: 12),
                ],
              ),
            ),
          ),

          // ── Content ────────────────────────────────────────────────────
          if (_loading)
            const SliverFillRemaining(
              child: Center(child: CircularProgressIndicator()),
            )
          else if (filtered.isEmpty)
            SliverFillRemaining(child: _emptyState())
          else
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 80),
              sliver: SliverList(
                delegate: SliverChildBuilderDelegate(
                  (_, i) => _LotCard(batch: filtered[i]),
                  childCount: filtered.length,
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildHeader(int count, double volume) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [PnpiColors.deepSpace, Colors.brown.shade800],
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
              Icon(Icons.inventory_2_rounded, color: Colors.white60, size: 16),
              SizedBox(width: 6),
              Text('Traçabilité des lots industriels',
                  style: TextStyle(color: Colors.white60, fontSize: 12)),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              _kpi('Total lots', '$count', Colors.white),
              _kpi('Volume', '${volume.toStringAsFixed(1)} T',
                  Colors.amber.shade200),
              _kpi('Certifications', '${_certifications.length}',
                  Colors.lightBlue.shade200),
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
                    fontSize: 20,
                    fontWeight: FontWeight.w800)),
            Text(label,
                style: const TextStyle(color: Colors.white60, fontSize: 10)),
          ],
        ),
      );

  Widget _filterChip(String label, String? value) {
    final isSelected = _selectedCert == value;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: FilterChip(
        label: Text(label),
        selected: isSelected,
        onSelected: (v) => setState(
            () => _selectedCert = v ? value : null),
        selectedColor: colorWithOpacity(PnpiColors.lagoon, 0.18),
        checkmarkColor: PnpiColors.lagoon,
        labelStyle: TextStyle(
          color: isSelected ? PnpiColors.lagoon : Colors.black54,
          fontWeight:
              isSelected ? FontWeight.w700 : FontWeight.normal,
          fontSize: 12,
        ),
        backgroundColor: Colors.white,
        side: BorderSide(
            color: isSelected
                ? colorWithOpacity(PnpiColors.lagoon, 0.6)
                : Colors.black12),
        padding: const EdgeInsets.symmetric(horizontal: 4),
      ),
    );
  }

  Widget _emptyState() => Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.inventory_2_outlined,
                size: 50, color: Colors.grey.shade300),
            const SizedBox(height: 12),
            Text('Aucun lot trouvé',
                style: TextStyle(
                    color: Colors.grey.shade500,
                    fontWeight: FontWeight.w600,
                    fontSize: 14)),
          ],
        ),
      );
}

// ── Lot card ──────────────────────────────────────────────────────────────

class _LotCard extends StatelessWidget {
  final TraceBatch batch;
  const _LotCard({required this.batch});

  Color get _certColor {
    final c = batch.certification.toUpperCase();
    if (c.contains('FSC')) return Colors.green.shade700;
    if (c.contains('ISO')) return Colors.blue.shade700;
    if (c.contains('FSSC')) return Colors.teal.shade700;
    return Colors.grey.shade600;
  }

  void _showQr(BuildContext context) {
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text(batch.batchId,
            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.qr_code_2_rounded, size: 80, color: Colors.black87),
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: Colors.grey.shade100,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                batch.qrCode,
                style: const TextStyle(
                    fontFamily: 'monospace',
                    fontSize: 11,
                    color: Colors.black54),
                textAlign: TextAlign.center,
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Fermer'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: PnpiTheme.softShadows,
        border: Border(left: BorderSide(color: _certColor, width: 4)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    batch.batchId,
                    style: const TextStyle(
                        fontWeight: FontWeight.w800, fontSize: 14),
                  ),
                ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
                  decoration: BoxDecoration(
                    color: colorWithOpacity(_certColor, 0.12),
                    borderRadius: BorderRadius.circular(99),
                    border: Border.all(
                        color: colorWithOpacity(_certColor, 0.35)),
                  ),
                  child: Text(
                    batch.certification,
                    style: TextStyle(
                        color: _certColor,
                        fontWeight: FontWeight.w700,
                        fontSize: 10),
                  ),
                ),
                const SizedBox(width: 4),
                IconButton(
                  tooltip: 'Voir QR',
                  icon: Icon(Icons.qr_code_rounded,
                      color: Colors.grey.shade400, size: 20),
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                  onPressed: () => _showQr(context),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              batch.product,
              style: const TextStyle(
                  fontWeight: FontWeight.w600, fontSize: 13),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                const Icon(Icons.factory_rounded,
                    size: 13, color: Colors.black38),
                const SizedBox(width: 4),
                Expanded(
                  child: Text(
                    batch.factory,
                    style:
                        const TextStyle(fontSize: 12, color: Colors.black54),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 3),
            Row(
              children: [
                const Icon(Icons.location_on_outlined,
                    size: 13, color: Colors.black38),
                const SizedBox(width: 4),
                Expanded(
                  child: Text(
                    batch.origin,
                    style:
                        const TextStyle(fontSize: 12, color: Colors.black54),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                const Icon(Icons.inventory_2_outlined,
                    size: 13, color: Colors.black38),
                const SizedBox(width: 4),
                Text(
                  '${batch.quantityTons.toStringAsFixed(1)} T',
                  style:
                      const TextStyle(fontSize: 12, color: Colors.black45),
                ),
                const Spacer(),
                const Icon(Icons.calendar_today_outlined,
                    size: 13, color: Colors.black38),
                const SizedBox(width: 4),
                Text(
                  '${batch.timestamp.day.toString().padLeft(2, '0')}/'
                  '${batch.timestamp.month.toString().padLeft(2, '0')}/'
                  '${batch.timestamp.year}',
                  style:
                      const TextStyle(fontSize: 12, color: Colors.black45),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
