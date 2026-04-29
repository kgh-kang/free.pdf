# Changelog

## [2026-04-29] — Undo/Redo + 모바일 모달 + 이미지 회전 좌표

### Undo/Redo (P0-6)
- 50-deep snapshot 히스토리 스택 (`_history.past/future`)
- `Cmd/Ctrl+Z` undo, `Cmd/Ctrl+Shift+Z`/`Ctrl+Y` redo
- contenteditable/input/textarea 안에선 브라우저 native undo (텍스트 char 단위) 우선
- 17곳 변형 직전 `pushHistory()` 와이어: 파일 추가/제거, 페이지 선택/회전/순서, 박스 추가/이동(드래그 첫 이동 시)/스타일변경/정렬/삭제, Ctrl+D 복제
- `_history.suspended` 카운터로 빈 박스 자동 정리는 undo 대상에서 제외
- Undo 시 모달 닫기(closeAnyOpenEditor) + workspace/dropzone 토글

### 모바일 모달 적응형 (P0-7)
- 600px 이하: 툴바를 `position:fixed` 하단 시트로, `flex-wrap:nowrap; overflow-x:auto` 가로 스크롤, `backdrop-filter:blur(8px)`
- `order:99` 로 DOM 순서와 무관하게 시각적으로 캔버스 아래 배치
- 44px 터치 타겟 일괄 적용: add/icon-btn/num/select/color-picker, close/nav 버튼
- `.modal-tb-hint`, `.modal-tb-label`, `.modal-preview-note` 모바일 숨김 (공간 확보)
- 캔버스 `max-height:calc(100vh - 200px)` — 툴바 영역 잠식 방지

### 이미지 박스 회전 좌표 변환 (P1)
- 페이지 회전 시 textBox 변환 로직과 동일하게 imageBox 좌표 변환
- 좌상단 회전: `nx = oldH - b.y - b.h; ny = b.x`
- 박스 폭/높이 swap, naturalW/H swap (resize aspect 정합성 유지)

### 코드 정리 (P1)
- `buildModalTextToolbar()` 추출 — openPageEditor 안의 30줄 툴바 DOM 빌드 청크 분리 (순수 함수)
- openPageEditor 안에 8개 섹션 주석 (`===== 1. PDF 페이지 렌더 ...` 등) 추가 — 함수 길이는 유지하면서 가독성 개선

### 알려진 한계
- openPageEditor 540줄 → 본격적 리팩터(클래스화)는 별도 라운드. 현재는 섹션 주석으로 가독성만 개선
- 이미지 박스 PDF 저장 시 회전된 페이지에서 좌표가 어긋날 가능성 (별도 이슈)
- contenteditable 안에서 Cmd+Z는 char 단위 native undo만 — 박스 단위 undo는 blur 후

---

## [2026-04-29] — 텍스트/이미지 편집 강화 + 7개 페르소나 평가 + P0 5건 적용

### 텍스트 편집 (모달 단일 진입점)
- 메인 툴바의 [T 텍스트] 패널 제거, 모달 안에 떠다니는 툴바로 통합
- 모달 툴바 구성: `[+ 텍스트] [+ 이미지] | 크기 색상 [B] [U] | 정렬 3종 | 배경 | (다중선택 시) 박스 정렬 6방향`
- 박스 데이터 모델 확장: `{bold, underline, align, bg}` 추가
- 인라인 스타일 편집: 박스 클릭 → 툴바가 그 박스 설정으로 sync, 툴바 변경 → 박스 즉시 갱신
- 툴바 배경 제거 + 추가 버튼 폭 통일 (min-width:96px)
- 서식 옵션은 addMode/박스 선택 시에만 표시 (기본은 [+ 텍스트] [+ 이미지]만)

### 이미지 박스 (Adobe 스타일)
- 모달 [+ 이미지] 클릭 → 파일 선택 → 페이지 가운데 자동 배치
- 호버 시 우상단 ✕ 삭제 버튼, 우하단 보라 핸들로 비율 유지 리사이즈
- 별도 imageLayer DOM (textLayer와 분리, z-index 차등)
- PDF 저장 시 `embedPng/embedJpg` + `drawImage`

### 인터랙션
- **다중 박스 선택**: Shift+클릭 토글, 노란 outline 표시
- **박스 정렬 6방향**: 좌/가운데/우 + 위/가운데/아래 (다중 선택 2개 이상일 때만 자동 표시)
- **키보드 단축키**: 박스 편집 중 `Ctrl+D` 복제, `Ctrl+Backspace` 삭제, `ESC` blur
- **페이지 좌우 네비**: 모달 양쪽 ‹ › 화살표 + ←/→ 키, 첫/마지막 페이지에서 자동 비활성
- **In-place 페이지 전환**: 새 모달 렌더 완료 후 옛 overlay 제거 → 메인 화면 노출 깜빡임 X
- **터치 지원**: mouse → pointer 이벤트 통합, setPointerCapture로 드래그 안정화
- **회전 시 박스 좌표 자동 변환**: 90° 시계 변환식 (textBoxes만, imageBoxes는 미지원)

### 색상 입력
- 텍스트 색상/배경색에 native `<input type="color">` picker 추가 (24bit RGB 임의 선택)
- select와 picker 양방향 동기화

### 폰트 (Pretendard → NanumGothic 교체)
- `Pretendard-Regular.otf`(CFF) → `NanumGothic-Regular.ttf`(TrueType)
  - fontkit이 Pretendard CFF 파싱 시 `topDict` 에러 발생, TTF는 안정
- `subset:false`로 임베드 (subset이 한글 일부 글자 누락시키는 이슈 회피)
- 가짜 굵게(fake bold): 0.4pt 옆으로 한 번 더 그려서 효과
- 밑줄: HTML/Canvas/PDF 3곳 모두 렌더링 (PDF는 `drawLine`)
- file:// 환경 대응: base64 lazy load (`korean-base64.js`, ~2.7MB) — `<script>` 태그로 동적 로드, fetch 차단 우회

### 화질 / 레이아웃
- 미리보기 모달: `MODAL_SCALE × max(2, dpr)` × 페이지 sharpening (캔버스 픽셀 ~3-4배)
- 썸네일: `THUMB_SCALE 0.5 → 0.85` + dpr 곱 적용
- 페이지 그리드: 4열 → 3열 (가독성 ↑)
- 사이드바: 1400px 이상에서 main 영역 외부 우측 floating (page-grid 공간 침범 X)
- 파일 클릭: "그 파일 페이지만 토글" (기존 "그것만 select" → 직관 반대였던 동작 수정)
- 페이지 그리드 맨 앞 `+ 추가` 박스 제거 (상단 툴바와 중복), 끝에만 유지

### 메인 툴바 / 헤더
- divider 제거 + 균일 8px gap
- 전체 선택/해제 토글을 메인 툴바 우측으로 이동 (page-grid-controls 통째 제거)
- "크게 보기" 버튼 삭제
- tool-desc 아래 `tool-hint` 추가: "각 페이지 우측 상단의 ⤢ 버튼으로 크게 보면 텍스트·이미지 추가 가능"
- 뒤로가기 버튼: 흰색 pill ("← 돌아가기")
- 미리보기 안내문 흰색 가독성 ↑
- 파일 목록 sidebar-title 흰색 + 13px 굵게

### CSP / 환경
- `connect-src`에 `unpkg.com`, `cdn.jsdelivr.net`, `cdnjs.cloudflare.com` 추가 (sourcemap 차단 해소)
- `worker-src blob:` 추가 (pdf.js worker)
- `font-src`에 jsdelivr/gstatic 허용
- file:// 환경에서는 로컬 fetch 시도 자체를 건너뛰어 콘솔 노이즈 제거
- GoatCounter `https://` 명시 (file:// 프로토콜 오류 방지)

### 평가 (P0 5건 적용)
- 7개 페르소나 평가 진행 (첫 방문자/파워유저/UI·UX/경쟁/모바일/코드/보안) → `EVALUATION.md`에 종합
- **파일명 XSS 패치**: `escapeHtml` 강화(`"`/`'`/`&` 모두 처리) + 파일 리스트 innerHTML escape
- **메모리 누수 방지**: `pdf.destroy()` 호출 + `_imgCache.clear()` (resetTool/editClearBtn)
- **저장 버튼 라벨 동적화**: 파일 2개+ → "합쳐서 저장", 1개+일부 선택 → "추출해서 저장"
- **색대비 개선**: `#555` → `#7a7a8a` 10곳 일괄 치환 + page-thumb-check ✓ 표시 (색-only 의존 제거)
- **접근성 마크업**: 카드 `<button>` + aria-label, 드롭존 `role="button" tabindex="0"` + Enter/Space 키 처리, 페이지 썸네일 `role="checkbox" aria-checked` + 키보드 토글, focus-visible 통일

### 알려진 이슈 / 내일 작업
- Undo/Redo 미지원 (P0)
- 모바일 모달 320~600px에서 툴바 wrap으로 캔버스 영역 잠식 (P0)
- 회전 시 imageBoxes 좌표 변환 미지원
- `openPageEditor` 520줄 단일 함수 (기술 부채)
- WCAG 2.1 AA 점수 3.5/10 → P0 적용 후 ~5.0/10 추정

---

## [Unreleased]

### 구조 변경
- HTML/CSS/JS 분리: `assets/styles.css` + `assets/app.js` 공유 자산으로 추출
- 한국어/영문 페이지가 동일한 JS/CSS 파일 참조 — 기능 동기화 자동
- 사용자 표시 문자열을 `window.I18N` 사전으로 분리 (각 HTML 인라인)
- 영문 페이지를 한국어 v3.0 디자인에 맞춰 재구성

### 폰트
- Pretendard `.otf` 로컬 번들 (`assets/fonts/Pretendard-Regular.otf`)
- pdf-lib + fontkit 으로 임베드, 한글 페이지번호/텍스트/워터마크 지원
- CSP `connect-src 'self'` 로 완화 (로컬 폰트 fetch)

### EDIT 통합 툴바 (도구 4 → 3)
- 워터마크 도구를 EDIT으로 완전 흡수 — 홈 카드 4개 → 3개 (MARK 제거)
- EDIT 상단 툴바: `[+ 파일] | [번호] [텍스트] [워터마크]`
- 워터마크/번호 stamp는 모두 *선택된 페이지에만* 적용 — 기존 워터마크 도구의 "전체 페이지 일괄"과 차별화
- 워터마크 텍스트/이미지 모드 서브탭, 페이지번호 모드는 별도 [번호] 버튼으로 분리

### Adobe 스타일 텍스트 박스 편집
- [텍스트] 도구가 단순 stamp → **페이지별 자유 텍스트 박스** 로 재정의
- 썸네일 ⤢ 미리보기 모달이 편집 모드 — 텍스트 모드 활성 시 캔버스 클릭 → 그 위치에 contenteditable 박스 생성
- 박스 호버 시 X 버튼 (삭제), 드래그로 이동 (포커스 안 됐을 때), 클릭으로 편집 모드 진입
- 박스마다 위치/크기/색상 독립 — Pretendard 임베드로 한글 입력 OK
- 빈 박스 자동 정리 (blur 시 텍스트 비어있으면 제거)
- ESC: 박스 안에선 blur, 박스 밖에선 모달 close
- 페이지 회전 시 confirm 후 텍스트 박스 모두 클리어 (좌표 변환은 추후)

### 미리보기 라이브 반영
- stamp 옵션(번호/워터마크) 변경 → 200ms debounce 후 모든 썸네일 즉시 redraw
- 편집 모달도 stamp 옵션 + 텍스트 박스 모두 반영해서 표시

### 예정
- **모달 안 텍스트 편집 툴바** — `[+ 텍스트 추가]` 버튼 + 크기/색상/배경 swatch. 메인 툴바 [T 텍스트] 패널 제거하고 모달이 텍스트 편집 단일 진입점이 되도록
- **텍스트 박스 배경색** — 데이터 모델에 `bg` 필드 추가, HTML/Canvas/PDF 3곳 렌더링 (drawRectangle + drawText)
- **포커스된 박스 인라인 스타일 편집** — 박스 클릭 시 모달 툴바가 그 박스 설정 반영, 툴바 변경 시 박스 즉시 갱신
- **페이지 회전 후 텍스트 박스 좌표 자동 변환** — 현재는 confirm 후 클리어. 90/180/270 회전 변환 수식 적용
- **이미지 삽입** — 텍스트 박스와 동일한 패턴으로 페이지에 임의 이미지 배치
- **100+ 페이지 PDF 처리 안정성 개선** (메모리/렌더링)
- **모바일 EDIT 툴바/모달 UX 점검** — 가로 스크롤 동작, 박스 터치 편집

## [3.0.0] - 디자인 리뉴얼 + 도구 간소화

### 브랜딩
- 사이트명 변경: 진짜무료PDF → free.pdf
- 로고: Pretendard 기반 타이포 로고

### 디자인 리뉴얼
- Corporate SaaS 다크 스타일 (#0a0a0f 배경)
- 폰트: Pretendard Variable (본문) + Playfair Display (카드 장식)
- 색상 체계 4단계로 정리: #fff / #e0e0e0 / #888 / #555
- 액센트 컬러: #a855f7 (보라) 통일
- 홈 카드: 3:4 비율 다크 카드, 대형 영문 키워드 배경 (EDIT, CONVERT, TEXT, MARK)
- hover: 상단 그라디언트 라인 + 키워드 밝아짐 + 태그 하이라이트
- 버튼/입력 border-radius 12px 통일
- transition .2s 통일
- 배경 blur orb, 글래스모피즘, 그라디언트 텍스트 전면 제거

### 네비게이션
- breadcrumb 방식: free.pdf › PDF 편집
- header 축소 전환 (max-height + opacity 애니메이션)
- 뷰 전환 시 fade-in 애니메이션
- 스크롤 위치 자동 리셋
- 언어 전환: 우상단 pill 버튼

### 도구 간소화 (8개 → 4개)
- 압축 도구 제거 (실질적 효과 미미)
- 이미지→PDF + PDF→이미지 → "이미지 변환" 통합 (탭 전환)
- 워터마크 + 서명/도장 + 페이지번호 → "워터마크" 통합 (텍스트/이미지/페이지번호 모드)

### UX 개선
- 썸네일 크게 보기 토글
- 저장 진행률 페이지 카운트 표시 (3/10페이지)
- 범위 입력 오류 피드백
- 상태 메시지 맥락화 (페이지를 선택하세요 / 전체 N페이지 준비 완료)
- 50MB 이상 파일 업로드 시 경고
- 모바일 회전 버튼 터치 타겟 확대

---

## [2.0.0] - UI 대개편

### 변경
- **도구 통합**: 합치기+나누기+삭제+추출+회전 → "PDF 편집" 하나로 통합 (12개→8개 도구)
- **홈 화면**: 핵심 도구 4개 대형 카드 + "더 많은 도구" 섹션으로 위계 구분
- **에러 메시지**: 3초 자동 소멸 → X 버튼 수동 닫기
- **반응형**: 768px 태블릿 브레이크포인트 추가
- **대용량 경고**: 50MB 이상 파일 업로드 시 경고 표시
- **워터마크**: 투명도 옵션 제거 (20% 고정)
- **서명/도장**: px 수동입력 → 3단계(작게/보통/크게)로 간소화

### PDF 편집 통합 도구
- 여러 PDF를 넣고 모든 페이지를 썸네일로 확인
- 페이지 선택/해제, 드래그로 순서 변경
- 개별 페이지 90° 회전 버튼
- 선택한 페이지만 저장

---

## [1.0.0] - 초기 버전

### 기능
- PDF 합치기 (파일별 페이지 선택, 드래그 순서 변경)
- PDF 나누기 (페이지별/범위/여러 구간)
- 페이지 삭제
- 페이지 추출
- 페이지 회전 (90°/180°/270°)
- 텍스트 추출 (복사/TXT 다운로드)
- 압축 (Object Streams 활용)
- 워터마크 (대각선/가로/타일, 크기/투명도 조절)
- 이미지→PDF 변환
- PDF→이미지 변환 (PNG/JPG, 해상도 선택)
- 서명/도장 삽입
- 페이지 번호 추가

### 기술
- 100% 클라이언트 사이드 처리
- 다크 테마 + 글래스모피즘 UI
- 반응형 디자인 (480px 브레이크포인트)
- 드래그 앤 드롭 파일 업로드
