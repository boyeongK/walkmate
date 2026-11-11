# 산책메이트 APK 빌드 스크립트 (Windows)
$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

# JDK 자동 탐색 (Gradle 8.14+ 는 JDK 25 지원)
$javaHomeCandidates = @(
    "C:\Program Files\Eclipse Adoptium\jdk-25.0.4.7-hotspot",
    "C:\Program Files\Android\Android Studio\jbr",
    "$env:LOCALAPPDATA\jdk-21"
)

foreach ($candidatePath in $javaHomeCandidates) {
    if (Test-Path "$candidatePath\bin\java.exe") {
        $env:JAVA_HOME = $candidatePath
        break
    }
}

if (-not $env:JAVA_HOME) {
    Write-Error "JDK를 찾을 수 없습니다. Eclipse Temurin 또는 Android Studio를 설치해 주세요."
}

Write-Host "JAVA_HOME: $env:JAVA_HOME"
Write-Host ""
Write-Host "[1/2] Capacitor sync..." -ForegroundColor Cyan
npm run cap:sync
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "[2/2] Gradle assembleDebug..." -ForegroundColor Cyan
Set-Location "$projectRoot\android"
& .\gradlew.bat assembleDebug --no-daemon
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$apkPath = "$projectRoot\android\app\build\outputs\apk\debug\app-debug.apk"
if (Test-Path $apkPath) {
    $apkSizeMb = [math]::Round((Get-Item $apkPath).Length / 1MB, 2)
    Write-Host ""
    Write-Host "APK 생성 완료 ($apkSizeMb MB)" -ForegroundColor Green
    Write-Host $apkPath
} else {
    Write-Error "APK 파일을 찾을 수 없습니다."
}
