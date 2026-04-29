# 사이트 종합 평가

## 2026-04-30 — 2차 평가 (6 에이전트 병렬)

이전 라운드 (2026-04-29) 의 P0 7건 + 후속 변경(CSP 강화, password UI, 변환 도구 회전, 환영/팁 배너, 페이지 단위 ✕ 삭제 등) 적용 후 재평가.

### 점수 변화

| 관점 | 1차 (4-29) | 2차 (4-30) | 변화 |
|------|:----:|:----:|:----:|
| 보안 위험도 (낮을수록 안전) | 5.5/10 | ~3.5/10 | ▼ V1/V2 해결 |
| WCAG 2.1 AA | 3.5/10 | 4.5/10 | ▲ +1.0 |
| 디자인 일관성 | Linear 70-80% | 40/100 | 더 엄격한 기준 |
| 파워유저 효율 | C | B- (5.5/10) | ▲ Undo/Redo |
| 첫 방문자 직관성 | C+ | B | ▲ 환영 배너 |
| 코드 유지보수 | C | C+ | ▲ 데드 i18n 0개 |

### 통합 우선순위

**🔴 CRITICAL (가성비 최고, 수 분 단위)**
1. textExtract `pdf.destroy()` 누락 (코드 헬스, app.js:1524)
2. `.modal-tb-label color:#555` → `#333` (접근성, 색대비 미달)
3. `prefers-reduced-motion` @media query 미대응 (접근성)
4. EN CSP `script-src` 에서 `gc.zgo.at` 누락 → KO/EN 비대칭 (보안 V8)
5. `URL.revokeObjectURL` 누락 (보안 V11 / 메모리 누수)

**🟠 HIGH**
- 모달 focus 복귀 + focus trap (접근성 P0)
- localStorage 마지막 옵션 기억 (편의성 +15-20%)
- CSS 변수 도입 + 8px 그리드 정규화 + 타이포 rem 통일 (디자인 토대)
- pdf.js worker self-host + SRI (보안 V5)
- 썸네일 ✕/↻ 모바일 44px 터치 타겟 (접근성/UX)
- `_imgCache` 개별 삭제 시 leak (코드 헬스)

**🟡 MED**
- 다중 페이지 일괄 박스 적용 (편의성 +75%)
- 버튼 시스템 통합 (8개 클래스 → 3-4개)
- 키보드 단축키 hint (모달 상단 안내)
- 빠른 액션 프리셋 ("모든 페이지에 번호 / DRAFT" 1클릭)
- welcome / tip 배너 ARIA role

**🟢 LOW**
- 이모지 → SVG 통일
- 100+ 페이지 메모리 최적화 (가상화)
- `style-src 'unsafe-inline'` 제거
- 영문 카피 미세 다듬기
- 박스 템플릿 저장

### 신규 위협 (V8-V14)
- V8 [MED-HIGH] EN CSP `gc.zgo.at` 누락
- V9 [MED] pdf.js worker URL 동적 + SRI 미적용
- V10 [MED] `renderPageGrid` 내 `.onclick=` 직할당 3곳 (CSP 우회 가능성 낮으나 패턴 불일치)
- V11 [MED] `URL.createObjectURL(Blob)` revoke 누락
- V12 [MED] 파일 위장 차단 약함 (`.pdf.exe` 등 매직 바이트 미검증)
- V13 [LOW] `window.prompt()` 평문 암호 메모리 잔존
- V14 [LOW] localStorage 키 사용자 행동 추적 가능

### 다음 라운드 패키지 (권장 순서: A → C → B → D)

- **A. 가성비 빅뱅** (1-2시간) — CRITICAL 5건. *현재 진행 대상*
- **B. 디자인 시스템 라운드** (1일) — CSS 변수 + 8px + 타이포 rem
- **C. 편의성 라운드** (1일) — localStorage 옵션 + 다중 페이지 박스 + 빠른 프리셋
- **D. 접근성 마무리** (반나절) — focus 관리 + 모바일 터치 + 키보드 hint + ARIA

---

## 2026-04-29 — 1차 평가 (7 에이전트 페르소나)

7개 에이전트 페르소나로 병렬 평가 진행. 각 에이전트는 별도 컨텍스트로 독립 분석.

---

## 점수표

| 관점 | 점수 |
|------|:----:|
| 보안 위험도 | 5.5 / 10 (낮을수록 안전) |
| WCAG 2.1 AA 접근성 | 3.5 / 10 |
| UI/UX 완성도 | Linear의 70-80% (토스 2018-19 수준) |
| 파워유저 효율 | C — Undo 없는 편집기 |
| 첫 방문자 직관성 | C+ — 합치기 동선 미흡 |
| 코드 유지보수 | C — `openPageEditor` 520줄 단일 함수 |

---

## 7개 페르소나 핵심 약점

### 1. 첫 방문자 (PDF 처음 쓰는 일반인)
- "PDF 편집" 카드 라벨이 *합치기*와 멘탈모델 어긋남
- 워크스페이스에 "합치기" 단어가 없음 → "저장" 버튼만 있어 confidence 부족
- 칩(`합치기·추출·삭제·회전`)이 클릭 가능해 보이는데 비활성 → 인지부조화
- 첫 방문 코치마크/도움말 0건

### 2. 파워유저 (잦은 PDF 편집 직장인)
- **Undo/Redo 전무** — 가장 치명적 (실수 복구 불가)
- 모달 밖(페이지 그리드)에서 키보드 단축키 0
- 다중 페이지에 일괄 박스 적용 불가 (한 박스를 N페이지에 같은 위치로)
- 이미지 박스 키보드 지원 0 (Ctrl+D 복제도 텍스트 박스만)
- 박스 템플릿 저장 X (자주 쓰는 도장/워터마크 재사용 불가)

### 3. UI/UX 디자이너
- **8px 그리드 깨짐** (50/48/60/70/22/14 등 자유 변동)
- **디자인 토큰 부재** (`#a855f7` 30+회 하드코딩, surface 색 매번 따로)
- **`:focus-visible` 0건** (폼 외 모든 인터랙티브)
- **버튼 시스템 4종 위계 혼란** (back-btn/lang-btn 흰색 pill이 secondary로 부적절)
- border-radius 8단계 혼재
- 타이포 스케일 7단계 + rem/px 혼용

### 4. 경쟁 분석가
- **OCR 미지원** — 스캔 PDF 검색 유입 큰 손실
- **PDF 암호 보호/해제** 미지원 (해제는 묵시적 동작 중, UI만 노출하면 됨)
- **PDF 압축** 제거됨 (재도입 가치 있음, 그림 PDF 한정 lossy)
- 전자 서명(캔버스 손글씨), Office 변환 등 글로벌 경쟁 도구 표준 기능 부재
- 한 줄 포지션: *"Smallpdf의 깔끔함, PDF24의 무제한, 그리고 둘 다 못 가진 진짜 로컬 처리 — 한국어로"*

### 5. 모바일/접근성 (WCAG 2.1 AA)
- **`aria-`/`role`/`tabindex` 0건** — 카드/드롭존/썸네일 모두 `<div onclick>`
- **모달 320~600px 붕괴** — 툴바 14+개 버튼 4~5줄 wrap → 캔버스 사라짐
- **터치 타겟 미달 다수** — 14~30px (44/48px 권장 미달): 회전/삭제/색상 picker/박스 핸들
- **색-only 의존** — 페이지 선택 색 보더만, 파일별 컬러 점만
- **`#555`(2.5:1) 사용 다수** — drop-zone-sub, footer, file-meta, disabled 버튼 (WCAG 1.4.3 미달)
- **`prefers-reduced-motion` 미대응**

### 6. 코드 리뷰어
- **`openPageEditor` 520줄 단일 함수** — 6가지 책임(렌더/툴바/텍스트박스/이미지박스/다중선택/네비) 결합. 가장 큰 기술 부채
- **`_imgCache` 영구 누수** — Map에서 절대 비워지지 않음
- **`pdf.destroy()` 0건** — pdf.js worker 메모리 회수 안 됨, 100+페이지 OOM 1차 원인
- ArrayBuffer slice(0) 매번 호출로 같은 파일이 메모리에 N회 복사
- `redrawAllThumbs`가 페이지 토글마다 100페이지 전체 redraw
- 에러 핸들링 누락 7곳 (img2pdf/pdf2img/copyBtn/FileReader/getMarkImgElement/font fetch/이미지 박스 임베드)
- `T.rotateClearsBoxes` 데드 i18n 키
- 회전 시 imageBoxes 좌표 변환 누락

### 7. 보안 전문가
- **V1 [HIGH] 파일명 XSS** (`app.js:201`) — `escapeHtml` 누락된 unescaped innerHTML
- **V2 [HIGH] CSP `'unsafe-inline'`** — V1 발화 시 차단 메커니즘 무력화
- **V3 [MED-HIGH] CSS/Font CDN SRI 미적용** — Pretendard CSS, Google Fonts CSS
- **V4 [MED] GoatCounter KO만 적용** — KO/EN 비대칭, "100% 클라이언트" 카피와 모순
- **V5 [MED] pdf.js worker SRI 미적용** — JS에서 동적 URL만 지정, self-host 필요
- **V6 [MED] PDF.js 옵션 미설정** — `isEvalSupported`, XFA 차단 누락 + 파일 크기 상한 부재
- **V7 [LOW-MED] 인라인 onclick 다수** — V2 제거를 어렵게 함

---

## 오늘 적용한 조치 (P0 가성비 5건)

| # | 조치 | 영향 | 위치 |
|---|------|------|------|
| 1 | 파일명 XSS 패치 + `escapeHtml` 강화(`"`/`'` 처리) | 보안 V1 해결 | `app.js:96, 201` |
| 2 | `pdf.destroy()` (handleEditFiles, openPageEditor) + `_imgCache.clear()` (reset 시점) | 100+페이지 OOM 1차 완화 (코드 W1+W2) | `app.js` |
| 3 | 저장 버튼 동적 라벨 (`"5페이지 합쳐서 저장"` / `"추출해서 저장"`) | 첫 방문자 confidence (첫 방문자 P0) | `app.js`, KO/EN I18N |
| 4 | `#555` → `#7a7a8a` 일괄 치환 + page-thumb-check ✓ 표시 | 색대비 WCAG 1.4.3 + 색-only 의존 제거 (접근성 P0-2) | `styles.css` |
| 5 | 카드 `<button>` + 드롭존 `role="button" tabindex="0"` + 썸네일 `role="checkbox" aria-checked` + Enter/Space 키 처리 + focus-visible 통일 | 키보드 접근성 (접근성 P0-1) | `app.js`, KO/EN HTML, `styles.css` |

홈 카드 칩(`합치기·추출·삭제·회전`)도 `pointer-events:none` + border-radius 4px로 라벨화하여 인지부조화 제거.

---

## 내일 처리할 P0 (남은 2건)

| # | 작업 | 영향 |
|---|------|------|
| 6 | **Undo/Redo 스택** (Ctrl+Z/Y, 50개 deep snapshot) | 파워유저 신뢰 결정타. 페이지 선택/삭제/회전, 텍스트·이미지 박스 추가/이동/스타일변경/삭제 모두 적용 |
| 7 | **모바일 모달 적응형** (44px 터치 타겟, 600px↓ 툴바 분리/하단 시트) | 모바일 사용 가능성 (WCAG 2.5.5 + 모달 붕괴) |

---

## P1 — 다음 단계 (6건)

| # | 작업 |
|---|------|
| 1 | CSP `'unsafe-inline'` 제거 (`onclick` → `addEventListener`, I18N 외부 .js 분리) |
| 2 | pdf.js worker self-host + 최신 3.x로 업그레이드 (CVE 패치) |
| 3 | 디자인 토큰 + 8px 그리드 + `:focus-visible` 통일 |
| 4 | 페이지 그리드 키보드 단축키 (Ctrl+A/Shift+클릭 다중선택/범위 입력) |
| 5 | `THUMB_SCALE` CLAUDE.md 동기화 + magic number 상수화 |
| 6 | 에러 핸들링 보강 (try-catch 누락 7곳, FileReader.onerror) |

---

## P2 — 차별화/보강 (5건)

| # | 작업 |
|---|------|
| 1 | OCR (Tesseract.js, kor+eng) — 검색 유입 + USP 정합 |
| 2 | PDF 암호 보호/해제 (이미 ignoreEncryption 동작 중, UI 노출만) |
| 3 | PWA + 오프라인 (service worker, "인터넷 끊고도 동작") |
| 4 | `openPageEditor` 분해 (520줄 → 모달 컨트롤러 클래스) |
| 5 | 다중 페이지 박스 일괄 적용 + 박스 템플릿 저장 |

---

## 한국 시장 차별화 전략

USP를 **"Privacy-Verifiable + 한국 직장인 워크플로 1급"** 으로 명문화:

1. CSP/Network DevTools 캡처로 "외부 송신 0건" 가시화
2. PWA 설치 + 오프라인 동작 데모
3. 한국 양식 프리셋 (인감 도장, 갑/을 페이지번호, A4 표준)
4. 한국어 UI 1급 + 영어는 글로벌 진입점으로

법무·HR·의료·금융 등 사내 보안 정책상 외부 PDF 사이트 차단 직군이 1차 타겟.
