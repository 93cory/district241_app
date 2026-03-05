class TraceBatch {
  final String batchId;
  final String product;
  final String origin;
  final String factory;
  final DateTime timestamp;
  final String certification;
  final String qrCode;
  final double quantityTons;
  final double? originLat;
  final double? originLng;
  final double? factoryLat;
  final double? factoryLng;

  const TraceBatch({
    required this.batchId,
    required this.product,
    required this.origin,
    required this.factory,
    required this.timestamp,
    required this.certification,
    required this.qrCode,
    required this.quantityTons,
    this.originLat,
    this.originLng,
    this.factoryLat,
    this.factoryLng,
  });

  factory TraceBatch.fromJson(Map<String, dynamic> json) => TraceBatch(
    batchId: json['batch_id'],
    product: json['product'],
    origin: json['origin'],
    factory: json['factory'],
    timestamp: DateTime.parse(json['timestamp']),
    certification: json['certification'],
    qrCode: json['qr_code'],
    quantityTons: (json['quantity_tons'] as num).toDouble(),
    originLat: (json['origin_lat'] as num?)?.toDouble(),
    originLng: (json['origin_lng'] as num?)?.toDouble(),
    factoryLat: (json['factory_lat'] as num?)?.toDouble(),
    factoryLng: (json['factory_lng'] as num?)?.toDouble(),
  );
}
