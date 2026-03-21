class ApiCache {
  static final ApiCache instance = ApiCache._();
  ApiCache._();

  final Map<String, _CacheEntry> _store = {};

  T? get<T>(String key) {
    final entry = _store[key];
    if (entry == null) return null;
    if (DateTime.now().isAfter(entry.expiresAt)) {
      _store.remove(key);
      return null;
    }
    return entry.data as T;
  }

  void set(String key, dynamic data,
      {Duration ttl = const Duration(minutes: 2)}) {
    _store[key] = _CacheEntry(data: data, expiresAt: DateTime.now().add(ttl));
  }

  void invalidate(String key) => _store.remove(key);

  void invalidatePrefix(String prefix) {
    _store.removeWhere((key, _) => key.startsWith(prefix));
  }

  void clear() => _store.clear();
}

class _CacheEntry {
  final dynamic data;
  final DateTime expiresAt;
  _CacheEntry({required this.data, required this.expiresAt});
}
