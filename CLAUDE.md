# free.pdf

## 프로젝트 개요
브라우저 기반 PDF 도구 모음. 서버 전송 없이 클라이언트에서 모든 처리를 수행한다.
HTML 페이지 + 공유 JS/CSS 구조이며, pdf-lib와 pdf.js를 CDN으로 로드한다.
다국어 지원: `index.html` (한국어), `en/index.html` (영문) — 두 페이지가 동일한 `assets/app.js`, `assets/styles.css`를 공유한다.

## 디자인 철학
- **직관적**: 한눈에 기능을 파악할 수 있어야 한다
- **간단**: 불필요한 옵션을 줄이고 핵심에 집중한다
- **사용하기 쉬움**: 드래그 앤 드롭, 명확한 라벨, 일관된 워크플로
- **디자인**: Corporate SaaS 다크 스타일, Pretendard + Playfair Display 폰트, 보라(#a855f7) 액센트

## 도구 구성 (3개)
1. PDF 편집 (EDIT) — 상단 툴바 기반 통합 편집기. 합치기/추출/삭제/회전 + 저장 시 stamp(페이지번호/텍스트/워터마크) 적용. stamp는 *선택된 페이지에만* 적용
2. 이미지 변환 (CONVERT) — 이미지→PDF / PDF→이미지 탭 전환
3. 텍스트 추출 (TEXT) — PDF에서 텍스트 복사

EDIT 툴바: `[+ 파일] | [번호 #] [텍스트 T] [워터마크 ⊕]`. 오른쪽 3개는 클릭 → 패널 열림 → 체크박스로 적용 ON/OFF. 활성 시 툴바 버튼에 ✓ 표시. 한 번에 한 패널만 노출.

### 텍스트 도구 (Adobe 스타일)
- [텍스트] 패널의 체크박스는 *추가 모드* 토글 — ON 상태에서 페이지 미리보기 모달의 캔버스를 클릭하면 그 위치에 contenteditable 텍스트 박스 생성
- 박스는 `editPages[i].textBoxes[]` 에 저장: `{id, text, x, y, size, color}` (x,y는 PDF 점 단위, 좌상단 원점)
- 모달에서: 호버 시 X 버튼, 드래그로 이동(포커스 전), 클릭으로 편집(포커스 후), ESC로 blur
- 썸네일/저장 모두 `pg.textBoxes` 순회하며 그림. 저장 시 PDF 좌표로 Y축 반전 (`pageHeight - y - size`)
- 페이지 회전 시 박스 좌표 변환 미지원 → confirm 후 클리어

### 썸네일 미리보기 라이브
- `renderThumbCanvas(pg, opts, pageIndex)` + `applyStampOverlays` + `drawTextBoxesLayer` — stamp 옵션과 텍스트 박스 모두 캔버스에 합성
- 옵션 변경 시 `scheduleThumbRedraw()` 200ms debounce 후 모든 썸네일 redraw
- THUMB_SCALE=0.5, MODAL_SCALE=1.5 — `applyStampOverlays(ctx, w, h, opts, scale, pageIndex)` 가 두 스케일 모두 처리

## 기술 스택
- HTML5 + Vanilla CSS + Vanilla JS (프레임워크 없음)
- pdf-lib@1.17.1 — PDF 생성/편집/합치기
- pdf.js@3.11.174 — PDF 렌더링/텍스트 추출
- Pretendard Variable (CDN) — 본문 폰트
- Playfair Display (Google Fonts) — 카드 장식 텍스트
- 빌드 도구 없음, 정적 파일만으로 동작

## 구조
- `index.html` — 한국어 페이지 (HTML 마크업)
- `en/index.html` — 영문 페이지 (HTML 마크업)
- `assets/app.js` — 두 페이지 공유 JS. 사용자 표시 문자열은 `window.I18N` 에서 읽음
- `assets/i18n-ko.js` — 한국어 i18n 사전 (`window.I18N=...`). app.js 보다 *먼저* 로드됨
- `assets/i18n-en.js` — 영문 i18n 사전
- `assets/styles.css` — 공유 CSS
- `assets/fonts/Pretendard-Regular.otf`, `assets/fonts/NanumGothic-Regular.ttf`, `assets/fonts/korean-base64.js` — 한글 텍스트 임베드용 폰트
- `README.md` — 프로젝트 소개
- `CHANGELOG.md` — 변경 이력
- `EVALUATION.md` — 페르소나 평가 결과 (2026-04-29 기준, 이후 라운드 변경사항은 CHANGELOG 참고)

## 보안 / CSP
- `script-src 'self' https://unpkg.com https://cdnjs.cloudflare.com [...]` — `'unsafe-inline'` *없음*. 인라인 스크립트/onclick 모두 외부 .js 또는 data-action 위임으로 처리됨
- `style-src 'self' 'unsafe-inline' [...]` — 인라인 `style=""` 사용 중이라 유지 (P2 강화 대상)
- `connect-src 'self' https://unpkg.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com` — 폰트/소스맵 fetch 허용
- `pdfjsLib.getDocument` 호출 시 `isEvalSupported:false`, `enableXfa:false` (`PDFJS_SAFE_OPTS` 상수)
- 파일 크기 상한 `SIZE_MAX = 300MB` — `setupDropZone` 에서 사전 검증

## 코딩 규칙
- 외부 서버 통신 최소화 (사용자 파일은 외부로 전송 안 함, CSP `connect-src` 는 폰트/소스맵 정도만 허용)
- 새 기능 추가 시 기존 도구와 동일한 워크플로 패턴 유지: 업로드 → 설정 → 실행 → 다운로드
- 사용자 표시 문자열은 코드에 박지 않고 `assets/i18n-ko.js` + `assets/i18n-en.js` 양쪽 사전에 동시 추가
- 새 element id 추가 시 KO/EN HTML 양쪽 동일하게 (기능 동기화)
- 인라인 onclick 금지 — `data-action="..."` + `app.js` 위임 핸들러 사용. 액션 종류: `home`, `tool`, `reset-tool`, `reset-convert`, `welcome-close`, `tip-close`
- 색상 4단계: #fff(primary), #e0e0e0(secondary), #888(tertiary), #7a7a8a(muted, WCAG AA 통과)
- transition 속도 통일: .2s
- border-radius 통일: 12px(카드/버튼/입력), 8px(소형)
- 인라인 `<button onclick=...>` 또는 `<button onclick="resetTool('text')">` 같은 패턴 금지 — CSP에서 `'unsafe-inline'` 제거됨

## PDF 처리 헬퍼
- `getPdfDoc(data, password?)` — pdf.js 로드 + safe 옵션
- `unlockPdf(arrayBuffer, fileName)` → `{doc, password}` — 암호 PDF 자동 감지, prompt 3회 재시도
- `getPdfDocSafe` — 위와 동일하지만 doc만 반환
- 결과 password는 `pg.password` / `pdf2imgData.password` 에 보존 → 후속 호출 시 재사용 (openPageEditor 등)

## UX 패턴 — 첫 진입 가이드
- 홈 환영 배너: `#welcomeBanner`, localStorage `freepdf.welcomed`
- 도구별 팁 배너 (예: 변환 도구 회전): `#convertRotateTip`, localStorage `freepdf.tip.<key>`
- 일반화된 헬퍼: `showTipIfNew(tipKey, elementId)` + `data-action="tip-close" data-tip="<key>"` 위임 핸들러
- 새 팁 추가 시 동일 패턴 따름 (예: `freepdf.tip.editText`)

## Undo/Redo
- 50-deep snapshot 히스토리 (`_history.past/future`)
- `Cmd/Ctrl+Z` undo, `Cmd/Ctrl+Shift+Z`/`Ctrl+Y` redo
- contenteditable 안에서는 브라우저 native (텍스트 char 단위) 우선
- 변형 직전 `pushHistory()` 호출 — 17곳 와이어 (파일 추가/제거, 페이지 선택/회전/순서, 박스 추가/이동/스타일/정렬/삭제, Ctrl+D 복제)
- 자동 정리(빈 박스 제거 등)는 `_history.suspended++/--` 로 undo 대상에서 제외

## 작업 방식
- 디자인/기능 평가가 필요할 때 병렬 에이전트를 적극 활용
- 독립적인 작업은 병렬로 진행
- git commit/push 는 사용자가 명시적으로 요청할 때만 (자동 commit 금지)

## 알려진 이슈 / 제약
- 100페이지 이상 PDF 합치기 시 오류 발생 가능 (브라우저 메모리/렌더링)
- `openPageEditor` 540줄 단일 함수 — 섹션 주석으로 가독성만 개선, 본격 클래스화는 별도 라운드
- 회전된 페이지에 이미지 박스 PDF 저장 시 좌표 어긋날 가능성 (검증 미완)
- contenteditable Cmd+Z 는 char 단위 native 만 — 박스 단위 undo 는 blur 후
- PDF 암호 *설정* (출력에 암호 걸기) 미지원 — pdf-lib 직접 지원 없음, 별도 라이브러리 필요
- `style-src 'unsafe-inline'` 유지 (인라인 style 다수)
- OCR / PWA / 다중 페이지 박스 일괄 적용 / 박스 템플릿 — P2 차별화 작업, 미진행
