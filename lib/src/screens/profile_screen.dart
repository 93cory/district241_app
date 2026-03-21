import 'package:flutter/material.dart';

import '../services/api_service.dart';
import '../theme/pnpi_theme.dart';
import '../widgets/pnpi_branding.dart';
import 'login_screen.dart';
import 'two_factor_screen.dart';

class ProfileScreen extends StatelessWidget {
  final AuthUserProfile profile;

  const ProfileScreen({super.key, required this.profile});

  Color _roleColor(String role) => switch (role) {
        'admin' => Colors.red.shade700,
        'ministre' => const Color(0xFFB8860B),
        'directeur' => PnpiColors.oceanPulse,
        'inspecteur' => Colors.indigo,
        'instructeur' => Colors.teal,
        'operateur' => Colors.purple,
        _ => Colors.grey.shade700,
      };

  String _roleLabel(String role) => switch (role) {
        'admin' => 'Administrateur',
        'ministre' => 'Ministre',
        'directeur' => 'Directeur',
        'inspecteur' => 'Inspecteur',
        'instructeur' => 'Instructeur',
        'operateur' => 'Opérateur',
        _ => role,
      };

  String get _initials {
    final parts = profile.fullName.trim().split(' ');
    if (parts.length >= 2) {
      return '${parts.first[0]}${parts.last[0]}'.toUpperCase();
    }
    return profile.fullName.substring(0, 2).toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Mon profil'),
        flexibleSpace: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [Color(0xFF005C33), Color(0xFFF2CD1B), Color(0xFF0044A8)],
            ),
          ),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
        children: [
          _buildAvatarCard(context),
          const SizedBox(height: 18),
          _buildInfoCard(),
          const SizedBox(height: 18),
          _buildRolesCard(),
          const SizedBox(height: 18),
          _buildTwoFactorCard(context),
          const SizedBox(height: 24),
          _buildLogoutButton(context),
          const SizedBox(height: 32),
          const Center(child: PnpiFlagRibbon(height: 5)),
          const SizedBox(height: 10),
          Center(
            child: Text(
              'PNPI — Plateforme Nationale de Suivi Industriel\nRépublique Gabonaise',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 11,
                color: Colors.grey.shade500,
                height: 1.6,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAvatarCard(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: PnpiTheme.heroGradient,
        borderRadius: BorderRadius.circular(24),
        boxShadow: PnpiTheme.softShadows,
      ),
      child: Column(
        children: [
          Container(
            width: 88,
            height: 88,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: Colors.white24,
              border: Border.all(color: Colors.white54, width: 2),
            ),
            alignment: Alignment.center,
            child: Text(
              _initials,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 32,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          const SizedBox(height: 14),
          Text(
            profile.fullName,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 20,
              fontWeight: FontWeight.w700,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 4),
          Text(
            '@${profile.username}',
            style: const TextStyle(color: Colors.white70, fontSize: 14),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoCard() {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: PnpiTheme.softShadows,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Informations du compte',
            style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
          ),
          const SizedBox(height: 14),
          _infoRow(Icons.person_outline, 'Nom complet', profile.fullName),
          const Divider(height: 20),
          _infoRow(Icons.alternate_email, 'Identifiant', '@${profile.username}'),
          const Divider(height: 20),
          _infoRow(
            Icons.verified_user_outlined,
            'Statut',
            'Compte actif',
            valueColor: Colors.green.shade700,
          ),
        ],
      ),
    );
  }

  Widget _infoRow(IconData icon, String label, String value, {Color? valueColor}) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 20, color: PnpiColors.lagoon),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: const TextStyle(fontSize: 12, color: Colors.black54),
              ),
              const SizedBox(height: 2),
              Text(
                value,
                style: TextStyle(
                  fontWeight: FontWeight.w600,
                  color: valueColor ?? Colors.black87,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildRolesCard() {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: PnpiTheme.softShadows,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Roles attribues',
            style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
          ),
          const SizedBox(height: 14),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: profile.roles.map((role) {
              final color = _roleColor(role);
              return Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                decoration: BoxDecoration(
                  color: colorWithOpacity(color, 0.12),
                  borderRadius: BorderRadius.circular(99),
                  border: Border.all(color: colorWithOpacity(color, 0.5)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.shield_outlined, size: 14, color: color),
                    const SizedBox(width: 6),
                    Text(
                      _roleLabel(role),
                      style: TextStyle(
                        color: color,
                        fontWeight: FontWeight.w700,
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildTwoFactorCard(BuildContext context) {
    final bool is2FAEnabled = profile.totpEnabled;

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: PnpiTheme.softShadows,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Securite — Authentification a deux facteurs',
            style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Icon(
                is2FAEnabled ? Icons.verified : Icons.shield_outlined,
                size: 20,
                color: is2FAEnabled ? Colors.green.shade700 : Colors.orange.shade700,
              ),
              const SizedBox(width: 10),
              Text(
                'Statut : ',
                style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: is2FAEnabled
                      ? Colors.green.shade50
                      : Colors.orange.shade50,
                  borderRadius: BorderRadius.circular(99),
                  border: Border.all(
                    color: is2FAEnabled
                        ? Colors.green.shade300
                        : Colors.orange.shade300,
                  ),
                ),
                child: Text(
                  is2FAEnabled ? 'Activee' : 'Desactivee',
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 12,
                    color: is2FAEnabled
                        ? Colors.green.shade700
                        : Colors.orange.shade700,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: () {
                Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => TwoFactorScreen(
                      username: profile.username,
                      apiBaseUrl: const String.fromEnvironment(
                        'PNPI_API_URL',
                        defaultValue: 'http://localhost:8000',
                      ),
                      onVerified: () => Navigator.of(context).pop(),
                      onBack: () => Navigator.of(context).pop(),
                    ),
                  ),
                );
              },
              icon: Icon(
                is2FAEnabled ? Icons.lock_open : Icons.lock_outline,
                size: 18,
              ),
              label: Text(is2FAEnabled ? 'Desactiver la 2FA' : 'Activer la 2FA'),
              style: OutlinedButton.styleFrom(
                foregroundColor:
                    is2FAEnabled ? Colors.red.shade700 : PnpiColors.lagoon,
                side: BorderSide(
                  color: is2FAEnabled
                      ? Colors.red.shade300
                      : PnpiColors.lagoon,
                ),
                padding: const EdgeInsets.symmetric(vertical: 12),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLogoutButton(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton.icon(
        onPressed: () {
          ApiService.instance.logout();
          Navigator.of(context).pushAndRemoveUntil(
            MaterialPageRoute(builder: (_) => const LoginScreen()),
            (_) => false,
          );
        },
        icon: const Icon(Icons.logout),
        label: const Text('Se deconnecter'),
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.red.shade700,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
        ),
      ),
    );
  }
}
