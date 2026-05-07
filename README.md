# site/ — 인계 폴더

영화 prop 사이트 작업 폴더. 자세한 인계 정보는 상위 폴더의 `CONTEXT.md` 참고.

## 폴더 구조

```
site/
├── d/         gyu.dev/d (중고사이트)
├── g/         gyu.dev/g (검색사이트, 원본 SingleFile 캡처 기반 SPA)
├── shared/    공통 자산 (모달/게이트/링크차단/.md 파서)
├── CNAME      GitHub Pages custom domain (gyu.dev)
├── .nojekyll  GitHub Pages에서 _profile-img-data.txt 등 언더스코어 파일 보존
├── serve.sh   로컬 테스트용 정적 서버
└── README.md  (이 파일)
```

## 빠르게 로컬 테스트

```bash
chmod +x serve.sh
./serve.sh
# 중고거래 (목록):  http://localhost:8080/d/
# 상세 페이지:      http://localhost:8080/d/product-1.html
#                  http://localhost:8080/d/product-2.html
# 검색사이트:       http://localhost:8080/g/

# 같은 Wi-Fi 휴대폰/다른 기기:
# http://192.168.0.24:8080/d/
# http://192.168.0.24:8080/g/
```

## 콘텐츠 편집

- 상품 1 텍스트:    `d/product-1.md`
- 상품 2 텍스트:    `d/product-2.md`
- 상품 1 이미지:    `d/images/product-1/1.jpeg`(여러 장이면 `2.jpeg, 3.jpeg…` 추가 후 .md `images:` 갱신)
- 상품 2 이미지:    `d/images/product-2/`
- 검색 기록 목록:   `g/search-history.md`

`python3 -m http.server 8080` 서버 하나로 `/d`와 `/g`를 동시에 확인할 수 있다. 두 주소를 서로 다른 브라우저 탭/기기에서 열면 된다.

## GitHub Pages 배포

`site/` 폴더의 내용을 `vacangyu.github.io` 저장소 루트에 그대로 올린다. `CNAME`과 `.nojekyll`도 함께 포함되어야 한다.

## 비밀번호

- 게이트 비밀번호: **`파이팅`** 또는 **`vkdlxld`** (DAANGN/GOOGLE 공용)
- 다시 게이트 보고 싶으면 콘솔에서:
  ```js
  localStorage.removeItem('clone-gate-shared'); location.reload();
  ```

## 다음 AI에게 인계

상위 폴더의 `CONTEXT.md`에 상세 진행 상태와 미완료 작업, 사용자 결정사항 등이 정리되어 있음.
