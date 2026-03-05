import 'package:flutter_test/flutter_test.dart';
import 'package:pnpi/src/models/inspection_conformite.dart';

void main() {
  group('InspectionConformite', () {
    InspectionConformite makeInsp({String statut = 'conforme', int daysAgo = 5}) =>
        InspectionConformite(
          id: 'INSP-001',
          operateurId: 'OP-001',
          operateurNom: 'Test SA',
          inspecteurId: 'INS-01',
          inspecteurNom: 'Jean Dupont',
          dateInspection: DateTime.now().subtract(Duration(days: daysAgo)),
          statutConformite: statut,
          observations: 'RAS',
          province: 'estuaire',
          secteur: 'bois',
        );

    test('statutLabel returns correct French labels', () {
      expect(makeInsp(statut: 'conforme').statutLabel, 'Conforme');
      expect(makeInsp(statut: 'non_conforme').statutLabel, 'Non conforme');
      expect(makeInsp(statut: 'partiel').statutLabel, 'Partiellement conforme');
      expect(makeInsp(statut: 'autre').statutLabel, 'autre');
    });

    test('boolean helpers work correctly', () {
      expect(makeInsp(statut: 'conforme').isConforme, isTrue);
      expect(makeInsp(statut: 'conforme').isNonConforme, isFalse);
      expect(makeInsp(statut: 'non_conforme').isNonConforme, isTrue);
      expect(makeInsp(statut: 'partiel').isPartiel, isTrue);
    });

    test('ageJours computes days since inspection', () {
      expect(makeInsp(daysAgo: 12).ageJours, 12);
    });

    test('fromJson parses all fields including backend naming', () {
      final json = {
        'id': 'INSP-002',
        'operateur_id': 'OP-005',
        'operateur_nom': 'Bois Sud',
        'ati_id': 'ATI-010',
        'ati_numero': 'ATI-2026-0010',
        'inspecteur_username': 'jdupont',
        'inspecteur_nom': 'Jean Dupont',
        'date_inspection': '2026-02-20T10:00:00',
        'statut_conformite': 'non_conforme',
        'observations': 'Manque extincteurs',
        'mesures_correctives': 'Installer 5 extincteurs sous 30 jours',
        'latitude': 0.39,
        'longitude': 9.45,
        'province': 'estuaire',
        'secteur': 'bois',
      };
      final insp = InspectionConformite.fromJson(json);
      expect(insp.id, 'INSP-002');
      expect(insp.inspecteurId, 'jdupont');
      expect(insp.inspecteurNom, 'Jean Dupont');
      expect(insp.atiId, 'ATI-010');
      expect(insp.statutConformite, 'non_conforme');
      expect(insp.mesuresCorrectives, contains('extincteurs'));
      expect(insp.latitude, 0.39);
    });

    test('fromJson handles missing optional fields', () {
      final json = {
        'id': 'INSP-003',
        'operateur_id': 'OP-001',
        'inspecteur_username': 'admin',
        'date_inspection': '2026-03-01T00:00:00',
        'statut_conformite': 'conforme',
        'observations': 'OK',
      };
      final insp = InspectionConformite.fromJson(json);
      expect(insp.operateurNom, 'OP-001'); // fallback to operateur_id
      expect(insp.inspecteurNom, 'admin'); // fallback to username
      expect(insp.atiId, isNull);
      expect(insp.mesuresCorrectives, isNull);
      expect(insp.latitude, isNull);
      expect(insp.province, '');
      expect(insp.secteur, '');
    });
  });
}
