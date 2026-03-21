import 'package:flutter/material.dart';

enum ToastType { success, error, warning, info }

class PnpiToast {
  static void show(BuildContext context, {
    required String message,
    ToastType type = ToastType.info,
    Duration duration = const Duration(seconds: 3),
  }) {
    final overlay = Overlay.of(context);
    late OverlayEntry entry;

    final color = switch (type) {
      ToastType.success => const Color(0xFF006233),
      ToastType.error => const Color(0xFFB42318),
      ToastType.warning => const Color(0xFFF2B800),
      ToastType.info => const Color(0xFF0C7EB4),
    };

    final icon = switch (type) {
      ToastType.success => Icons.check_circle_rounded,
      ToastType.error => Icons.error_rounded,
      ToastType.warning => Icons.warning_rounded,
      ToastType.info => Icons.info_rounded,
    };

    entry = OverlayEntry(
      builder: (context) => _ToastWidget(
        message: message,
        color: color,
        icon: icon,
        onDismiss: () => entry.remove(),
        duration: duration,
      ),
    );

    overlay.insert(entry);
  }
}

class _ToastWidget extends StatefulWidget {
  final String message;
  final Color color;
  final IconData icon;
  final VoidCallback onDismiss;
  final Duration duration;

  const _ToastWidget({
    required this.message,
    required this.color,
    required this.icon,
    required this.onDismiss,
    required this.duration,
  });

  @override
  State<_ToastWidget> createState() => _ToastWidgetState();
}

class _ToastWidgetState extends State<_ToastWidget> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _fadeAnimation;
  late Animation<Offset> _slideAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: const Duration(milliseconds: 300));
    _fadeAnimation = CurvedAnimation(parent: _controller, curve: Curves.easeOutCubic);
    _slideAnimation = Tween<Offset>(begin: const Offset(0, -1), end: Offset.zero)
        .animate(CurvedAnimation(parent: _controller, curve: Curves.easeOutCubic));
    _controller.forward();
    Future.delayed(widget.duration, _dismiss);
  }

  void _dismiss() {
    if (!mounted) return;
    _controller.reverse().then((_) {
      if (mounted) widget.onDismiss();
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Positioned(
      top: MediaQuery.of(context).padding.top + 12,
      left: 16,
      right: 16,
      child: SlideTransition(
        position: _slideAnimation,
        child: FadeTransition(
          opacity: _fadeAnimation,
          child: Material(
            color: Colors.transparent,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              decoration: BoxDecoration(
                color: widget.color,
                borderRadius: BorderRadius.circular(14),
                boxShadow: const [
                  BoxShadow(color: Color(0x30000000), blurRadius: 16, offset: Offset(0, 8)),
                ],
              ),
              child: Row(
                children: [
                  Icon(widget.icon, color: Colors.white, size: 22),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(widget.message, style: const TextStyle(
                      color: Colors.white, fontSize: 14, fontWeight: FontWeight.w600,
                    )),
                  ),
                  GestureDetector(
                    onTap: _dismiss,
                    child: const Icon(Icons.close_rounded, color: Colors.white70, size: 20),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
