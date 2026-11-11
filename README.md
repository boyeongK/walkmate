# 산책메이트 (WalkMate)

반려동물 산책 동행을 AI 매칭으로 추천해주는 서비스의 프로토타입입니다. 자유 채팅 없이 **선택형 제안 + 정해진 상태 버튼**만으로 산책 약속을 조율하는 것이 핵심 차별점입니다.

## 프로젝트 구조

```
walkmate/
├── backend/            # Express 기반 API 서버
│   ├── data/db.json     # 데모용 데이터 저장소 (JSON 파일)
│   ├── routes/          # users, pets, matches, requests API
│   ├── matching.js      # 태그 기반 매칭 스코어링 로직
│   ├── db.js            # JSON 파일 read/write 헬퍼
│   └── server.js        # 서버 진입점 (프론트엔드 정적 파일도 함께 서빙)
└── frontend/           # 순수 HTML/CSS/JS 화면
    ├── index.html        # 데모 계정 선택(온보딩)
    ├── profile.html       # 반려동물 프로필 등록
    ├── matching.html       # 내가 직접 눌러서 실행하는 AI 매칭 측정 (점수 근거까지 표시)
    ├── home.html          # AI 추천 산책 짝 리스트 (요약 대시보드)
    ├── request.html       # 선택형 매칭 요청 보내기
    ├── requests.html      # 받은/보낸 요청 목록
    ├── walk.html          # 상태 버튼 · 인증 · 후기
    ├── history.html       # 완료된 산책 이력
    ├── css/               # 화면별 스타일 (common.css + 화면별 css)
    └── js/                # 화면별 로직 + api.js(공통 fetch 유틸)
```

## 실행 방법

```bash
cd backend
npm install
npm run dev   # 코드 수정 시 자동 재시작 (nodemon)
# 또는
npm start     # 자동 재시작 없이 실행
```

서버가 실행되면 브라우저에서 `http://localhost:4000` 으로 접속하세요. (프론트엔드와 API를 같은 서버에서 서빙하므로 별도 서버 실행이 필요 없습니다.)

포트가 이미 사용 중이라면 `PORT` 환경변수로 다른 포트를 지정할 수 있습니다. (예: PowerShell에서 `$env:PORT=4020; npm run dev`)

> ⚠️ `npm start`(nodemon 미사용)로 실행 중에 백엔드 코드를 수정했다면, 반드시 서버를 껐다가 다시 켜야 변경사항이 반영됩니다. `npm run dev`를 쓰면 이 과정이 자동으로 처리됩니다.

## 데모 계정

문자 인증 대신, 3개의 데모 계정 중 하나를 선택해 로그인 상태를 시뮬레이션합니다.

| 계정 | 반려동물 | 특징 |
|---|---|---|
| 김지수 | 몽이 (말티즈, 소형) | 활발함, 사람좋아함 |
| 박서준 | 코코 (푸들, 소형) | 활발함, 장난기많음 |
| 이하늘 | 보리 (골든리트리버, 대형) | 온순함, 장거리산책 |

기존 계정 대신 **온보딩 화면 하단의 "새 계정 만들기" 폼**으로 직접 계정을 만들 수도 있습니다. 이름(과 지역)만 입력하면 새 계정이 생성되고, 곧바로 내 반려동물 프로필을 등록해 위 3개 데모 반려동물과의 AI 매칭 점수를 실제로 받아볼 수 있습니다.

## 핵심 흐름

1. 계정 선택(또는 새 계정 생성) → 반려동물 프로필 등록
2. **AI 매칭 측정** 화면에서 버튼을 눌러 내 반려동물과 동네 반려동물들의 궁합을 직접 계산 (태그 일치/활동량/크기 궁합 점수 근거까지 표시)
3. 시간대/장소를 선택형으로 골라 산책 요청 전송 (자유 채팅 없음)
4. 상대가 수락 → 정해진 상태 버튼("도착했어요" 등)으로 조율
5. 산책 시작/종료 인증 → 후기 작성 → 이력에 기록

## Android APK (Capacitor) — **평가자 제출용**

평가자가 Android 폰에 APK를 설치해 확인하려면:

1. API 서버를 **인터넷에 배포** (Render 등)
2. `frontend/js/app-config.js`에 배포 URL 설정
3. APK 빌드 후 `app-debug.apk` + `EVALUATOR_INSTALL.md` 전달

**상세 가이드: [EVALUATOR_APK.md](./EVALUATOR_APK.md)**

로컬 APK 빌드만: [APP_BUILD.md](./APP_BUILD.md)

## iPhone에서 시연하기 (본인 확인용)

아이폰은 Android APK를 설치할 수 없습니다. **Safari + 홈 화면 추가**로 동일하게 시연할 수 있습니다.  
자세한 방법: **[IPHONE_DEMO.md](./IPHONE_DEMO.md)**

```bash
# walkmate 루트에서
npm install
npx cap sync android
npx cap open android   # Android Studio에서 APK 빌드
```

앱은 별도 API 서버(`backend/`)가 실행 중이어야 동작합니다. 실제 폰 테스트 시 `frontend/js/app-config.js`에 PC IP를 설정하세요.

## 현재 프로토타입의 한계 (실제 서비스 전환 시 보완 필요)

- 휴대폰 본인인증, 실시간 위치 공유, 신고/차단은 목업 처리됨
- 데이터가 JSON 파일에 저장되어 동시 사용자 확장에는 적합하지 않음 (실제 서비스는 DB 필요)
- 매칭 로직은 규칙 기반이며, 실제 서비스에서는 산책 데이터가 쌓인 뒤 AI 모델로 고도화 예정
