# AIML Quant briefing agent guide

## Purpose

- 이 공개 저장소는 브리핑의 **생성된 HTML·자산과 GitHub Pages 배포**만 관리한다.
- AI Weekly의 raw 조사 데이터, 후보·탈락 원장, 스킬, 템플릿, 생성·검증 하네스는
  형제 비공개 저장소 `../briefing-materials`가 정본이다.
- 저장소 이름이 공개 URL 경로다: `briefing` →
  `https://aimlquant.github.io/briefing/`.

## Repository boundary

```text
briefing/                     public
├── html/                     Pages에 그대로 배포되는 생성물
├── .github/workflows/        정적 배포
└── AGENTS.md · README.md     공개 경계와 이용 안내

briefing-materials/           private, sibling repository
├── raw/                      수집 응답·원문 스냅샷·해시
├── ai-weekly/                후보·주장·선정 원장
├── .agents/skills/           AI Weekly 제작 스킬
└── harness/                  수집·정규화·렌더·검증·발행 도구
```

이 저장소에서 리포트·덱을 직접 저작하거나 생성기·프롬프트·raw 데이터를 새로
만들지 않는다. 수정이 필요하면 `briefing-materials`의 정본을 고친 뒤 게시 명령으로
`html/`을 다시 생성한다.

## Public file contract

```text
html/
├── index.html
├── 404.html
├── assets/
└── ai-weekly/
    ├── index.html
    └── YYYY-MM-DD/
        ├── index.html          # 15장 발표자료
        ├── report.html         # 상세 리포트
        └── assets/             # CSS·JS·자체 SVG 스냅샷
```

공개 호의 URL은 한 번 발행하면 바꾸지 않는다. 비공개 raw 경로, API 키, 쿠키,
OAuth, 로컬 절대 경로, 프롬프트, 탈락 후보의 개인식별 정보는 `html/`에 넣지 않는다.

## Publication contract

1. `briefing-materials` 검증이 모두 성공해야 한다.
2. 게시기는 명시된 한 호만 `html/`에 쓴다.
3. 두 저장소는 별도 커밋·별도 push한다.
4. Pages 워크플로의 head SHA가 병합된 public 커밋과 일치해야 한다.
5. 공개 URL을 데스크톱·모바일에서 실제 렌더해 확인해야 완료다.

## Required verification

```bash
test -f html/index.html
test -f html/ai-weekly/index.html
git diff --check
```

HTML·CSS·SVG 변경은 최종 표시 크기로 실제 렌더해 글자 잘림, 오버플로, 불균형,
SVG 정렬과 화살표 접점을 확인한다.
