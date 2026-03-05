/// Modèle représentant une inspection de conformité industrielle (PNPI).
class InspectionConformite {
  final String id;
  final String operateurId;
  final String operateurNom;
  final String? atiId;
  final String? atiNumero;
  final String inspecteurId;
  final String inspecteurNom;
  final DateTime dateInspection;
  final String statutConformite; // conforme | non_conforme | partiel
  final String observations;
  final String? mesuresCorrectives;
  final double? latitude;
  final double? longitude;
  final String province;
  final String secteur;

  const InspectionConformite({
    required this.id,
    required this.operateurId,
    required this.operateurNom,
    this.atiId,
    this.atiNumero,
    required this.inspecteurId,
    required this.inspecteurNom,
    required this.dateInspection,
    required this.statutConformite,
    required this.observations,
    this.mesuresCorrectives,
    this.latitude,
    this.longitude,
    required this.province,
    required this.secteur,
  });

  String get statutLabel => switch (statutConformite) {
        'conforme' => 'Conforme',
        'non_conforme' => 'Non conforme',
        'partiel' => 'Partiellement conforme',
        _ => statutConformite,
      };

  bool get isConforme => statutConformite == 'conforme';
  bool get isNonConforme => statutConformite == 'non_conforme';
  bool get isPartiel => statutConformite == 'partiel';

  /// Nombre de jours depuis l'inspection.
  int get ageJours => DateTime.now().difference(dateInspection).inDays;

  factory InspectionConformite.fromJson(Map<String, dynamic> json) =>
      InspectionConformite(
        id: json['id'] as String,
        operateurId: json['operateur_id'] as String,
        operateurNom: (json['operateur_nom'] as String?) ?? json['operateur_id'] as String,
        atiId: json['ati_id'] as String?,
        atiNumero: json['ati_numero'] as String?,
        // Le backend retourne inspecteur_username (pas inspecteur_id)
        inspecteurId: json['inspecteur_username'] as String,
        inspecteurNom: (json['inspecteur_nom'] as String?) ?? json['inspecteur_username'] as String,
        dateInspection: DateTime.parse(json['date_inspection'] as String),
        statutConformite: json['statut_conformite'] as String,
        observations: json['observations'] as String,
        mesuresCorrectives: json['mesures_correctives'] as String?,
        latitude: (json['latitude'] as num?)?.toDouble(),
        longitude: (json['longitude'] as num?)?.toDouble(),
        province: (json['province'] as String?) ?? '',
        secteur: (json['secteur'] as String?) ?? '',
      );
}
