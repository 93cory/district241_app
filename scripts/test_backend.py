import json
import os
import sys

from fastapi.testclient import TestClient

sys.path.append("backend")
from app.main import app

client = TestClient(app)
print("POST /auth/token")
resp = client.post(
    "/auth/token",
    data={
        "username": os.getenv("PNPI_BACKEND_TEST_USER", "ministere"),
        "password": os.getenv("PNPI_BACKEND_TEST_PASSWORD", "ministere-dev-password"),
    },
)
print("status", resp.status_code)
body = resp.json()
print("body", json.dumps(body, indent=2, ensure_ascii=False))
token = body.get("access_token")
headers = {"Authorization": f"Bearer {token}"}
for path in ["/units", "/batches", "/dashboard/indicators"]:
    resp = client.get(path, headers=headers)
    print(path, resp.status_code)
    print(json.dumps(resp.json(), indent=2, ensure_ascii=False))
