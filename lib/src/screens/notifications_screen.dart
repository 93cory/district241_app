import 'package:flutter/material.dart';

import '../services/api_service.dart';
import '../theme/pnpi_theme.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  List<AppNotification> _notifications = [];
  bool _loading = true;
  final Set<String> _busyIds = {};

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final list = await ApiService.instance.fetchNotifications();
    if (!mounted) return;
    setState(() {
      _notifications = list;
      _loading = false;
    });
  }

  Future<void> _markRead(AppNotification notif) async {
    if (notif.isRead || _busyIds.contains(notif.id)) return;
    setState(() => _busyIds.add(notif.id));
    try {
      await ApiService.instance.markNotificationRead(notif.id);
      await _load();
    } catch (_) {
    } finally {
      if (mounted) setState(() => _busyIds.remove(notif.id));
    }
  }

  Future<void> _markAllRead() async {
    final unread = _notifications.where((n) => !n.isRead).toList();
    for (final n in unread) {
      try {
        await ApiService.instance.markNotificationRead(n.id);
      } catch (_) {}
    }
    await _load();
  }

  Color _severityColor(String severity) => switch (severity) {
        'critical' => Colors.red.shade700,
        'high' => Colors.deepOrange,
        'medium' => Colors.amber.shade700,
        _ => PnpiColors.oceanPulse,
      };

  IconData _severityIcon(String severity) => switch (severity) {
        'critical' => Icons.error_rounded,
        'high' => Icons.warning_rounded,
        'medium' => Icons.info_rounded,
        _ => Icons.notifications_rounded,
      };

  String _formatDate(DateTime dt) {
    final now = DateTime.now();
    final diff = now.difference(dt);
    if (diff.inMinutes < 60) return 'Il y a ${diff.inMinutes} min';
    if (diff.inHours < 24) return 'Il y a ${diff.inHours} h';
    if (diff.inDays < 7) return 'Il y a ${diff.inDays} j';
    return '${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')}/${dt.year}';
  }

  @override
  Widget build(BuildContext context) {
    final unreadCount = _notifications.where((n) => !n.isRead).length;

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            const Text('Notifications'),
            if (unreadCount > 0) ...[
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: Colors.redAccent,
                  borderRadius: BorderRadius.circular(99),
                ),
                child: Text(
                  '$unreadCount',
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                  ),
                ),
              ),
            ],
          ],
        ),
        flexibleSpace: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [Color(0xFF005C33), Color(0xFFF2CD1B), Color(0xFF0044A8)],
            ),
          ),
        ),
        actions: [
          if (unreadCount > 0)
            Semantics(
              button: true,
              label: 'Marquer toutes les notifications comme lues',
              child: TextButton.icon(
                onPressed: _markAllRead,
                icon: const Icon(Icons.done_all, color: Colors.white),
                label: const Text('Tout lu', style: TextStyle(color: Colors.white)),
              ),
            ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _notifications.isEmpty
              ? _buildEmpty()
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView.builder(
                    padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 14),
                    itemCount: _notifications.length,
                    itemBuilder: (context, index) {
                      final n = _notifications[index];
                      return _buildCard(n);
                    },
                  ),
                ),
    );
  }

  Widget _buildCard(AppNotification n) {
    final color = _severityColor(n.severity);
    final icon = _severityIcon(n.severity);
    final isRead = n.isRead;
    final busy = _busyIds.contains(n.id);

    return Semantics(
      button: !isRead,
      label: '${n.title} — ${n.severity}${isRead ? ', lue' : ', non lue — appuyer pour marquer comme lue'}',
      child: GestureDetector(
      onTap: () => _markRead(n),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 240),
        margin: const EdgeInsets.only(bottom: 10),
        decoration: BoxDecoration(
          color: isRead ? Colors.white : colorWithOpacity(color, 0.07),
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: isRead ? Colors.grey.shade200 : colorWithOpacity(color, 0.4),
            width: 1.4,
          ),
          boxShadow: PnpiTheme.softShadows,
        ),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(9),
                decoration: BoxDecoration(
                  color: colorWithOpacity(color, 0.16),
                  shape: BoxShape.circle,
                ),
                child: busy
                    ? SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2, color: color),
                      )
                    : Icon(icon, color: color, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            n.title,
                            style: TextStyle(
                              fontWeight:
                                  isRead ? FontWeight.w500 : FontWeight.w700,
                              fontSize: 14.5,
                            ),
                          ),
                        ),
                        if (!isRead)
                          Container(
                            width: 9,
                            height: 9,
                            decoration: BoxDecoration(
                              color: color,
                              shape: BoxShape.circle,
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      n.message,
                      style: const TextStyle(color: Colors.black87, height: 1.35),
                    ),
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: colorWithOpacity(color, 0.15),
                            borderRadius: BorderRadius.circular(99),
                          ),
                          child: Text(
                            n.severity.toUpperCase(),
                            style: TextStyle(
                              fontSize: 11,
                              color: color,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          _formatDate(n.createdAt),
                          style: const TextStyle(
                              fontSize: 12, color: Colors.black45),
                        ),
                        if (n.targetRole != null) ...[
                          const SizedBox(width: 8),
                          Text(
                            '• ${n.targetRole}',
                            style: const TextStyle(
                                fontSize: 12, color: Colors.black38),
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
      ),
    );
  }

  Widget _buildEmpty() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.notifications_none_rounded,
              size: 64, color: Colors.grey.shade400),
          const SizedBox(height: 14),
          Text(
            'Aucune notification',
            style: TextStyle(
                fontSize: 16,
                color: Colors.grey.shade600,
                fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 6),
          Text(
            'Vous etes a jour.',
            style: TextStyle(color: Colors.grey.shade500),
          ),
        ],
      ),
    );
  }
}
