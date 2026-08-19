# Storyboarder 클라우드 공유 설정 가이드

약 10분이면 끝납니다. 완료하면: **gyu.dev/storyboarder** 주소로 접속 → Juan님은 로그인 후 편집(자동 클라우드 저장) → 카톡방에 링크를 공유하면 누구나 로그인 없이 실시간 읽기 전용으로 볼 수 있습니다. 비용은 현재 규모에서 0원입니다.

---

## 1. Firebase 프로젝트 만들기 (구글 계정 필요)

1. https://console.firebase.google.com 접속 → **프로젝트 추가**
2. 프로젝트 이름: `storyboarder` (아무거나) → 애널리틱스는 **사용 안 함** → 만들기

## 2. 로그인 계정 만들기

1. 왼쪽 메뉴 **빌드 → Authentication** → 시작하기
2. **Sign-in method** 탭 → **이메일/비밀번호** → 사용 설정 → 저장
3. **Users** 탭 → **사용자 추가** → 본인 이메일과 비밀번호 입력
   (이것이 앱에서 로그인할 편집자 계정입니다)

## 3. 실시간 데이터베이스 만들기

1. **빌드 → Realtime Database** → 데이터베이스 만들기
   - 위치: `asia-southeast1 (싱가포르)` 권장
   - **잠금 모드**로 시작
2. **규칙** 탭에 아래를 통째로 붙여넣고 **게시**:

```json
{
  "rules": {
    "boards": {
      "$b": {
        ".read": true,
        ".write": "auth != null",
        "comments": {
          ".write": true
        }
      }
    }
  }
}
```

> 의미: 문서 읽기는 링크를 아는 누구나 가능, 쓰기는 로그인한 계정만 가능.
> 단 `comments` 경로만은 비로그인 뷰어도 쓸 수 있어 댓글 작성이 가능하다
> (수정/삭제 권한은 앱 UI에서 작성자·편집자 기준으로 제한).

## 4. 웹 앱 설정값을 파일에 붙여넣기

1. 프로젝트 개요 옆 **⚙(프로젝트 설정)** → 아래 **내 앱** → **웹**(`</>`) 아이콘 클릭
2. 앱 닉네임 `storyboarder` → 앱 등록 (호스팅 체크 불필요)
3. 화면에 나오는 `firebaseConfig = { ... }` 객체를 복사
4. `index.html`을 텍스트 편집기로 열어 상단의 아래 부분을 찾습니다:

```js
const FIREBASE_CONFIG = null; /* ← 여기에 firebaseConfig 객체 붙여넣기 */
```

5. `null`을 복사한 객체로 교체합니다. 예:

```js
const FIREBASE_CONFIG = {
  apiKey: "AIza...",
  authDomain: "storyboarder-xxxx.firebaseapp.com",
  databaseURL: "https://storyboarder-xxxx-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "storyboarder-xxxx",
  storageBucket: "storyboarder-xxxx.appspot.com",
  messagingSenderId: "...",
  appId: "..."
};
```

> `databaseURL`이 빠져 있으면 Realtime Database 페이지 상단의 URL을 복사해 직접 추가하세요.

## 5. 승인된 도메인에 gyu.dev 추가

**Authentication → Settings → 승인된 도메인** → **도메인 추가** → `gyu.dev`

## 6. gyu.dev/storyboarder 에 올리기

수정한 `index.html`을 **gyu.dev의 `/storyboarder/` 경로에 `index.html` 이름 그대로** 업로드하면 끝입니다. 방법은 gyu.dev를 어디에 호스팅 중인지에 따라 다릅니다:

- **GitHub Pages**: 저장소에 `storyboarder/index.html`로 커밋
- **Vercel / Netlify**: 프로젝트의 `storyboarder/` 폴더에 파일을 넣고 배포 (또는 Netlify 대시보드에 폴더 드래그)
- **직접 운영하는 서버**: 웹 루트의 `storyboarder/` 디렉터리에 업로드

앱은 단일 파일이고 서버 코드가 전혀 필요 없어서, 정적 파일을 서빙할 수 있는 곳이면 어디든 동작합니다. `.dev` 도메인은 자동으로 HTTPS라서 추가 설정이 필요 없습니다.

## 7. 사용 방법

- **Juan님(편집자)**: `https://gyu.dev/storyboarder` 접속 → 우측 상단 **로그인** → 2번에서 만든 이메일/비밀번호 입력. 이후 편집하면 멈춘 지 3초 뒤 자동으로 클라우드에 저장되고, 우측 상단에 "● 클라우드 저장됨"이 표시됩니다. 최초 로그인 시 클라우드가 비어 있으면 파일에 내장된 문서가 자동으로 업로드됩니다.
- **보는 사람들**: 같은 주소를 카톡방에 공유하면 됩니다. 로그인 없이 열리며, 편집 내용이 몇 초 안에 실시간 반영되는 읽기 전용 화면("● 실시간 보기")을 보게 됩니다.
- 로컬에서 파일을 그대로 열어도(더블클릭) 기존처럼 동작합니다. 설정을 넣기 전이라면 완전히 로컬 전용으로 작동합니다.

## 참고

- **용량/비용**: 무료(Spark) 요금제 기준 저장 1GB·전송 10GB/월. 이미지는 내용 기반 해시로 한 번만 업로드되고, 이후 편집은 텍스트만 동기화되어 가볍습니다. 시청 인원 수십 명 수준에서는 무료 한도로 충분합니다.
- **보안**: 쓰기는 로그인 계정만 가능합니다. 읽기는 주소를 아는 사람이면 가능하므로, 신뢰하는 카톡방에만 공유하세요.
- **내보내기와의 관계**: 설정값을 넣은 파일에서 `파일 → index_n.html 내보내기`를 하면 설정값도 함께 내장되어, 내보낸 파일을 그대로 다시 업로드해도 동작합니다.
