import 'package:flutter/material.dart';

import '../services/api_service.dart';
import '../theme/pnpi_theme.dart';

class GovernanceScreen extends StatefulWidget {
  const GovernanceScreen({super.key});

  @override
  State<GovernanceScreen> createState() => _GovernanceScreenState();
}

class _GovernanceScreenState extends State<GovernanceScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabCtrl;
  late Future<_GovernanceData> _future;

  // Audit filters
  String _auditQuery = '';
  String _auditActionFilter = 'all';

  // Notification filters
  bool _onlyUnread = false;
  String _severityFilter = 'all';

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 2, vsync: this);
    _future = _load();
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    super.dispose();
  }

  Future<_GovernanceData> _load() async {
    final profile = await ApiService.instance.fetchCurrentUser();
    final notifications = await ApiService.instance.fetchNotifications();
    final events = await ApiService.instance.fetchAuditEvents();
    return _GovernanceData(
      profile: profile,
      notifications: notifications,
      auditEvents: events,
    );
  }

  Future<void> _refresh() async {
    final data = await _load();
    if (!mounted) return;
    setState(() => _future = Future.value(data));
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<_GovernanceData>(
      future: _future,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const Center(child: CircularProgressIndicator());
        }
        if (!snapshot.hasData) {
          return Center(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Text(
                'Impossible de charger la gouvernance.\n'
                '${snapshot.error ?? "Erreur inconnue"}',
                textAlign: TextAlign.center,
              ),
            ),
          );
        }

        final data = snapshot.data!;
        final unreadCount = data.notifications.where((n) => !n.isRead).length;
        final criticalCount = data.notifications
            .where((n) => n.severity == 'critical' && !n.isRead)
            .length;
        final atiCount = data.auditEvents
            .where((e) => e.action.startsWith('ATI_'))
            .length;

        return RefreshIndicator(
          onRefresh: _refresh,
          child: Column(
            children: [
              // ── KPI band ──────────────────────────────────────────────
              Container(
                padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
                color: PnpiColors.deepSpace,
                child: Row(
                  children: [
                    _kpi('Non lues', '$unreadCount', Colors.amber),
                    _kpi('Critiques', '$criticalCount', Colors.red.shade400),
                    _kpi('Audit', '${data.auditEvents.length}', PnpiColors.lagoon),
                    _kpi('Actions ATI', '$atiCount', Colors.purple.shade300),
                  ],
                ),
              ),

              // ── Session info bar ───────────────────────────────────────
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                color: colorWithOpacity(PnpiColors.deepSpace, 0.9),
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 14,
                      backgroundColor: PnpiColors.lagoon,
                      child: Text(
                        _initials(data.profile.fullName),
                        style: const TextStyle(
                            color: Colors.white,
                            fontSize: 10,
                            fontWeight: FontWeight.w700),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        data.profile.fullName,
                        style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w600,
                            fontSize: 13),
                      ),
                    ),
                    ...data.profile.roles.map((r) => Container(
                          margin: const EdgeInsets.only(left: 4),
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: colorWithOpacity(_roleColor(r), 0.25),
                            borderRadius: BorderRadius.circular(99),
                            border: Border.all(
                                color: colorWithOpacity(_roleColor(r), 0.6)),
                          ),
                          child: Text(
                            r,
                            style: TextStyle(
                                color: _roleColor(r),
                                fontSize: 11,
                                fontWeight: FontWeight.w700),
                          ),
                        )),
                  ],
                ),
              ),

              // ── TabBar ────────────────────────────────────────────────
              Container(
                color: Colors.white,
                child: TabBar(
                  controller: _tabCtrl,
                  labelColor: PnpiColors.lagoon,
                  unselectedLabelColor: Colors.black45,
                  indicatorColor: PnpiColors.lagoon,
                  tabs: [
                    Tab(
                      icon: Badge(
                        isLabelVisible: unreadCount > 0,
                        label: Text('$unreadCount'),
                        child: const Icon(Icons.notifications_outlined, size: 20),
                      ),
                      text: 'Notifications',
                    ),
                    const Tab(
                      icon: Icon(Icons.history_rounded, size: 20),
                      text: 'Journal d\'audit',
                    ),
                  ],
                ),
              ),

              // ── Tab content ────────────────────────────────────────────
              Expanded(
                child: TabBarView(
                  controller: _tabCtrl,
                  children: [
                    _buildNotificationsTab(data),
                    _buildAuditTab(data),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  // ── Notifications tab ──────────────────────────────────────────────────

  Widget _buildNotificationsTab(_GovernanceData data) {
    final filtered = data.notifications.where((n) {
      if (_onlyUnread && n.isRead) return false;
      if (_severityFilter != 'all' && n.severity != _severityFilter) return false;
      return true;
    }).toList();

    return Column(
      children: [
        // Filters
        Container(
          color: const Color(0xFFF5F7FA),
          padding: const EdgeInsets.fromLTRB(14, 10, 14, 6),
          child: Row(
            children: [
              // Unread toggle
              FilterChip(
                label: const Text('Non lues'),
                selected: _onlyUnread,
                onSelected: (v) => setState(() => _onlyUnread = v),
                selectedColor: colorWithOpacity(PnpiColors.lagoon, 0.15),
                checkmarkColor: PnpiColors.lagoon,
                labelStyle: TextStyle(
                    color: _onlyUnread ? PnpiColors.lagoon : Colors.black54,
                    fontSize: 12),
                visualDensity: VisualDensity.compact,
              ),
              const SizedBox(width: 8),
              // Severity filter chips
              ..._severities.map((s) => Padding(
                    padding: const EdgeInsets.only(right: 6),
                    child: ChoiceChip(
                      label: Text(s == 'all' ? 'Toutes' : s),
                      selected: _severityFilter == s,
                      onSelected: (_) => setState(() => _severityFilter = s),
                      selectedColor:
                          colorWithOpacity(_severityColor(s), 0.15),
                      labelStyle: TextStyle(
                          color: _severityFilter == s
                              ? _severityColor(s)
                              : Colors.black54,
                          fontSize: 12),
                      visualDensity: VisualDensity.compact,
                    ),
                  )),
            ],
          ),
        ),
        Expanded(
          child: filtered.isEmpty
              ? _emptyState(
                  Icons.notifications_none_rounded, 'Aucune notification')
              : ListView.builder(
                  padding: const EdgeInsets.fromLTRB(14, 10, 14, 80),
                  itemCount: filtered.length,
                  itemBuilder: (_, i) => _NotifCard(
                    notif: filtered[i],
                    onMarkRead: () async {
                      try {
                        await ApiService.instance
                            .markNotificationRead(filtered[i].id);
                        await _refresh();
                      } catch (_) {}
                    },
                  ),
                ),
        ),
      ],
    );
  }

  // ── Audit tab ──────────────────────────────────────────────────────────

  Widget _buildAuditTab(_GovernanceData data) {
    final actions = <String>{
      'all',
      ...data.auditEvents.map((e) => e.action),
    }.toList()
      ..sort();

    final filtered = data.auditEvents.where((e) {
      if (_auditActionFilter != 'all' && e.action != _auditActionFilter) {
        return false;
      }
      final q = _auditQuery.trim().toLowerCase();
      if (q.isEmpty) return true;
      final hay = '${e.actor} ${e.action} ${e.target ?? ""} ${e.details}'
          .toLowerCase();
      return hay.contains(q);
    }).toList();

    return Column(
      children: [
        // Search + filter
        Container(
          color: const Color(0xFFF5F7FA),
          padding: const EdgeInsets.fromLTRB(14, 10, 14, 8),
          child: Column(
            children: [
              TextField(
                onChanged: (v) => setState(() => _auditQuery = v),
                decoration: InputDecoration(
                  hintText: 'Rechercher acteur, cible, détails…',
                  prefixIcon: const Icon(Icons.search, size: 20),
                  filled: true,
                  fillColor: Colors.white,
                  isDense: true,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide.none,
                  ),
                ),
              ),
              const SizedBox(height: 8),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: actions.map((a) {
                    final safe =
                        actions.contains(_auditActionFilter) ? _auditActionFilter : 'all';
                    return Padding(
                      padding: const EdgeInsets.only(right: 6),
                      child: ChoiceChip(
                        label: Text(a == 'all' ? 'Toutes' : a),
                        selected: safe == a,
                        onSelected: (_) =>
                            setState(() => _auditActionFilter = a),
                        selectedColor:
                            colorWithOpacity(_actionColor(a), 0.15),
                        labelStyle: TextStyle(
                            color: safe == a
                                ? _actionColor(a)
                                : Colors.black54,
                            fontSize: 11),
                        visualDensity: VisualDensity.compact,
                      ),
                    );
                  }).toList(),
                ),
              ),
            ],
          ),
        ),
        // Audit timeline
        Expanded(
          child: filtered.isEmpty
              ? _emptyState(Icons.history_rounded, 'Aucun événement audit')
              : ListView.builder(
                  padding: const EdgeInsets.fromLTRB(14, 10, 14, 80),
                  itemCount: filtered.length,
                  itemBuilder: (_, i) => _AuditEventTile(
                    event: filtered[i],
                    isLast: i == filtered.length - 1,
                  ),
                ),
        ),
      ],
    );
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  static const _severities = ['all', 'critical', 'high', 'medium', 'low'];

  Color _severityColor(String s) => switch (s) {
        'critical' => Colors.red.shade700,
        'high' => Colors.deepOrange,
        'medium' => Colors.amber.shade700,
        'low' => Colors.green.shade700,
        _ => PnpiColors.lagoon,
      };

  Color _actionColor(String a) => switch (a) {
        'ATI_TRANSITION' => Colors.purple.shade700,
        'ATI_CREATED' => Colors.blue.shade700,
        'INSPECTION_CREATED' => Colors.teal.shade700,
        'OPERATEUR_REGISTERED' => Colors.green.shade700,
        'EXPORT' => Colors.indigo.shade700,
        'LOGIN' => Colors.grey.shade700,
        _ => PnpiColors.lagoon,
      };

  Color _roleColor(String r) => switch (r) {
        'admin' => Colors.red.shade700,
        'ministere' => const Color(0xFF005C33),
        'directeur' => PnpiColors.oceanPulse,
        'instructeur' => Colors.teal,
        'inspecteur' => Colors.indigo,
        'industriel' => Colors.deepOrange,
        _ => Colors.grey.shade600,
      };

  Widget _kpi(String label, String value, Color color) => Expanded(
        child: Column(
          children: [
            Text(value,
                style: TextStyle(
                    color: color,
                    fontSize: 22,
                    fontWeight: FontWeight.w800)),
            Text(label,
                style: const TextStyle(
                    color: Colors.white60, fontSize: 11)),
          ],
        ),
      );

  Widget _emptyState(IconData icon, String label) => Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 52, color: Colors.grey.shade300),
            const SizedBox(height: 12),
            Text(label,
                style: TextStyle(
                    color: Colors.grey.shade500,
                    fontWeight: FontWeight.w600)),
          ],
        ),
      );

  String _initials(String name) {
    final parts = name.trim().split(' ');
    if (parts.length >= 2) return '${parts.first[0]}${parts.last[0]}'.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  }
}

// ── Notification card ─────────────────────────────────────────────────────

class _NotifCard extends StatelessWidget {
  final AppNotification notif;
  final VoidCallback onMarkRead;

  const _NotifCard({required this.notif, required this.onMarkRead});

  Color get _color => switch (notif.severity) {
        'critical' => Colors.red.shade700,
        'high' => Colors.deepOrange,
        'medium' => Colors.amber.shade700,
        _ => Colors.green.shade700,
      };

  IconData get _icon => switch (notif.severity) {
        'critical' => Icons.error_rounded,
        'high' => Icons.warning_rounded,
        'medium' => Icons.info_rounded,
        _ => Icons.check_circle_outline_rounded,
      };

  String _formatDate(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 60) return 'Il y a ${diff.inMinutes} min';
    if (diff.inHours < 24) return 'Il y a ${diff.inHours} h';
    if (diff.inDays < 7) return 'Il y a ${diff.inDays} j';
    return '${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')}/${dt.year}';
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: notif.isRead ? Colors.white : colorWithOpacity(_color, 0.06),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: notif.isRead
              ? Colors.grey.shade200
              : colorWithOpacity(_color, 0.35),
          width: 1.3,
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
                color: colorWithOpacity(_color, 0.14),
                shape: BoxShape.circle,
              ),
              child: Icon(_icon, color: _color, size: 19),
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
                          notif.title,
                          style: TextStyle(
                            fontWeight: notif.isRead
                                ? FontWeight.w500
                                : FontWeight.w700,
                            fontSize: 13.5,
                          ),
                        ),
                      ),
                      if (!notif.isRead)
                        Container(
                          width: 8,
                          height: 8,
                          decoration: BoxDecoration(
                              color: _color, shape: BoxShape.circle),
                        ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(notif.message,
                      style: const TextStyle(
                          color: Colors.black87, fontSize: 12.5, height: 1.35)),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: colorWithOpacity(_color, 0.14),
                          borderRadius: BorderRadius.circular(99),
                        ),
                        child: Text(
                          notif.severity.toUpperCase(),
                          style: TextStyle(
                              fontSize: 10,
                              color: _color,
                              fontWeight: FontWeight.w700),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(_formatDate(notif.createdAt),
                          style: const TextStyle(
                              fontSize: 11, color: Colors.black38)),
                      if (notif.targetRole != null) ...[
                        const SizedBox(width: 6),
                        Text('• ${notif.targetRole}',
                            style: const TextStyle(
                                fontSize: 11, color: Colors.black38)),
                      ],
                      const Spacer(),
                      if (!notif.isRead)
                        GestureDetector(
                          onTap: onMarkRead,
                          child: Text(
                            'Marquer lue',
                            style: TextStyle(
                                fontSize: 11,
                                color: _color,
                                fontWeight: FontWeight.w600),
                          ),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Audit event tile ──────────────────────────────────────────────────────

class _AuditEventTile extends StatelessWidget {
  final AuditEvent event;
  final bool isLast;

  const _AuditEventTile({required this.event, required this.isLast});

  Color get _color => switch (event.action) {
        'ATI_TRANSITION' => Colors.purple.shade700,
        'ATI_CREATED' => Colors.blue.shade700,
        'INSPECTION_CREATED' => Colors.teal.shade700,
        'OPERATEUR_REGISTERED' => Colors.green.shade700,
        'EXPORT' => Colors.indigo.shade700,
        'LOGIN' => Colors.grey.shade600,
        _ => PnpiColors.lagoon,
      };

  IconData get _icon => switch (event.action) {
        'ATI_TRANSITION' => Icons.swap_horiz_rounded,
        'ATI_CREATED' => Icons.add_circle_outline_rounded,
        'INSPECTION_CREATED' => Icons.fact_check_rounded,
        'OPERATEUR_REGISTERED' => Icons.business_rounded,
        'EXPORT' => Icons.file_download_outlined,
        'LOGIN' => Icons.login_rounded,
        _ => Icons.history_rounded,
      };

  String _label(String action) => switch (action) {
        'ATI_TRANSITION' => 'Transition ATI',
        'ATI_CREATED' => 'ATI soumis',
        'INSPECTION_CREATED' => 'Inspection créée',
        'OPERATEUR_REGISTERED' => 'Opérateur enregistré',
        'EXPORT' => 'Export',
        'LOGIN' => 'Connexion',
        _ => action,
      };

  String _formatDate(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 60) return 'Il y a ${diff.inMinutes} min';
    if (diff.inHours < 24) return 'Il y a ${diff.inHours} h';
    if (diff.inDays < 7) return 'Il y a ${diff.inDays} j';
    return '${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')}/${dt.year}';
  }

  @override
  Widget build(BuildContext context) {
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Timeline spine
          SizedBox(
            width: 40,
            child: Column(
              children: [
                Container(
                  width: 34,
                  height: 34,
                  decoration: BoxDecoration(
                    color: colorWithOpacity(_color, 0.12),
                    shape: BoxShape.circle,
                    border: Border.all(color: colorWithOpacity(_color, 0.5)),
                  ),
                  child: Icon(_icon, color: _color, size: 17),
                ),
                if (!isLast)
                  Expanded(
                    child: Container(
                      width: 1.5,
                      color: Colors.grey.shade200,
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          // Content
          Expanded(
            child: Container(
              margin: EdgeInsets.only(bottom: isLast ? 0 : 12),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                boxShadow: PnpiTheme.softShadows,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: colorWithOpacity(_color, 0.12),
                          borderRadius: BorderRadius.circular(99),
                        ),
                        child: Text(
                          _label(event.action),
                          style: TextStyle(
                              fontSize: 11,
                              color: _color,
                              fontWeight: FontWeight.w700),
                        ),
                      ),
                      const Spacer(),
                      Text(
                        _formatDate(event.timestamp),
                        style: const TextStyle(
                            fontSize: 11, color: Colors.black38),
                      ),
                    ],
                  ),
                  if (event.target != null) ...[
                    const SizedBox(height: 5),
                    Row(
                      children: [
                        const Icon(Icons.label_outline,
                            size: 13, color: Colors.black38),
                        const SizedBox(width: 4),
                        Text(
                          event.target!,
                          style: const TextStyle(
                              fontWeight: FontWeight.w700,
                              fontSize: 13,
                              color: Colors.black87),
                        ),
                      ],
                    ),
                  ],
                  const SizedBox(height: 5),
                  Text(
                    event.details,
                    style: const TextStyle(
                        fontSize: 12.5,
                        color: Colors.black54,
                        height: 1.4),
                  ),
                  const SizedBox(height: 5),
                  Row(
                    children: [
                      const Icon(Icons.person_outline,
                          size: 13, color: Colors.black38),
                      const SizedBox(width: 4),
                      Text(
                        event.actor,
                        style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: Colors.black54),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _GovernanceData {
  final AuthUserProfile profile;
  final List<AppNotification> notifications;
  final List<AuditEvent> auditEvents;

  const _GovernanceData({
    required this.profile,
    required this.notifications,
    required this.auditEvents,
  });
}
