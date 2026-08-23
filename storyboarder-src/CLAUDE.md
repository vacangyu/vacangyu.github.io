# Storyboarder — 프로젝트 컨텍스트

영화 스토리보드 제작·공유 웹앱. 단일 HTML 파일(빌드 도구·프레임워크·서버 코드 없음, 바닐라 JS)로 동작하며, https://gyu.dev/storyboarder 에 배포되어 있다. 이 문서는 Claude(Cowork) 세션에서 개발된 전체 맥락을 Claude Code로 이관하기 위한 문서다. 수정 요청이 오면 이 문서의 규칙과 구조를 따른다.

## 저장소 및 배포

- 배포 저장소: `github.com/vacangyu/vacangyu.github.io` (GitHub Pages, main 브랜치, 커스텀 도메인 gyu.dev + Cloudflare DNS)
- 배포 경로:
  - `sb/index.html` → https://gyu.dev/sb (작품 리스트 메인 페이지, 소스: `sb-home.html`)
  - `sb/app/index.html` → 앱 본체. `?f=N`으로 N번째 작품 열기, `?new=1`로 새 작품 추가 플로우
  - `sb/1/`~`sb/6/` → `/sb/app/?f=N`으로 넘기는 정적 스텁 (앱이 `history.replaceState`로 주소를 다시 `/sb/N`으로 정리). 작품이 7개 이상 되면 스텁 폴더 추가할 것
  - `storyboarder/index.html` → 구 주소, `/sb/`로 리다이렉트만 함
- 배포 절차: `node build.mjs` → `dist/index.html`→`sb/app/index.html`, `dist/sb-home.html`→`sb/index.html`, `dist/version.txt`→`sb/version.txt` 복사 → commit & push. Pages 빌드는 커밋 후 30초~2분. 브라우저 HTML 캐시가 10분이라 확인 시 강력 새로고침 또는 `?v=n` 쿼리 사용.
- **사용자가 "수정하고 배포까지"라고 하면: 빌드 → 복사 → 커밋 → 푸시까지 한 번에 진행한다.**

## 이 폴더의 파일

| 파일 | 역할 |
|---|---|
| `storyboard.html` | **소스 오브 트루스.** 모든 코드 수정은 이 파일에만 한다 |
| `firebase-config.json` | Firebase 웹 설정값 (빌드 시 주입) |
| `doc-data.json` | 내장 문서 데이터(v3 직렬화, 이미지 dataURL 포함 ~3.8MB). 클라우드가 비었을 때의 초기값/폴백 |
| `build.mjs` | 빌드: 템플릿에 설정값·문서를 주입해 `dist/index.html` 생성 |
| `FIREBASE_SETUP.md` | Firebase 콘솔 설정 가이드 (완료된 상태) |

## 아키텍처 요약

**문서 모델**: `films = { '시절인, 연': doc, '개구리': doc }`, `doc = {settings, blocks[]}`. block은 `{type:'title'}` 또는 `{type:'board', cuts[]}`. cut은 `{id, s, c, imgs[], context, notes, merged?}` — 텍스트 필드는 contenteditable HTML 문자열, imgs는 `{src(dataURL), fit:'cover'|'contain', zoom?, ox?, oy?}`. 직렬화 v3: `{app:'storyboard-maker', version:3, current, films}`.

**렌더링 파이프라인**: `renderAll()` → `applyAutoHl()`(대사 하이라이트 토글 온이면 재계산) → `computePages()`(숨은 #measure 컨테이너에서 행 높이 실측 → A4에 그리디 패킹, 페이지 초과 컷은 줄 높이에 맞춰 슬라이스 분할 + ⋮ 마커) → `buildPagesDOM()` → 캐럿 복원(텍스트 오프셋 기반) → 썸네일(디바운스). 편집은 contenteditable + execCommand, 입력 700ms 디바운스 후 재렌더.

**임베드 마커 시스템**: 스크립트 끝의 `/*__EMBED_START__*/` … `/*__EMBED_END__*/` 사이에 빌드가 `loadDocFromJSON("…")` 호출을 주입한다(마커는 build.mjs가 사용하므로 유지할 것).

**클라우드(Firebase)**: compat SDK(10.12.5)를 gstatic에서 동적 로드. RTDB 경로 `boards/main/{doc, images/{hash}, meta, presence/editor}`. 이미지는 SHA-256 해시로 내용 주소화해 별도 저장하고 문서에는 `ref:해시`만 남김 → 3.8MB 문서가 34KB 텍스트로 동기화됨. 규칙: 읽기 공개, 쓰기는 로그인(이메일/비밀번호, Firebase Auth)만.
- 편집자(로그인): 텍스트는 트레일링 2초·최대 6초 디바운스, **사진 조작(추가/삭제/이동/반전/크롭/일괄 전환/undo)은 publishFast(150ms) 즉시 발행** — 메타데이터 변경은 이미지가 이미 업로드돼 있어 텍스트급 반영, 성공 시 `dirty=false`(창닫기 경고 해제), "● 클라우드 저장됨" 표시.
- **데이터 보존 불변식**: `modelRev`(markDirty마다 증가)로 발행·원격병합의 비동기 구간(이미지 업로드, restoreDoc 등) 중 로컬 변경을 감지 — 낡은 스냅숏으로 모델을 덮어쓰지 않고 base를 옮기지 않은 채 재병합 루프(발행 6회·수신 4회 한도)를 돈다. `baseStr`은 "그 내용이 모델에 완전히 반영된 서버 상태"일 때만 전진시킬 것(어기면 3-way가 상대 변경을 삭제로 오판). 사진은 `im.id` 기반 개별 3-way 병합(mergeImgs). 원격 적용은 타이핑·조합·모든 조작(lastMutTs) 직후 연기. 추가 안전망: IndexedDB `sb-backup`에 30초 간격(변경 시·유휴 시)+창 닫기 직전 스냅숏 20개 보관, 파일→"로컬 백업 복구…"로 복원(복원본이 클라우드보다 우선 발행됨). 경쟁 재현 테스트는 `__sb.collab.setDelayHook`/`setFb` 사용.
- **핑퐁 방지**: 클라우드 동기화 경로(stripDoc)에서 savedAt 제거 — 매 직렬화마다 값이 바뀌어 동일 내용도 '다름'으로 판정, 편집자 탭 간 재발행 무한 루프의 연료였음(⌘S 파일에는 유지). 추가로 같은 병합 결과를 60초 내 3회 초과 재발행하려 하면 전파 중단(maybeRepublishAhead — 구버전 탭과의 정규화 전쟁 차단). 새 버전 대기(pendingUpdateReload) 중이면 발행 성공 직후 즉시 업데이트 체크.
- **동시 편집 병합**: 편집자도 `doc`을 실시간 구독. `baseStr`(서버의 마지막 알려진 stripped JSON) 대비 로컬/원격 3-way 머지를 **셀(필드) 단위**로 수행(`mergeDocs` — 작품 union → settings 키별 → 블록/컷은 id 기준 리스트 머지: 순서는 로컬이 바꿨으면 로컬 기준, 삭제 vs 수정이면 수정 승리, 같은 필드 동시 수정은 로컬 우선). 발행은 `boardRef('doc').transaction(cur => merge(base, local, cur))`(applyLocally=false)라 발행 경쟁에서도 유실 없음. 원격 수신은 타이핑·IME 조합 중(400ms 이내 입력)엔 연기했다가 한가할 때 적용하며 캐럿을 텍스트 오프셋으로 보존. 모든 병합·발행은 `collabChain` 큐로 직렬화. 한계: 같은 셀을 동시에 타이핑하면 문자 단위 OT가 아니라 셀 단위라 최종 발행자 기준으로 수렴(캐럿 표시로 충돌 회피 유도). presence는 **per-uid** `presence/editors/{uid}`에 `{name, ty(뷰포트 상단 Y·줌1 기준), cy(구버전 폴백), z(배율%), film, m(마우스 pages-local 좌표), car(캐럿/선택: 셀 키+텍스트 오프셋), ts}`를 120ms 스로틀(내용 미변경 시 스킵, 5초 하트비트) + onDisconnect 제거로 브로드캐스트. IME 조합 중에는 전송·강제 리플로우 금지.
- **Spotlight Me**: 편집자 버튼(#b-spot) → presence `spot`(요청 ts, 12초간 송신). 뷰어는 새 spot 수신 시 상단 중앙 #spot-pill로 5초 카운트다운(클릭=거부) 후 해당 편집자 자동 팔로우.
- **실시간 셀 스트리밍**: presence `live:{f,cut,block,nth,html}`(편집 중 셀, ≤20KB, mcell 제외) — 수신 측은 그 셀 DOM에 즉시 반영(모델은 정식 발행·병합이 갱신, 해당 셀 포커스 진입 시 모델로 채택). 발행 지연(2~6초)과 무관하게 타이핑이 준실시간으로 보임.
- 팔로우 중 내 마우스(m): 기본 숨김이되 내가 마우스를 움직이면 표시, 발표자 주도 스크롤/줌(followTick 대이동)이 있으면 다시 숨김(lastMouseMoveTs vs followHideTs). 모바일 축소 시 글씨 비례 축소를 위해 html에 text-size-adjust:100%(폰트 부스팅 차단). 뷰포트 앵커는 기하 스캔이며 **frac은 컷 전체(슬라이스 합산) 기준** — 조각 내 frac을 수신 측이 첫 조각에 적용해 팔로워가 한 페이지 위로 튀던 버그의 원인. 페이지 하단 여백·문서 끝에서는 그 페이지 마지막 행의 끝을 앵커로(다중 페이지 블록의 block 앵커는 첫 페이지로 튐). 왕복(anchor→wantTop) 오차: 콘텐츠 위 0px.
- 로그인: 아이디만 입력하면 `@sb.gyu.dev` 자동 보정(콘솔에서 해당 형식으로 계정 생성).
- 다중 편집자: 모든 접속자(편집자 포함)가 `presence/editors`를 구독 — 상단바에 다른 편집자마다 이름 첫 글자 원형 아바타(uid 해시 색). **아바타 클릭 = 따라가기(고정) 토글**(점프 전용 기능·◉ 버튼은 2026-08 폐지). 따라가는 중 사용자가 직접 스크롤(휠·터치·스크롤바·키보드)하면 자동 해제, 상단 필로도 해제. 문서 위에는 사용자별 색의 Figma식 마우스 커서 + Google Docs식 캐럿/선택 표시(#remote-layer, 재렌더 시 400ms 인터벌로 복구).
- 뷰어(비로그인): `body.viewer` — 편집 UI 숨김/차단(`.eo` 클래스 + `isViewer()` 가드 + contenteditable 비활성), 문서 실시간 구독. PDF 내보내기는 뷰어에게도 허용(파일 메뉴에서 PDF 항목만 노출). 팔로우: rAF 감쇠 보간 0.16, 초록 테두리 #follow-frame + 상단 필.
- 부트: FIREBASE_CONFIG가 있으면 클라우드 문서 수신 전까지 #boot-overlay(로딩 화면)로 내장 문서 플래시를 가림(9초 타임아웃 폴백).
- FIREBASE_CONFIG가 null이면(템플릿 기본) 완전 로컬 모드로 동작.

## 주요 기능 인벤토리 (사용자와 합의된 사양)

- **인원표**: 토프바 '인원표' 버튼 → 전체화면 패널(#crew-panel). 데이터는 작품별 `films[name].crew = {teams:[{id,name,color,members:[{id,name,role}]}], days:[{id,label,sub,h0,h1}], marks:{memberId:{dayId:{hour: teamId|'X'}}}}` — 문서에 저장돼 발행/병합 파이프라인으로 동기화(mergeCrew: 팀/인원 id 병합, 마크는 인원×날짜 키 단위. normalizeFilm·mergeFilmDoc이 crew 필드 보존). 셀: 팀색 채움=확실 가능(타 팀 배정 가능), 빨간 빗금('X')=불가, 빈칸=미정. 좌상단 팀/이름/역할 헤더·코너는 z-index 6으로 가로 스크롤 시 시간 헤더 위 유지. 편집자만: 드래그 = 직사각형 범위 미리보기(.crew-selq) 후 릴리즈 시 일괄 적용(undo 1회), 도구 팔레트+숫자키(1~8 팀, 9 불가, 0 지우개). 불가 표시는 우상단→좌하단 얇은 빨간 실선. 패널 재구축 시 .crew-scroll 스크롤 위치 보존, 팀/인원/날짜 추가·삭제(confirm)·더블클릭 인라인 수정, 팀 컬러픽커, 인원 ⠿ 드래그로 팀 이동/재배치, 시간 범위(h0–h1) 수정. 모든 변경 pushOp(undo)+publishFast. 뷰어는 열람만. 개구리는 최초 오픈 시 PDF 명단·3일차 시드(crewSeedFor), 타 작품은 빈 5팀. 모바일 뷰에선 숨김.
- **모바일 뷰어**: 뷰어 && 화면폭 ≤760px이면 body.mobileview — 앱 UI 유지하되 사이드바·호버성 UI만 숨기고 **툴바를 터치 친화(가로 스크롤·34px 버튼)**로 표시, 인원표 접근 가능. 진입 시 페이지 폭 화면 맞춤 + 핀치 확대. 작품 전환은 툴바 드롭다운(#mswitch 폐지). viewport meta는 진입 시에만 주입.
- 열 보호: `col.core`(마이그레이션으로 기존 열 전부 true, 새 열은 false) — core 열은 삭제 불가.
- C#·Next(라벨 기준) 열은 첫 줄 이외 텍스트를 자동 흐림(`transformDim` 모델 변환 → span/.dim-rest, 멱등·인쇄 반영).
- 행 도구 v2: [⠿ 드래그 핸들(끌어서 컷 이동 — 블록 간 이동 가능, 파란 삽입선)] [＋ 다중 열 컷] [⊞ 단일 열(전체 폭) 셀 추가] [⤓ 아래 컷과 합치기(텍스트 이어붙임+사진 병합, 단일 열 셀 불가)] [✕]. 복제·위/아래 버튼·기존 ⊞ 변환은 폐지.
- 열 도구 v2: [⠿ 드래그 핸들(헤더 위로 끌어 이동)] [✎ 이름 수정] [＋ 추가] [✕]. 이름 수정·추가는 prompt 대신 헤더 셀 인라인 편집(전체선택 시작, Enter/블러 확정, Esc 취소).
- 댓글 UI v2: 행 우상단(우변에 딱 붙게) 플랫 SVG 아이콘 — 호버 시 표시(#cmt-btn), 댓글 있는 행은 .page 안 절대배치 배지(.cmt-chip, 아이콘+개수)가 상시 표시.
- 화면비 메뉴 v2: 단순화된 목록(1.85 최상단) + '사진 원본' 옵션. 선택 = 모든 사진 일괄 크롭/원본(zoom·오프셋 리셋, settings.photoMode 저장, undo 가능). 전부 일치 ✓, 개별 조절 후 −, 재선택 시 다시 일괄+✓. 새 사진 기본 fit도 photoMode 따름. '사진 가져오기' 버튼·파일픽커 폐지(드롭/붙여넣기로 대체).
- 부트 로딩: 전체화면 → 용지 영역만(#boot-overlay가 #editor-scroll 내부, 앱 뼈대는 즉시 표시).
- 마지막 보기 복원: vp().scroll = {ty, zoom} (스크롤 500ms 디바운스·줌 변경 시 저장), viewPrefs._lastFilm — 재방문/새로고침/작품 전환 시 복원. URL에 작품 지정 없으면 마지막 작품.
- 보기 메뉴: '현재 보기를 문서 기본값으로 저장'(orientation·colPct를 문서에 기록, 편집자), '내 보기를 기본값으로 되돌리기'(개인 설정 삭제).
- **등장인물 리스트**: `settings.castL = [{n(이름), c(하이라이트 색)}]` — 팝오버에서 행 추가/제거·인물별 컬러픽커. 구 `cast` 쉼표 문자열은 마이그레이션(빈 리스트+문자열 있음도 대상)·`castMirror()`로 역동기(구버전 호환).
- **캐럿 보존 v2**: DOM 경로(재렌더는 같은 HTML을 재생성하므로 대부분 정확) → 실패 시 '줄바꿈 인지' 오프셋(블록 시작·<br>=1) 폴백. **선택 영역도 보존**: 같은 셀 내 anchor+focus 양 끝을 저장, setBaseAndExtent로 방향까지 복원 — 포커스만 저장·collapse하던 탓에 재렌더/원격 병합마다 드래그 선택이 풀리던 버그의 수정. 순수 텍스트 오프셋은 빈 줄과 이전 줄 끝을 구분 못해 캐럿이 튀던 버그의 원인. 빈 영역 클릭은 caretRangeFromPoint로 클릭 지점에 배치.
- **타이핑 보호**: 셀 포커스+최근 1.2초 입력 시 재렌더 연기, 발행도 입력 350ms 이내면 연기.
- **/ 커서 채팅**: 편집 필드 밖에서 / → 마우스 위치에 채팅 버블(내 테마 색), 입력은 presence `chat:{t,s,sTs}`로 실시간 공유. Enter=커밋(본인 즉시 클리어, 상대는 6초 유지 후 페이드), 5초 무입력 fade out.
- **presence 안정화**: 접속 판정 = ts 5분(백그라운드 탭 타이머 스로틀 대응) — 아바타는 항상 표시, `act`(활동 시각, 15초 단위) 5분 초과 시 회색(.idle), 커서·캐럿·채팅은 act 30초 이내만 표시.
- **전역 실행취소**: 텍스트(editUndo) + 구조 op 스택(hlUndoStack의 `{op}` — 컷 추가/이동/복제/삭제/합치기, 블록 추가/이동/삭제/정렬, 열 조작, 사진 반전/크롭/삭제/이동, 새 문서) — 배열 참조 공유 스냅숏이라 메모리 부담 없음, depth 50. 타이핑해도 스택 유지.
- **프로필**: RTDB `profiles/{uid}` = {name, color, photo(96px JPEG dataURL)} — 토프바 내 아바타 클릭 → 모달. 이름은 presence에, 색은 아바타/커서/캐럿/선택/채팅에, 사진 없으면 첫 글자.
- **개인별 보기 설정**: 용지 방향·열 너비는 사용자(편집자·뷰어)마다 로컬(localStorage `sb_vp`, 작품별) — `effOri()`/`effColPct()`로 읽고, 문서의 settings 값은 기본값. 열 구조 변경(추가/삭제/이동)은 공유(문서). 팔로우는 레이아웃이 달라도 같은 셀에 도착하도록 presence에 뷰포트 상단 셀 앵커(`a:{cut|block, frac}`)를 실어 `anchorWantTop()`으로 해석(실패 시 ty 근사 폴백).
- 대사 하이라이트 세그먼테이션은 모든 중첩 깊이의 div/p를 컨테이너로 처리(블록을 span으로 감싸면 배경이 안 보이는 버그 수정, 2026-08).
- A4(상하좌우 10mm 여백), **동적 컬럼** 표 — 기본 5열(S#, C#, Video, Context, Notes), `settings.cols` = `{id, label, kind:'text'|'video'}` 배열, `colPct`와 인덱스 동기. 헤더 셀 호버 시 열 도구(#coltools, Win8 스타일)로 열 이동(◀▶)·오른쪽에 새 텍스트 열 추가(＋, prompt로 이름)·삭제(✕, confirm — Video 열은 삭제 불가, 최소 2열). 사용자 열 데이터는 cut[colId]에 저장(삭제해도 데이터는 남음), 클래스 c-x. S#/C# 열은 슬라이스 시 첫 조각에만 표시되는 라벨 열. 표는 상단 정렬·좌우 중앙. 헤더 행은 모든 페이지 반복, 배경색 선택 가능(문서 메뉴). 페이지 번호 토글.
- 사진 붙여넣기 경로: clipboardData.files → items(kind=file) 폴백 → HTML `<img>` 다운로드 → **비동기 클립보드(navigator.clipboard.read, 1.5초 제한)** — 피그마 등 paste 이벤트에 비트맵이 안 실리는 앱 대응. 피그마 벡터(figmeta/figclip)만 있으면 "Copy as PNG" 안내 토스트.
- 빌드 확인: `BUILD_ID`(build.mjs가 KST 타임스탬프 주입)를 로드 시 우상단 #build-toast로 4.5초 표시. **자동 갱신**: `/sb/version.txt`(수십 바이트)를 로드+2.5초·탭 복귀·10분 주기로 폴링(?t= CDN 캐시 우회) — 새 빌드면 saveHandoff()로 현재 문서를 IndexedDB에 저장 후 `&su=1`로 무감지 리로드. su 부트는 클라우드 도착 전이면 핸드오프 문서를 즉시 그려 스피너 없이 이어 보기(cloudDocArrived 게이트). 미저장/조합/드래그 중엔 연기했다가 발행 성공 직후 갱신. sessionStorage 가드로 빌드당 1회.
- Video 셀: 화면비 드롭다운(기본 1.85:1, 3:2·16:9·2.39:1 등) + 전체 크롭/원본 일괄 전환. 사진 다중 스택(세로, 2mm 간격). 삽입 시 자동 다운스케일(최대 1200px JPEG 0.82). 셀 클릭=선택(다크 링), ⌘V 붙여넣기(클립보드에 파일이 없으면 HTML 속 img 주소에서 다운로드 — 구글 닥스 대응), 호버 시 "＋ 사진 가져오기" 버튼만 파일 선택창을 연다. 사진 클릭=사진 선택(파란 오버레이 링) → ⌘C 복사/Delete 삭제(⌘Z 복원). 크롭 상태에선 "확대" 버튼 → 슬라이더(100~300%) + 드래그로 위치 조정(경계 클램프). 사진 도구에 좌우(↔)/상하(↕) 반전(`im.flipH/flipV`, `imgTransform()`으로 확대·이동과 합성). **사진 드래그 앤 드롭**: vbox 드래그로 같은 셀 내 순서 변경(위/아래 절반에 파란 라인 표시)·다른 컷의 Video 칸으로 이동(점선 테두리), ⌘Z로 되돌리기. 단 크롭+확대(zoom>1) 상태의 사진은 드래그가 위치 조정(팬)으로 동작. 사진 도구·가져오기 버튼·확대 슬라이더는 Windows 8 스타일(플랫·직사각형·반투명 회색, 호버 시 어두워짐).
- 컷 행 도구(호버): 위/아래 이동, 추가(C# 자동 연속: "1"→"2", "8-A"→"8-B"), 복제, 한 칸 합치기(⊞, 빈 컷만·비가역·씬 상단 메모/사진용 — 이미지 전폭 밴드, 드래그 이동·재선택 후 모서리 리사이즈), 삭제. 마지막 컷 Notes에서 Tab → 새 컷.
- 하이라이트: "대사 하이라이트" 켬/끔 토글 + chevron 팝오버에서 등장인물 편집 — 줄 단위 매칭(이름+공백, 이중 공백, V.O./O.S. 표기 허용), 이름 볼드, 색은 이름 순서(빨강·파랑·초록 순환). 렌더마다 재계산. (구 "촬팀 하이라이트"(⌘1)는 2026-08 삭제됨 — 기존 문서의 초록 텍스트는 그대로 유지)
- 좌상단 작품 드롭다운("시절인, 연" / "개구리"), Storyboarder 브랜드 텍스트. 사이드바: 씬 단위 벤토(S#라벨), 페이지 드래그 정렬(씬 경계 스냅 — 제목 페이지가 씬 중간에 못 들어감), 우클릭 삭제, panel-left 아이콘으로 접기. 용지 방향 아이콘 버튼.
- 저장: ⌘S = JSON 파일(File System Access), 열기, PDF 내보내기(인쇄: 여백 없음·배경 그래픽 켬), "박광규 제출용 백업 내보내기"(전체 데이터 JSON — index_n.html 내보내기는 2026-08 폐지, SELF_HTML 캡처도 제거됨). 파일 메뉴 맨 아래에 현재 빌드 번호 표시(#build-info).
- **댓글**: 컷(행) 단위, RTDB `comments/{cutId}/{commentId}` = `{text, name, ts, uid?(편집자), vid?(뷰어 localStorage id), edited?}`. 행 호버 시 오른쪽 변 끝에 💬 버튼(뷰어 포함), 댓글 있는 행은 마지막 셀에 개수 칩. 패널에서 작성(⌘↵)/수정(작성자만 — prompt)/삭제(편집자+작성자, confirm). 뷰어 신원은 localStorage(sb_vid, 첫 작성 시 이름 prompt → sb_vname). 뷰어 쓰기는 RTDB 규칙에서 `comments` 경로만 `.write: true` 개방 필요(FIREBASE_SETUP.md). 컷 삭제 시 편집자가 해당 댓글 노드도 정리.
- shadcn 스타일 UI(zinc 팔레트, 고스트 버튼, 커스텀 드롭다운·슬라이더). 토스트는 최소한으로.

## 규칙·주의사항

- **모든 작업 시작 시 `git status` 확인 후 `git pull --ff-only`로 원격과 동기화하고 시작할 것.**
- **단일 파일 유지.** 외부 의존성 추가 금지(Firebase SDK CDN, 웹폰트 CDN — Pretendard(jsdelivr)·IBM Plex Mono(Google Fonts) — 제외). 새 기능도 storyboard.html 안에. Plex Mono의 한글 폴백은 Pretendard.
- 인쇄 충실도가 핵심: 페이지는 mm 단위, `@page{size:A4 …;margin:0}`, 화면 전용 요소는 `.noprint`. 페이지네이션 수치를 바꾸면 인쇄 결과를 반드시 검증(Playwright `page.pdf()`로 A4 크기·페이지 수 확인해 왔음).
- 한국어 IME: composition 중 재렌더 금지(기존 로직 유지). 캐럿 복원은 텍스트 오프셋 기반이라 텍스트를 바꾸지 않는 DOM 변형은 안전.
- 뷰어 모드 가드: 새 상호작용 핸들러를 추가하면 반드시 `isViewer()` 가드와 `.eo`(또는 viewer CSS 숨김)를 함께 고려할 것.
- doc-data.json 갱신: 라이브 사이트에서 ⌘S로 저장한 .sbd.json이 곧 v3 스냅숏이므로 그대로 교체하면 된다. 단, 지금은 클라우드가 콘텐츠의 소스 오브 트루스라 내장 문서는 폴백 용도 — 코드만 고칠 때는 갱신 불필요.
- 검증 습관: 수정 후 `node --check`(스크립트 추출) + Playwright 헤드리스(로컬 file://)로 회귀 확인. 이 환경에서는 firebase SDK가 로드 안 되어도 로컬 모드로 폴백하므로 UI 검증 가능. `window.__sb`에 테스트용 API 노출되어 있음(doc, films, serialize, loadDocFromJSON, switchFilm, crewHighlight, addCutImages, cloud.setRole, follow.setTarget 등).

## 미결/알려진 한계

- 공동 편집은 셀 단위 병합까지 구현(2026-08). 같은 셀 내 문자 단위 OT/CRDT는 미구현 — 필요해지면 diff3 텍스트 머지를 pick3의 "둘 다 수정" 분기에 추가하는 것이 다음 단계.
- 자동 대사 하이라이트가 켜진 동안엔 오탐 줄("인수 대사 끝나면…" 같은 지문)이 재계산마다 다시 칠해짐 — 예외 규칙 필요 시 추가 예정.
- 문서 편집 undo: 셀 단위 스냅숏 스택(`editUndo`/`editRedo`) — beforeinput(변경 직전)에 모델 값을 저장, 연속 타이핑은 900ms 창으로 병합, ⌘Z/⌘⇧Z를 가로채 복원(재렌더로 DOM이 교체돼도 유지). execCommand 경로(붙여넣기·B/I/U)는 beforeinput이 안 오므로 호출 직전에 직접 스냅숏. 사진 삭제/이동(hlUndoStack)과는 ts 비교로 더 최근 조작을 취소.
- RTDB 무료 한도(전송 10GB/월) — 시청자 수십 명 규모까지 여유.
