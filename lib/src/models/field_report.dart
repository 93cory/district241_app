class FieldReport {
  final String id;
  final String? unitId;
  final String title;
  final String comment;
  final String severity;
  final String? location;
  final String status;
  final DateTime createdAt;
  final String createdBy;

  const FieldReport({
    required this.id,
    required this.unitId,
    required this.title,
    required this.comment,
    required this.severity,
    required this.location,
    required this.status,
    required this.createdAt,
    required this.createdBy,
  });

  bool get isOpen => status != 'closed';

  factory FieldReport.fromJson(Map<String, dynamic> json) => FieldReport(
        id: json['id'],
        unitId: json['unit_id'],
        title: json['title'],
        comment: json['comment'],
        severity: json['severity'],
        location: json['location'],
        status: json['status'],
        createdAt: DateTime.parse(json['created_at']),
        createdBy: json['created_by'],
      );
}
