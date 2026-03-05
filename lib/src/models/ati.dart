/// Agrément Technique Industriel (ATI) — workflow d'instruction PNPI.
class AgrementTechniqueIndustriel {
  final String id;
  final String numeroAti;
  final String operateurId;
  final String operateurNom;
  final String typeActivite;
  final String secteur;
  final String statut; // soumis | en_instruction | en_validation | approuve | rejete | expire
  final String etape;  // reception | instruction | validation | decision
  final String priorite; // normale | elevee | urgente
  final String? instructeurId;
  final DateTime dateSoumission;
  final DateTime? dateDecision;
  final DateTime? dateExpiration;
  final int slaDays;
  final String? motifRejet;
  final String? numeroReferenceDecision;
  final String province;

  const AgrementTechniqueIndustriel({
    required this.id,
    required this.numeroAti,
    required this.operateurId,
    required this.operateurNom,
    required this.typeActivite,
    required this.secteur,
    required this.statut,
    required this.etape,
    required this.priorite,
    this.instructeurId,
    required this.dateSoumission,
    this.dateDecision,
    this.dateExpiration,
    this.slaDays = 30,
    this.motifRejet,
    this.numeroReferenceDecision,
    required this.province,
  });

  String get statutLabel => switch (statut) {
        'soumis' => 'Soumis',
        'en_instruction' => 'En instruction',
        'en_validation' => 'En validation',
        'approuve' => 'Approuvé',
        'rejete' => 'Rejeté',
        'expire' => 'Expiré',
        _ => statut,
      };

  String get prioriteLabel => switch (priorite) {
        'elevee' => 'Élevée',
        'urgente' => 'Urgente',
        _ => 'Normale',
      };

  bool get isActive => statut == 'soumis' ||
      statut == 'en_instruction' ||
      statut == 'en_validation';

  bool get isFinal => statut == 'approuve' || statut == 'rejete' || statut == 'expire';

  int get ageJours => DateTime.now().difference(dateSoumission).inDays;

  bool get isOverdue => isActive && ageJours > slaDays;

  int get slaDaysRemaining => slaDays - ageJours;

  factory AgrementTechniqueIndustriel.fromJson(Map<String, dynamic> json) =>
      AgrementTechniqueIndustriel(
        id: json['id'] as String,
        numeroAti: json['numero_ati'] as String,
        operateurId: json['operateur_id'] as String,
        operateurNom: json['operateur_nom'] as String,
        typeActivite: json['type_activite'] as String,
        secteur: json['secteur'] as String,
        statut: json['statut'] as String,
        etape: json['etape'] as String,
        priorite: json['priorite'] as String? ?? 'normale',
        instructeurId: json['instructeur_id'] as String?,
        dateSoumission: DateTime.parse(json['date_soumission'] as String),
        dateDecision: json['date_decision'] != null
            ? DateTime.parse(json['date_decision'] as String)
            : null,
        dateExpiration: json['date_expiration'] != null
            ? DateTime.parse(json['date_expiration'] as String)
            : null,
        slaDays: json['sla_jours'] as int? ?? 30,
        motifRejet: json['motif_rejet'] as String?,
        numeroReferenceDecision: json['numero_reference_decision'] as String?,
        province: json['province'] as String? ?? '',
      );
}
