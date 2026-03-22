import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'api_service.dart';

class OfflineAction {
  final String id;
  final String type; // 'create_inspection', 'field_report', 'resubmit_ati'
  final Map<String, dynamic> payload;
  final DateTime createdAt;
  int retryCount;

  OfflineAction({
    required this.id,
    required this.type,
    required this.payload,
    required this.createdAt,
    this.retryCount = 0,
  });

  Map<String, dynamic> toJson() => {
    'id': id,
    'type': type,
    'payload': payload,
    'createdAt': createdAt.toIso8601String(),
    'retryCount': retryCount,
  };

  factory OfflineAction.fromJson(Map<String, dynamic> json) => OfflineAction(
    id: json['id'],
    type: json['type'],
    payload: Map<String, dynamic>.from(json['payload']),
    createdAt: DateTime.parse(json['createdAt']),
    retryCount: json['retryCount'] ?? 0,
  );
}

class OfflineQueue {
  static const _storageKey = 'pnpi_offline_queue';
  static final OfflineQueue instance = OfflineQueue._();
  OfflineQueue._();

  List<OfflineAction> _queue = [];
  bool _syncing = false;

  int get pendingCount => _queue.length;
  List<OfflineAction> get pending => List.unmodifiable(_queue);

  Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_storageKey);
    if (raw != null) {
      final list = jsonDecode(raw) as List;
      _queue = list.map((e) => OfflineAction.fromJson(e)).toList();
    }
  }

  Future<void> _save() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_storageKey, jsonEncode(_queue.map((e) => e.toJson()).toList()));
  }

  Future<void> enqueue(OfflineAction action) async {
    _queue.add(action);
    await _save();
  }

  Future<int> syncAll() async {
    if (_syncing || _queue.isEmpty) return 0;
    _syncing = true;
    int synced = 0;
    final toRemove = <String>[];

    for (final action in _queue) {
      try {
        await _executeAction(action);
        toRemove.add(action.id);
        synced++;
      } catch (_) {
        action.retryCount++;
        if (action.retryCount > 5) {
          toRemove.add(action.id); // Give up after 5 retries
        }
      }
    }

    _queue.removeWhere((a) => toRemove.contains(a.id));
    await _save();
    _syncing = false;
    return synced;
  }

  Future<void> _executeAction(OfflineAction action) async {
    switch (action.type) {
      case 'field_report':
        await ApiService.instance.submitFieldReport(
          title: action.payload['title'],
          comment: action.payload['comment'],
          severity: action.payload['severity'],
          unitId: action.payload['unitId'],
          latitude: (action.payload['latitude'] as num?)?.toDouble(),
          longitude: (action.payload['longitude'] as num?)?.toDouble(),
        );
      case 'resubmit_ati':
        await ApiService.instance.resubmitATI(
          action.payload['atiId'],
          observations: action.payload['observations'] ?? '',
        );
      default:
        throw Exception('Unknown action type: ${action.type}');
    }
  }

  Future<void> clear() async {
    _queue.clear();
    await _save();
  }
}
