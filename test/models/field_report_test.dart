import 'package:flutter_test/flutter_test.dart';
import 'package:pnpi/src/models/field_report.dart';

void main() {
  group('FieldReport', () {
    FieldReport makeReport({
      String status = 'open',
      String severity = 'medium',
      int daysAgo = 5,
    }) =>
        FieldReport(
          id: 'FR-001',
          unitId: 'UI001',
          title: 'Controle hygrometrie',
          comment: 'Ecart releve sur le lot.',
          severity: severity,
          location: 'Port-Gentil',
          status: status,
          createdAt: DateTime.now().subtract(Duration(days: daysAgo)),
          createdBy: 'inspecteur',
        );

    // -----------------------------------------------------------------------
    // JSON deserialization
    // -----------------------------------------------------------------------

    test('fromJson parses all fields', () {
      final json = {
        'id': 'FR-010',
        'unit_id': 'UI002',
        'title': 'Controle emballage',
        'comment': 'Doute sur la conformite.',
        'severity': 'high',
        'location': 'Libreville',
        'status': 'in_progress',
        'created_at': '2026-03-01T14:30:00',
        'created_by': 'jdupont',
      };
      final report = FieldReport.fromJson(json);

      expect(report.id, 'FR-010');
      expect(report.unitId, 'UI002');
      expect(report.title, 'Controle emballage');
      expect(report.comment, contains('conformite'));
      expect(report.severity, 'high');
      expect(report.location, 'Libreville');
      expect(report.status, 'in_progress');
      expect(report.createdAt, DateTime(2026, 3, 1, 14, 30));
      expect(report.createdBy, 'jdupont');
    });

    test('fromJson handles null optional fields', () {
      final json = {
        'id': 'FR-020',
        'unit_id': null,
        'title': 'Signalement general',
        'comment': 'Observation terrain.',
        'severity': 'low',
        'location': null,
        'status': 'open',
        'created_at': '2026-02-20T08:00:00',
        'created_by': 'admin',
      };
      final report = FieldReport.fromJson(json);

      expect(report.unitId, isNull);
      expect(report.location, isNull);
    });

    // -----------------------------------------------------------------------
    // Status values
    // -----------------------------------------------------------------------

    test('isOpen returns true for non-closed statuses', () {
      expect(makeReport(status: 'open').isOpen, isTrue);
      expect(makeReport(status: 'in_progress').isOpen, isTrue);
      expect(makeReport(status: 'pending').isOpen, isTrue);
    });

    test('isOpen returns false for closed status', () {
      expect(makeReport(status: 'closed').isOpen, isFalse);
    });

    // -----------------------------------------------------------------------
    // Age calculation
    // -----------------------------------------------------------------------

    test('createdAt allows computing age in days', () {
      final report = makeReport(daysAgo: 12);
      final ageDays = DateTime.now().difference(report.createdAt).inDays;
      expect(ageDays, 12);
    });

    test('recent report has age of zero days', () {
      final report = makeReport(daysAgo: 0);
      final ageDays = DateTime.now().difference(report.createdAt).inDays;
      expect(ageDays, 0);
    });
  });
}
