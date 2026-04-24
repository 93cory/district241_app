"""PNPI · Signature electronique simplifiee pour documents officiels.

Genere un hash SHA-256 du contenu + metadata pour garantir l'integrite.
"""
from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone


def generate_signature(
    document_content: bytes,
    signer_username: str,
    signer_role: str,
    document_type: str,
    reference: str,
) -> dict:
    """Generate a digital signature for a document.

    Returns a signature dict that can be embedded in the document
    or stored separately for verification.
    """
    timestamp = datetime.now(timezone.utc)

    # Create signature payload
    payload = {
        "signer": signer_username,
        "role": signer_role,
        "document_type": document_type,
        "reference": reference,
        "timestamp": timestamp.isoformat(),
        "content_hash": hashlib.sha256(document_content).hexdigest(),
    }

    # Sign the payload (in production, use RSA/ECDSA keys)
    payload_json = json.dumps(payload, sort_keys=True)
    signature_hash = hashlib.sha256(payload_json.encode()).hexdigest()

    return {
        **payload,
        "signature": signature_hash,
        "verification_url": f"https://pnpi-gabon.ga/verify/signature/{signature_hash[:16]}",
    }


def verify_signature(signature_data: dict, document_content: bytes) -> dict:
    """Verify a document signature."""
    content_hash = hashlib.sha256(document_content).hexdigest()

    if content_hash != signature_data.get("content_hash"):
        return {"valid": False, "reason": "Le contenu du document a ete modifie."}

    # Reconstruct and verify signature
    payload = {
        "signer": signature_data["signer"],
        "role": signature_data["role"],
        "document_type": signature_data["document_type"],
        "reference": signature_data["reference"],
        "timestamp": signature_data["timestamp"],
        "content_hash": signature_data["content_hash"],
    }
    payload_json = json.dumps(payload, sort_keys=True)
    expected_hash = hashlib.sha256(payload_json.encode()).hexdigest()

    if expected_hash != signature_data.get("signature"):
        return {"valid": False, "reason": "Signature invalide ou corrompue."}

    return {
        "valid": True,
        "signer": signature_data["signer"],
        "role": signature_data["role"],
        "signed_at": signature_data["timestamp"],
        "document_type": signature_data["document_type"],
        "reference": signature_data["reference"],
    }
