import 'package:flutter_test/flutter_test.dart';
import 'package:pnpi/src/models/ati.dart';

void main() {
  group('AgrementTechniqueIndustriel', () {
    AgrementTechniqueIndustriel makeATI({
      String statut = 'soumis',
      String priorite = 'normale',
      int daysAgo = 10,
      int slaDays = 30,
    }) =>
        AgrementTechniqueIndustriel(
          id: 'ATI-001',
          numeroAti: 'ATI-2026-0001',
          operateurId: 'OP-001',
          operateurNom: 'Societe Test',
          typeActivite: 'Scierie',
          secteur: 'bois',
          statut: statut,
          etape: 'instruction',
          priorite: priorite,
          dateSoumission: DateTime.now().subtract(Duration(days: daysAgo)),
          slaDays: slaDays,
          province: 'estuaire',
        );

    test('statutLabel returns correct French labels', () {
      expect(makeATI(statut: 'soumis').statutLabel, 'Soumis');
      expect(makeATI(statut: 'en_instruction').statutLabel, 'En instruction');
      expect(makeATI(statut: 'en_validation').statutLabel, 'En validation');
      expect(makeATI(statut: 'approuve').statutLabel, 'Approuvé');
      expect(makeATI(statut: 'rejete').statutLabel, 'Rejeté');
      expect(makeATI(statut: 'expire').statutLabel, 'Expiré');
      expect(makeATI(statut: 'inconnu').statutLabel, 'inconnu');
    });

    test('prioriteLabel returns correct labels', () {
      expect(makeATI(priorite: 'normale').prioriteLabel, 'Normale');
      expect(makeATI(priorite: 'elevee').prioriteLabel, 'Élevée');
      expect(makeATI(priorite: 'urgente').prioriteLabel, 'Urgente');
    });

    test('isActive is true for in-progress statuts', () {
      expect(makeATI(statut: 'soumis').isActive, isTrue);
      expect(makeATI(statut: 'en_instruction').isActive, isTrue);
      expect(makeATI(statut: 'en_validation').isActive, isTrue);
      expect(makeATI(statut: 'approuve').isActive, isFalse);
      expect(makeATI(statut: 'rejete').isActive, isFalse);
      expect(makeATI(statut: 'expire').isActive, isFalse);
    });

    test('isFinal is true for terminal statuts', () {
      expect(makeATI(statut: 'approuve').isFinal, isTrue);
      expect(makeATI(statut: 'rejete').isFinal, isTrue);
      expect(makeATI(statut: 'expire').isFinal, isTrue);
      expect(makeATI(statut: 'soumis').isFinal, isFalse);
    });

    test('isOverdue when active and past SLA', () {
      expect(makeATI(statut: 'soumis', daysAgo: 35, slaDays: 30).isOverdue, isTrue);
      expect(makeATI(statut: 'soumis', daysAgo: 10, slaDays: 30).isOverdue, isFalse);
      // Final statuts are never overdue
      expect(makeATI(statut: 'approuve', daysAgo: 100, slaDays: 30).isOverdue, isFalse);
    });

    test('ageJours computes days since submission', () {
      final ati = makeATI(daysAgo: 15);
      expect(ati.ageJours, 15);
    });

    test('slaDaysRemaining computes correctly', () {
      expect(makeATI(daysAgo: 10, slaDays: 30).slaDaysRemaining, 20);
      expect(makeATI(daysAgo: 35, slaDays: 30).slaDaysRemaining, -5);
    });

    test('fromJson parses all fields', () {
      final json = {
        'id': 'ATI-002',
        'numero_ati': 'ATI-2026-0042',
        'operateur_id': 'OP-005',
        'operateur_nom': 'Bois Gabon SA',
        'type_activite': 'Transformation bois',
        'secteur': 'bois',
        'statut': 'en_instruction',
        'etape': 'instruction',
        'priorite': 'elevee',
        'instructeur_id': 'INS-01',
        'date_soumission': '2026-01-15T00:00:00',
        'date_decision': null,
        'date_expiration': null,
        'sla_jours': 45,
        'motif_rejet': null,
        'numero_reference_decision': null,
        'province': 'ogooue_maritime',
      };
      final ati = AgrementTechniqueIndustriel.fromJson(json);
      expect(ati.id, 'ATI-002');
      expect(ati.numeroAti, 'ATI-2026-0042');
      expect(ati.secteur, 'bois');
      expect(ati.statut, 'en_instruction');
      expect(ati.priorite, 'elevee');
      expect(ati.slaDays, 45);
      expect(ati.province, 'ogooue_maritime');
      expect(ati.instructeurId, 'INS-01');
    });

    test('fromJson handles missing optional fields', () {
      final json = {
        'id': 'ATI-003',
        'numero_ati': 'ATI-2026-0099',
        'operateur_id': 'OP-010',
        'operateur_nom': 'Mines du Sud',
        'type_activite': 'Extraction',
        'secteur': 'mines',
        'statut': 'soumis',
        'etape': 'reception',
        'date_soumission': '2026-02-01T00:00:00',
      };
      final ati = AgrementTechniqueIndustriel.fromJson(json);
      expect(ati.priorite, 'normale');
      expect(ati.slaDays, 30);
      expect(ati.instructeurId, isNull);
      expect(ati.dateDecision, isNull);
      expect(ati.province, '');
    });
  });
}
