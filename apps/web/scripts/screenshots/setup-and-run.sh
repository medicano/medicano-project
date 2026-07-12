#!/usr/bin/env bash
# Requer as credenciais das contas de demonstração via ambiente:
#   SCREENSHOTS_PATIENT_EMAIL, SCREENSHOTS_PATIENT_PASSWORD,
#   SCREENSHOTS_CLINIC_EMAIL, SCREENSHOTS_CLINIC_PASSWORD
# Opcional: SCREENSHOTS_BASE_URL (default: https://medicano.app)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== Setup: instalando dependências ==="
npm init -y
npm install playwright
npx playwright install chromium

echo ""
echo "=== Rodando captura de screenshots ==="
node capture.js
