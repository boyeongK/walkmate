# 평가자용 APK 제출 가이드 (제출자용)

평가자가 **자기 Android 폰에 APK를 설치**해서 확인하려면,  
APK 안의 앱이 **인터넷 어디서든 접속 가능한 API 서버**에 연결되어 있어야 합니다.

(PC Wi-Fi에만 붙어 있는 `192.168.x.x` 주소로는 평가자 폰에서 동작하지 않습니다.)

---

## 전체 흐름 (3단계)

```
① API 서버 클라우드 배포  →  ② app-config.js에 URL 설정  →  ③ APK 빌드 후 전달
```

---

## 1단계: API 서버 배포 (Render 무료)

1. [Render](https://render.com) 가입 (GitHub 연동 가능)
2. 이 프로젝트를 GitHub에 올리거나, Render **Blueprint**로 `render.yaml` 사용
3. 배포 완료 후 URL 확인 (예: `https://walkmate-api-xxxx.onrender.com`)
4. 브라우저에서 `https://walkmate-api-xxxx.onrender.com/api/health` → `{"status":"ok"}` 확인

> Render 무료 플랜은 15분 미사용 시 슬립됩니다.  
> 평가 전에 한 번 URL을 열어 서버를 깨워 두세요.

### GitHub 없이 수동 배포

1. Render 대시보드 → **New → Web Service**
2. Root Directory: `backend`
3. Build: `npm install` / Start: `npm start`
4. Deploy

---

## 2단계: APK에 서버 주소 넣기

`frontend/js/app-config.js` 파일을 열고 **아래 한 줄만** 배포 URL로 수정:

```javascript
window.WALKMATE_CONFIG.apiBaseUrl = 'https://walkmate-api-xxxx.onrender.com/api';
```

저장 후 동기화:

```powershell
cd walkmate
npx cap sync android
```

---

## 3단계: APK 빌드

### Android Studio (처음 한 번)

1. Android Studio 실행 → **Setup Wizard Standard** (SDK 설치)
2. 프로젝트 열기:

```powershell
cd walkmate
npx cap open android
```

3. Gradle sync 완료 후 **Build → Build Bundle(s) / APK(s) → Build APK(s)**
4. APK 위치: `walkmate/android/app/build/outputs/apk/debug/app-debug.apk`

### 명령줄 (SDK 설치 후)

```powershell
cd walkmate\android
.\gradlew assembleDebug
```

---

## 4단계: 평가자에게 전달할 것

| 전달물 | 설명 |
|---|---|
| `app-debug.apk` | Android 설치 파일 |
| `EVALUATOR_INSTALL.md` | 평가자 설치·사용 안내 (함께 전달) |

회사 메일/제출 양식 예시:

> Android 폰에서 `app-debug.apk` 설치 후 실행해 주세요.  
> 인터넷(Wi-Fi/ LTE) 연결이 필요합니다.  
> 데모 계정: 김지수 / 박서준 / 이하늘 또는 새 계정 생성 가능.

---

## 체크리스트 (제출 전)

- [ ] `https://.../api/health` 브라우저에서 OK
- [ ] `app-config.js`에 배포 URL 반영
- [ ] `npx cap sync android` 실행
- [ ] APK 새로 빌드
- [ ] 다른 Android 폰(또는 에뮬레이터)에서 APK 설치 후 로그인·매칭·이력 확인

---

## iPhone(본인) vs Android(평가자)

| | 본인 (iPhone) | 평가자 (Android) |
|---|---|---|
| 방법 | Safari + 홈 화면 추가 | APK 설치 |
| 가이드 | [IPHONE_DEMO.md](./IPHONE_DEMO.md) | [EVALUATOR_INSTALL.md](./EVALUATOR_INSTALL.md) |

iOS 네이티브 앱은 Mac + Xcode가 필요합니다. **회사 Android 평가용은 APK로 충분**합니다.
