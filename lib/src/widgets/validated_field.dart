import 'package:flutter/material.dart';
import '../theme/pnpi_theme.dart';

typedef FieldValidator = String? Function(String? value);

class ValidatedField extends StatefulWidget {
  final TextEditingController controller;
  final String label;
  final String? hint;
  final FieldValidator? validator;
  final bool required;
  final TextInputType? keyboardType;
  final int maxLines;
  final bool obscureText;
  final IconData? prefixIcon;

  const ValidatedField({
    super.key,
    required this.controller,
    required this.label,
    this.hint,
    this.validator,
    this.required = false,
    this.keyboardType,
    this.maxLines = 1,
    this.obscureText = false,
    this.prefixIcon,
  });

  @override
  State<ValidatedField> createState() => _ValidatedFieldState();
}

class _ValidatedFieldState extends State<ValidatedField> {
  String? _error;
  bool _touched = false;

  void _validate() {
    if (!_touched) return;
    final value = widget.controller.text.trim();
    String? error;
    if (widget.required && value.isEmpty) {
      error = '${widget.label} est obligatoire';
    } else if (widget.validator != null) {
      error = widget.validator!(value);
    }
    if (error != _error) setState(() => _error = error);
  }

  @override
  void initState() {
    super.initState();
    widget.controller.addListener(_validate);
  }

  @override
  void dispose() {
    widget.controller.removeListener(_validate);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final hasError = _error != null;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        RichText(
          text: TextSpan(
            text: widget.label,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color:
                  hasError ? const Color(0xFFB42318) : PnpiColors.slateDark,
            ),
            children: widget.required
                ? const [
                    TextSpan(
                        text: ' *',
                        style: TextStyle(color: Color(0xFFB42318)))
                  ]
                : null,
          ),
        ),
        const SizedBox(height: 6),
        TextField(
          controller: widget.controller,
          keyboardType: widget.keyboardType,
          maxLines: widget.maxLines,
          obscureText: widget.obscureText,
          onTap: () {
            if (!_touched) setState(() => _touched = true);
          },
          decoration: InputDecoration(
            hintText: widget.hint,
            prefixIcon: widget.prefixIcon != null
                ? Icon(widget.prefixIcon, size: 20)
                : null,
            filled: true,
            fillColor:
                hasError ? const Color(0xFFFFF5F5) : const Color(0xFFF6F8FB),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(
                  color: hasError
                      ? const Color(0xFFB42318)
                      : const Color(0xFFDCE4EF)),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(
                  color: hasError
                      ? const Color(0xFFB42318)
                      : const Color(0xFFDCE4EF)),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(
                  color:
                      hasError ? const Color(0xFFB42318) : PnpiColors.lagoon,
                  width: 2),
            ),
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
          ),
        ),
        AnimatedSize(
          duration: const Duration(milliseconds: 200),
          child: hasError
              ? Padding(
                  padding: const EdgeInsets.only(top: 4, left: 4),
                  child: Row(
                    children: [
                      const Icon(Icons.error_outline_rounded,
                          size: 14, color: Color(0xFFB42318)),
                      const SizedBox(width: 4),
                      Text(_error!,
                          style: const TextStyle(
                              fontSize: 12, color: Color(0xFFB42318))),
                    ],
                  ),
                )
              : const SizedBox.shrink(),
        ),
      ],
    );
  }
}

/// Common validators
class Validators {
  static FieldValidator email = (value) {
    if (value == null || value.isEmpty) return null;
    final regex = RegExp(r'^[\w\.\-]+@[\w\.\-]+\.\w{2,}$');
    return regex.hasMatch(value) ? null : 'Adresse email invalide';
  };

  static FieldValidator phone = (value) {
    if (value == null || value.isEmpty) return null;
    final regex = RegExp(r'^\+?[\d\s\-]{7,20}$');
    return regex.hasMatch(value) ? null : 'Numero de telephone invalide';
  };

  static FieldValidator minLength(int min) => (value) {
        if (value == null || value.isEmpty) return null;
        return value.length >= min
            ? null
            : 'Minimum $min caracteres requis';
      };

  static FieldValidator nif = (value) {
    if (value == null || value.isEmpty) return null;
    return value.length >= 6
        ? null
        : 'NIF invalide (minimum 6 caracteres)';
  };
}
