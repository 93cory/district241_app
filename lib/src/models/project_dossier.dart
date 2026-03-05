class PilotageStatusCount {
  final String key;
  final int count;

  const PilotageStatusCount({
    required this.key,
    required this.count,
  });

  factory PilotageStatusCount.fromJson(Map<String, dynamic> json) => PilotageStatusCount(
        key: json['key'],
        count: json['count'],
      );
}

class PilotageKpiSnapshot {
  final DateTime generatedAt;
  final int totalDossiers;
  final int inProgressDossiers;
  final int overdueDossiers;
  final double approvalRate;
  final double medianProcessingDays;
  final double slaComplianceRate;
  final List<PilotageStatusCount> statusBreakdown;
  final List<PilotageStatusCount> stageBreakdown;

  const PilotageKpiSnapshot({
    required this.generatedAt,
    required this.totalDossiers,
    required this.inProgressDossiers,
    required this.overdueDossiers,
    required this.approvalRate,
    required this.medianProcessingDays,
    required this.slaComplianceRate,
    required this.statusBreakdown,
    required this.stageBreakdown,
  });

  factory PilotageKpiSnapshot.fromJson(Map<String, dynamic> json) => PilotageKpiSnapshot(
        generatedAt: DateTime.parse(json['generated_at']),
        totalDossiers: json['total_dossiers'] ?? 0,
        inProgressDossiers: json['in_progress_dossiers'] ?? 0,
        overdueDossiers: json['overdue_dossiers'] ?? 0,
        approvalRate: (json['approval_rate'] as num?)?.toDouble() ?? 0,
        medianProcessingDays: (json['median_processing_days'] as num?)?.toDouble() ?? 0,
        slaComplianceRate: (json['sla_compliance_rate'] as num?)?.toDouble() ?? 0,
        statusBreakdown: (json['status_breakdown'] as List<dynamic>? ?? [])
            .map((entry) => PilotageStatusCount.fromJson(entry))
            .toList(),
        stageBreakdown: (json['stage_breakdown'] as List<dynamic>? ?? [])
            .map((entry) => PilotageStatusCount.fromJson(entry))
            .toList(),
      );
}

class ProjectDossier {
  final String id;
  final String companyName;
  final String projectTitle;
  final String sector;
  final String location;
  final String status;
  final String stage;
  final String priority;
  final int slaDays;
  final DateTime submittedAt;
  final DateTime updatedAt;
  final DateTime? decisionAt;
  final String? assignedTo;
  final String? assignedRole;
  final String? decisionReason;
  final String? decisionReference;
  final int ageDays;
  final bool isOverdue;

  const ProjectDossier({
    required this.id,
    required this.companyName,
    required this.projectTitle,
    required this.sector,
    required this.location,
    required this.status,
    required this.stage,
    required this.priority,
    required this.slaDays,
    required this.submittedAt,
    required this.updatedAt,
    required this.decisionAt,
    required this.assignedTo,
    required this.assignedRole,
    required this.decisionReason,
    required this.decisionReference,
    required this.ageDays,
    required this.isOverdue,
  });

  factory ProjectDossier.fromJson(Map<String, dynamic> json) => ProjectDossier(
        id: json['id'],
        companyName: json['company_name'],
        projectTitle: json['project_title'],
        sector: json['sector'],
        location: json['location'],
        status: json['status'],
        stage: json['stage'],
        priority: json['priority'],
        slaDays: json['sla_days'],
        submittedAt: DateTime.parse(json['submitted_at']),
        updatedAt: DateTime.parse(json['updated_at']),
        decisionAt: json['decision_at'] == null
            ? null
            : DateTime.parse(json['decision_at']),
        assignedTo: json['assigned_to'],
        assignedRole: json['assigned_role'],
        decisionReason: json['decision_reason'],
        decisionReference: json['decision_reference'],
        ageDays: json['age_days'] ?? 0,
        isOverdue: json['is_overdue'] ?? false,
      );
}

class ProjectDossierTransition {
  final String id;
  final String dossierId;
  final String changedBy;
  final String? previousStatus;
  final String? newStatus;
  final String? previousStage;
  final String? newStage;
  final String note;
  final DateTime changedAt;

  const ProjectDossierTransition({
    required this.id,
    required this.dossierId,
    required this.changedBy,
    required this.previousStatus,
    required this.newStatus,
    required this.previousStage,
    required this.newStage,
    required this.note,
    required this.changedAt,
  });

  factory ProjectDossierTransition.fromJson(Map<String, dynamic> json) =>
      ProjectDossierTransition(
        id: json['id'],
        dossierId: json['dossier_id'],
        changedBy: json['changed_by'],
        previousStatus: json['previous_status'],
        newStatus: json['new_status'],
        previousStage: json['previous_stage'],
        newStage: json['new_stage'],
        note: json['note'],
        changedAt: DateTime.parse(json['changed_at']),
      );
}
