import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import '../data/mock_data.dart';
import '../models/ati.dart';
import '../models/ati_transition.dart';
import '../models/field_report.dart';
import '../models/inspection_conformite.dart';
import '../models/forecast_point.dart';
import '../models/industrial_unit.dart';
import '../models/operateur_industriel.dart';
import '../models/project_dossier.dart';
import '../models/sector_indicator.dart';
import '../models/trace_batch.dart';

const _backendUrl = String.fromEnvironment(
  'PNPI_API_URL',
  defaultValue: 'http://localhost:8000',
);
const _backendUsername = String.fromEnvironment(
  'PNPI_API_USERNAME',
  defaultValue: 'ministre',
);
const _backendPassword = String.fromEnvironment('PNPI_API_PASSWORD');
const _strictBackend = bool.fromEnvironment(
  'PNPI_STRICT_BACKEND',
  defaultValue: false,
);
const _pendingFieldReportsStorageKey = 'pnpi_pending_field_reports_v1';

/// Snapshot de donnees exposees par `/dashboard/indicators`.
class DashboardSnapshot {
  final List<SectorIndicator> indicators;
  final double nationalIndex;
  final int jobsCreated;
  final double importGapTons;
  final int activeUnits;
  final int activeZones;
  final int tracedBatches;

  DashboardSnapshot({
    required this.indicators,
    required this.nationalIndex,
    required this.jobsCreated,
    required this.importGapTons,
    this.activeUnits = 0,
    this.activeZones = 0,
    this.tracedBatches = 0,
  });

  factory DashboardSnapshot.fromJson(Map<String, dynamic> json) =>
      DashboardSnapshot(
        indicators: (json['indicators'] as List<dynamic>)
            .map((entry) => SectorIndicator.fromJson(entry))
            .toList(),
        nationalIndex: (json['national_index'] as num).toDouble(),
        jobsCreated: json['jobs_created'],
        importGapTons: (json['import_gap_tons'] as num).toDouble(),
        activeUnits: json['active_units'] ?? 0,
        activeZones: json['active_zones'] ?? 0,
        tracedBatches: json['traced_batches'] ?? 0,
      );
}

class DashboardAlert {
  final String id;
  final String severity;
  final String title;
  final String detail;
  final String source;
  final DateTime createdAt;

  const DashboardAlert({
    required this.id,
    required this.severity,
    required this.title,
    required this.detail,
    required this.source,
    required this.createdAt,
  });

  factory DashboardAlert.fromJson(Map<String, dynamic> json) => DashboardAlert(
        id: json['id'],
        severity: json['severity'],
        title: json['title'],
        detail: json['detail'],
        source: json['source'],
        createdAt: DateTime.parse(json['created_at']),
      );
}

class AppNotification {
  final String id;
  final String? targetRole;
  final String title;
  final String message;
  final String severity;
  final DateTime createdAt;
  final bool isRead;

  const AppNotification({
    required this.id,
    required this.targetRole,
    required this.title,
    required this.message,
    required this.severity,
    required this.createdAt,
    required this.isRead,
  });

  factory AppNotification.fromJson(Map<String, dynamic> json) => AppNotification(
        id: json['id'],
        targetRole: json['target_role'],
        title: json['title'],
        message: json['message'],
        severity: json['severity'],
        createdAt: DateTime.parse(json['created_at']),
        isRead: json['is_read'] ?? false,
      );
}

class PnpiAlert {
  final String type;
  final String severity;
  final String title;
  final String message;
  final String targetId;
  final DateTime createdAt;

  const PnpiAlert({
    required this.type,
    required this.severity,
    required this.title,
    required this.message,
    required this.targetId,
    required this.createdAt,
  });

  factory PnpiAlert.fromJson(Map<String, dynamic> json) => PnpiAlert(
        type: json['type'] as String? ?? '',
        severity: json['severity'] as String? ?? 'info',
        title: json['title'] as String? ?? '',
        message: json['message'] as String? ?? '',
        targetId: json['target_id'] as String? ?? '',
        createdAt: DateTime.tryParse(json['created_at'] as String? ?? '') ?? DateTime.now(),
      );
}

class AuditEvent {
  final String id;
  final DateTime timestamp;
  final String actor;
  final String action;
  final String? target;
  final String details;

  const AuditEvent({
    required this.id,
    required this.timestamp,
    required this.actor,
    required this.action,
    required this.target,
    required this.details,
  });

  factory AuditEvent.fromJson(Map<String, dynamic> json) => AuditEvent(
        id: json['id'],
        timestamp: DateTime.parse(json['timestamp']),
        actor: json['actor'],
        action: json['action'],
        target: json['target'],
        details: json['details'] ?? '',
      );
}

class PendingFieldReport {
  final String? unitId;
  final String title;
  final String comment;
  final String severity;
  final String? location;
  final DateTime queuedAt;

  const PendingFieldReport({
    required this.unitId,
    required this.title,
    required this.comment,
    required this.severity,
    required this.location,
    required this.queuedAt,
  });

  Map<String, dynamic> toJson() => {
        'unit_id': unitId,
        'title': title,
        'comment': comment,
        'severity': severity,
        'location': location,
        'queued_at': queuedAt.toIso8601String(),
      };

  factory PendingFieldReport.fromJson(Map<String, dynamic> json) => PendingFieldReport(
        unitId: json['unit_id'],
        title: json['title'],
        comment: json['comment'],
        severity: json['severity'],
        location: json['location'],
        queuedAt: DateTime.parse(json['queued_at']),
      );
}

class AuthUserProfile {
  final String username;
  final String fullName;
  final List<String> roles;

  const AuthUserProfile({
    required this.username,
    required this.fullName,
    required this.roles,
  });

  bool get canManagePilotage => roles.contains('ministre');

  factory AuthUserProfile.fromJson(Map<String, dynamic> json) => AuthUserProfile(
        username: json['username'],
        fullName: json['full_name'],
        roles: (json['roles'] as List<dynamic>).map((entry) => '$entry').toList(),
      );
}

class ApiService {
  ApiService._();

  static final ApiService instance = ApiService._();

  final http.Client _client = http.Client();
  String? _token;
  AuthUserProfile? _profile;
  bool _demoMode = false;

  bool get isAuthenticated => _token != null;
  bool get isDemoMode => _demoMode;

  Map<String, String> get _authHeaders =>
      _token == null ? {} : {'Authorization': 'Bearer $_token'};

  Future<void> login({
    String username = _backendUsername,
    String password = _backendPassword,
  }) async {
    if (password.isEmpty) {
      throw Exception('PNPI_API_PASSWORD manquant');
    }
    final response = await _client.post(
      Uri.parse('$_backendUrl/auth/token'),
      headers: {'Content-Type': 'application/x-www-form-urlencoded'},
      body: {'username': username, 'password': password},
    );
    if (response.statusCode != 200) {
      throw Exception('Impossible de s authentifier');
    }
    final json = jsonDecode(response.body) as Map<String, dynamic>;
    _token = json['access_token'];
    _profile = null;
    _demoMode = false;
    await syncQueuedFieldReports();
  }

  void enableDemoMode({String role = 'inspecteur'}) {
    _token = null;
    final fullNames = <String, String>{
      'admin': 'Administrateur Demo',
      'ministre': 'Ministre Demo',
      'directeur': 'Directeur Demo',
      'inspecteur': 'Inspecteur Demo',
      'instructeur': 'Instructeur Demo',
      'operateur': 'Operateur Demo',
    };
    _profile = AuthUserProfile(
      username: 'demo_$role',
      fullName: fullNames[role] ?? 'Utilisateur Demo',
      roles: [role],
    );
    _demoMode = true;
  }

  void logout() {
    _token = null;
    _profile = null;
    _demoMode = false;
  }

  Future<void> _ensureToken() async {
    if (_token == null) {
      await login();
    }
  }

  Future<List<PendingFieldReport>> _loadPendingFieldReports() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_pendingFieldReportsStorageKey);
    if (raw == null || raw.isEmpty) {
      return const [];
    }
    final decoded = jsonDecode(raw) as List<dynamic>;
    return decoded
        .map((entry) => PendingFieldReport.fromJson(entry as Map<String, dynamic>))
        .toList();
  }

  Future<void> _savePendingFieldReports(List<PendingFieldReport> reports) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      _pendingFieldReportsStorageKey,
      jsonEncode(reports.map((entry) => entry.toJson()).toList()),
    );
  }

  Future<int> getPendingFieldReportsCount() async {
    final reports = await _loadPendingFieldReports();
    return reports.length;
  }

  Future<void> _enqueueFieldReport({
    String? unitId,
    required String title,
    required String comment,
    required String severity,
    String? location,
  }) async {
    final reports = await _loadPendingFieldReports();
    reports.add(
      PendingFieldReport(
        unitId: unitId,
        title: title,
        comment: comment,
        severity: severity,
        location: location,
        queuedAt: DateTime.now().toUtc(),
      ),
    );
    await _savePendingFieldReports(reports);
  }

  Future<int> syncQueuedFieldReports() async {
    final reports = await _loadPendingFieldReports();
    if (reports.isEmpty) return 0;

    final remaining = <PendingFieldReport>[];
    var sent = 0;
    for (final report in reports) {
      try {
        await submitFieldReport(
          unitId: report.unitId,
          title: report.title,
          comment: report.comment,
          severity: report.severity,
          location: report.location,
          queueOnFailure: false,
        );
        sent += 1;
      } catch (_) {
        remaining.add(report);
      }
    }
    await _savePendingFieldReports(remaining);
    return sent;
  }

  Future<AuthUserProfile> fetchCurrentUser({bool forceRefresh = false}) async {
    if (_demoMode && _profile != null) {
      return _profile!;
    }
    await _ensureToken();
    if (!forceRefresh && _profile != null) {
      return _profile!;
    }
    try {
      final response = await _client.get(
        Uri.parse('$_backendUrl/auth/me'),
        headers: _authHeaders,
      );
      if (response.statusCode != 200) {
        throw Exception('Lecture profil echouee');
      }
      final profile = AuthUserProfile.fromJson(jsonDecode(response.body));
      _profile = profile;
      return profile;
    } catch (_) {
      if (_strictBackend) rethrow;
      const fallback = AuthUserProfile(
        username: 'offline',
        fullName: 'Mode hors ligne',
        roles: ['inspecteur'],
      );
      _profile = fallback;
      return fallback;
    }
  }

  Future<DashboardSnapshot> fetchDashboardSnapshot() async {
    try {
      await _ensureToken();
      final response = await _client.get(
        Uri.parse('$_backendUrl/dashboard/indicators'),
        headers: _authHeaders,
      );
      if (response.statusCode != 200) throw Exception('Erreur');
      return DashboardSnapshot.fromJson(jsonDecode(response.body));
    } catch (_) {
      if (_strictBackend) rethrow;
      final indicators = MockData.sectorIndicators;
      return DashboardSnapshot(
        indicators: indicators,
        nationalIndex: 0.68,
        jobsCreated: indicators.fold<int>(0, (sum, e) => sum + e.jobs),
        importGapTons: indicators.fold<double>(
              0,
              (sum, e) => sum + e.importVolumeTons,
            ) -
            indicators.fold<double>(
              0,
              (sum, e) => sum + e.localVolumeTons,
            ),
        activeUnits: MockData.units.where((unit) => unit.status.name == 'active').length,
        activeZones: 3,
        tracedBatches: MockData.traceBatches.length,
      );
    }
  }

  Future<List<ForecastPoint>> fetchForecast() async {
    try {
      await _ensureToken();
      final response = await _client.get(
        Uri.parse('$_backendUrl/dashboard/forecast'),
        headers: _authHeaders,
      );
      if (response.statusCode != 200) throw Exception('Erreur');
      return (jsonDecode(response.body) as List<dynamic>)
          .map((entry) => ForecastPoint.fromJson(entry))
          .toList();
    } catch (_) {
      if (_strictBackend) rethrow;
      return MockData.forecastPoints;
    }
  }

  Future<List<TraceBatch>> fetchBatches() async {
    try {
      await _ensureToken();
      final response = await _client.get(
        Uri.parse('$_backendUrl/batches'),
        headers: _authHeaders,
      );
      if (response.statusCode != 200) throw Exception('Erreur');
      return (jsonDecode(response.body) as List<dynamic>)
          .map((entry) => TraceBatch.fromJson(entry))
          .toList();
    } catch (_) {
      if (_strictBackend) rethrow;
      return MockData.traceBatches;
    }
  }

  Future<TraceBatch?> fetchBatchById(String batchId) async {
    try {
      await _ensureToken();
      final response = await _client.get(
        Uri.parse('$_backendUrl/batches/$batchId'),
        headers: _authHeaders,
      );
      if (response.statusCode == 404) {
        return null;
      }
      if (response.statusCode != 200) throw Exception('Erreur');
      return TraceBatch.fromJson(jsonDecode(response.body));
    } catch (_) {
      if (_strictBackend) rethrow;
      for (final batch in MockData.traceBatches) {
        if (batch.batchId.toUpperCase() == batchId.toUpperCase()) {
          return batch;
        }
      }
      return null;
    }
  }

  Future<List<IndustrialUnit>> fetchUnits() async {
    try {
      await _ensureToken();
      final response = await _client.get(
        Uri.parse('$_backendUrl/units'),
        headers: _authHeaders,
      );
      if (response.statusCode != 200) throw Exception('Erreur');
      return (jsonDecode(response.body) as List<dynamic>)
          .map((entry) => IndustrialUnit.fromJson(entry))
          .toList();
    } catch (_) {
      if (_strictBackend) rethrow;
      return MockData.units;
    }
  }

  Future<List<DashboardAlert>> fetchDashboardAlerts() async {
    try {
      await _ensureToken();
      final response = await _client.get(
        Uri.parse('$_backendUrl/dashboard/alerts'),
        headers: _authHeaders,
      );
      if (response.statusCode != 200) throw Exception('Erreur');
      return (jsonDecode(response.body) as List<dynamic>)
          .map((entry) => DashboardAlert.fromJson(entry))
          .toList();
    } catch (_) {
      if (_strictBackend) rethrow;
      return [
        DashboardAlert(
          id: 'fallback-1',
          severity: 'high',
          title: 'Declarations en attente',
          detail: 'Des declarations terrain restent a valider.',
          source: 'declarations',
          createdAt: DateTime.utc(2026, 2, 23),
        ),
      ];
    }
  }

  Future<List<FieldReport>> fetchFieldReports() async {
    try {
      await _ensureToken();
      final response = await _client.get(
        Uri.parse('$_backendUrl/field-reports'),
        headers: _authHeaders,
      );
      if (response.statusCode != 200) throw Exception('Erreur');
      return (jsonDecode(response.body) as List<dynamic>)
          .map((entry) => FieldReport.fromJson(entry))
          .toList();
    } catch (_) {
      if (_strictBackend) rethrow;
      return const [];
    }
  }

  Future<void> submitDeclaration({
    required String unitId,
    required DateTime month,
    required double volumeTons,
    required int jobs,
  }) async {
    await _ensureToken();
    final response = await _client.post(
      Uri.parse('$_backendUrl/units/$unitId/declarations'),
      headers: {..._authHeaders, 'Content-Type': 'application/json'},
      body: jsonEncode({
        'month': month.toIso8601String().split('T').first,
        'volume_tons': volumeTons,
        'jobs': jobs,
        'validated': false,
      }),
    );
    if (response.statusCode != 201) {
      throw Exception('Declaration echouee');
    }
  }

  Future<void> submitFieldReport({
    String? unitId,
    required String title,
    required String comment,
    String severity = 'medium',
    String? location,
    bool queueOnFailure = true,
  }) async {
    try {
      await _ensureToken();
      final response = await _client.post(
        Uri.parse('$_backendUrl/field-reports'),
        headers: {..._authHeaders, 'Content-Type': 'application/json'},
        body: jsonEncode({
          'unit_id': unitId,
          'title': title,
          'comment': comment,
          'severity': severity,
          'location': location,
        }),
      );
      if (response.statusCode != 201) {
        throw Exception('Declaration terrain echouee');
      }
    } catch (_) {
      if (!queueOnFailure) {
        rethrow;
      }
      await _enqueueFieldReport(
        unitId: unitId,
        title: title,
        comment: comment,
        severity: severity,
        location: location,
      );
      if (_strictBackend) {
        rethrow;
      }
    }
  }

  Future<bool> submitFieldReportWithOfflineQueue({
    String? unitId,
    required String title,
    required String comment,
    String severity = 'medium',
    String? location,
  }) async {
    try {
      final before = await getPendingFieldReportsCount();
      await submitFieldReport(
        unitId: unitId,
        title: title,
        comment: comment,
        severity: severity,
        location: location,
        queueOnFailure: true,
      );
      final after = await getPendingFieldReportsCount();
      return after == before;
    } catch (_) {
      return false;
    }
  }

  Future<void> updateFieldReportStatus({
    required String reportId,
    required String status,
  }) async {
    await _ensureToken();
    final response = await _client.patch(
      Uri.parse('$_backendUrl/field-reports/$reportId/status'),
      headers: {..._authHeaders, 'Content-Type': 'application/json'},
      body: jsonEncode({'status': status}),
    );
    if (response.statusCode != 200) {
      throw Exception('Mise a jour statut echouee');
    }
  }

  Future<void> deleteFieldReport(String reportId) async {
    await _ensureToken();
    final response = await _client.delete(
      Uri.parse('$_backendUrl/field-reports/$reportId'),
      headers: _authHeaders,
    );
    if (response.statusCode != 204) {
      throw Exception('Suppression rapport echouee');
    }
  }

  Future<PilotageKpiSnapshot> fetchPilotageKpis() async {
    try {
      await _ensureToken();
      final response = await _client.get(
        Uri.parse('$_backendUrl/pilotage/kpis'),
        headers: _authHeaders,
      );
      if (response.statusCode != 200) {
        throw Exception('pilotage/kpis HTTP ${response.statusCode}: ${response.body}');
      }
      return PilotageKpiSnapshot.fromJson(jsonDecode(response.body));
    } catch (_) {
      if (_strictBackend) rethrow;
      return MockData.pilotageKpis;
    }
  }

  Future<List<ProjectDossier>> fetchProjectDossiers() async {
    try {
      await _ensureToken();
      final response = await _client.get(
        Uri.parse('$_backendUrl/pilotage/dossiers'),
        headers: _authHeaders,
      );
      if (response.statusCode != 200) throw Exception('Erreur');
      return (jsonDecode(response.body) as List<dynamic>)
          .map((entry) => ProjectDossier.fromJson(entry))
          .toList();
    } catch (_) {
      if (_strictBackend) rethrow;
      return MockData.projectDossiers;
    }
  }

  Future<List<ProjectDossier>> fetchProjectQueue() async {
    try {
      await _ensureToken();
      final response = await _client.get(
        Uri.parse('$_backendUrl/pilotage/queue'),
        headers: _authHeaders,
      );
      if (response.statusCode != 200) {
        throw Exception('pilotage/queue HTTP ${response.statusCode}: ${response.body}');
      }
      return (jsonDecode(response.body) as List<dynamic>)
          .map((entry) => ProjectDossier.fromJson(entry))
          .toList();
    } catch (_) {
      if (_strictBackend) rethrow;
      return MockData.projectDossiers;
    }
  }

  Future<List<ProjectDossierTransition>> fetchProjectDossierHistory(
    String dossierId,
  ) async {
    try {
      await _ensureToken();
      final response = await _client.get(
        Uri.parse('$_backendUrl/pilotage/dossiers/$dossierId/history'),
        headers: _authHeaders,
      );
      if (response.statusCode != 200) throw Exception('Erreur');
      return (jsonDecode(response.body) as List<dynamic>)
          .map((entry) => ProjectDossierTransition.fromJson(entry))
          .toList();
    } catch (_) {
      if (_strictBackend) rethrow;
      return MockData.projectDossierTransitions
          .where((entry) => entry.dossierId == dossierId)
          .toList();
    }
  }

  Future<List<AppNotification>> fetchNotifications() async {
    try {
      await _ensureToken();
      final response = await _client.get(
        Uri.parse('$_backendUrl/admin/notifications'),
        headers: _authHeaders,
      );
      if (response.statusCode != 200) throw Exception('Erreur');
      return (jsonDecode(response.body) as List<dynamic>)
          .map((entry) => AppNotification.fromJson(entry))
          .toList();
    } catch (_) {
      if (_strictBackend) rethrow;
      return _mockNotifications;
    }
  }

  static final _mockNotifications = <AppNotification>[
    AppNotification(
      id: 'notif-001',
      targetRole: 'instructeur',
      title: 'Nouvel ATI à instruire',
      message: 'ATI-2026-0005 (CIMGABON SARL) vient d\'être soumis. '
          'Veuillez prendre en charge l\'instruction sous 30 jours.',
      severity: 'medium',
      createdAt: DateTime.now().subtract(const Duration(minutes: 45)),
      isRead: false,
    ),
    AppNotification(
      id: 'notif-002',
      targetRole: 'directeur',
      title: 'SLA dépassé — action requise',
      message: 'ATI-2026-0007 (OLAM Gabon) a dépassé son délai SLA de 3 jours. '
          'Une décision urgente est nécessaire.',
      severity: 'critical',
      createdAt: DateTime.now().subtract(const Duration(hours: 2)),
      isRead: false,
    ),
    AppNotification(
      id: 'notif-003',
      targetRole: 'operateur',
      title: 'ATI approuvé',
      message: 'Votre ATI-2026-0003 a été approuvé par la Direction Industrielle. '
          'Votre certificat est disponible dans l\'application.',
      severity: 'low',
      createdAt: DateTime.now().subtract(const Duration(hours: 6)),
      isRead: false,
    ),
    AppNotification(
      id: 'notif-004',
      targetRole: 'inspecteur',
      title: 'Inspection non-conforme signalée',
      message: 'L\'inspection IN-2026-042 (SETRAG — Ogooué-Ivindo) a conclu '
          'à une non-conformité. Des mesures correctives sont attendues sous 15 jours.',
      severity: 'high',
      createdAt: DateTime.now().subtract(const Duration(hours: 14)),
      isRead: true,
    ),
    AppNotification(
      id: 'notif-005',
      targetRole: 'admin',
      title: 'Nouvel opérateur enregistré',
      message: 'L\'opérateur GABOWOOD Industries a été enregistré (NIF: 12345678A). '
          'Province : Woleu-Ntem — Secteur : Bois.',
      severity: 'low',
      createdAt: DateTime.now().subtract(const Duration(days: 1)),
      isRead: true,
    ),
    AppNotification(
      id: 'notif-006',
      targetRole: 'operateur',
      title: 'ATI rejeté',
      message: 'Votre ATI-2026-0004 a été rejeté. Motif : dossier incomplet — '
          'pièces manquantes : plan de site et bilan d\'activité.',
      severity: 'high',
      createdAt: DateTime.now().subtract(const Duration(days: 2)),
      isRead: true,
    ),
    AppNotification(
      id: 'notif-007',
      targetRole: 'directeur',
      title: 'Rapport mensuel disponible',
      message: 'Le rapport PNPI de février 2026 est disponible. '
          '12 ATIs traités, taux d\'approbation : 83 %, délai moyen : 18 jours.',
      severity: 'low',
      createdAt: DateTime.now().subtract(const Duration(days: 3)),
      isRead: true,
    ),
  ];

  // ── PNPI Alerts ───────────────────────────────────────────────────────
  Future<List<PnpiAlert>> fetchPnpiAlerts() async {
    try {
      await _ensureToken();
      final response = await _client.get(
        Uri.parse('$_backendUrl/pnpi/alerts'),
        headers: _authHeaders,
      );
      if (response.statusCode != 200) throw Exception('Erreur');
      return (jsonDecode(response.body) as List<dynamic>)
          .map((e) => PnpiAlert.fromJson(e as Map<String, dynamic>))
          .toList();
    } catch (_) {
      if (_strictBackend) rethrow;
      return [];
    }
  }

  Future<List<ATITransition>> fetchPnpiHistorique({int limit = 50}) async {
    try {
      await _ensureToken();
      final response = await _client.get(
        Uri.parse('$_backendUrl/pnpi/historique?limit=$limit'),
        headers: _authHeaders,
      );
      if (response.statusCode != 200) throw Exception('Erreur');
      return (jsonDecode(response.body) as List<dynamic>)
          .map((e) {
            final m = e as Map<String, dynamic>;
            return ATITransition(
              id: m['id'] as String,
              atiId: m['ati_id'] as String,
              changedBy: m['changed_by'] as String,
              oldStatut: m['previous_statut'] as String?,
              newStatut: m['new_statut'] as String,
              note: m['note'] as String?,
              changedAt: DateTime.parse(m['changed_at'] as String),
            );
          })
          .toList();
    } catch (_) {
      if (_strictBackend) rethrow;
      return [];
    }
  }

  Future<void> markNotificationRead(String notificationId) async {
    await _ensureToken();
    final response = await _client.patch(
      Uri.parse('$_backendUrl/admin/notifications/$notificationId/read'),
      headers: {..._authHeaders, 'Content-Type': 'application/json'},
      body: jsonEncode({'is_read': true}),
    );
    if (response.statusCode != 200) {
      throw Exception('Mise a jour notification echouee: ${response.body}');
    }
  }

  Future<List<AuditEvent>> fetchAuditEvents() async {
    try {
      await _ensureToken();
      final response = await _client.get(
        Uri.parse('$_backendUrl/audit/events'),
        headers: _authHeaders,
      );
      if (response.statusCode == 403) {
        return const [];
      }
      if (response.statusCode != 200) throw Exception('Erreur');
      return (jsonDecode(response.body) as List<dynamic>)
          .map((entry) => AuditEvent.fromJson(entry))
          .toList();
    } catch (_) {
      if (_strictBackend) rethrow;
      return _mockAuditEvents;
    }
  }

  static final _mockAuditEvents = <AuditEvent>[
    AuditEvent(
      id: 'aud-001',
      timestamp: DateTime.now().subtract(const Duration(minutes: 20)),
      actor: 'Pierre NGUEMA',
      action: 'ATI_TRANSITION',
      target: 'ATI-2026-0003',
      details: 'Statut : en_validation → approuve. Note : "Dossier complet et conforme."',
    ),
    AuditEvent(
      id: 'aud-002',
      timestamp: DateTime.now().subtract(const Duration(hours: 1, minutes: 10)),
      actor: 'Marie OBAME',
      action: 'INSPECTION_CREATED',
      target: 'INS-2026-042',
      details: 'Inspection créée pour SETRAG (Ogooué-Ivindo). Résultat : non_conforme.',
    ),
    AuditEvent(
      id: 'aud-003',
      timestamp: DateTime.now().subtract(const Duration(hours: 3)),
      actor: 'Jean-Claude MOUSSAVOU',
      action: 'ATI_CREATED',
      target: 'ATI-2026-0008',
      details: 'Nouvel ATI soumis pour GABOWOOD Industries — secteur Bois, province Woleu-Ntem.',
    ),
    AuditEvent(
      id: 'aud-004',
      timestamp: DateTime.now().subtract(const Duration(hours: 5, minutes: 30)),
      actor: 'Admin Système',
      action: 'OPERATEUR_REGISTERED',
      target: 'OPI-2026-035',
      details: 'Opérateur CIMGABON SARL enregistré (NIF: 98765432B) — BTP, Estuaire.',
    ),
    AuditEvent(
      id: 'aud-005',
      timestamp: DateTime.now().subtract(const Duration(hours: 8)),
      actor: 'Pierre NGUEMA',
      action: 'ATI_TRANSITION',
      target: 'ATI-2026-0004',
      details: 'Statut : en_validation → rejete. Motif : "Pièces manquantes — plan de site et bilan."',
    ),
    AuditEvent(
      id: 'aud-006',
      timestamp: DateTime.now().subtract(const Duration(hours: 10)),
      actor: 'Sylvie BONGO ONDO',
      action: 'ATI_TRANSITION',
      target: 'ATI-2026-0001',
      details: 'Statut : soumis → en_instruction. Prise en charge par l\'instructeur.',
    ),
    AuditEvent(
      id: 'aud-007',
      timestamp: DateTime.now().subtract(const Duration(days: 1, hours: 2)),
      actor: 'Pierre NGUEMA',
      action: 'EXPORT',
      target: 'rapport_pnpi_fevrier_2026.pdf',
      details: 'Export du rapport mensuel PNPI — Février 2026 (12 ATIs, 6 opérateurs).',
    ),
    AuditEvent(
      id: 'aud-008',
      timestamp: DateTime.now().subtract(const Duration(days: 1, hours: 8)),
      actor: 'Admin Système',
      action: 'LOGIN',
      target: null,
      details: 'Connexion réussie depuis 41.158.xx.xx (Libreville, Gabon).',
    ),
    AuditEvent(
      id: 'aud-009',
      timestamp: DateTime.now().subtract(const Duration(days: 2)),
      actor: 'Marie OBAME',
      action: 'INSPECTION_CREATED',
      target: 'INS-2026-041',
      details: 'Inspection créée pour SUCAF Gabon (Ngounié). Résultat : conforme.',
    ),
    AuditEvent(
      id: 'aud-010',
      timestamp: DateTime.now().subtract(const Duration(days: 3)),
      actor: 'Jean-Claude MOUSSAVOU',
      action: 'ATI_TRANSITION',
      target: 'ATI-2026-0002',
      details: 'Statut : en_instruction → en_validation. Envoyé pour décision de direction.',
    ),
  ];

  Future<void> createProjectDossier({
    required String companyName,
    required String projectTitle,
    required String sector,
    required String location,
    String priority = 'medium',
    int slaDays = 30,
    String? assignedTo,
  }) async {
    await _ensureToken();
    final response = await _client.post(
      Uri.parse('$_backendUrl/pilotage/dossiers'),
      headers: {..._authHeaders, 'Content-Type': 'application/json'},
      body: jsonEncode({
        'company_name': companyName,
        'project_title': projectTitle,
        'sector': sector,
        'location': location,
        'priority': priority,
        'sla_days': slaDays,
        'assigned_to': assignedTo,
      }),
    );
    if (response.statusCode != 201) {
      throw Exception('Creation dossier echouee');
    }
  }

  Future<void> updateProjectDossier({
    required String dossierId,
    String? status,
    String? stage,
    String? priority,
    int? slaDays,
    String? assignedTo,
    String? assignedRole,
    String? decisionReason,
    String? decisionReference,
  }) async {
    await _ensureToken();
    final payload = <String, dynamic>{};
    if (status != null) payload['status'] = status;
    if (stage != null) payload['stage'] = stage;
    if (priority != null) payload['priority'] = priority;
    if (slaDays != null) payload['sla_days'] = slaDays;
    if (assignedTo != null) payload['assigned_to'] = assignedTo;
    if (assignedRole != null) payload['assigned_role'] = assignedRole;
    if (decisionReason != null) payload['decision_reason'] = decisionReason;
    if (decisionReference != null) payload['decision_reference'] = decisionReference;

    final response = await _client.patch(
      Uri.parse('$_backendUrl/pilotage/dossiers/$dossierId'),
      headers: {..._authHeaders, 'Content-Type': 'application/json'},
      body: jsonEncode(payload),
    );
    if (response.statusCode != 200) {
      throw Exception('Mise a jour dossier echouee: ${response.body}');
    }
  }

  Future<String> downloadDecisionDocument(String dossierId) async {
    await _ensureToken();
    final response = await _client.get(
      Uri.parse('$_backendUrl/pilotage/dossiers/$dossierId/decision-document.pdf'),
      headers: _authHeaders,
    );
    if (response.statusCode != 200) {
      throw Exception('Telechargement PDF echoue: ${response.body}');
    }

    final directory = Directory('${Directory.systemTemp.path}${Platform.pathSeparator}pnpi');
    if (!directory.existsSync()) {
      directory.createSync(recursive: true);
    }
    final filePath =
        '${directory.path}${Platform.pathSeparator}$dossierId-decision.pdf';
    final file = File(filePath);
    await file.writeAsBytes(response.bodyBytes, flush: true);
    return file.path;
  }

  Future<String> downloadPilotageTransitionsCsv({
    String? dossierId,
    String? changedBy,
    DateTime? dateFrom,
    DateTime? dateTo,
  }) {
    return _downloadPilotageTransitionsExport(
      format: 'csv',
      dossierId: dossierId,
      changedBy: changedBy,
      dateFrom: dateFrom,
      dateTo: dateTo,
    );
  }

  Future<String> downloadPilotageTransitionsPdf({
    String? dossierId,
    String? changedBy,
    DateTime? dateFrom,
    DateTime? dateTo,
  }) {
    return _downloadPilotageTransitionsExport(
      format: 'pdf',
      dossierId: dossierId,
      changedBy: changedBy,
      dateFrom: dateFrom,
      dateTo: dateTo,
    );
  }

  Future<String> _downloadPilotageTransitionsExport({
    required String format,
    String? dossierId,
    String? changedBy,
    DateTime? dateFrom,
    DateTime? dateTo,
  }) async {
    await _ensureToken();
    final query = <String, String>{};
    if (dossierId != null && dossierId.trim().isNotEmpty) {
      query['dossier_id'] = dossierId.trim().toUpperCase();
    }
    if (changedBy != null && changedBy.trim().isNotEmpty) {
      query['changed_by'] = changedBy.trim();
    }
    if (dateFrom != null) {
      query['date_from'] = dateFrom.toIso8601String().split('T').first;
    }
    if (dateTo != null) {
      query['date_to'] = dateTo.toIso8601String().split('T').first;
    }
    final uri = Uri.parse('$_backendUrl/exports/pilotage-transitions.$format')
        .replace(queryParameters: query.isEmpty ? null : query);
    final response = await _client.get(uri, headers: _authHeaders);
    if (response.statusCode != 200) {
      throw Exception('Export transitions $format echoue: ${response.body}');
    }

    final directory = Directory('${Directory.systemTemp.path}${Platform.pathSeparator}pnpi');
    if (!directory.existsSync()) {
      directory.createSync(recursive: true);
    }
    final timestamp = DateTime.now().toIso8601String().replaceAll(':', '-');
    final suffix = query['dossier_id'] != null ? '-${query['dossier_id']}' : '';
    final filePath =
        '${directory.path}${Platform.pathSeparator}pilotage-transitions$suffix-$timestamp.$format';
    final file = File(filePath);
    await file.writeAsBytes(response.bodyBytes, flush: true);
    return file.path;
  }

  Future<List<OperateurIndustriel>> fetchOperateurs() async {
    try {
      await _ensureToken();
      final response = await _client.get(
        Uri.parse('$_backendUrl/pnpi/operateurs'),
        headers: _authHeaders,
      );
      if (response.statusCode != 200) throw Exception('Erreur');
      return (jsonDecode(response.body) as List<dynamic>)
          .map((e) => OperateurIndustriel.fromJson(e as Map<String, dynamic>))
          .toList();
    } catch (_) {
      if (_strictBackend) rethrow;
      return MockData.operateurs;
    }
  }

  Future<List<AgrementTechniqueIndustriel>> fetchATIsByOperateur(
      String operateurId) async {
    try {
      await _ensureToken();
      final response = await _client.get(
        Uri.parse('$_backendUrl/pnpi/operateurs/$operateurId/ati'),
        headers: _authHeaders,
      );
      if (response.statusCode != 200) throw Exception('Erreur');
      return (jsonDecode(response.body) as List<dynamic>)
          .map((e) =>
              AgrementTechniqueIndustriel.fromJson(e as Map<String, dynamic>))
          .toList();
    } catch (_) {
      if (_strictBackend) rethrow;
      return MockData.atis
          .where((a) => a.operateurId == operateurId)
          .toList();
    }
  }

  Future<List<AgrementTechniqueIndustriel>> fetchATIs({
    String? statut,
    String? secteur,
    String? province,
  }) async {
    try {
      await _ensureToken();
      final query = <String, String>{};
      if (statut != null) query['statut'] = statut;
      if (secteur != null) query['secteur'] = secteur;
      if (province != null) query['province'] = province;
      final uri = Uri.parse('$_backendUrl/pnpi/ati')
          .replace(queryParameters: query.isEmpty ? null : query);
      final response = await _client.get(uri, headers: _authHeaders);
      if (response.statusCode != 200) throw Exception('Erreur');
      return (jsonDecode(response.body) as List<dynamic>)
          .map((e) => AgrementTechniqueIndustriel.fromJson(e as Map<String, dynamic>))
          .toList();
    } catch (_) {
      if (_strictBackend) rethrow;
      var list = MockData.atis;
      if (statut != null) list = list.where((a) => a.statut == statut).toList();
      if (secteur != null) list = list.where((a) => a.secteur == secteur).toList();
      if (province != null) list = list.where((a) => a.province == province).toList();
      return list;
    }
  }

  Future<AgrementTechniqueIndustriel> submitATI({
    required String operateurId,
    required String typeActivite,
    required String secteur,
    required String province,
    String priorite = 'normale',
    int slaDays = 30,
  }) async {
    await _ensureToken();
    final response = await _client.post(
      Uri.parse('$_backendUrl/pnpi/ati'),
      headers: {..._authHeaders, 'Content-Type': 'application/json'},
      body: jsonEncode({
        'operateur_id': operateurId,
        'type_activite': typeActivite,
        'secteur': secteur,
        'province': province,
        'priorite': priorite,
        'sla_jours': slaDays,
      }),
    );
    if (response.statusCode != 201) {
      throw Exception('Soumission ATI echouee: ${response.body}');
    }
    return AgrementTechniqueIndustriel.fromJson(
        jsonDecode(response.body) as Map<String, dynamic>);
  }

  Future<OperateurIndustriel> createOperateur({
    required String nifGabon,
    required String raisonSociale,
    required String secteur,
    required String province,
    required String ville,
    String? contactEmail,
    String? contactTelephone,
  }) async {
    try {
      await _ensureToken();
      final response = await _client.post(
        Uri.parse('$_backendUrl/pnpi/operateurs'),
        headers: {..._authHeaders, 'Content-Type': 'application/json'},
        body: jsonEncode({
          'nif_gabon': nifGabon,
          'raison_sociale': raisonSociale,
          'secteur': secteur,
          'province': province,
          'ville': ville,
          if (contactEmail != null) 'contact_email': contactEmail,
          if (contactTelephone != null) 'contact_telephone': contactTelephone,
        }),
      );
      if (response.statusCode != 201) {
        throw Exception('Enregistrement echoue: ${response.body}');
      }
      return OperateurIndustriel.fromJson(
          jsonDecode(response.body) as Map<String, dynamic>);
    } catch (e) {
      if (_strictBackend) rethrow;
      // Mode démo : retourne un opérateur fictif avec les données saisies
      return OperateurIndustriel(
        id: 'OPI-DEMO-${DateTime.now().millisecondsSinceEpoch}',
        nifGabon: nifGabon,
        raisonSociale: raisonSociale,
        secteur: secteur,
        province: province,
        ville: ville,
        contactEmail: contactEmail,
        contactTelephone: contactTelephone,
        dateCreation: DateTime.now(),
        nombreAtiTotal: 0,
        nombreAtiActifs: 0,
        statutConformite: 'en_attente',
      );
    }
  }

  Future<void> updateATIStatut({
    required String atiId,
    required String newStatut,
    String? note,
  }) async {
    try {
      await _ensureToken();
      final response = await _client.patch(
        Uri.parse('$_backendUrl/pnpi/ati/$atiId/statut'),
        headers: {..._authHeaders, 'Content-Type': 'application/json'},
        body: jsonEncode({'new_statut': newStatut, 'note': note}),
      );
      if (response.statusCode != 200) throw Exception('Erreur');
    } catch (_) {
      if (_strictBackend) rethrow;
      // Demo mode: succeed silently — UI will reload from MockData
    }
  }

  Future<List<ATITransition>> fetchATIHistory(String atiId) async {
    try {
      await _ensureToken();
      final response = await _client.get(
        Uri.parse('$_backendUrl/pnpi/ati/$atiId/historique'),
        headers: _authHeaders,
      );
      if (response.statusCode != 200) throw Exception('Erreur');
      return (jsonDecode(response.body) as List<dynamic>)
          .map((e) => ATITransition.fromJson(e as Map<String, dynamic>))
          .toList();
    } catch (_) {
      if (_strictBackend) rethrow;
      final list = MockData.atiTransitions
          .where((t) => t.atiId == atiId)
          .toList()
        ..sort((a, b) => a.changedAt.compareTo(b.changedAt));
      return list;
    }
  }

  Future<List<InspectionConformite>> fetchInspections({
    String? statutConformite,
    String? secteur,
    String? province,
    String? operateurId,
  }) async {
    try {
      await _ensureToken();
      final query = <String, String>{};
      if (statutConformite != null) query['statut_conformite'] = statutConformite;
      if (secteur != null) query['secteur'] = secteur;
      if (province != null) query['province'] = province;
      if (operateurId != null) query['operateur_id'] = operateurId;
      final uri = Uri.parse('$_backendUrl/pnpi/inspections')
          .replace(queryParameters: query.isEmpty ? null : query);
      final response = await _client.get(uri, headers: _authHeaders);
      if (response.statusCode != 200) throw Exception('Erreur');
      return (jsonDecode(response.body) as List<dynamic>)
          .map((e) => InspectionConformite.fromJson(e as Map<String, dynamic>))
          .toList();
    } catch (_) {
      if (_strictBackend) rethrow;
      var list = MockData.inspections;
      if (statutConformite != null) {
        list = list.where((i) => i.statutConformite == statutConformite).toList();
      }
      if (secteur != null) {
        list = list.where((i) => i.secteur == secteur).toList();
      }
      if (province != null) {
        list = list.where((i) => i.province == province).toList();
      }
      if (operateurId != null) {
        list = list.where((i) => i.operateurId == operateurId).toList();
      }
      return list;
    }
  }

  Future<InspectionConformite> createInspection({
    required String operateurId,
    String? atiId,
    required String statutConformite,
    required String observations,
    String? mesuresCorrectives,
    required String province,
    required String secteur,
    double? latitude,
    double? longitude,
  }) async {
    try {
      await _ensureToken();
      final response = await _client.post(
        Uri.parse('$_backendUrl/pnpi/inspections'),
        headers: {..._authHeaders, 'Content-Type': 'application/json'},
        body: jsonEncode({
          'operateur_id': operateurId,
          if (atiId != null) 'ati_id': atiId,
          'statut_conformite': statutConformite,
          'observations': observations,
          if (mesuresCorrectives != null)
            'mesures_correctives': mesuresCorrectives,
          'province': province,
          'secteur': secteur,
          if (latitude != null) 'latitude': latitude,
          if (longitude != null) 'longitude': longitude,
        }),
      );
      if (response.statusCode != 201) {
        throw Exception('Enregistrement inspection echoue: ${response.body}');
      }
      return InspectionConformite.fromJson(
          jsonDecode(response.body) as Map<String, dynamic>);
    } catch (e) {
      if (_strictBackend) rethrow;
      // Fallback démo
      final op = MockData.operateurs.firstWhere(
        (o) => o.id == operateurId,
        orElse: () => MockData.operateurs.first,
      );
      return InspectionConformite(
        id: 'INS-DEMO-${DateTime.now().millisecondsSinceEpoch}',
        operateurId: operateurId,
        operateurNom: op.raisonSociale,
        atiId: atiId,
        atiNumero: atiId,
        inspecteurId: 'USR-DEMO',
        inspecteurNom: _profile?.fullName ?? 'Inspecteur Démo',
        dateInspection: DateTime.now(),
        statutConformite: statutConformite,
        observations: observations,
        mesuresCorrectives: mesuresCorrectives,
        latitude: latitude,
        longitude: longitude,
        province: province,
        secteur: secteur,
      );
    }
  }

  // ─── PNPI Dashboard endpoints ─────────────────────────────────────────────

  Future<PNPIDashboardKpis> fetchPNPIDashboardKpis() async {
    if (_demoMode) return PNPIDashboardKpis.demo();
    final response = await _client.get(
      Uri.parse('$_backendUrl/pnpi/dashboard/kpis'),
      headers: _authHeaders,
    );
    if (response.statusCode == 200) {
      return PNPIDashboardKpis.fromJson(
          jsonDecode(response.body) as Map<String, dynamic>);
    }
    throw Exception('fetchPNPIDashboardKpis: ${response.statusCode}');
  }

  Future<List<MensuelStats>> fetchPNPITendances() async {
    if (_demoMode) return MensuelStats.demoList();
    final response = await _client.get(
      Uri.parse('$_backendUrl/pnpi/dashboard/tendances'),
      headers: _authHeaders,
    );
    if (response.statusCode == 200) {
      return (jsonDecode(response.body) as List<dynamic>)
          .map((e) => MensuelStats.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    throw Exception('fetchPNPITendances: ${response.statusCode}');
  }

  Future<void> openLocalFile(String path) async {
    if (Platform.isWindows) {
      await Process.start('cmd', ['/c', 'start', '', path], runInShell: true);
      return;
    }
    if (Platform.isMacOS) {
      await Process.start('open', [path], runInShell: true);
      return;
    }
    if (Platform.isLinux) {
      await Process.start('xdg-open', [path], runInShell: true);
      return;
    }
    throw Exception('Ouverture fichier non supportee sur cette plateforme');
  }
}

// ─── PNPI Dashboard models ─────────────────────────────────────────────────

class PNPIDashboardKpis {
  final int atisTotal;
  final int atisEnCours;
  final int atisApprouvesCeMois;
  final int atisEnRetard;
  final double delaiMoyenJours;
  final double tauxSlaPct;
  final int operateursActifs;
  final double tauxConformitePct;
  final DateTime generatedAt;

  const PNPIDashboardKpis({
    required this.atisTotal,
    required this.atisEnCours,
    required this.atisApprouvesCeMois,
    required this.atisEnRetard,
    required this.delaiMoyenJours,
    required this.tauxSlaPct,
    required this.operateursActifs,
    required this.tauxConformitePct,
    required this.generatedAt,
  });

  factory PNPIDashboardKpis.fromJson(Map<String, dynamic> json) =>
      PNPIDashboardKpis(
        atisTotal: json['atis_total'] as int,
        atisEnCours: json['atis_en_cours'] as int,
        atisApprouvesCeMois: json['atis_approuves_ce_mois'] as int,
        atisEnRetard: json['atis_en_retard'] as int,
        delaiMoyenJours: (json['delai_moyen_jours'] as num).toDouble(),
        tauxSlaPct: (json['taux_sla_pct'] as num).toDouble(),
        operateursActifs: json['operateurs_actifs'] as int,
        tauxConformitePct: (json['taux_conformite_pct'] as num).toDouble(),
        generatedAt: DateTime.parse(json['generated_at'] as String),
      );

  factory PNPIDashboardKpis.demo() => PNPIDashboardKpis(
        atisTotal: 30,
        atisEnCours: 16,
        atisApprouvesCeMois: 3,
        atisEnRetard: 2,
        delaiMoyenJours: 29.0,
        tauxSlaPct: 72.73,
        operateursActifs: 20,
        tauxConformitePct: 40.0,
        generatedAt: DateTime.now(),
      );
}

class MensuelStats {
  final String mois;
  final int nbSoumis;
  final int nbApprouves;
  final int nbRejetes;

  const MensuelStats({
    required this.mois,
    required this.nbSoumis,
    required this.nbApprouves,
    required this.nbRejetes,
  });

  factory MensuelStats.fromJson(Map<String, dynamic> json) => MensuelStats(
        mois: json['mois'] as String,
        nbSoumis: json['nb_soumis'] as int,
        nbApprouves: json['nb_approuves'] as int,
        nbRejetes: json['nb_rejetes'] as int,
      );

  static List<MensuelStats> demoList() => [
        MensuelStats(mois: '2025-09', nbSoumis: 2, nbApprouves: 1, nbRejetes: 0),
        MensuelStats(mois: '2025-10', nbSoumis: 4, nbApprouves: 2, nbRejetes: 1),
        MensuelStats(mois: '2025-11', nbSoumis: 5, nbApprouves: 3, nbRejetes: 0),
        MensuelStats(mois: '2025-12', nbSoumis: 6, nbApprouves: 3, nbRejetes: 1),
        MensuelStats(mois: '2026-01', nbSoumis: 7, nbApprouves: 4, nbRejetes: 1),
        MensuelStats(mois: '2026-02', nbSoumis: 6, nbApprouves: 3, nbRejetes: 0),
      ];
}
