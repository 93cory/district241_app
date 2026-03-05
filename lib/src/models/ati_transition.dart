/// Représente un événement de transition dans le workflow d'un ATI.
class ATITransition {
  final String id;
  final String atiId;
  final String changedBy;
  final String? oldStatut;
  final String newStatut;
  final String? note;
  final DateTime changedAt;

  const ATITransition({
    required this.id,
    required this.atiId,
    required this.changedBy,
    this.oldStatut,
    required this.newStatut,
    this.note,
    required this.changedAt,
  });

  String get newStatutLabel => switch (newStatut) {
        'soumis' => 'Soumis',
        'en_instruction' => 'Mis en instruction',
        'en_validation' => 'Envoyé en validation',
        'approuve' => 'Approuvé',
        'rejete' => 'Rejeté',
        'expire' => 'Expiré',
        _ => newStatut,
      };

  bool get isFinal =>
      newStatut == 'approuve' ||
      newStatut == 'rejete' ||
      newStatut == 'expire';

  factory ATITransition.fromJson(Map<String, dynamic> json) => ATITransition(
        id: json['id'] as String,
        atiId: json['ati_id'] as String,
        changedBy: json['changed_by'] as String,
        oldStatut: json['old_statut'] as String?,
        newStatut: json['new_statut'] as String,
        note: json['note'] as String?,
        changedAt: DateTime.parse(json['changed_at'] as String),
      );
}
