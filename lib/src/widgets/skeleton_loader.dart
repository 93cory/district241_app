import 'package:flutter/material.dart';

class SkeletonLoader extends StatefulWidget {
  final double width;
  final double height;
  final double borderRadius;

  const SkeletonLoader({
    super.key,
    this.width = double.infinity,
    this.height = 16,
    this.borderRadius = 8,
  });

  @override
  State<SkeletonLoader> createState() => _SkeletonLoaderState();
}

class _SkeletonLoaderState extends State<SkeletonLoader>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return Container(
          width: widget.width,
          height: widget.height,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(widget.borderRadius),
            gradient: LinearGradient(
              begin: Alignment(-1.0 + 2.0 * _controller.value, 0),
              end: Alignment(-1.0 + 2.0 * _controller.value + 1.0, 0),
              colors: const [
                Color(0xFFE8EDF2),
                Color(0xFFF4F7FA),
                Color(0xFFE8EDF2),
              ],
            ),
          ),
        );
      },
    );
  }
}

/// Skeleton for a KPI card
class SkeletonKpiCard extends StatelessWidget {
  const SkeletonKpiCard({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: const [
          BoxShadow(
              color: Color(0x10000000), blurRadius: 12, offset: Offset(0, 4))
        ],
      ),
      child: const Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SkeletonLoader(width: 40, height: 40, borderRadius: 12),
          SizedBox(height: 14),
          SkeletonLoader(width: 100, height: 12),
          SizedBox(height: 8),
          SkeletonLoader(width: 60, height: 24),
        ],
      ),
    );
  }
}

/// Skeleton for a list item
class SkeletonListItem extends StatelessWidget {
  const SkeletonListItem({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        boxShadow: const [
          BoxShadow(
              color: Color(0x08000000), blurRadius: 8, offset: Offset(0, 2))
        ],
      ),
      child: const Row(
        children: [
          SkeletonLoader(width: 44, height: 44, borderRadius: 12),
          SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SkeletonLoader(width: 180, height: 14),
                SizedBox(height: 8),
                SkeletonLoader(width: 120, height: 10),
              ],
            ),
          ),
          SkeletonLoader(width: 60, height: 24, borderRadius: 12),
        ],
      ),
    );
  }
}

/// Skeleton for a dashboard section
class SkeletonDashboard extends StatelessWidget {
  const SkeletonDashboard({super.key});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          // Hero skeleton
          const SkeletonLoader(height: 120, borderRadius: 20),
          const SizedBox(height: 18),
          // KPI grid skeleton
          Row(
            children: List.generate(
                2,
                (_) => const Expanded(
                      child: Padding(
                        padding: EdgeInsets.symmetric(horizontal: 6),
                        child: SkeletonKpiCard(),
                      ),
                    )),
          ),
          const SizedBox(height: 12),
          Row(
            children: List.generate(
                2,
                (_) => const Expanded(
                      child: Padding(
                        padding: EdgeInsets.symmetric(horizontal: 6),
                        child: SkeletonKpiCard(),
                      ),
                    )),
          ),
          const SizedBox(height: 18),
          // Chart skeleton
          const SkeletonLoader(height: 200, borderRadius: 20),
          const SizedBox(height: 18),
          // List items
          ...List.generate(4, (_) => const SkeletonListItem()),
        ],
      ),
    );
  }
}
