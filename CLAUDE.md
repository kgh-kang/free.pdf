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
- `index.html` — 한국어 페이지 (HTML 마크업 + 인라인 `window.I18N` 한국어 사전)
- `en/index.html` — 영문 페이지 (HTML 마크업 + 인라인 `window.I18N` 영문 사전)
- `assets/app.js` — 두 페이지가 공유하는 JS. 사용자 표시 문자열은 `window.I18N`에서 읽음
- `assets/styles.css` — 두 페이지가 공유하는 CSS
- `README.md` — 프로젝트 소개
- `CHANGELOG.md` — 변경 이력

## 코딩 규칙
- 외부 서버 통신 금지 (CSP: connect-src 'none')
- 새 기능 추가 시 기존 도구와 동일한 워크플로 패턴 유지: 업로드 → 설정 → 실행 → 다운로드
- 사용자 표시 문자열은 코드에 박지 않고 `window.I18N`에 추가 후 양쪽 사전(`index.html`, `en/index.html`) 동시 갱신
- 새 element id를 추가했다면 KO/EN HTML 양쪽에 동일하게 추가 (기능 동기화 유지)
- 색상 4단계: #fff(primary), #e0e0e0(secondary), #888(tertiary), #555(muted)
- transition 속도 통일: .2s
- border-radius 통일: 12px(카드/버튼/입력), 8px(소형)

## 작업 방식
- 디자인/기능 평가가 필요할 때 병렬 에이전트를 적극 활용할 것
- 독립적인 작업은 병렬로 진행하여 효율을 높일 것

## 알려진 이슈
- 100페이지 이상 PDF 합치기 시 오류 발생 가능 (브라우저 메모리/렌더링 관련)
