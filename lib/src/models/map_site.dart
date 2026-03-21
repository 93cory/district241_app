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

  /// Optional: latest ATI status for this site's operator (approuve, en_cours, rejete, etc.)
  final String? latestAtiStatut;

  /// Optional: operator conformity status (conforme, non_conforme, en_attente)
  final String? statutConformite;

  const MapSite({
    required this.id,
    required this.name,
    required this.sector,
    required this.province,
    required this.position,
    required this.status,
    this.latestAtiStatut,
    this.statutConformite,
  });

  String get statusLabel => status == UnitStatus.active ? 'Actif' : 'Inactif';
}
