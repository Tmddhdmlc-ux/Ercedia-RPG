# 에르세디아 RPG — 초상화 운영 규칙 v0.2

> 목적: 캐릭터·지역의 시각적 일관성을 지키고 채팅형 RPG에서 대화와 감정 연출에 활용한다.
> 상태: 채팅 UI 실험에서 검증된 CDN 표시 규칙 반영. 게임 세계관의 새로운 인물·설정은 사용자가 승인하기 전까지 확정하지 않는다.

## 1. 기본 원칙
1. 주요 캐릭터는 승인된 **기준 초상화** 한 장을 가진다. 일반 파일명은 `base.png`이며, 세린은 투명 파일 `base_transparent.png`를 기준으로 사용한다.
2. 감정·복장·부상 등 변형 이미지는 가능하면 기준 초상화를 참조해 생성한다.
3. 이미 확정된 캐릭터를 장면마다 새로운 검색 이미지로 대체하지 않는다.
4. 캐릭터와 마을·지역 모두 통일된 **카툰풍 중세 판타지** 비주얼을 사용한다.
5. 새로운 생성 이미지가 기준 원화와 다르면 자동으로 교체하지 않고 검수한다.
6. 같은 캐릭터·장소를 반복 표시할 때에는 **저장된 동일 이미지 파일을 재사용**한다. AI 재생성만으로 완전한 일관성을 보장할 수 없다.

## 2. 아트 디렉션
- 캐릭터: 표현력 좋은 2D 카툰/일러스트, 선명한 실루엣, 읽기 쉬운 표정.
- 기본 초상화: 가슴~허리 위 반신, 정면 또는 3/4 시점, 의상과 고유 표식이 보이는 구도.
- 전체 디자인: 과도한 실사·사진풍을 피하고 마법·기사·귀족 등 세계관 신분을 복장으로 보여준다.
- 지역: 중세 판타지 마을·도시·성·마법탑·던전의 건축적 특징을 고정한다.
- 세부 색감·선화 방식은 첫 샘플 검수 후 결정한다.

## 3. 폴더 구조
```text
assets/
  characters/
    main/
      character_id/
        base.png
        smile.png
        angry.png
        sad.png
        surprised.png
        embarrassed.png
        serious.png
        injured.png
        notes.md
    sub/
      character_id/
        base.png
        notes.md
  locations/
    kingdoms/
    towns/
    dungeons/
    anomalies/
  ui/
    portraits/
```
캐릭터 식별자는 영문 소문자 snake_case로 사용한다. 예: `serin`.

## 4. 표정·상태 이름
신규 주요 캐릭터 전체 제작의 기본 세트는 [CHARACTER_PIPELINE.md](CHARACTER_PIPELINE.md)에 따라 base, smile, angry, surprised, sad, embarrassed, afraid, annoyed, love 총 9종이다. 아래 기존 목록의 serious, injured 등은 선택 확장으로 유지한다. love는 과장된 하트눈 없이 자연스러운 애정을 표현한다. 위 폴더 구조는 기존 예시이며 신규 기본 9종의 전체 경로는 파이프라인을 따른다.

- `base.png` 기본 무표정
- `smile.png` 미소
- `angry.png` 분노
- `sad.png` 슬픔
- `surprised.png` 놀람
- `embarrassed.png` 부끄러움
- `serious.png` 진지함
- `injured.png` 부상
- 선택 확장: `battle.png`, `crying.png`, `tired.png`, `laughing.png`, `armor.png` 등

## 5. 캐릭터 고정 디자인 기록 (notes.md)
각 캐릭터에 기록:
- 이름 / 연령대 / 성별 / 종족 / 직업 / 소속
- 머리색 및 형태 / 눈 색 / 얼굴형 / 특징적인 장신구
- 기준 의상 / 색 팔레트 / 체형 및 실루엣
- 절대 바꾸면 안 되는 요소 / 허용 가능한 변화 / 금지 요소
- 기준 원화 승인 여부 / 각 파생 이미지 생성·검수 이력
- 초상화 파일 이름과 해당 캐릭터의 ID

## 6. 중요도별 이미지 운영
- 메인: 신규 전체 제작은 승인된 base를 포함한 기본 9종. 실제 생성은 기준 원본 승인 후 단계적으로 진행하며, 부분 제작 요청은 지정 범위를 따른다.
- 주요 조연: 우선 base, 등장에 맞춰 필수 표정 추가.
- 단역: base 중심, 재등장 시 확장.
- 본편에서 중요한 역할인지 여부는 실제 전개에 따라 바뀔 수 있다.

## 7. 지역 배경 이미지
- 같은 장소의 기본 구도와 랜드마크를 고정한다.
- `town_day.png`, `town_night.png`, `town_rain.png`, `town_under_attack.png`처럼 시간·날씨·사건 버전을 파생한다.
- 배경 변형이 기존 건물·도로 배치를 임의로 뒤바꾸지 않도록 검수한다.

## 8. 신규 캐릭터 제작 및 검수
1. [캐릭터 시트 템플릿](templates/CHARACTER_SHEET_TEMPLATE.md)을 작성하고 [제작 파이프라인](CHARACTER_PIPELINE.md)을 따른다. 이름·외형·직업과 고정 디자인을 먼저 지정한다.
2. 카툰풍 기준 원화 **1장** 생성.
3. 사용자가 검토하여 `base.png` 확정.
4. 해당 원화에 기반해 `smile`·`angry`·`surprised` 등 2~3종 변형 시험.
5. 머리/눈/얼굴/의상/장신구/화풍 일치 여부 확인.
6. 승인된 변형을 별도 파일로 저장하고 UI에서 파일명을 감정 상태에 연결한다.
7. 실패한 변형은 정식 에셋으로 등록하지 않는다.

## 9. 실험과 표시 방식의 제약
- 이미지 검색은 같은 문구로 다시 검색해도 이미지가 달라질 수 있으므로 캐릭터 고정용으로 사용하지 않는다.
- 이미지를 고정하려면 안정적인 이미지 URL 또는 채팅에서 참조 가능한 승인된 에셋이 필요하다.
- GitHub에 이미지를 보관하는 것과 채팅 UI가 그 파일을 자동으로 표시하는 것은 별개다. 렌더링 전에 접근 가능한 이미지 경로를 검증한다.
- 기준 원화를 편집해 새 표정을 만들 때도 얼굴이 조금 달라질 수 있으므로 최종 검수를 거친다.
- 이미지를 생성했더라도 GitHub에 업로드되었다고 간주하지 않는다. 실제 업로드 및 커밋이 확인되어야 저장 완료다.

## 10. 첫 테스트 — 세린
- 테스트명: **세린 (Serin)**
- 기사 등급: **베이직 나이트**
- 미확정 사항: 출신 국가, 기사단 소속, 성격, 구체적인 외형.
- 현재 기준 초상화: `assets/characters/main/serin/base_transparent.png`. 배경이 있는 이전 세린 이미지들은 사용자 요청으로 삭제했다. 투명 PNG의 알파 채널과 GitHub 등록을 확인했으며, 이 파일의 대화 UI 합성 표시는 별도 검증한다.
- 시험 도중 정해진 세부 외형은 사용자의 승인을 거친 후 notes.md에 반영한다.


## 11. 채팅 UI의 고정 이미지 호출 — 필수 규칙
- **다른 채팅에서 시작하거나 기존 세션을 재개할 때, 이미지 표시 전에 저장소의 최신 `PORTRAIT_RULES.md`를 먼저 읽고 적용한다.** 이전 채팅의 기억이나 오래된 raw URL 지침에 의존하지 않는다.
- 이 규칙은 **모든 등록 캐릭터·NPC 초상화와 장소·마을·지역 배경의 표시 및 재사용**에 공통 적용한다. 같은 캐릭터·장소는 등록된 동일 에셋 경로를 재사용한다.
- 등록 이미지는 **이미지 검색/키워드 검색(query)으로 호출하지 않는다.** URL을 query에 넣는 것도 금지한다. 검색 결과가 원본과 관계없는 다른 인물·장소로 바뀔 수 있기 때문이다.
- ChatGPT 대화 UI에서는 **AppBlock HTML의 `<img src="...">`에 jsDelivr CDN URL을 그대로 지정해 표시한다.** URL 형식은 `https://cdn.jsdelivr.net/gh/Tmddhdmlc-ux/Ercedia-RPG@main/<asset_path>`이며, `<asset_path>`를 저장소에 실제 등록된 에셋의 상대 경로로 바꾼다.
- **`raw.githubusercontent.com` 및 `github.com/.../raw/...` 링크를 채팅 UI 이미지 표시용으로 사용하지 않는다.** 두 방식은 이번 UI 테스트에서 실패했고, jsDelivr CDN 방식은 성공했다. 이는 이번 ChatGPT UI 실험 결과이며 GitHub 파일 자체의 존재 여부와는 별개다.
- 사용자에게 대화창을 보여줄 때는 **HTML 코드 블록만 출력하지 말고 AppBlock으로 렌더링된 대화창을 제공한다.** 코드 예시만 출력한 상태를 이미지 표시 성공으로 보고하지 않는다.
- 이미지가 **미등록이거나 로드에 실패하면 다른 검색 이미지로 대체하지 않는다.** 미등록 상태 또는 로드 오류를 알리고, 등록된 경로가 있다면 해당 CDN 원본 링크를 제공한다. AppBlock 렌더링을 지원하지 않는 환경에서도 같은 원칙을 따른다.
- 채팅마다 저장소의 파일 존재를 확인하고, 표정 전환 시 등록된 표정 파일만 사용한다. 요청한 표정이 미등록이면 같은 캐릭터의 승인된 기준 초상화(세린: `base_transparent.png`)가 등록되어 있고 정상 로드되는 경우에만 이를 유지하며, 해당 표정이 미등록임을 알린다. 기본 이미지까지 미등록이거나 로드에 실패하면 위 실패 처리 규칙을 따른다.
- **세린**: `assets/characters/main/serin/base_transparent.png` (배경 투명 PNG; 현재 유일한 등록 초상화. 표정 변형은 미등록) (금발 포니테일, 푸른 눈, 은백색 갑옷, 남색 망토). 다른 얼굴로 대체 금지.
- 이미지 표시와 GitHub에 파일이 존재하는 것은 별도로 검증해야 한다. 실제 렌더링 또는 사용자 확인 전에는 '화면 표시 성공'으로 보고하지 않는다.

### 현재 세린 CDN 주소와 AppBlock HTML 예시
현재 투명 초상화 CDN URL:
`https://cdn.jsdelivr.net/gh/Tmddhdmlc-ux/Ercedia-RPG@main/assets/characters/main/serin/base_transparent.png`

아래는 AppBlock 내부에 넣을 HTML 예시다. 실제 대화에서는 코드 텍스트가 아니라 렌더링된 UI로 표시한다.

```html
<img
  src="https://cdn.jsdelivr.net/gh/Tmddhdmlc-ux/Ercedia-RPG@main/assets/characters/main/serin/base_transparent.png"
  alt="세린 공식 기준 초상화"
  style="display:block;width:220px;max-width:100%;height:auto;border-radius:12px"
/>
```
