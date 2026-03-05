import 'package:flutter/material.dart';

import 'industrial_unit.dart';

/// Représente un site industriel positionné sur la carte nationale.
class MapSite {
  final String id;
  final String name;
  final String sector;
  final String province;
  final Offset position;
  final UnitStatus status;

  const MapSite({
    required this.id,
    required this.name,
    required this.sector,
    required this.province,
    required this.position,
    required this.status,
  });

  String get statusLabel => status == UnitStatus.active ? 'Actif' : 'Inactif';
}
