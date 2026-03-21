import 'package:flutter_test/flutter_test.dart';
import 'package:pnpi/src/models/project_dossier.dart';

void main() {
  group('ProjectDossier', () {
    test('fromJson parses all fields', () {
      final json = {
        'id': 'DOS-001',
        'company_name': 'Gabon Bois SA',
        'project_title': 'Scierie Estuaire Phase 2',
        'sector': 'bois',
        'location': 'Libreville',
        'status': 'en_instruction',
        'stage': 'instruction',
        'priority': 'elevee',
        'sla_days': 45,
        'submitted_at': '2026-01-15T00:00:00',
        'updated_at': '2026-02-20T10:30:00',
        'decision_at': '2026-03-01T09:00:00',
        'assigned_to': 'instructeur01',
        'assigned_role': 'instructeur',
        'decision_reason': 'Dossier complet',
        'decision_reference': 'REF-2026-042',
        'age_days': 65,
        'is_overdue': true,
      };
      final dossier = ProjectDossier.fromJson(json);

      expect(dossier.id, 'DOS-001');
      expect(dossier.companyName, 'Gabon Bois SA');
      expect(dossier.projectTitle, 'Scierie Estuaire Phase 2');
      expect(dossier.sector, 'bois');
      expect(dossier.location, 'Libreville');
      expect(dossier.status, 'en_instruction');
      expect(dossier.stage, 'instruction');
      expect(dossier.priority, 'elevee');
      expect(dossier.slaDays, 45);
      expect(dossier.submittedAt, DateTime(2026, 1, 15));
      expect(dossier.updatedAt, DateTime(2026, 2, 20, 10, 30));
      expect(dossier.decisionAt, DateTime(2026, 3, 1, 9));
      expect(dossier.assignedTo, 'instructeur01');
      expect(dossier.assignedRole, 'instructeur');
      expect(dossier.decisionReason, 'Dossier complet');
      expect(dossier.decisionReference, 'REF-2026-042');
      expect(dossier.ageDays, 65);
      expect(dossier.isOverdue, isTrue);
    });

    test('fromJson handles null optional fields', () {
      final json = {
        'id': 'DOS-002',
        'company_name': 'Mines du Nord',
        'project_title': 'Extraction Woleu',
        'sector': 'mines',
        'location': 'Oyem',
        'status': 'soumis',
        'stage': 'reception',
        'priority': 'normale',
        'sla_days': 30,
        'submitted_at': '2026-03-01T00:00:00',
        'updated_at': '2026-03-01T00:00:00',
        'decision_at': null,
        'assigned_to': null,
        'assigned_role': null,
        'decision_reason': null,
        'decision_reference': null,
      };
      final dossier = ProjectDossier.fromJson(json);

      expect(dossier.decisionAt, isNull);
      expect(dossier.assignedTo, isNull);
      expect(dossier.assignedRole, isNull);
      expect(dossier.decisionReason, isNull);
      expect(dossier.decisionReference, isNull);
      expect(dossier.ageDays, 0);
      expect(dossier.isOverdue, isFalse);
    });

    test('status mapping covers all expected values', () {
      final statuses = [
        'soumis',
        'en_instruction',
        'en_validation',
        'approuve',
        'rejete',
        'expire',
      ];
      for (final status in statuses) {
        final json = {
          'id': 'DOS-STATUS',
          'company_name': 'Test',
          'project_title': 'Test',
          'sector': 'bois',
          'location': 'Test',
          'status': status,
          'stage': 'reception',
          'priority': 'normale',
          'sla_days': 30,
          'submitted_at': '2026-01-01T00:00:00',
          'updated_at': '2026-01-01T00:00:00',
          'decision_at': null,
          'assigned_to': null,
          'assigned_role': null,
          'decision_reason': null,
          'decision_reference': null,
        };
        final dossier = ProjectDossier.fromJson(json);
        expect(dossier.status, status);
      }
    });
  });

  group('PilotageStatusCount', () {
    test('fromJson parses key and count', () {
      final json = {'key': 'en_instruction', 'count': 12};
      final sc = PilotageStatusCount.fromJson(json);
      expect(sc.key, 'en_instruction');
      expect(sc.count, 12);
    });
  });

  group('PilotageKpiSnapshot', () {
    test('fromJson parses all fields including nested lists', () {
      final json = {
        'generated_at': '2026-03-20T12:00:00',
        'total_dossiers': 150,
        'in_progress_dossiers': 42,
        'overdue_dossiers': 7,
        'approval_rate': 0.85,
        'median_processing_days': 22.5,
        'sla_compliance_rate': 0.92,
        'status_breakdown': [
          {'key': 'soumis', 'count': 30},
          {'key': 'en_instruction', 'count': 42},
        ],
        'stage_breakdown': [
          {'key': 'reception', 'count': 20},
          {'key': 'instruction', 'count': 55},
        ],
      };
      final kpi = PilotageKpiSnapshot.fromJson(json);

      expect(kpi.generatedAt, DateTime(2026, 3, 20, 12));
      expect(kpi.totalDossiers, 150);
      expect(kpi.inProgressDossiers, 42);
      expect(kpi.overdueDossiers, 7);
      expect(kpi.approvalRate, 0.85);
      expect(kpi.medianProcessingDays, 22.5);
      expect(kpi.slaComplianceRate, 0.92);
      expect(kpi.statusBreakdown, hasLength(2));
      expect(kpi.statusBreakdown[0].key, 'soumis');
      expect(kpi.stageBreakdown, hasLength(2));
    });

    test('fromJson handles missing optional numeric fields', () {
      final json = {
        'generated_at': '2026-03-20T12:00:00',
      };
      final kpi = PilotageKpiSnapshot.fromJson(json);

      expect(kpi.totalDossiers, 0);
      expect(kpi.inProgressDossiers, 0);
      expect(kpi.overdueDossiers, 0);
      expect(kpi.approvalRate, 0);
      expect(kpi.medianProcessingDays, 0);
      expect(kpi.slaComplianceRate, 0);
      expect(kpi.statusBreakdown, isEmpty);
      expect(kpi.stageBreakdown, isEmpty);
    });
  });

  group('ProjectDossierTransition', () {
    test('fromJson parses all fields', () {
      final json = {
        'id': 'TR-001',
        'dossier_id': 'DOS-001',
        'changed_by': 'instructeur01',
        'previous_status': 'soumis',
        'new_status': 'en_instruction',
        'previous_stage': 'reception',
        'new_stage': 'instruction',
        'note': 'Dossier pris en charge',
        'changed_at': '2026-02-10T09:15:00',
      };
      final transition = ProjectDossierTransition.fromJson(json);

      expect(transition.id, 'TR-001');
      expect(transition.dossierId, 'DOS-001');
      expect(transition.changedBy, 'instructeur01');
      expect(transition.previousStatus, 'soumis');
      expect(transition.newStatus, 'en_instruction');
      expect(transition.previousStage, 'reception');
      expect(transition.newStage, 'instruction');
      expect(transition.note, 'Dossier pris en charge');
      expect(transition.changedAt, DateTime(2026, 2, 10, 9, 15));
    });

    test('fromJson handles null optional fields', () {
      final json = {
        'id': 'TR-002',
        'dossier_id': 'DOS-002',
        'changed_by': 'admin',
        'previous_status': null,
        'new_status': 'soumis',
        'previous_stage': null,
        'new_stage': 'reception',
        'note': 'Creation initiale',
        'changed_at': '2026-03-01T00:00:00',
      };
      final transition = ProjectDossierTransition.fromJson(json);

      expect(transition.previousStatus, isNull);
      expect(transition.previousStage, isNull);
      expect(transition.newStatus, 'soumis');
      expect(transition.newStage, 'reception');
    });
  });
}
