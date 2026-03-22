import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:local_auth/local_auth.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Manages biometric authentication (fingerprint, Face ID).
class BiometricService {
  static final BiometricService instance = BiometricService._();
  BiometricService._();

  final LocalAuthentication _auth = LocalAuthentication();
  static const _prefKey = 'biometric_enabled';

  /// Check if biometric hardware is available.
  Future<bool> isAvailable() async {
    try {
      final canCheck = await _auth.canCheckBiometrics;
      final isSupported = await _auth.isDeviceSupported();
      return canCheck && isSupported;
    } on PlatformException {
      return false;
    }
  }

  /// Get available biometric types.
  Future<List<BiometricType>> availableTypes() async {
    try {
      return await _auth.getAvailableBiometrics();
    } on PlatformException {
      return [];
    }
  }

  /// Check if user has enabled biometric login.
  Future<bool> isEnabled() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_prefKey) ?? false;
  }

  /// Enable or disable biometric login.
  Future<void> setEnabled(bool value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_prefKey, value);
  }

  /// Authenticate using biometrics.
  /// Returns true if authenticated successfully.
  Future<bool> authenticate({String reason = 'Veuillez vous authentifier'}) async {
    try {
      return await _auth.authenticate(
        localizedReason: reason,
        options: const AuthenticationOptions(
          stickyAuth: true,
          biometricOnly: true,
        ),
      );
    } on PlatformException {
      return false;
    }
  }

  /// Get a display name for the available biometric type.
  Future<String> biometricLabel() async {
    final types = await availableTypes();
    if (types.contains(BiometricType.face)) return 'Face ID';
    if (types.contains(BiometricType.fingerprint)) return 'Empreinte digitale';
    if (types.contains(BiometricType.iris)) return 'Scan iris';
    return 'Biometrie';
  }
}
