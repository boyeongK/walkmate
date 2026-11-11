# iPhone에서 산책메이트 시연하기

Android APK는 아이폰에서 설치할 수 없습니다.  
대신 **같은 Wi-Fi**에서 Safari로 접속하면, 지금 만든 화면을 **앱처럼** 시연할 수 있습니다.

## 1. PC에서 서버 실행

```powershell
cd walkmate\backend
npm run dev
```

## 2. PC IP 주소 확인

PowerShell에서:

```powershell
ipconfig
```

**무선 LAN 어댑터 Wi-Fi** → **IPv4 주소** (예: `192.168.0.15`)

## 3. iPhone Safari에서 접속

1. iPhone과 PC를 **같은 Wi-Fi**에 연결
2. Safari 주소창에 입력:

```
http://192.168.0.15:4000
```

(PC IP는 본인 것으로 바꾸세요)

3. 산책메이트 화면이 뜨면 정상입니다.

## 4. 홈 화면에 추가 (앱처럼 보이게)

1. Safari 하단 **공유** 버튼 (□↑)
2. **홈 화면에 추가** 선택
3. 이름 확인 후 **추가**

이제 홈 화면 아이콘으로 실행하면 전체 화면에 가깝게 열립니다.

## 안 될 때

| 증상 | 확인 |
|---|---|
| 페이지가 안 열림 | PC IP 맞는지, 같은 Wi-Fi인지 |
| Failed to fetch | PC에서 `npm run dev` 실행 중인지 |
| Windows 방화벽 | 4000 포트 허용 (아래 참고) |

### Windows 방화벽 (4000 포트 허용)

PowerShell **관리자 권한**:

```powershell
New-NetFirewallRule -DisplayName "WalkMate 4000" -Direction Inbound -LocalPort 4000 -Protocol TCP -Action Allow
```

## 회사 발표용 한 줄

> "Android/iOS 네이티브 앱 전환은 Capacitor로 준비했고, 현재는 모바일 웹 + 홈 화면 추가(PWA)로 iPhone/Android 모두 동일 UX를 시연합니다."

## iOS 네이티브 앱이 꼭 필요할 때

App Store용 `.ipa` 빌드는 **Mac + Xcode**가 필요합니다.  
Windows PC만으로는 iOS 앱 파일을 만들 수 없습니다.
