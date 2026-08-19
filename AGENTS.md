# vacangyu.github.io

Storyboarder 앱 관련 작업을 하기 전에 **반드시 `storyboarder-src/CLAUDE.md` 를 먼저 읽을 것.**
프로젝트 맥락, 아키텍처, 코드 수정 규칙, 빌드·배포 절차가 모두 그 문서에 있다.

요약: 소스는 `storyboarder-src/storyboard.html`, 빌드는 `node storyboarder-src/build.mjs`, 배포는 `dist/index.html` → `sb/app/index.html`, `dist/sb-home.html` → `sb/index.html` 복사 후 commit & push (GitHub Pages, https://gyu.dev/sb).
