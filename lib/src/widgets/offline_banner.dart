import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/connectivity_provider.dart';
import '../services/offline_queue.dart';

class OfflineBanner extends StatelessWidget {
  const OfflineBanner({super.key});

  @override
  Widget build(BuildContext context) {
    final isOnline = context.watch<ConnectivityProvider>().isOnline;

    return AnimatedSize(
      duration: const Duration(milliseconds: 250),
      child: isOnline
          ? const SizedBox.shrink()
          : Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              color: const Color(0xFFF2B800),
              child: SafeArea(
                bottom: false,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.wifi_off_rounded, size: 18, color: Color(0xFF1B2635)),
                    const SizedBox(width: 8),
                    Text(
                      OfflineQueue.instance.pendingCount > 0
                          ? 'Connexion perdue — ${OfflineQueue.instance.pendingCount} actions en attente'
                          : 'Connexion perdue — mode hors-ligne',
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF1B2635),
                      ),
                    ),
                  ],
                ),
              ),
            ),
    );
  }
}
