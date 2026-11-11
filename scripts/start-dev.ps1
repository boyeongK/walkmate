# 산책메이트 — 개발 서버 시작 (어느 PC에서나 walkmate 폴더 기준)
$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$backendRoot = Join-Path $projectRoot "backend"

if (-not (Test-Path "$backendRoot\node_modules")) {
    Write-Host "node_modules가 없습니다. scripts\setup.ps1 을 먼저 실행합니다..." -ForegroundColor Yellow
    & "$projectRoot\scripts\setup.ps1"
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Set-Location $backendRoot
Write-Host ""
Write-Host "서버 시작 → 브라우저에서 http://localhost:4000 열기" -ForegroundColor Green
Write-Host "데이터 파일: backend\data\db.json (폴더와 함께 복사·동기화됨)" -ForegroundColor Gray
Write-Host ""

npm run dev
