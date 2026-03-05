import 'package:flutter_test/flutter_test.dart';
import 'package:pnpi/src/models/operateur_industriel.dart';

void main() {
  group('OperateurIndustriel', () {
    test('statutConformiteLabel returns French labels', () {
      OperateurIndustriel make(String statut) => OperateurIndustriel(
            id: 'OP-001',
            nifGabon: 'NIF-00001',
            raisonSociale: 'Test SA',
            secteur: 'bois',
            province: 'estuaire',
            ville: 'Libreville',
            dateCreation: DateTime(2025, 1, 1),
            statutConformite: statut,
          );

      expect(make('conforme').statutConformiteLabel, 'Conforme');
      expect(make('non_conforme').statutConformiteLabel, 'Non conforme');
      expect(make('en_attente').statutConformiteLabel, 'En attente');
      expect(make('autre').statutConformiteLabel, 'En attente');
    });

    test('fromJson parses all fields', () {
      final json = {
        'id': 'OP-010',
        'nif_gabon': 'NIF-12345',
        'raison_sociale': 'Gabon Mines SARL',
        'secteur': 'mines',
        'province': 'haut_ogooue',
        'ville': 'Franceville',
        'latitude': 1.63,
        'longitude': 13.59,
        'contact_email': 'contact@test.ga',
        'contact_telephone': '+241-01-23-45',
        'date_creation': '2024-06-15T00:00:00',
        'nombre_ati_total': 5,
        'nombre_ati_actifs': 2,
        'statut_conformite': 'conforme',
      };
      final op = OperateurIndustriel.fromJson(json);
      expect(op.id, 'OP-010');
      expect(op.nifGabon, 'NIF-12345');
      expect(op.raisonSociale, 'Gabon Mines SARL');
      expect(op.latitude, 1.63);
      expect(op.contactEmail, 'contact@test.ga');
      expect(op.nombreAtiTotal, 5);
      expect(op.nombreAtiActifs, 2);
      expect(op.statutConformite, 'conforme');
    });

    test('fromJson handles missing optional fields with defaults', () {
      final json = {
        'id': 'OP-020',
        'nif_gabon': 'NIF-99999',
        'raison_sociale': 'Test',
        'secteur': 'btp',
        'province': 'estuaire',
        'ville': 'Libreville',
        'date_creation': '2025-01-01T00:00:00',
      };
      final op = OperateurIndustriel.fromJson(json);
      expect(op.latitude, isNull);
      expect(op.longitude, isNull);
      expect(op.contactEmail, isNull);
      expect(op.nombreAtiTotal, 0);
      expect(op.nombreAtiActifs, 0);
      expect(op.statutConformite, 'en_attente');
    });
  });
}
