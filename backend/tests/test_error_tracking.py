"""Tests pour `app.core.error_tracking` (monitoring d'erreurs, dette D-009).

Le test `test_capture_exception_reaches_real_http_endpoint` fait une vraie
requete HTTP vers un serveur local ephemere (pas de mock) : verifie que le
SDK envoie reellement un evenement au format protocole Sentry (utilise
aussi par Glitchtip) quand une exception est capturee — pas seulement que
la fonction s'execute sans lever.
"""

from __future__ import annotations

import http.server
import importlib
import queue
import threading

import pytest


@pytest.fixture
def fresh_module(monkeypatch):
    def _reload(env: dict[str, str] | None = None):
        for key in ("PNPI_SENTRY_DSN", "PNPI_ENV", "PNPI_RELEASE", "PNPI_SENTRY_TRACES_SAMPLE_RATE"):
            monkeypatch.delenv(key, raising=False)
        for k, v in (env or {}).items():
            monkeypatch.setenv(k, v)
        from app.core import error_tracking

        importlib.reload(error_tracking)
        return error_tracking

    return _reload


def test_disabled_without_dsn(fresh_module):
    et = fresh_module()
    assert et.init_error_tracking() is False
    assert et.is_enabled() is False


def test_capture_exception_is_noop_when_disabled(fresh_module):
    """Ne doit jamais lever, meme non initialise (ne doit jamais faire
    echouer une requete a cause du monitoring lui-meme)."""
    et = fresh_module()
    et.capture_exception(ValueError("test"))  # ne doit pas lever


def test_init_with_missing_sdk_falls_back_gracefully(fresh_module, monkeypatch):
    """Si sentry_sdk n'est pas installe, init_error_tracking() ne doit pas
    planter le boot de l'app — juste desactiver le monitoring."""
    import builtins

    real_import = builtins.__import__

    def fake_import(name, *args, **kwargs):
        if name == "sentry_sdk":
            raise ImportError("simule : sentry-sdk non installe")
        return real_import(name, *args, **kwargs)

    monkeypatch.setattr(builtins, "__import__", fake_import)
    et = fresh_module({"PNPI_SENTRY_DSN": "http://key@localhost:1/1"})
    assert et.init_error_tracking() is False


def test_capture_exception_reaches_real_http_endpoint(fresh_module):
    """Test d'integration reel (pas de mock) : un serveur HTTP local recoit
    effectivement l'evenement au format protocole Sentry/Glitchtip."""
    received = queue.Queue()

    class Handler(http.server.BaseHTTPRequestHandler):
        def do_POST(self):
            length = int(self.headers.get("Content-Length", 0))
            self.rfile.read(length)
            received.put(self.path)
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b"{}")

        def log_message(self, *args):
            pass

    server = http.server.HTTPServer(("127.0.0.1", 0), Handler)
    port = server.server_address[1]
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        et = fresh_module({"PNPI_SENTRY_DSN": f"http://fakepublickey@127.0.0.1:{port}/1"})
        assert et.init_error_tracking() is True
        assert et.is_enabled() is True

        et.capture_exception(ValueError("erreur de test D-009"))

        path = received.get(timeout=5)
        assert path == "/api/1/envelope/"
    finally:
        server.shutdown()
