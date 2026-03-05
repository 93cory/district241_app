class ForecastPoint {
  final String month;
  final double volumeTons;

  const ForecastPoint({required this.month, required this.volumeTons});

  factory ForecastPoint.fromJson(Map<String, dynamic> json) => ForecastPoint(
    month: json['month'],
    volumeTons: (json['volume_tons'] as num).toDouble(),
  );
}
