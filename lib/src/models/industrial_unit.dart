import 'production_declaration.dart';

enum UnitStatus { active, inactive }

class IndustrialUnit {
  final String id;
  final String name;
  final String sector;
  final double capacity;
  final String equipment;
  final String location;
  final UnitStatus status;
  final List<ProductionDeclaration> declarations;

  const IndustrialUnit({
    required this.id,
    required this.name,
    required this.sector,
    required this.capacity,
    required this.equipment,
    required this.location,
    required this.status,
    required this.declarations,
  });

  double get latestVolume =>
      declarations.isNotEmpty ? declarations.last.volumeTons : 0;

  int get latestJobs => declarations.isNotEmpty ? declarations.last.jobs : 0;

  factory IndustrialUnit.fromJson(Map<String, dynamic> json) => IndustrialUnit(
    id: json['id'],
    name: json['name'],
    sector: json['sector'],
    capacity: (json['capacity'] as num).toDouble(),
    equipment: json['equipment'],
    location: json['location'],
    status: UnitStatus.values.firstWhere(
      (status) => status.name == json['status'],
      orElse: () => UnitStatus.active,
    ),
    declarations:
        (json['declarations'] as List<dynamic>?)
            ?.map((decl) => ProductionDeclaration.fromJson(decl))
            .toList() ??
        [],
  );
}
