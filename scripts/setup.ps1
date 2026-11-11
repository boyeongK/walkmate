# 산책메이트 — 새 PC에서 최초 1회 실행 (의존성 설치)
$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

Write-Host "Node 버전 확인..." -ForegroundColor Cyan
node -v
if ($LASTEXITCODE -ne 0) {
    Write-Error "Node.js가 설치되어 있지 않습니다. https://nodejs.org LTS를 설치한 뒤 다시 실행해주세요."
}

Write-Host ""
Write-Host "[1/2] 루트 패키지 설치 (Capacitor)..." -ForegroundColor Cyan
npm install
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "[2/2] 백엔드 패키지 설치..." -ForegroundColor Cyan
Set-Location "$projectRoot\backend"
npm install
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "설치 완료. 다음 실행: scripts\start-dev.ps1 또는 npm run dev (walkmate 폴더에서)" -ForegroundColor Green
