"""Tests for the sanitization module."""
from app.core.sanitize import sanitize_html, is_safe_input


def test_strip_script_tags():
    assert "<script>" not in sanitize_html('<script>alert("xss")</script>')


def test_strip_html_tags():
    result = sanitize_html("<b>Hello</b> <i>World</i>")
    assert "<b>" not in result
    assert "<i>" not in result
    assert "Hello" in result
    assert "World" in result


def test_escape_entities():
    result = sanitize_html('test "quotes" & <stuff>')
    assert "<stuff>" not in result


def test_preserves_normal_text():
    text = "Societe Gabonaise de Transformation du Bois - NIF 12345"
    assert sanitize_html(text) == text


def test_preserves_french_accents():
    text = "Agrement technique delivre a Libreville"
    assert sanitize_html(text) == text


def test_is_safe_input_detects_script():
    assert is_safe_input("normal text") is True
    assert is_safe_input('<script>alert(1)</script>') is False
    assert is_safe_input('"><img onerror=alert(1)>') is False
    assert is_safe_input("javascript:void(0)") is False


def test_empty_string():
    assert sanitize_html("") == ""


def test_strips_iframe():
    result = sanitize_html('<iframe src="evil.com"></iframe>Content')
    assert "iframe" not in result.lower()
    assert "Content" in result
