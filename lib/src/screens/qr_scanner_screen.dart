import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../models/ati.dart';
import '../models/trace_batch.dart';
import '../services/api_service.dart';

enum _QrKind { ati, batch, unknown }

class QrScannerScreen extends StatefulWidget {
  const QrScannerScreen({super.key});

  @override
  State<QrScannerScreen> createState() => _QrScannerScreenState();
}

class _QrScannerScreenState extends State<QrScannerScreen> {
  final MobileScannerController _controller = MobileScannerController();

  String? _lastValue;
  bool _loading = false;
  TraceBatch? _matchedBatch;
  AgrementTechniqueIndustriel? _matchedAti;
  bool _notFound = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  // ── Detection helpers ──────────────────────────────────────────────────

  _QrKind _detectKind(String raw) {
    final trimmed = raw.trim();
    if (trimmed.toUpperCase().startsWith('ATI-')) return _QrKind.ati;

    final uri = Uri.tryParse(trimmed);
    if (uri != null && uri.pathSegments.isNotEmpty) {
      final last = uri.pathSegments.last;
      if (last.toUpperCase().startsWith('ATI-')) return _QrKind.ati;
    }
    return _QrKind.batch;
  }

  String? _extractAtiNumero(String raw) {
    final trimmed = raw.trim();
    if (trimmed.toUpperCase().startsWith('ATI-')) return trimmed;

    final uri = Uri.tryParse(trimmed);
    if (uri != null && uri.pathSegments.isNotEmpty) {
      final last = uri.pathSegments.last;
      if (last.toUpperCase().startsWith('ATI-')) return last;
    }
    return null;
  }

  String? _extractBatchId(String raw) {
    final trimmed = raw.trim();
    if (trimmed.isEmpty) return null;
    if (trimmed.toUpperCase().startsWith('B')) return trimmed;

    final uri = Uri.tryParse(trimmed);
    if (uri == null || uri.pathSegments.isEmpty) return null;
    return uri.pathSegments.last;
  }

  // ── Scan handler ───────────────────────────────────────────────────────

  Future<void> _onDetect(Barcode barcode) async {
    if (_loading) return;
    final rawValue = barcode.rawValue;
    if (rawValue == null || rawValue.trim().isEmpty) return;

    setState(() {
      _loading = true;
      _lastValue = rawValue;
      _matchedBatch = null;
      _matchedAti = null;
      _notFound = false;
    });
    await _controller.stop();

    switch (_detectKind(rawValue)) {
      case _QrKind.ati:
        await _handleAtiScan(rawValue);
        break;
      case _QrKind.batch:
      case _QrKind.unknown:
        await _handleBatchScan(rawValue);
        break;
    }
  }

  Future<void> _handleAtiScan(String raw) async {
    final numero = _extractAtiNumero(raw);
    if (numero == null) {
      if (mounted) setState(() { _loading = false; _notFound = true; });
      return;
    }
    try {
      final atis = await ApiService.instance.fetchATIs();
      final match = atis.cast<AgrementTechniqueIndustriel?>().firstWhere(
        (a) => a!.numeroAti.toUpperCase() == numero.toUpperCase(),
        orElse: () => null,
      );
      if (mounted) {
        setState(() {
          _matchedAti = match;
          _notFound = match == null;
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() { _loading = false; _notFound = true; });
    }
  }

  Future<void> _handleBatchScan(String raw) async {
    final batchId = _extractBatchId(raw);
    if (batchId == null) {
      if (mounted) setState(() { _loading = false; _notFound = true; });
      return;
    }
    final batch = await ApiService.instance.fetchBatchById(batchId);
    if (mounted) {
      setState(() {
        _matchedBatch = batch;
        _notFound = batch == null;
        _loading = false;
      });
    }
  }

  Future<void> _restartScan() async {
    setState(() {
      _loading = false;
      _lastValue = null;
      _matchedBatch = null;
      _matchedAti = null;
      _notFound = false;
    });
    await _controller.start();
  }

  // ── Build ──────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Scan QR PNPI'),
        backgroundColor: const Color(0xFF003A71),
        actions: [
          IconButton(
            icon: ValueListenableBuilder(
              valueListenable: _controller.torchState,
              builder: (context, state, child) {
                return Icon(
                  state == TorchState.off ? Icons.flash_off : Icons.flash_on,
                  color: Colors.white,
                );
              },
            ),
            onPressed: () => _controller.toggleTorch(),
          ),
        ],
      ),
      body: Column(
        children: [
          Container(
            width: double.infinity,
            color: const Color(0xFF051B36),
            padding:
                const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
            child: const Text(
              'Scannez un QR d\'ATI ou de lot industriel',
              style: TextStyle(
                  color: Colors.white70,
                  fontSize: 13,
                  fontStyle: FontStyle.italic),
              textAlign: TextAlign.center,
            ),
          ),
          Expanded(
            child: MobileScanner(
              controller: _controller,
              onDetect: (capture) {
                if (capture.barcodes.isEmpty) return;
                _onDetect(capture.barcodes.first);
              },
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text('Résultat du scan',
                    style: TextStyle(fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                Text(
                  _lastValue ?? 'Aucun QR détecté',
                  style: const TextStyle(fontSize: 16),
                ),
                const SizedBox(height: 12),
                if (_loading) const LinearProgressIndicator(),
                if (_matchedBatch != null) _BatchPanel(batch: _matchedBatch!),
                if (_matchedAti != null)
                  _ATIVerificationResult(ati: _matchedAti!),
                if (!_loading && _notFound)
                  const Text(
                    'Aucun enregistrement trouvé pour ce QR.',
                    style: TextStyle(color: Colors.redAccent),
                  ),
                const SizedBox(height: 12),
                ElevatedButton(
                  onPressed: _restartScan,
                  style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF006233)),
                  child: const Text('Relancer le scan'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ── Batch result panel (unchanged) ────────────────────────────────────────

class _BatchPanel extends StatelessWidget {
  final TraceBatch batch;
  const _BatchPanel({required this.batch});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFF3F7FF),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFF003A71)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(batch.batchId,
              style: const TextStyle(fontWeight: FontWeight.w700)),
          const SizedBox(height: 4),
          Text('Produit: ${batch.product}'),
          Text('Usine: ${batch.factory}'),
          Text('Origine: ${batch.origin}'),
          Text('Certification: ${batch.certification}'),
          Text('Quantité: ${batch.quantityTons.toStringAsFixed(1)} T'),
        ],
      ),
    );
  }
}

// ── ATI verification result card ──────────────────────────────────────────

class _ATIVerificationResult extends StatelessWidget {
  final AgrementTechniqueIndustriel ati;
  const _ATIVerificationResult({required this.ati});

  @override
  Widget build(BuildContext context) {
    final Color bgColor;
    final Color borderColor;
    final Color iconColor;
    final IconData statusIcon;
    final String statusTitle;

    if (ati.statut == 'approuve') {
      bgColor = const Color(0xFFE8F5E9);
      borderColor = const Color(0xFF388E3C);
      iconColor = const Color(0xFF388E3C);
      statusIcon = Icons.verified_outlined;
      statusTitle = 'ATI Valide';
    } else if (ati.statut == 'rejete' || ati.statut == 'expire') {
      bgColor = const Color(0xFFFFEBEE);
      borderColor = const Color(0xFFC62828);
      iconColor = const Color(0xFFC62828);
      statusIcon = Icons.cancel_outlined;
      statusTitle = ati.statut == 'rejete' ? 'ATI Non valide' : 'ATI Expiré';
    } else {
      bgColor = const Color(0xFFFFF8E1);
      borderColor = const Color(0xFFF9A825);
      iconColor = const Color(0xFFF9A825);
      statusIcon = Icons.hourglass_top_outlined;
      statusTitle = 'ATI en cours de traitement';
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: borderColor, width: 1.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(statusIcon, color: iconColor, size: 22),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  statusTitle,
                  style: TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 15,
                      color: iconColor),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          const Divider(height: 1),
          const SizedBox(height: 10),
          _Row('Numéro ATI', ati.numeroAti),
          _Row('Opérateur', ati.operateurNom),
          _Row('Type d\'activité', ati.typeActivite),
          _Row('Statut', ati.statutLabel),
          if (ati.statut == 'approuve' && ati.dateExpiration != null)
            _Row('Expiration', _fmt(ati.dateExpiration!)),
          if (ati.statut == 'rejete' && ati.motifRejet != null)
            _Row('Motif de rejet', ati.motifRejet!),
        ],
      ),
    );
  }

  String _fmt(DateTime dt) =>
      '${dt.day.toString().padLeft(2, '0')}/'
      '${dt.month.toString().padLeft(2, '0')}/'
      '${dt.year}';
}

class _Row extends StatelessWidget {
  final String label;
  final String value;
  const _Row(this.label, this.value);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: RichText(
        text: TextSpan(
          style: const TextStyle(fontSize: 13, color: Colors.black87),
          children: [
            TextSpan(
                text: '$label: ',
                style: const TextStyle(fontWeight: FontWeight.w600)),
            TextSpan(text: value),
          ],
        ),
      ),
    );
  }
}
