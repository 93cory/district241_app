import 'package:flutter/material.dart';
import '../services/api_service.dart';

class NotificationsProvider extends ChangeNotifier {
  List<AppNotification> _notifications = [];
  bool _isLoading = false;
  int _unreadCount = 0;

  List<AppNotification> get notifications => _notifications;
  bool get isLoading => _isLoading;
  int get unreadCount => _unreadCount;

  Future<void> fetch() async {
    _isLoading = true;
    notifyListeners();
    try {
      _notifications = await ApiService.instance.fetchNotifications();
      _unreadCount = _notifications.where((n) => !n.isRead).length;
    } catch (_) {}
    _isLoading = false;
    notifyListeners();
  }

  Future<void> markAllRead() async {
    for (final n in _notifications.where((n) => !n.isRead)) {
      await ApiService.instance.markNotificationRead(n.id);
    }
    await fetch();
  }

  Future<void> markRead(String id) async {
    await ApiService.instance.markNotificationRead(id);
    final idx = _notifications.indexWhere((n) => n.id == id);
    if (idx >= 0) {
      _unreadCount = (_unreadCount - 1).clamp(0, _notifications.length);
      notifyListeners();
    }
    await fetch();
  }
}
