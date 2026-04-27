# free.pdf

## 프로젝트 개요
브라우저 기반 PDF 도구 모음. 서버 전송 없이 클라이언트에서 모든 처리를 수행한다.
단일 파일(index.html) 구조이며, pdf-lib와 pdf.js를 CDN으로 로드한다.
다국어 지원: `index.html` (한국어), `en/index.html` (영문)

## 디자인 철학
- **직관적**: 한눈에 기능을 파악할 수 있어야 한다
- **간단**: 불필요한 옵션을 줄이고 핵심에 집중한다
- **사용하기 쉬움**: 드래그 앤 드롭, 명확한 라벨, 일관된 워크플로
- **디자인**: Corporate SaaS 다크 스타일, Pretendard + Playfair Display 폰트, 보라(#a855f7) 액센트

## 도구 구성 (4개)
1. PDF 편집 (EDIT) — 합치기, 추출, 삭제, 회전 통합
2. 이미지 변환 (CONVERT) — 이미지→PDF / PDF→이미지 탭 전환
3. 텍스트 추출 (TEXT) — PDF에서 텍스트 복사
4. 워터마크 (MARK) — 텍스트/이미지/페이지번호 모드 통합

## 기술 스택
- HTML5 + Vanilla CSS + Vanilla JS (프레임워크 없음)
- pdf-lib@1.17.1 — PDF 생성/편집/합치기
- pdf.js@3.11.174 — PDF 렌더링/텍스트 추출
- Pretendard Variable (CDN) — 본문 폰트
- Playfair Display (Google Fonts) — 카드 장식 텍스트
- 빌드 도구 없음, 단일 index.html

## 구조
- `index.html` — 한국어 전체 앱 (HTML + CSS + JS 인라인)
- `en/index.html` — 영문 버전
- `README.md` — 프로젝트 소개
- `CHANGELOG.md` — 변경 이력

## 코딩 규칙
- 외부 서버 통신 금지 (CSP: connect-src 'none')
- 새 기능 추가 시 기존 도구와 동일한 워크플로 패턴 유지: 업로드 → 설정 → 실행 → 다운로드
- CSS/JS는 index.html 인라인으로 유지
- 색상 4단계: #fff(primary), #e0e0e0(secondary), #888(tertiary), #555(muted)
- transition 속도 통일: .2s
- border-radius 통일: 12px(카드/버튼/입력), 8px(소형)

## 작업 방식
- 디자인/기능 평가가 필요할 때 병렬 에이전트를 적극 활용할 것
- 독립적인 작업은 병렬로 진행하여 효율을 높일 것

## 알려진 이슈
- 100페이지 이상 PDF 합치기 시 오류 발생 가능 (브라우저 메모리/렌더링 관련)
