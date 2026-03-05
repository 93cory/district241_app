import 'package:flutter/material.dart';

import '../models/ati.dart';
import '../models/inspection_conformite.dart';
import '../models/operateur_industriel.dart';
import '../services/api_service.dart';
import '../theme/pnpi_theme.dart';
import 'inspection_create_screen.dart';
import 'submit_ati_screen.dart';

/// Dossier Industriel Unique (DIU) — vue complète d'un opérateur.
class OperateurDetailScreen extends StatefulWidget {
  final OperateurIndustriel operateur;

  const OperateurDetailScreen({super.key, required this.operateur});

  @override
  State<OperateurDetailScreen> createState() => _OperateurDetailScreenState();
}

class _OperateurDetailScreenState extends State<OperateurDetailScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabCtrl;
  late Future<_DossierData> _future;

  OperateurIndustriel get _op => widget.operateur;

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 3, vsync: this);
    _future = _load();
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    super.dispose();
  }

  Future<_DossierData> _load() async {
    final results = await Future.wait([
      ApiService.instance.fetchATIsByOperateur(_op.id),
      ApiService.instance.fetchInspections(operateurId: _op.id),
    ]);
    return _DossierData(
      atis: results[0] as List<AgrementTechniqueIndustriel>,
      inspections: results[1] as List<InspectionConformite>,
    );
  }

  Color get _secteurColor => switch (_op.secteur) {
        'bois' => Colors.brown.shade600,
        'agroalimentaire' => Colors.green.shade600,
        'peche' => Colors.blue.shade600,
        'mines' => Colors.grey.shade700,
        'btp' => Colors.deepOrange.shade600,
        'petrole' => Colors.blueGrey.shade700,
        _ => PnpiColors.lagoon,
      };

  Color get _conformiteColor => switch (_op.statutConformite) {
        'conforme' => Colors.green.shade700,
        'non_conforme' => Colors.red.shade700,
        _ => Colors.orange.shade700,
      };

  String _secteurLabel(String s) => switch (s) {
        'bois' => 'Bois & Forêt',
        'agroalimentaire' => 'Agroalimentaire',
        'peche' => 'Pêche & Aquaculture',
        'mines' => 'Mines & Carrières',
        'btp' => 'BTP',
        'petrole' => 'Pétrole & Gaz',
        _ => s,
      };

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F7FA),
      appBar: AppBar(
        title: Text(
          _op.raisonSociale,
          style: const TextStyle(fontSize: 15),
          overflow: TextOverflow.ellipsis,
        ),
        flexibleSpace: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [Color(0xFF005C33), Color(0xFF0044A8)],
            ),
          ),
        ),
        actions: [
          IconButton(
            tooltip: 'Soumettre un ATI',
            icon: const Icon(Icons.add_circle_outline_rounded),
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) =>
                    SubmitATIScreen(preselectedOperateur: _op),
              ),
            ),
          ),
        ],
      ),
      body: FutureBuilder<_DossierData>(
        future: _future,
        builder: (context, snap) {
          if (snap.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          final data = snap.data ??
              const _DossierData(atis: [], inspections: []);
          return Column(
            children: [
              // ── Identity card ────────────────────────────────────────
              _buildIdentityCard(data),

              // ── TabBar ───────────────────────────────────────────────
              Container(
                color: Colors.white,
                child: TabBar(
                  controller: _tabCtrl,
                  labelColor: PnpiColors.lagoon,
                  unselectedLabelColor: Colors.black45,
                  indicatorColor: PnpiColors.lagoon,
                  tabs: [
                    Tab(
                      icon: Badge(
                        isLabelVisible: data.atis.isNotEmpty,
                        label: Text('${data.atis.length}'),
                        child: const Icon(Icons.approval_rounded, size: 19),
                      ),
                      text: 'ATI',
                    ),
                    Tab(
                      icon: Badge(
                        isLabelVisible: data.inspections.isNotEmpty,
                        label: Text('${data.inspections.length}'),
                        child: const Icon(Icons.fact_check_rounded, size: 19),
                      ),
                      text: 'Inspections',
                    ),
                    const Tab(
                      icon: Icon(Icons.folder_rounded, size: 19),
                      text: 'Documents',
                    ),
                  ],
                ),
              ),

              // ── Tab content ──────────────────────────────────────────
              Expanded(
                child: TabBarView(
                  controller: _tabCtrl,
                  children: [
                    _buildATITab(data.atis),
                    _buildInspectionsTab(data.inspections),
                    _buildDocumentsTab(),
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  // ── Identity card ─────────────────────────────────────────────────────

  Widget _buildIdentityCard(_DossierData data) {
    final actifs = data.atis.where((a) => a.isActive).length;
    final approuves = data.atis.where((a) => a.statut == 'approuve').length;
    final lastInspection = data.inspections.isNotEmpty
        ? data.inspections
            .reduce((a, b) =>
                a.dateInspection.isAfter(b.dateInspection) ? a : b)
            .dateInspection
        : null;

    return Container(
      margin: const EdgeInsets.fromLTRB(14, 14, 14, 0),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [PnpiColors.deepSpace, colorWithOpacity(_secteurColor, 0.8)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: PnpiTheme.softShadows,
      ),
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header row
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: colorWithOpacity(_secteurColor, 0.25),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(_secteurIcon, color: Colors.white, size: 22),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _op.raisonSociale,
                        style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w800,
                            fontSize: 15),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'NIF : ${_op.nifGabon}',
                        style: const TextStyle(
                            color: Colors.white60, fontSize: 12),
                      ),
                    ],
                  ),
                ),
                // Conformité badge
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: colorWithOpacity(_conformiteColor, 0.25),
                    borderRadius: BorderRadius.circular(99),
                    border: Border.all(
                        color: colorWithOpacity(_conformiteColor, 0.6)),
                  ),
                  child: Text(
                    _op.statutConformiteLabel,
                    style: TextStyle(
                        color: _conformiteColor,
                        fontWeight: FontWeight.w700,
                        fontSize: 12),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),

            // Chips row
            Wrap(
              spacing: 8,
              runSpacing: 6,
              children: [
                _chip(Icons.category_outlined, _secteurLabel(_op.secteur)),
                _chip(Icons.location_city_outlined, _op.province),
                _chip(Icons.place_outlined, _op.ville),
                if (_op.latitude != null)
                  _chip(Icons.gps_fixed_rounded,
                      '${_op.latitude!.toStringAsFixed(3)}, ${_op.longitude!.toStringAsFixed(3)}'),
              ],
            ),
            const SizedBox(height: 14),

            // Stats row
            Row(
              children: [
                _statPill('ATIs total', '${data.atis.length}',
                    Colors.white70),
                const SizedBox(width: 8),
                _statPill('En cours', '$actifs', Colors.amber.shade300),
                const SizedBox(width: 8),
                _statPill('Approuvés', '$approuves', Colors.green.shade300),
                if (lastInspection != null) ...[
                  const SizedBox(width: 8),
                  _statPill(
                    'Dernière insp.',
                    '${lastInspection.day.toString().padLeft(2, '0')}/'
                        '${lastInspection.month.toString().padLeft(2, '0')}/'
                        '${lastInspection.year}',
                    Colors.lightBlue.shade200,
                  ),
                ],
              ],
            ),

            // Contact
            if (_op.contactEmail != null || _op.contactTelephone != null) ...[
              const SizedBox(height: 12),
              const Divider(color: Colors.white24),
              const SizedBox(height: 8),
              Row(
                children: [
                  if (_op.contactEmail != null)
                    Expanded(
                      child: Row(
                        children: [
                          const Icon(Icons.email_outlined,
                              color: Colors.white54, size: 14),
                          const SizedBox(width: 5),
                          Flexible(
                            child: Text(
                              _op.contactEmail!,
                              style: const TextStyle(
                                  color: Colors.white70, fontSize: 12),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ),
                  if (_op.contactTelephone != null)
                    Row(
                      children: [
                        const Icon(Icons.phone_outlined,
                            color: Colors.white54, size: 14),
                        const SizedBox(width: 5),
                        Text(
                          _op.contactTelephone!,
                          style: const TextStyle(
                              color: Colors.white70, fontSize: 12),
                        ),
                      ],
                    ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  // ── ATI tab ───────────────────────────────────────────────────────────

  Widget _buildATITab(List<AgrementTechniqueIndustriel> atis) {
    if (atis.isEmpty) {
      return _empty(
        Icons.approval_rounded,
        'Aucun ATI pour cet opérateur',
        action: FilledButton.icon(
          onPressed: () => Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => SubmitATIScreen(preselectedOperateur: _op),
            ),
          ),
          icon: const Icon(Icons.add_rounded, size: 18),
          label: const Text('Soumettre un ATI'),
          style: FilledButton.styleFrom(
            backgroundColor: PnpiColors.lagoon,
            shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12)),
          ),
        ),
      );
    }
    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 80),
      itemCount: atis.length,
      itemBuilder: (_, i) => _ATICard(ati: atis[i]),
    );
  }

  // ── Inspections tab ───────────────────────────────────────────────────

  Widget _buildInspectionsTab(List<InspectionConformite> inspections) {
    if (inspections.isEmpty) {
      return _empty(
        Icons.fact_check_rounded,
        'Aucune inspection enregistrée',
        action: FilledButton.icon(
          onPressed: () => Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) =>
                  InspectionCreateScreen(preselectedOperateur: _op),
            ),
          ),
          icon: const Icon(Icons.add_rounded, size: 18),
          label: const Text('Déclarer une inspection'),
          style: FilledButton.styleFrom(
            backgroundColor: Colors.teal.shade700,
            shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12)),
          ),
        ),
      );
    }
    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 80),
      itemCount: inspections.length,
      itemBuilder: (_, i) => _InspectionCard(inspection: inspections[i]),
    );
  }

  // ── Documents tab ─────────────────────────────────────────────────────

  Widget _buildDocumentsTab() {
    final docs = [
      const _MockDocument(nom: 'Statuts_SARL.pdf', type: 'Statuts', taille: '245 Ko', date: 'Il y a 3 mois'),
      const _MockDocument(nom: 'Bilan_2025.xlsx', type: 'Bilan', taille: '1.2 Mo', date: 'Il y a 2 mois'),
      const _MockDocument(nom: 'Plan_site_usine.pdf', type: 'Plan de site', taille: '3.8 Mo', date: 'Il y a 1 mois'),
      const _MockDocument(nom: 'Certification_ISO.pdf', type: 'Certification', taille: '890 Ko', date: 'Il y a 15 jours'),
    ];

    return ListView(
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 80),
      children: [
        Padding(
          padding: const EdgeInsets.only(bottom: 14),
          child: FilledButton.icon(
            onPressed: () => ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Upload disponible avec le backend connecté')),
            ),
            icon: const Icon(Icons.upload_file_rounded, size: 18),
            label: const Text('Ajouter un document'),
            style: FilledButton.styleFrom(
              backgroundColor: PnpiColors.lagoon,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
        ),
        ...docs.map((doc) => _DocumentCard(doc: doc, parentContext: context)),
      ],
    );
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  IconData get _secteurIcon => switch (_op.secteur) {
        'bois' => Icons.forest_rounded,
        'agroalimentaire' => Icons.agriculture_rounded,
        'peche' => Icons.water_rounded,
        'mines' => Icons.hardware_rounded,
        'btp' => Icons.construction_rounded,
        'petrole' => Icons.local_gas_station_rounded,
        _ => Icons.factory_rounded,
      };

  Widget _chip(IconData icon, String label) => Container(
        padding:
            const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: Colors.white12,
          borderRadius: BorderRadius.circular(99),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 12, color: Colors.white60),
            const SizedBox(width: 4),
            Text(label,
                style:
                    const TextStyle(color: Colors.white70, fontSize: 11)),
          ],
        ),
      );

  Widget _statPill(String label, String value, Color color) => Expanded(
        child: Container(
          padding:
              const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
          decoration: BoxDecoration(
            color: Colors.white10,
            borderRadius: BorderRadius.circular(10),
          ),
          child: Column(
            children: [
              Text(value,
                  style: TextStyle(
                      color: color,
                      fontWeight: FontWeight.w800,
                      fontSize: 15)),
              Text(label,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                      color: Colors.white54,
                      fontSize: 9,
                      height: 1.2)),
            ],
          ),
        ),
      );

  Widget _empty(IconData icon, String label, {Widget? action}) => Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 52, color: Colors.grey.shade300),
            const SizedBox(height: 12),
            Text(label,
                style: TextStyle(
                    color: Colors.grey.shade500,
                    fontWeight: FontWeight.w600,
                    fontSize: 14)),
            if (action != null) ...[
              const SizedBox(height: 16),
              action,
            ],
          ],
        ),
      );
}

// ── ATI card ──────────────────────────────────────────────────────────────

class _ATICard extends StatelessWidget {
  final AgrementTechniqueIndustriel ati;
  const _ATICard({required this.ati});

  Color get _color => switch (ati.statut) {
        'soumis' => Colors.blue.shade700,
        'en_instruction' => Colors.orange.shade700,
        'en_validation' => Colors.purple.shade700,
        'approuve' => Colors.green.shade700,
        'rejete' => Colors.red.shade700,
        _ => Colors.grey.shade600,
      };

  String get _statutLabel => switch (ati.statut) {
        'soumis' => 'Soumis',
        'en_instruction' => 'En instruction',
        'en_validation' => 'En validation',
        'approuve' => 'Approuvé',
        'rejete' => 'Rejeté',
        'expire' => 'Expiré',
        _ => ati.statut,
      };

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: PnpiTheme.softShadows,
        border: Border(
            left: BorderSide(color: _color, width: 4)),
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
                    ati.numeroAti,
                    style: const TextStyle(
                        fontWeight: FontWeight.w700, fontSize: 14),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 9, vertical: 4),
                  decoration: BoxDecoration(
                    color: colorWithOpacity(_color, 0.12),
                    borderRadius: BorderRadius.circular(99),
                    border:
                        Border.all(color: colorWithOpacity(_color, 0.4)),
                  ),
                  child: Text(
                    _statutLabel,
                    style: TextStyle(
                        color: _color,
                        fontWeight: FontWeight.w700,
                        fontSize: 11),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              ati.typeActivite,
              style: const TextStyle(color: Colors.black54, fontSize: 13),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Icon(Icons.calendar_today_outlined,
                    size: 13, color: Colors.black38),
                const SizedBox(width: 4),
                Text(
                  _fmt(ati.dateSoumission),
                  style: const TextStyle(
                      fontSize: 12, color: Colors.black45),
                ),
                const Spacer(),
                if (ati.isActive) ...[
                  Icon(
                    ati.isOverdue
                        ? Icons.warning_amber_rounded
                        : Icons.timer_outlined,
                    size: 13,
                    color: ati.isOverdue
                        ? Colors.red.shade600
                        : Colors.green.shade600,
                  ),
                  const SizedBox(width: 3),
                  Text(
                    ati.isOverdue
                        ? 'Dépassé ${-ati.slaDaysRemaining} j'
                        : '${ati.slaDaysRemaining} j restant(s)',
                    style: TextStyle(
                        fontSize: 11,
                        color: ati.isOverdue
                            ? Colors.red.shade600
                            : Colors.green.shade600,
                        fontWeight: FontWeight.w600),
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }

  String _fmt(DateTime dt) =>
      '${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')}/${dt.year}';
}

// ── Inspection card ───────────────────────────────────────────────────────

class _InspectionCard extends StatelessWidget {
  final InspectionConformite inspection;
  const _InspectionCard({required this.inspection});

  Color get _color => switch (inspection.statutConformite) {
        'conforme' => Colors.green.shade700,
        'non_conforme' => Colors.red.shade700,
        _ => Colors.orange.shade700,
      };

  IconData get _icon => switch (inspection.statutConformite) {
        'conforme' => Icons.check_circle_rounded,
        'non_conforme' => Icons.cancel_rounded,
        _ => Icons.remove_circle_rounded,
      };

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: PnpiTheme.softShadows,
        border: Border(
            left: BorderSide(color: _color, width: 4)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(_icon, color: _color, size: 22),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        inspection.statutLabel,
                        style: TextStyle(
                            color: _color,
                            fontWeight: FontWeight.w700,
                            fontSize: 13),
                      ),
                    ),
                    Text(
                      '${inspection.dateInspection.day.toString().padLeft(2, '0')}/'
                      '${inspection.dateInspection.month.toString().padLeft(2, '0')}/'
                      '${inspection.dateInspection.year}',
                      style: const TextStyle(
                          fontSize: 11, color: Colors.black38),
                    ),
                  ],
                ),
                const SizedBox(height: 5),
                Text(
                  inspection.observations,
                  style: const TextStyle(
                      fontSize: 12.5, color: Colors.black54, height: 1.35),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                if (inspection.mesuresCorrectives != null) ...[
                  const SizedBox(height: 5),
                  Row(
                    children: [
                      Icon(Icons.build_outlined,
                          size: 12, color: Colors.orange.shade700),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          inspection.mesuresCorrectives!,
                          style: TextStyle(
                              fontSize: 11,
                              color: Colors.orange.shade700,
                              fontStyle: FontStyle.italic),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ],
                const SizedBox(height: 5),
                Row(
                  children: [
                    const Icon(Icons.person_outline,
                        size: 12, color: Colors.black38),
                    const SizedBox(width: 4),
                    Text(
                      inspection.inspecteurNom,
                      style: const TextStyle(
                          fontSize: 11, color: Colors.black38),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _DossierData {
  final List<AgrementTechniqueIndustriel> atis;
  final List<InspectionConformite> inspections;

  const _DossierData({required this.atis, required this.inspections});
}

// ── Mock document model ───────────────────────────────────────────────────

class _MockDocument {
  final String nom;
  final String type;
  final String taille;
  final String date;

  const _MockDocument({
    required this.nom,
    required this.type,
    required this.taille,
    required this.date,
  });
}

// ── Document card ─────────────────────────────────────────────────────────

class _DocumentCard extends StatelessWidget {
  final _MockDocument doc;
  final BuildContext parentContext;

  const _DocumentCard({required this.doc, required this.parentContext});

  IconData get _icon => switch (doc.type) {
        'Statuts' => Icons.picture_as_pdf_rounded,
        'Bilan' => Icons.table_chart_rounded,
        'Plan de site' => Icons.map_rounded,
        'Certification' => Icons.verified_rounded,
        _ => Icons.insert_drive_file_rounded,
      };

  Color get _typeColor => switch (doc.type) {
        'Statuts' => const Color(0xFFC62828),
        'Bilan' => const Color(0xFF2E7D32),
        'Plan de site' => const Color(0xFF1565C0),
        'Certification' => const Color(0xFF6A1B9A),
        _ => const Color(0xFF546E7A),
      };

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: PnpiTheme.softShadows,
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: colorWithOpacity(_typeColor, 0.10),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(_icon, color: _typeColor, size: 22),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    doc.nom,
                    style: const TextStyle(
                        fontWeight: FontWeight.w700, fontSize: 13),
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 7, vertical: 2),
                        decoration: BoxDecoration(
                          color: colorWithOpacity(_typeColor, 0.12),
                          borderRadius: BorderRadius.circular(99),
                          border: Border.all(
                              color: colorWithOpacity(_typeColor, 0.35)),
                        ),
                        child: Text(
                          doc.type,
                          style: TextStyle(
                              color: _typeColor,
                              fontWeight: FontWeight.w600,
                              fontSize: 10),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(doc.taille,
                          style: const TextStyle(
                              fontSize: 11, color: Colors.black45)),
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(doc.date,
                      style: const TextStyle(
                          fontSize: 11, color: Colors.black38)),
                ],
              ),
            ),
            IconButton(
              tooltip: 'Télécharger',
              icon: Icon(Icons.download_rounded,
                  color: PnpiColors.lagoon, size: 22),
              onPressed: () => ScaffoldMessenger.of(parentContext).showSnackBar(
                const SnackBar(
                    content: Text(
                        'Téléchargement non disponible en mode démo')),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
