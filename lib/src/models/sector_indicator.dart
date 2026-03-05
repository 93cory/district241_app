class SectorIndicator {
  final String sector;
  final double localVolumeTons;
  final double importVolumeTons;
  final int jobs;

  const SectorIndicator({
    required this.sector,
    required this.localVolumeTons,
    required this.importVolumeTons,
    required this.jobs,
  });

  factory SectorIndicator.fromJson(Map<String, dynamic> json) =>
      SectorIndicator(
        sector: json['sector'],
        localVolumeTons: (json['local_volume_tons'] as num).toDouble(),
        importVolumeTons: (json['import_volume_tons'] as num).toDouble(),
        jobs: json['jobs'],
      );
}
