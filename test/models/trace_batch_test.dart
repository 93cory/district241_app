import 'package:flutter_test/flutter_test.dart';
import 'package:pnpi/src/models/trace_batch.dart';

void main() {
  group('TraceBatch', () {
    test('fromJson parses all required fields', () {
      final json = {
        'batch_id': 'BATCH-001',
        'product': 'Okoume brut',
        'origin': 'Ndjole',
        'factory': 'Scierie du Littoral',
        'timestamp': '2026-03-10T08:30:00',
        'certification': 'FSC',
        'qr_code': 'QR-BATCH-001',
        'quantity_tons': 42.5,
      };
      final batch = TraceBatch.fromJson(json);

      expect(batch.batchId, 'BATCH-001');
      expect(batch.product, 'Okoume brut');
      expect(batch.origin, 'Ndjole');
      expect(batch.factory, 'Scierie du Littoral');
      expect(batch.timestamp, DateTime(2026, 3, 10, 8, 30));
      expect(batch.certification, 'FSC');
      expect(batch.qrCode, 'QR-BATCH-001');
      expect(batch.quantityTons, 42.5);
    });

    test('fromJson handles required fields correctly', () {
      final json = {
        'batch_id': 'BATCH-002',
        'product': 'Kevazingo',
        'origin': 'Makokou',
        'factory': 'Usine Nord',
        'timestamp': '2026-01-01T00:00:00',
        'certification': 'PEFC',
        'qr_code': 'QR-BATCH-002',
        'quantity_tons': 100,
      };
      final batch = TraceBatch.fromJson(json);

      expect(batch.batchId, 'BATCH-002');
      expect(batch.quantityTons, 100.0);
      expect(batch.certification, 'PEFC');
    });

    test('fromJson parses optional lat/lng when present', () {
      final json = {
        'batch_id': 'BATCH-003',
        'product': 'Padouk',
        'origin': 'Lastoursville',
        'factory': 'Scierie Centre',
        'timestamp': '2026-02-15T14:00:00',
        'certification': 'OLB',
        'qr_code': 'QR-BATCH-003',
        'quantity_tons': 75.3,
        'origin_lat': 0.82,
        'origin_lng': 12.71,
        'factory_lat': 0.39,
        'factory_lng': 9.45,
      };
      final batch = TraceBatch.fromJson(json);

      expect(batch.originLat, 0.82);
      expect(batch.originLng, 12.71);
      expect(batch.factoryLat, 0.39);
      expect(batch.factoryLng, 9.45);
    });

    test('fromJson sets lat/lng to null when absent', () {
      final json = {
        'batch_id': 'BATCH-004',
        'product': 'Azobe',
        'origin': 'Oyem',
        'factory': 'Scierie Nord',
        'timestamp': '2026-03-01T09:00:00',
        'certification': 'FSC',
        'qr_code': 'QR-BATCH-004',
        'quantity_tons': 30,
      };
      final batch = TraceBatch.fromJson(json);

      expect(batch.originLat, isNull);
      expect(batch.originLng, isNull);
      expect(batch.factoryLat, isNull);
      expect(batch.factoryLng, isNull);
    });

    test('quantityTons handles integer input', () {
      final json = {
        'batch_id': 'BATCH-005',
        'product': 'Ilomba',
        'origin': 'Bitam',
        'factory': 'Usine Est',
        'timestamp': '2026-03-20T12:00:00',
        'certification': 'FSC',
        'qr_code': 'QR-BATCH-005',
        'quantity_tons': 200,
      };
      final batch = TraceBatch.fromJson(json);

      expect(batch.quantityTons, isA<double>());
      expect(batch.quantityTons, 200.0);
    });
  });
}
