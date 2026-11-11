# 산책메이트 Android APK 빌드 가이드

지금 웹 화면(HTML/CSS/JS)을 **Capacitor**로 감싸서 Android 앱으로 패키징합니다.  
화면 코드는 그대로 두고, 앱 껍데기 + API 서버 연결 설정만 추가한 구조입니다.

## 사전 준비

1. **Android Studio** 설치  
   https://developer.android.com/studio

2. **JDK** — PC에 JDK 25가 있어도 됩니다 (Gradle 8.14.4 사용 중)

3. **백엔드 서버** 실행 (앱은 API 서버가 필요합니다)

```powershell
cd backend
npm install
npm run dev
```

서버는 `0.0.0.0:4000`으로 열려 있어야 폰에서 접속할 수 있습니다.

---

## 1. API 서버 주소 설정

앱은 브라우저와 달리 `/api` 상대 경로를 쓸 수 없습니다.  
`frontend/js/app-config.js` 파일에서 PC IP를 설정하세요.

| 환경 | apiBaseUrl 예시 |
|---|---|
| Android 에뮬레이터 | `http://10.0.2.2:4000/api` (기본값) |
| 실제 폰 (같은 Wi-Fi) | `http://192.168.0.15:4000/api` ← PC IP로 변경 |

PC IP 확인 (PowerShell):

```powershell
ipconfig
```

`무선 LAN 어댑터 Wi-Fi` 항목의 **IPv4 주소**를 사용하면 됩니다.

설정 변경 후 반드시 sync:

```powershell
cd walkmate
npx cap sync android
```

---

## 2. Android Studio에서 열기

```powershell
cd walkmate
npx cap open android
```

Android Studio가 열리면 Gradle sync가 끝날 때까지 기다립니다.

---

## 3. APK 만들기 (회사 시연용)

### 방법 A: 한 줄 명령 (권장)

```powershell
cd walkmate
npm run apk:build
```

완료되면 `android\app\build\outputs\apk\debug\app-debug.apk` 가 생성됩니다.

### 방법 B: Android Studio 메뉴

1. **Build → Build Bundle(s) / APK(s) → Build APK(s)**
2. 완료 후 **locate** 링크 클릭
3. APK 경로: `android/app/build/outputs/apk/debug/app-debug.apk`

### 방법 C: 명령줄 (Gradle만)

```powershell
cd walkmate\android
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-25.0.4.7-hotspot"
.\gradlew assembleDebug
```

APK: `android\app\build\outputs\apk\debug\app-debug.apk`

---

## 4. 폰에 설치해서 테스트

1. PC에서 백엔드 서버 실행 (`npm run dev`)
2. 폰과 PC를 **같은 Wi-Fi**에 연결
3. `app-config.js`의 IP를 PC IP로 수정 후 `npx cap sync android` → APK 재빌드
4. APK를 폰으로 옮겨 설치 (USB 또는 파일 공유)
5. 앱 실행

> Windows 방화벽에서 4000 포트 허용이 필요할 수 있습니다.

---

## 5. 프론트 수정 후 다시 빌드할 때

```powershell
cd walkmate
npx cap sync android
npx cap open android
```

`sync`가 `frontend/` 파일을 Android 프로젝트로 복사합니다.

---

## 구조 요약

```
walkmate/
├── frontend/          ← 앱 UI (그대로 사용)
├── backend/           ← API 서버 (폰/에뮬레이터가 접속)
├── android/           ← Capacitor Android 프로젝트
├── capacitor.config.json
└── package.json
```

## 자주 나는 문제

| 증상 | 해결 |
|---|---|
| Failed to fetch | PC IP 확인, 서버 실행 여부, Wi-Fi 동일 네트워크 확인 |
| 에뮬레이터에서만 안 됨 | `10.0.2.2:4000` 사용 중인지 확인 |
| HTTP 연결 거부 | 방화벽 4000 포트 허용 |
| Gradle JVM 오류 (JDK 25) | Gradle 8.14.4 사용 — Android Studio Sync 후 Build |
| 한글 경로 오류 | `gradle.properties`에 `android.overridePathCheck=true` 설정됨 |
| 화면 수정이 반영 안 됨 | `npx cap sync android` 후 APK 재빌드 |
