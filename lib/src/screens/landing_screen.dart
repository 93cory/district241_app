import 'package:flutter/material.dart';

import '../services/api_service.dart';
import '../theme/pnpi_theme.dart';
import '../widgets/pnpi_branding.dart';
import 'ati_screen.dart';
import 'briefing_screen.dart';
import 'dashboard_screen.dart';
import 'industriel_dashboard_screen.dart';
import 'inspection_conformite_screen.dart';
import 'governance_screen.dart';
import 'inspectors_screen.dart';
import 'map_screen.dart';
import 'notifications_screen.dart';
import 'operateurs_screen.dart';
import 'pilotage_workflow_screen.dart';
import 'pnpi_dashboard_screen.dart';
import 'profile_screen.dart';
import 'qr_scanner_screen.dart';
import 'traceability_screen.dart';
import 'units_screen.dart';

class LandingScreen extends StatefulWidget {
  final AuthUserProfile profile;

  const LandingScreen({
    super.key,
    required this.profile,
  });

  @override
  State<LandingScreen> createState() => _LandingScreenState();
}

class _LandingScreenState extends State<LandingScreen> {
  late final List<_AppTab> _tabs = _buildTabs(widget.profile);
  late int _currentIndex = _defaultIndexFor(widget.profile, _tabs);
  int _unreadNotifications = 0;

  @override
  void initState() {
    super.initState();
    _refreshUnreadCount();
  }

  Future<void> _refreshUnreadCount() async {
    try {
      final list = await ApiService.instance.fetchNotifications();
      if (!mounted) return;
      setState(() {
        _unreadNotifications = list.where((n) => !n.isRead).length;
      });
    } catch (_) {}
  }

  void _openNotifications() async {
    await Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const NotificationsScreen()),
    );
    _refreshUnreadCount();
  }

  void _openProfile() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => ProfileScreen(profile: widget.profile),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final currentTab = _tabs[_currentIndex];
    return Scaffold(
      extendBody: true,
      appBar: AppBar(
        leadingWidth: 58,
        leading: const Padding(
          padding: EdgeInsets.only(left: 10, top: 8, bottom: 8),
          child: PnpiLogoMark(size: 32),
        ),
        title: Text(currentTab.title),
        flexibleSpace: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [
                Color(0xFF005C33),
                Color(0xFFF2CD1B),
                Color(0xFF0044A8),
              ],
            ),
          ),
        ),
        actions: [
          // Notifications bell with unread badge
          Stack(
            clipBehavior: Clip.none,
            children: [
              IconButton(
                tooltip: 'Notifications',
                onPressed: _openNotifications,
                icon: const Icon(Icons.notifications_outlined),
              ),
              if (_unreadNotifications > 0)
                Positioned(
                  top: 6,
                  right: 6,
                  child: Container(
                    padding: const EdgeInsets.all(3),
                    constraints:
                        const BoxConstraints(minWidth: 18, minHeight: 18),
                    decoration: const BoxDecoration(
                      color: Colors.redAccent,
                      shape: BoxShape.circle,
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      _unreadNotifications > 9
                          ? '9+'
                          : '$_unreadNotifications',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ),
            ],
          ),
          // Profile icon
          IconButton(
            tooltip: 'Mon profil',
            onPressed: _openProfile,
            icon: CircleAvatar(
              radius: 13,
              backgroundColor: Colors.white30,
              child: Text(
                _initials(widget.profile.fullName),
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ),
          IconButton(
            tooltip: 'Scanner QR',
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const QrScannerScreen()),
              );
            },
            icon: const Icon(Icons.qr_code_scanner_rounded),
          ),
          IconButton(
            tooltip: 'Briefing',
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const BriefingScreen()),
              );
            },
            icon: const Icon(Icons.assessment_outlined),
          ),
        ],
      ),
      body: SafeArea(
        child: AnimatedSwitcher(
          duration: PnpiTheme.motionMedium,
          switchInCurve: Curves.easeOutCubic,
          switchOutCurve: Curves.easeInCubic,
          child: KeyedSubtree(
            key: ValueKey<String>(currentTab.key),
            child: currentTab.page,
          ),
        ),
      ),
      bottomNavigationBar: Container(
        margin: const EdgeInsets.fromLTRB(12, 0, 12, 12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          boxShadow: PnpiTheme.softShadows,
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(18),
          child: BottomNavigationBar(
            currentIndex: _currentIndex,
            onTap: (index) => setState(() => _currentIndex = index),
            type: BottomNavigationBarType.fixed,
            selectedItemColor: PnpiColors.lagoon,
            unselectedItemColor: const Color(0xFF5D6674),
            backgroundColor: Colors.white,
            items: _tabs
                .map(
                  (tab) => BottomNavigationBarItem(
                    icon: Icon(tab.icon),
                    label: tab.navLabel,
                  ),
                )
                .toList(),
          ),
        ),
      ),
    );
  }
}

String _initials(String fullName) {
  final parts = fullName.trim().split(' ');
  if (parts.length >= 2) {
    return '${parts.first[0]}${parts.last[0]}'.toUpperCase();
  }
  return fullName.substring(0, 2).toUpperCase();
}

List<_AppTab> _buildTabs(AuthUserProfile profile) {
  final roles = profile.roles.toSet();
  final isAdmin = roles.contains('admin');
  final isMinistre = roles.contains('ministre');
  final isDirecteur = roles.contains('directeur');
  final isInstructeur = roles.contains('instructeur');
  final isInspecteur = roles.contains('inspecteur');
  final isOperateur = roles.contains('operateur');

  final tabs = <_AppTab>[];

  void addTab(_AppTab tab) {
    if (!tabs.any((entry) => entry.key == tab.key)) {
      tabs.add(tab);
    }
  }

  if (isAdmin) {
    addTab(
      const _AppTab(
        key: 'pnpi',
        title: 'Tableau PNPI',
        navLabel: 'PNPI',
        icon: Icons.insights_rounded,
        page: PNPIDashboardScreen(),
      ),
    );
    addTab(
      const _AppTab(
        key: 'ati',
        title: 'Agréments Techniques (ATI)',
        navLabel: 'ATI',
        icon: Icons.approval_rounded,
        page: ATIScreen(),
      ),
    );
    addTab(
      const _AppTab(
        key: 'operateurs',
        title: 'Opérateurs Industriels',
        navLabel: 'Opérateurs',
        icon: Icons.business_rounded,
        page: OperateursScreen(),
      ),
    );
    addTab(
      const _AppTab(
        key: 'audit',
        title: 'Gouvernance',
        navLabel: 'Audit',
        icon: Icons.policy_rounded,
        page: GovernanceScreen(),
      ),
    );
    addTab(
      const _AppTab(
        key: 'carte',
        title: 'Carte des Sites Industriels',
        navLabel: 'Carte',
        icon: Icons.map_rounded,
        page: MapScreen(),
      ),
    );
  }

  if (isDirecteur) {
    addTab(
      const _AppTab(
        key: 'pnpi',
        title: 'Tableau PNPI',
        navLabel: 'PNPI',
        icon: Icons.insights_rounded,
        page: PNPIDashboardScreen(),
      ),
    );
    addTab(
      const _AppTab(
        key: 'ati',
        title: 'Agréments Techniques (ATI)',
        navLabel: 'ATI',
        icon: Icons.approval_rounded,
        page: ATIScreen(),
      ),
    );
    addTab(
      const _AppTab(
        key: 'operateurs',
        title: 'Opérateurs Industriels',
        navLabel: 'Opérateurs',
        icon: Icons.business_rounded,
        page: OperateursScreen(),
      ),
    );
    addTab(
      const _AppTab(
        key: 'conformite',
        title: 'Inspections de Conformité',
        navLabel: 'Conformité',
        icon: Icons.fact_check_rounded,
        page: InspectionConformiteScreen(),
      ),
    );
    addTab(
      const _AppTab(
        key: 'audit',
        title: 'Gouvernance',
        navLabel: 'Audit',
        icon: Icons.policy_rounded,
        page: GovernanceScreen(),
      ),
    );
  }

  if (isInstructeur) {
    addTab(
      const _AppTab(
        key: 'ati',
        title: 'Agréments Techniques (ATI)',
        navLabel: 'ATI',
        icon: Icons.approval_rounded,
        page: ATIScreen(),
      ),
    );
    addTab(
      const _AppTab(
        key: 'operateurs',
        title: 'Opérateurs Industriels',
        navLabel: 'Opérateurs',
        icon: Icons.business_rounded,
        page: OperateursScreen(),
      ),
    );
    addTab(
      const _AppTab(
        key: 'carte',
        title: 'Carte des Sites Industriels',
        navLabel: 'Carte',
        icon: Icons.map_rounded,
        page: MapScreen(),
      ),
    );
  }

  if (isInspecteur) {
    addTab(
      const _AppTab(
        key: 'terrain',
        title: 'Inspecteurs Terrain',
        navLabel: 'Terrain',
        icon: Icons.shield_rounded,
        page: InspectorsScreen(),
      ),
    );
    addTab(
      const _AppTab(
        key: 'conformite',
        title: 'Inspections de Conformité',
        navLabel: 'Conformité',
        icon: Icons.fact_check_rounded,
        page: InspectionConformiteScreen(),
      ),
    );
    addTab(
      const _AppTab(
        key: 'ati',
        title: 'Agréments Techniques (ATI)',
        navLabel: 'ATI',
        icon: Icons.approval_rounded,
        page: ATIScreen(),
      ),
    );
    addTab(
      const _AppTab(
        key: 'carte',
        title: 'Carte des Sites Industriels',
        navLabel: 'Carte',
        icon: Icons.map_rounded,
        page: MapScreen(),
      ),
    );
  }

  if (isMinistre) {
    addTab(
      const _AppTab(
        key: 'pnpi',
        title: 'Tableau PNPI',
        navLabel: 'PNPI',
        icon: Icons.insights_rounded,
        page: PNPIDashboardScreen(),
      ),
    );
    addTab(
      const _AppTab(
        key: 'ati',
        title: 'Agréments Techniques (ATI)',
        navLabel: 'ATI',
        icon: Icons.approval_rounded,
        page: ATIScreen(),
      ),
    );
    addTab(
      const _AppTab(
        key: 'operateurs',
        title: 'Opérateurs Industriels',
        navLabel: 'Opérateurs',
        icon: Icons.business_rounded,
        page: OperateursScreen(),
      ),
    );
    addTab(
      const _AppTab(
        key: 'flux',
        title: 'Pilotage Industriel',
        navLabel: 'Flux',
        icon: Icons.account_tree_rounded,
        page: PilotageWorkflowScreen(),
      ),
    );
    addTab(
      const _AppTab(
        key: 'carte',
        title: 'Carte des Sites Industriels',
        navLabel: 'Carte',
        icon: Icons.map_rounded,
        page: MapScreen(),
      ),
    );
    addTab(
      const _AppTab(
        key: 'unites',
        title: 'Unités Industrielles',
        navLabel: 'Unités',
        icon: Icons.factory_rounded,
        page: UnitsScreen(),
      ),
    );
    addTab(
      const _AppTab(
        key: 'lots',
        title: 'Traçabilité',
        navLabel: 'Lots',
        icon: Icons.qr_code_2_rounded,
        page: TraceabilityScreen(),
      ),
    );
    addTab(
      const _AppTab(
        key: 'terrain',
        title: 'Inspecteurs Terrain',
        navLabel: 'Terrain',
        icon: Icons.shield_rounded,
        page: InspectorsScreen(),
      ),
    );
    addTab(
      const _AppTab(
        key: 'audit',
        title: 'Gouvernance',
        navLabel: 'Audit',
        icon: Icons.policy_rounded,
        page: GovernanceScreen(),
      ),
    );
  }

  // ── Rôle opérateur (nouveau PNPI) ────────────────────────────────────────
  if (isOperateur) {
    addTab(
      const _AppTab(
        key: 'mon_dossier',
        title: 'Mon Dossier PNPI',
        navLabel: 'Dossier',
        icon: Icons.folder_special_rounded,
        page: IndustrielDashboardScreen(),
      ),
    );
    addTab(
      const _AppTab(
        key: 'ati',
        title: 'Mes Agréments (ATI)',
        navLabel: 'ATI',
        icon: Icons.approval_rounded,
        page: ATIScreen(),
      ),
    );
    addTab(
      const _AppTab(
        key: 'lots',
        title: 'Traçabilité',
        navLabel: 'Lots',
        icon: Icons.qr_code_2_rounded,
        page: TraceabilityScreen(),
      ),
    );
  }

  if (tabs.isEmpty) {
    tabs.add(
      const _AppTab(
        key: 'dashboard',
        title: 'Tableau de bord ministeriel',
        navLabel: 'Pilotage',
        icon: Icons.dashboard_rounded,
        page: DashboardScreen(),
      ),
    );
  }

  return tabs;
}

int _defaultIndexFor(AuthUserProfile profile, List<_AppTab> tabs) {
  final roles = profile.roles.toSet();

  String preferredKey = 'dashboard';
  if (roles.contains('admin')) {
    preferredKey = 'pnpi';
  } else if (roles.contains('ministre')) {
    preferredKey = 'pnpi';
  } else if (roles.contains('directeur')) {
    preferredKey = 'pnpi';
  } else if (roles.contains('instructeur')) {
    preferredKey = 'ati';
  } else if (roles.contains('inspecteur')) {
    preferredKey = 'terrain';
  } else if (roles.contains('operateur')) {
    preferredKey = 'mon_dossier';
  }

  final index = tabs.indexWhere((tab) => tab.key == preferredKey);
  return index == -1 ? 0 : index;
}

class _AppTab {
  final String key;
  final String title;
  final String navLabel;
  final IconData icon;
  final Widget page;

  const _AppTab({
    required this.key,
    required this.title,
    required this.navLabel,
    required this.icon,
    required this.page,
  });
}
