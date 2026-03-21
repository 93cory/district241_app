import 'package:flutter/material.dart';
import '../theme/pnpi_theme.dart';

class ErrorScreen extends StatelessWidget {
  final String title;
  final String message;
  final VoidCallback? onRetry;
  final VoidCallback? onGoHome;

  const ErrorScreen({
    super.key,
    this.title = 'Une erreur est survenue',
    this.message = 'Veuillez reessayer ou contacter l\'administrateur.',
    this.onRetry,
    this.onGoHome,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFF5F5),
                    borderRadius: BorderRadius.circular(24),
                  ),
                  child: const Icon(Icons.error_outline_rounded, size: 56, color: Color(0xFFB42318)),
                ),
                const SizedBox(height: 24),
                Text(title, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700), textAlign: TextAlign.center),
                const SizedBox(height: 8),
                Text(message, style: TextStyle(fontSize: 14, color: Colors.grey.shade600, height: 1.5), textAlign: TextAlign.center),
                const SizedBox(height: 32),
                if (onRetry != null)
                  ElevatedButton.icon(
                    onPressed: onRetry,
                    icon: const Icon(Icons.refresh_rounded),
                    label: const Text('Reessayer'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: PnpiColors.lagoon,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                  ),
                if (onGoHome != null) ...[
                  const SizedBox(height: 12),
                  TextButton(
                    onPressed: onGoHome,
                    child: const Text('Retour a l\'accueil', style: TextStyle(fontWeight: FontWeight.w600)),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
