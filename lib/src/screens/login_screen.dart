import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../services/biometric_service.dart';
import '../theme/pnpi_theme.dart';
import '../widgets/pnpi_branding.dart';
import 'landing_screen.dart';
import 'two_factor_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _usernameCtrl = TextEditingController(text: 'ministre');
  final _passwordCtrl = TextEditingController(text: 'ministre-dev-password');
  bool _busy = false;
  String? _error;
  bool _showDemoRoles = false;
  bool _biometricAvailable = false;
  String _biometricLabel = '';

  // Rôles démo disponibles pour la présentation Ministère
  static const _demoRoles = [
    (role: 'admin', label: 'Admin', icon: Icons.admin_panel_settings_rounded, color: Color(0xFFB71C1C)),
    (role: 'ministre', label: 'Ministre', icon: Icons.account_balance_rounded, color: Color(0xFF005C33)),
    (role: 'directeur', label: 'Directeur', icon: Icons.manage_accounts_rounded, color: Color(0xFF0044A8)),
    (role: 'inspecteur', label: 'Inspecteur', icon: Icons.search_rounded, color: Color(0xFF1A237E)),
    (role: 'instructeur', label: 'Instructeur', icon: Icons.rate_review_rounded, color: Color(0xFF00695C)),
    (role: 'operateur', label: 'Opérateur', icon: Icons.factory_rounded, color: Color(0xFFBF360C)),
  ];

  @override
  void initState() {
    super.initState();
    _checkBiometric();
  }

  Future<void> _checkBiometric() async {
    final available = await BiometricService.instance.isAvailable();
    final enabled = await BiometricService.instance.isEnabled();
    if (available && enabled) {
      final label = await BiometricService.instance.biometricLabel();
      if (mounted) {
        setState(() {
          _biometricAvailable = true;
          _biometricLabel = label;
        });
        // Auto-prompt biometric
        _loginWithBiometric();
      }
    }
  }

  Future<void> _loginWithBiometric() async {
    final success = await BiometricService.instance.authenticate(
      reason: 'Connectez-vous a PNPI',
    );
    if (success && mounted) {
      // Use stored credentials to auto-login
      final prefs = await SharedPreferences.getInstance();
      final username = prefs.getString('last_username') ?? '';
      final token = prefs.getString('auth_token') ?? '';
      if (username.isNotEmpty && token.isNotEmpty) {
        // Fetch profile and navigate to landing screen
        final profile = await ApiService.instance.fetchCurrentUser(forceRefresh: true);
        if (!mounted) return;
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => LandingScreen(profile: profile)),
        );
      }
    }
  }

  Future<void> _signIn() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final authProvider = context.read<AuthProvider>();
      final result = await authProvider.login(
        username: _usernameCtrl.text.trim(),
        password: _passwordCtrl.text,
      );

      if (authProvider.error != null) {
        setState(() => _error = authProvider.error);
        return;
      }

      // If 2FA is required, navigate to the TOTP verification screen.
      if (result != null && result['requires_2fa'] == true) {
        if (!mounted) return;
        final verified = await Navigator.of(context).push<bool>(
          MaterialPageRoute(
            builder: (_) => TwoFactorScreen(
              username: _usernameCtrl.text.trim(),
              apiBaseUrl: '',
              onVerified: () => Navigator.of(context).pop(true),
              onBack: () => Navigator.of(context).pop(false),
            ),
          ),
        );
        if (verified != true || !mounted) return;
      }

      final profile = await ApiService.instance.fetchCurrentUser(forceRefresh: true);
      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => LandingScreen(profile: profile)),
      );
    } catch (error) {
      setState(() => _error = error is Exception ? error.toString() : 'Connexion echouee');
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  void _openDemoMode(String role) {
    ApiService.instance.enableDemoMode(role: role);
    ApiService.instance.fetchCurrentUser(forceRefresh: true).then((profile) {
      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => LandingScreen(profile: profile)),
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    final media = MediaQuery.of(context).size;
    return Scaffold(
      body: Stack(
        children: [
          _AnimatedGabonBackground(size: media),
          Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 460),
              child: Card(
                margin: const EdgeInsets.all(20),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
                child: Padding(
                  padding: const EdgeInsets.all(18),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Center(
                        child: TweenAnimationBuilder<double>(
                          duration: const Duration(milliseconds: 2200),
                          tween: Tween(begin: 0.94, end: 1.0),
                          curve: Curves.easeInOut,
                          builder: (context, value, child) => Transform.scale(scale: value, child: child),
                          child: const PnpiLogoMark(size: 96, showCaption: true),
                        ),
                      ),
                      const SizedBox(height: 12),
                      const PnpiFlagRibbon(height: 7),
                      const SizedBox(height: 14),
                      const Text(
                        'Connexion PNPI',
                        style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(height: 6),
                      const Text(
                        'Accedez au pilotage industriel avec votre role.',
                        style: TextStyle(color: Colors.black54),
                      ),
                      const SizedBox(height: 14),
                      TextField(
                        controller: _usernameCtrl,
                        decoration: const InputDecoration(labelText: 'Utilisateur'),
                      ),
                      const SizedBox(height: 10),
                      TextField(
                        controller: _passwordCtrl,
                        obscureText: true,
                        decoration: const InputDecoration(labelText: 'Mot de passe'),
                      ),
                      if (_error != null) ...[
                        const SizedBox(height: 10),
                        Text(
                          _error!,
                          style: const TextStyle(color: Colors.red),
                        ),
                      ],
                      const SizedBox(height: 16),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton.icon(
                          onPressed: _busy ? null : _signIn,
                          icon: _busy
                              ? const SizedBox(
                                  width: 14,
                                  height: 14,
                                  child: CircularProgressIndicator(strokeWidth: 2),
                                )
                              : const Icon(Icons.login),
                          label: const Text('Se connecter'),
                        ),
                      ),
                      if (_biometricAvailable) ...[
                        const SizedBox(height: 12),
                        OutlinedButton.icon(
                          onPressed: _loginWithBiometric,
                          icon: Icon(
                            _biometricLabel.contains('Face') ? Icons.face_rounded : Icons.fingerprint_rounded,
                            size: 22,
                          ),
                          label: Text('Se connecter avec $_biometricLabel'),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: PnpiColors.lagoon,
                            side: const BorderSide(color: PnpiColors.lagoon),
                            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                          ),
                        ),
                      ],
                      const SizedBox(height: 8),
                      // Démo role picker
                      AnimatedSize(
                        duration: const Duration(milliseconds: 280),
                        curve: Curves.easeOutCubic,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            OutlinedButton.icon(
                              onPressed: _busy
                                  ? null
                                  : () => setState(
                                        () => _showDemoRoles = !_showDemoRoles,
                                      ),
                              icon: Icon(_showDemoRoles
                                  ? Icons.expand_less
                                  : Icons.preview_rounded),
                              label: Text(_showDemoRoles
                                  ? 'Fermer la démo'
                                  : 'Mode démonstration'),
                            ),
                            if (_showDemoRoles) ...[
                              const SizedBox(height: 10),
                              const Text(
                                'Choisissez un rôle pour la démo',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: Colors.black54,
                                ),
                                textAlign: TextAlign.center,
                              ),
                              const SizedBox(height: 8),
                              GridView.count(
                                crossAxisCount: 3,
                                shrinkWrap: true,
                                physics: const NeverScrollableScrollPhysics(),
                                mainAxisSpacing: 8,
                                crossAxisSpacing: 8,
                                childAspectRatio: 1.15,
                                children: _demoRoles.map((entry) {
                                  return _DemoRoleCard(
                                    label: entry.label,
                                    icon: entry.icon,
                                    color: entry.color,
                                    onTap: () => _openDemoMode(entry.role),
                                  );
                                }).toList(),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _DemoRoleCard extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  const _DemoRoleCard({
    required this.label,
    required this.icon,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: colorWithOpacity(color, 0.08),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: colorWithOpacity(color, 0.35)),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: color, size: 26),
            const SizedBox(height: 5),
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                color: color,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

class _AnimatedGabonBackground extends StatefulWidget {
  final Size size;

  const _AnimatedGabonBackground({required this.size});

  @override
  State<_AnimatedGabonBackground> createState() => _AnimatedGabonBackgroundState();
}

class _AnimatedGabonBackgroundState extends State<_AnimatedGabonBackground>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(seconds: 8),
  )..repeat(reverse: true);

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, _) {
        final t = _controller.value;
        return Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment(-1 + t * 0.8, -1),
              end: Alignment(1, 1 - t * 0.6),
              colors: const [
                Color(0xFF005C33),
                Color(0xFFF2CD1B),
                Color(0xFF0044A8),
              ],
            ),
          ),
          child: Stack(
            children: [
              Positioned(
                top: widget.size.height * 0.08,
                left: -80 + (t * 30),
                child: _blurCircle(210, const Color(0x6600A95C)),
              ),
              Positioned(
                bottom: widget.size.height * 0.1,
                right: -60 + (t * 20),
                child: _blurCircle(190, const Color(0x66F4D22A)),
              ),
              Positioned(
                top: widget.size.height * 0.32,
                right: widget.size.width * 0.18,
                child: _blurCircle(160, const Color(0x550061CF)),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _blurCircle(double size, Color color) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: color,
        boxShadow: [
          BoxShadow(
            color: colorWithOpacity(color, 0.8),
            blurRadius: 55,
            spreadRadius: 14,
          ),
        ],
      ),
    );
  }
}
