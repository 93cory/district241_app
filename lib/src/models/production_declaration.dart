class ProductionDeclaration {
  final DateTime month;
  final double volumeTons;
  final int jobs;
  final bool validated;

  const ProductionDeclaration({
    required this.month,
    required this.volumeTons,
    required this.jobs,
    required this.validated,
  });

  factory ProductionDeclaration.fromJson(Map<String, dynamic> json) =>
      ProductionDeclaration(
        month: DateTime.parse(json['month']),
        volumeTons: (json['volume_tons'] as num).toDouble(),
        jobs: json['jobs'],
        validated: json['validated'],
      );
}
