param(
  [string]$ApiUrl = "http://127.0.0.1:8000",
  [string]$Username = "ministere",
  [string]$Password = "ministere-dev-password"
)

$ErrorActionPreference = "Stop"

$token = (
  Invoke-RestMethod `
    -Method Post `
    -Uri "$ApiUrl/auth/token" `
    -ContentType "application/x-www-form-urlencoded" `
    -Body "username=$Username&password=$Password"
).access_token

$response = Invoke-RestMethod `
  -Method Post `
  -Uri "$ApiUrl/ops/alerts/check" `
  -Headers @{ Authorization = "Bearer $token" }

$response | ConvertTo-Json -Depth 10
