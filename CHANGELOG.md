# Changelog

## [2026-04-29] — 3차 평가 라운드 (보안 + 사용성 + 접근성 + UI 다듬기)

병렬 4개 에이전트(보안 1 + 사용성 페르소나 3) 평가를 거쳐 CRITICAL/HIGH 17건 일괄 적용.

### 보안
- **CSS 변수 self-reference 회귀 수정** — `--c-purple/--c-yellow/--c-green/--c-surface-2/-3/--c-border-2` 6개가 자기 자신을 참조해 `var()`가 unresolvable → 보라 primary 버튼 배경 transparent, toast 무효화, focus-ring 색 무효 등. 깃 히스토리에서 원래 색 복원
- **CSP 강화** — `base-uri 'self'`, `object-src 'none'` 추가 (KO/EN). `frame-ancestors`는 meta CSP에서 무시되므로 `app.js`에 JS 클릭재킹 가드(`if(top!==self)top.location=self.location`)로 대체
- **인앱 암호 모달** — `window.prompt()` (네이티브 회색 다이얼로그, 신뢰 의심 + 컨텍스트 상실) → 다크 SaaS 일관 디자인의 인앱 모달. 시도 횟수 노출, 실패 시 인라인 에러, [건너뛰기] 옵션, focus trap, Esc/Enter 동선
- **password 평문 wipe** — `editClearBtn` / `resetTool('edit')`에서 `pg.password=null` 명시 wipe (V13)
- **클릭 안내 OK 디자인** — 박스 핸들 클릭 영역 확장(`::before` pseudo로 hit-area +6px)

### 사용성
- **첫 방문자 카피 정렬** — 환영 배너에 "어느 카드 → 어느 작업" 매핑 가이드 추가, "합치기" 단어를 카드 진입 화면 desc에 복원, status 카피 의미 역전 수정 ("불필요한 페이지를 클릭해서 해제하세요" → "전체 페이지가 선택됨 — 그대로 저장하면 합쳐집니다"), 저장 라벨 자연스럽게 ("N페이지를 한 PDF로 합쳐서 저장" / "선택한 N페이지만 새 PDF로 저장")
- **previewTitle 카피/동작 정합** — "원본 보기" → "크게 보고 텍스트·이미지 추가" (모달 진입 즉시 `addMode=true`로 캔버스 클릭이 박스 추가가 되는 동작과 일치)
- **삭제 toast + Undo 버튼** — 페이지/파일/모두 회전 후 화면 하단에 검은 토스트 + [되돌리기] 버튼 (Gmail 패턴, 5초 후 자동 사라짐). `rotateAllConfirm` 다이얼로그 제거 — Undo가 있으니 confirm 불필요
- **EDIT 그리드 범위 입력** — `[1-3, 5]` 형태로 비연속 페이지 한 번에 선택 (parseRange 재사용, CONVERT의 동일 패턴과 일치)
- **박스 다중 선택 정렬 fix** — 첫 박스가 `_focusedBox` 상태일 때 두 번째 Shift+클릭 시 첫 박스도 자동으로 multi에 포함 (Figma/PowerPoint 표준 패턴). 6방향 정렬 버튼이 의도대로 노출
- **박스 화살표 nudge** — 다중 선택 시 ←↑↓→ 1px 이동 (Shift+10px), pushHistory debounce(400ms)로 키 연타 시 undo 1단계로 묶임
- **캔버스 클릭 hit-test** — 기존 박스 영역 ±8px 안 클릭 시 새 박스 생성 대신 기존 박스 focus + `caretRangeFromPoint`로 캐럿을 클릭 위치로 (글자 사이 빈 공간에 클릭해도 같은 박스 편집)
- **클릭 안내 1회용** — "페이지의 원하는 위치를 클릭하면 텍스트가 추가됩니다" 안내가 EDIT 세션마다 첫 모달 진입 시 1회 [확인] 버튼과 함께 표시. EDIT 초기화 또는 새 첫 PDF 드롭 시 다시 표시
- **도장 이미지 localStorage 저장** — 1MB 이하 이미지에 한해 base64로 보관, 다음 세션 자동 복원 (회사 도장은 평생 같은 PNG 가정)

### 접근성 (WCAG 2.1 AA)
- **모달 `role="dialog" aria-modal="true" aria-labelledby`** — 스크린리더에 다이얼로그 진입 명시
- **status / error에 `aria-live`** — `editStatus/textStatus/img2pdfStatus/pdf2imgStatus`는 `polite`, `error-msg`는 `role="alert" aria-live="assertive"`. 진행률·완료·에러가 SR에 안내됨
- **`.page-grid`에 `role="group" aria-label`** — 페이지 thumb 47개를 흐름으로 인지
- **CONVERT 그리드 thumb 키보드 토글** — 기존 EDIT thumb처럼 `role="checkbox"` + Enter/Space 토글
- **dropzone aria-label i18n** — `setupDropZone`의 한국어 하드코딩(`'PDF 파일 선택'`)을 `T.dropzoneAriaPdf/Image`로 분리 → EN 사이트가 한국어 SR 안내하던 문제 해결
- **모달 `<span>` 닫기/네비를 `<button>`으로 교체** — 시맨틱 + Enter/Space 기본 동작 + tabindex 자동
- **박스 핸들 모바일 32px** — `.page-text-box-del/-grip/.page-image-box-del` 모바일 분기 32x32 (WCAG 2.5.5)

### UI 디자인
- **모바일 카드 aspect-ratio** — 데스크톱 3:4 → 모바일 `aspect-ratio:auto;min-height:96px`로 첫 viewport에 3카드 모두 노출
- **모달 닫기/네비 디자인** — `<button>` 변경 시 노출된 회색 user-agent 배경 → 흰색 원 + 검은 글자 + 검은 그림자(어떤 PDF 색 위에서도 visible) + hover scale(1.05). 좌우 ‹ › 버튼은 데스크톱에서 PDF 캔버스 바로 양 옆 28px gap (`modal-canvas-row` flex), 모바일은 viewport 양 끝 fixed 유지
- **EDIT 그리드 추가 단축키 제거** — Ctrl+A/Delete/R/Ctrl+S/Ctrl+O 추가 검토 후 제거 (Ctrl+Z/Y만 유지). 화면 단축키 hint 텍스트도 제거
- **페이지 thumb 컬러 도트 색대비** — `.page-thumb-source #444` → `var(--c-text-muted)` (1.4.3 본문 4.5:1 통과)

### 다국어 / 환경
- **EN lang 링크에 `index.html` 명시** — `./en/` → `./en/index.html` (file:// 환경에서 디렉토리 자동 resolve 안 됨)
- **i18n KO=EN 96개 키 1:1 동기화** — 새 키(toast/clickHintOk/pwModal*/modalDialogLabel 등) 양쪽 동시 추가

### 문서
- **CLAUDE.md** — "향후 과업" 섹션 추가 (pdf.js worker self-host, JSZip 다중 PDF 분리 저장 — 사내 배포에 영향 없음)
- **README.md** — 차별점/보안/접근성/다국어/구조 풀 리라이트
- **EVALUATION.md** — 3차 평가 결과 (별도 라운드)

---

## [2026-04-30] — 보안 강화 + 변환 도구 회전 + UX 가이드

### CSP `'unsafe-inline'` 제거 (script-src)
- 인라인 `<script>window.I18N=...</script>` → 외부 `assets/i18n-ko.js`, `assets/i18n-en.js` 분리
- 모든 인라인 `onclick="..."` 제거 → `data-action` 속성 + 위임 핸들러 (`document.addEventListener('click')`)
- 액션 종류: `home`, `tool`, `reset-tool`, `reset-convert`, `welcome-close`, `tip-close`
- showError/showWarn/showComplete 의 innerHTML 안 인라인 onclick → addEventListener
- 영향: V1 XSS 공격 표면 축소, V2 CSP defense-in-depth 강화
- 한계: `style-src 'unsafe-inline'` 은 인라인 `style="display:none"` 다수 사용 중이라 유지 (별도 라운드)

### pdf.js 옵션 강화
- `isEvalSupported:false`, `enableXfa:false` — 위험 PDF 파싱 차단
- `getPdfDoc(data, password)` 헬퍼로 5개 호출 사이트 통합
- `SIZE_MAX = 300MB` 상한 — 그 이상 거부 (DOS 방어)
- `setupDropZone` 에서 size 사전 검증 → 모든 도구에 자동 적용

### PDF 암호 해제 UI
- `unlockPdf(arrayBuffer, fileName)` 헬퍼 — `{doc, password}` 반환
- 암호 PDF 감지 시 `window.prompt()` 3회 재시도, 정확한 password 보존
- handleEditFiles / 텍스트 추출 / pdf2img 모두 적용
- `pg.password` / `pdf2imgData.password` 로 후속 호출(openPageEditor, convertPdf2Img) 시 재사용
- I18N: passwordPrompt, passwordWrong, passwordSkipped (KO/EN)
- 한계: 암호 *설정* (출력 PDF에 암호 걸기) 은 미지원 — pdf-lib에 직접 지원 없음, qpdf-wasm 같은 별도 라이브러리 필요

### 에러 핸들링 보강 (7곳)
- img2pdf / pdf2img 변환 try-catch + 사용자 표시 에러
- copyBtn 클립보드 + execCommand 폴백, 양쪽 실패 시 사용자 피드백
- FileReader.onerror, Image.onerror 추가 (이미지 박스 / img2pdf)
- pdf2img 종료 시 `pdf.destroy()` 명시 (메모리 회수)

### 변환 도구 회전 추가
- **이미지 → PDF**: 각 미리보기 좌상단 ↻ 버튼, 클릭 시 90° 누적, `transform:rotate()` 즉시 반영
- 저장 시 회전된 이미지는 canvas로 pre-rotate 후 PNG 임베드 (정확)
- **PDF → 이미지**: 각 페이지 썸네일 ↻ 버튼, pdf.js viewport rotation으로 canvas 재렌더 (정확한 종횡비)
- 사용자 회전은 PDF 자연 회전(메타데이터)에 더해짐: `(naturalRot + userRot) % 360`
- `renderPageGrid` 시그니처 확장: `getSel.getRotations()` 메서드로 rotations Map 노출

### UX 가이드 — 첫 방문 / 도구 첫 진입
- **홈 환영 배너** (welcome-banner): 첫 방문 시 `localStorage 'freepdf.welcomed'` 추적, dismiss 버튼
- **변환 도구 회전 팁** (help-tip): 변환 도구 첫 진입 시, `localStorage 'freepdf.tip.convertRotate'` 추적
- 일반화된 `showTipIfNew(tipKey, elementId)` + `tip-close` 위임 핸들러 → 향후 다른 도구 팁도 같은 패턴

### 변환 도구 적용 버튼 → 저장 버튼 명확화
- "PDF로 변환" / "이미지로 변환" → "PDF로 저장" / "이미지로 저장" 라벨
- 옵션 select는 단순 값 변경, *저장 버튼* 클릭이 명시적 다운로드 트리거
- (중간에 자동 변환으로 갔다가 사용자 의도 재해석 후 원복)

### 미리보기 화질
- pdf2img 페이지 그리드 스케일: `0.25` → `0.5 * dpr` (편집 도구와 동일 dpr boost)
- img-preview-item img: `image-rendering:high-quality` 힌트
- canvas 내부 픽셀 ~4-6배 증가 → 다운스케일 시 선명

### 첫 방문 + 모달 다듬기
- 모달 클릭 안내(modal-click-hint) `✨` 이모지 제거 — 텍스트만
- 미리보기 안내(modal-preview-note) 빨간색 배경 + 흰 글자로 강조
- 메인 페이지 헤더 여백 축소: `header margin-bottom 80px → 40px`, `header p margin-bottom 100px → 32px`
- 글자색/배경색 select 사이 divider 추가, 라벨 ::before 아이콘 (A 밑줄 / 색 박스) 으로 즉시 식별
- 변환 도구 메인 툴바 흰색 배경 + soft shadow

### 버그 수정
- **detached ArrayBuffer**: pdf2img 재로드 시 buffer transfer 후 재사용 → `renderPageGrid` 내부 `arrayBuffer.slice(0)` + `convertPdf2Img` 슬라이스
- **모달 회전 메타데이터 무시**: PDF 자체 회전(예: 90° 메타) 가 모달 미리보기에서 사라지던 버그 → `pg.naturalRotation = baseVp.rotation` 저장 + `(naturalRotation + userRotation) % 360` 합산
- **같은 파일 두 번 추가 시 사이드바 안 뜨는 버그**: editSourceNames 중복 차단 → `(2)`, `(3)` suffix 자동 부여, 사이드바 별개 항목 노출

### 페이지 단위 삭제
- 썸네일에 ✕ 삭제 버튼 (회전/확대 옆), hover 시 빨간 배경
- 클릭 시 editPages에서 splice + 그 sourceFile에 페이지 없으면 sourceNames도 제거
- 모든 페이지 사라지면 clearBtn cascade
- Undo로 복원 가능

---

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
