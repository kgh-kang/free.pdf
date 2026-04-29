# free.pdf

브라우저에서 PDF를 편집·변환·텍스트 추출. 파일이 외부 서버로 전송되지 않습니다.

> Korean / English: [https://kgh-kang.github.io/free.pdf/](https://kgh-kang.github.io/free.pdf/) · [English version](https://kgh-kang.github.io/free.pdf/en/)

---

## 핵심 기능

### PDF 편집 (EDIT)
- 여러 PDF 합치기 / 페이지 추출 / 삭제 / 회전
- 드래그로 페이지 순서 변경, 파일별 컬러 구분
- 페이지 ⤢ 모달에서 텍스트·이미지·도장 자유 배치
- 워터마크 (대각선·가로·타일) + 페이지 번호 (4가지 위치, 3가지 형식)
- Cmd/Ctrl+Z 50-deep Undo/Redo, 삭제 시 토스트 + [되돌리기] 버튼

### 이미지 변환 (CONVERT)
- 이미지(JPG/PNG) → PDF · 회전·순서 조절 가능
- PDF → 이미지(PNG/JPG) · 페이지별 회전, 1×/2×/3× 해상도

### 텍스트 추출 (TEXT)
- PDF에서 텍스트 추출 → 클립보드 복사 / TXT 다운로드

---

## 차별점

| 항목 | free.pdf | 일반 온라인 PDF 도구 |
|------|----------|---------------------|
| 파일 처리 위치 | **브라우저 내부 (외부 송신 0)** | 서버 업로드 |
| 회원가입 / 로그인 | 불필요 | 종종 필요 |
| 파일 크기 제한 | 300MB | 흔히 5–25MB |
| 다중 파일 처리 | 무제한 | 횟수 제한 흔함 |
| 광고 / 결제 | 없음 | 있음 |
| 한국어 UI | 1급 (영문 동등) | 번역체 흔함 |
| 오프라인 | (서비스 워커 도입 시) 가능 | 불가 |

확인 방법: 브라우저 DevTools > Network 탭에서 PDF 작업을 수행해도 파일이 외부로 전송되지 않습니다 (CDN 라이브러리/폰트 외 `connect-src`는 `'self'` + 명시 도메인만 허용).

---

## 보안 / 개인정보

- **CSP**: `script-src 'self' https://unpkg.com https://cdnjs.cloudflare.com https://gc.zgo.at` (`'unsafe-inline'` 없음). `base-uri 'self'`, `object-src 'none'` 명시. 클릭재킹은 JS top-frame 가드로 차단
- **pdf.js 안전 옵션**: `isEvalSupported:false`, `enableXfa:false`
- **파일 크기 상한**: 300MB (DoS 방어)
- **암호 보호 PDF**: 인앱 모달로 3회 시도, 실패 시 평문 메모리 클리어
- **외부 라이브러리 SRI**: pdf-lib, fontkit, pdf.min.js 모두 sha384 integrity 검증
- **추적**: GoatCounter (페이지뷰만, IP/PII 미수집) — 사용자 행동 추적 X

알려진 잔여 과업 (사내 배포에 영향 없음):
- pdf.js worker self-host + SRI (현재 cdnjs 직접 의존)
- 다중 PDF "파일별로 분리 저장" 토글 (JSZip 도입)

---

## 접근성

- WCAG 2.1 AA 기준 — 색대비 4.5:1, 키보드 전체 동선, focus-visible 통일
- 모든 인터랙티브 요소에 `role` / `aria-label` / `aria-checked`
- 모달은 `role="dialog" aria-modal="true"`, focus trap + 닫기 시 호출자 focus 복귀
- 상태/에러는 `aria-live` (스크린리더 알림)
- 모바일 44px 터치 타겟, `prefers-reduced-motion` 대응
- 키보드 단축키: `Cmd/Ctrl+Z`/`Y` Undo/Redo, 모달 안 `Cmd/Ctrl+D` 박스 복제, `Cmd/Ctrl+Shift+D` 다른 페이지 일괄, `Esc` 닫기, ←/→ 페이지 이동, 박스 다중 선택 시 ←↑↓→ nudge (Shift+10px)

---

## 다국어

- `index.html` (한국어), `en/index.html` (영문)
- `assets/i18n-ko.js`, `assets/i18n-en.js` 두 사전 (총 96개 키, 1:1 동기화)
- 모든 사용자 표시 문자열은 `window.I18N`에서 읽음 (코드에 박지 않음)
- 환영 배너·도구별 팁·동적 저장 라벨도 i18n 분리

---

## 기술 스택

- HTML5 + Vanilla CSS + Vanilla JS (프레임워크 / 빌드 도구 없음)
- [pdf-lib](https://pdf-lib.js.org/) 1.17.1 — PDF 생성·편집·합치기
- [pdf.js](https://mozilla.github.io/pdf.js/) 3.11.174 — 렌더링·텍스트 추출
- [Pretendard Variable](https://github.com/orioncactus/pretendard) — 본문 폰트
- Playfair Display — 카드 장식 타이포

---

## 빠른 시작 (로컬 개발)

```bash
# Python (3.x)
python -m http.server 8000 --bind 127.0.0.1

# 또는 Node
npx serve -l 8000
```

→ http://127.0.0.1:8000/ (한국어) · http://127.0.0.1:8000/en/ (영문)

`file://` 직접 열기도 동작하지만 `frame-ancestors` 경고와 goatcounter localfile 경고가 콘솔에 뜨고, 일부 fetch 동작이 차단됩니다. 로컬 서버 권장.

---

## 프로젝트 구조

```
free.pdf/
├─ index.html              # 한국어 페이지
├─ en/index.html           # 영문 페이지
├─ assets/
│  ├─ app.js               # 공유 JS (i18n 사전에서 문자열 읽음)
│  ├─ styles.css           # 공유 CSS (디자인 토큰 + 반응형)
│  ├─ i18n-ko.js           # 한국어 사전
│  ├─ i18n-en.js           # 영문 사전
│  └─ fonts/               # 한글 임베드용 NanumGothic + base64 fallback
├─ CLAUDE.md               # 프로젝트 컨텍스트 / 디자인 철학 / 알려진 이슈
├─ CHANGELOG.md            # 변경 이력
└─ EVALUATION.md           # 페르소나 평가 결과
```

---

## 라이선스

(필요 시 LICENSE 파일 추가)

---

## 문의

kgh.hyeon@gmail.com
