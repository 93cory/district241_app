/// Opérateur industriel enregistré sur la plateforme PNPI.
class OperateurIndustriel {
  final String id;
  final String nifGabon;
  final String raisonSociale;
  final String secteur;
  final String province;
  final String ville;
  final double? latitude;
  final double? longitude;
  final String? contactEmail;
  final String? contactTelephone;
  final DateTime dateCreation;
  final int nombreAtiTotal;
  final int nombreAtiActifs;
  final String statutConformite; // conforme | non_conforme | en_attente

  OperateurIndustriel({
    required this.id,
    required this.nifGabon,
    required this.raisonSociale,
    required this.secteur,
    required this.province,
    required this.ville,
    this.latitude,
    this.longitude,
    this.contactEmail,
    this.contactTelephone,
    required this.dateCreation,
    this.nombreAtiTotal = 0,
    this.nombreAtiActifs = 0,
    this.statutConformite = 'en_attente',
  });

  String get statutConformiteLabel => switch (statutConformite) {
        'conforme' => 'Conforme',
        'non_conforme' => 'Non conforme',
        _ => 'En attente',
      };

  factory OperateurIndustriel.fromJson(Map<String, dynamic> json) =>
      OperateurIndustriel(
        id: json['id'] as String,
        nifGabon: json['nif_gabon'] as String,
        raisonSociale: json['raison_sociale'] as String,
        secteur: json['secteur'] as String,
        province: json['province'] as String,
        ville: json['ville'] as String,
        latitude: (json['latitude'] as num?)?.toDouble(),
        longitude: (json['longitude'] as num?)?.toDouble(),
        contactEmail: json['contact_email'] as String?,
        contactTelephone: json['contact_telephone'] as String?,
        dateCreation: DateTime.parse(json['date_creation'] as String),
        nombreAtiTotal: json['nombre_ati_total'] as int? ?? 0,
        nombreAtiActifs: json['nombre_ati_actifs'] as int? ?? 0,
        statutConformite: json['statut_conformite'] as String? ?? 'en_attente',
      );
}
