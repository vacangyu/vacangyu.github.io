/* Storyboarder 빌드 스크립트
   사용법: node build.mjs  →  dist/index.html 생성
   구성: storyboard.html(템플릿) + firebase-config.json(클라우드 설정) + doc-data.json(내장 문서) */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';

let html = readFileSync(new URL('./storyboard.html', import.meta.url), 'utf8');

/* 빌드 번호(KST 타임스탬프) 주입 — 로드 시 우상단 토스트로 표시됨 */
const buildId = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' }).slice(0, 16);
html = html.replace(
  "const BUILD_ID = null; /* ← 빌드 시 타임스탬프 주입 */",
  'const BUILD_ID = ' + JSON.stringify(buildId) + ';'
);
console.log('빌드 번호: ' + buildId);

try {
  const cfg = JSON.parse(readFileSync(new URL('./firebase-config.json', import.meta.url), 'utf8'));
  html = html.replace(
    "const FIREBASE_CONFIG = null; /* ← 여기에 firebaseConfig 객체 붙여넣기 */",
    'const FIREBASE_CONFIG = ' + JSON.stringify(cfg, null, 2) + ';'
  );
  console.log('firebase-config.json 적용됨');
} catch (e) { console.warn('firebase-config.json 없음 → 로컬 전용 빌드'); }

try {
  const data = readFileSync(new URL('./doc-data.json', import.meta.url), 'utf8');
  const payload = 'try { loadDocFromJSON(' + JSON.stringify(data).replace(/<\//g, '<\\/') +
    '); } catch (e) { console.error("내장 문서 로드 실패", e); }';
  const MS = '/*__EMBED_' + 'START__*/', ME = '/*__EMBED_' + 'END__*/';
  const i = html.indexOf(MS), j = html.lastIndexOf(ME);
  if (i < 0 || j < 0) throw new Error('임베드 마커를 찾을 수 없음');
  html = html.slice(0, i + MS.length) + '\n' + payload + '\n' + html.slice(j);
  console.log('doc-data.json 내장됨 (' + Math.round(data.length / 1024) + ' KB)');
} catch (e) { console.warn('doc-data.json 미적용:', e.message); }

mkdirSync(new URL('./dist/', import.meta.url), { recursive: true });
writeFileSync(new URL('./dist/index.html', import.meta.url), html);
/* 경량 버전 체크 파일 — 앱은 이 파일(수십 바이트)만 폴링해 새 빌드를 감지 */
writeFileSync(new URL('./dist/version.txt', import.meta.url), buildId);
console.log('완료: dist/index.html (' + Math.round(html.length / 1024) + ' KB) + version.txt');

/* /sb 메인 리스트 페이지: databaseURL 주입 */
try {
  let home = readFileSync(new URL('./sb-home.html', import.meta.url), 'utf8');
  const cfg = JSON.parse(readFileSync(new URL('./firebase-config.json', import.meta.url), 'utf8'));
  if (cfg.databaseURL) {
    home = home.replace(
      "const DATABASE_URL = null; /* ← 빌드 시 firebase-config.json의 databaseURL 주입 */",
      'const DATABASE_URL = ' + JSON.stringify(cfg.databaseURL) + ';'
    );
  }
  writeFileSync(new URL('./dist/sb-home.html', import.meta.url), home);
  console.log('완료: dist/sb-home.html');
} catch (e) { console.warn('sb-home.html 미적용:', e.message); }
