# 「AI를 창작의 도구로 써봤다」 편집·팩트체크 기록

- 원문: [노션](https://app.notion.com/p/dev-suu3/AI-407a35b21c66807c9cc6d25f09e476f4)
- 확인일: 2026-11-22
- 대상 브랜치: `codex/blog-technical-posts`
- 본문: `content/기타/AI를_창작의_도구로_써봤다/AI를_창작의_도구로_써봤다.md`
- 게시일 메타데이터는 초안을 저장한 날짜다. 실제 사용 시점과 모델 버전은 미확인이다.

## 수정한 사실관계와 표현

| 원문 항목 | 확인·처리 | 근거 |
| --- | --- | --- |
| Seedance로 캐릭터 시트와 이미지 생성 | 이미지 모델은 Seedream, 영상 모델은 Seedance로 구분. 작성자도 대화에서 Seedream 사용을 확인했다. 버전은 추정하지 않았다. | [Seedream](https://seed.bytedance.com/en/seedream4_0), [Seedance](https://seed.bytedance.com/en/seedance) |
| Higgsfield의 Seedance / Kling | 여러 모델을 이용하는 플랫폼과 그 안에서 사용한 모델을 구분했다. Higgsfield가 두 모델을 개발했다는 인상을 줄이지 않도록 정리했다. | [Higgsfield 모델 안내](https://higgsfield.ai/enterprise-help-center/platform/ai-models) |
| Claude와 ChatGPT의 시각적 결과 비교 | 코드로 형태를 만드는 작업과 이미지 생성 경험을 구분했다. 모델 전체에 대한 성능 판정으로 확대하지 않았다. | 원문에 기록된 사용 경험. 당시 연결 도구와 세부 실행 환경은 미확인. |
| Tripo 모델이 수백만 폴리곤 | 해당 모델 파일이나 통계 화면 없이 수치를 검증할 수 없어 정확한 숫자는 제외했다. 촘촘하고 무거운 메시를 겪었다는 경험은 유지했다. | 원문 경험 진술. 수치 독립 검증 불가. |
| Tripo에서 리토폴로지 필요 | 자체 리토폴로지 기능이 있음을 보완했다. 폴리곤 감소와 변형에 적합한 토폴로지를 동일시하지 않도록 수정했다. | [Tripo Retopology](https://developers.tripo3d.ai/en/docs/mesh-decimate), [Blender Retopology](https://docs.blender.org/manual/en/latest/modeling/meshes/retopology.html) |
| Midjourney 이미지·영상 생성 | 영상 생성 기능을 확인했다. 일관성에 대한 불만은 개인 경험으로 유지하고 Style Reference가 다루는 범위를 보완했다. | [Video](https://docs.midjourney.com/hc/en-us/articles/37460773864589-Video), [Style Reference](https://docs.midjourney.com/hc/en-us/articles/32180011136653-Style-Reference) |
| Seedance는 역동적 움직임이 약함 | 당시 입력·설정에서의 경험으로 한정했다. 공식 소개는 큰 동작과 카메라 이동 지원을 설명하므로 보편적 한계로 단정하지 않았다. | [Seedance](https://seed.bytedance.com/en/seedance) |
| Kling이 크레딧이 적게 듦 | 당시 사용 설정에서의 경험으로 남겼다. 버전·길이·해상도를 맞춘 기록이 없어 일반적인 가격 비교로 제시하지 않았다. | 원문 경험 진술. 결제·생성 기록 미확인. |
| Kling에 지브리 같은 그림체 | 특정 결과물에 대한 인상을 모델의 고정된 특성으로 읽을 수 있어, 의도하지 않은 질감과 형태가 섞였다는 표현으로 정리했다. | 원문 경험 진술. 학습 데이터나 스타일의 출처에 대한 주장은 하지 않았다. |
| ElevenLabs 한국어 TTS·효과음 | 지원 기능을 확인했다. 자연스러움은 개인 평가로 유지했다. 립싱크는 음성 생성과 별도의 작업이었다는 원문 흐름을 명확히 했다. | [한국어 TTS](https://elevenlabs.io/text-to-speech/korean), [Sound Effects](https://elevenlabs.io/docs/eleven-creative/playground/sound-effects) |
| 같은 목소리 유지가 어려움 | 경험은 유지하되 Voice Design 결과를 저장·재사용할 수 있음을 보완했다. 작성자가 저장 기능을 실제로 사용했는지는 단정하지 않았다. | [Voice Design](https://elevenlabs.io/docs/eleven-creative/voices/voice-design) |
| ElevenLabs 비용 천 원 안팎 | 사용량·결제 내역이 없는 기억에 근거한 금액이라 제외했다. 비용 부담에 대한 주관적 경험만 남겼다. | 정확한 과금 검증 불가. |

## 프리비즈 보강의 근거와 해석 범위

- **정의와 공정:** [The Third Floor Previs](https://thethirdfloorinc.com/film-tv/previs/)에서 스토리보드·애니매틱, 3D 에셋 구성, 액션·카메라 탐색의 관계를 확인했다.
- **기술 검증과의 구분:** [The Third Floor Techvis](https://thethirdfloorinc.com/film-tv/techvis/)는 렌즈, 거리, 장비 등 촬영 구현에 필요한 기술 분석을 설명한다. 생성 영상을 얻었다고 실제 촬영 가능성이 검증된 것은 아니라는 문맥으로 사용했다.
- **추가한 해석:** AI 이미지·영상은 방향 탐색에, 조작 가능한 3D 장면은 위치·동선·카메라 검토에 활용하자는 제안은 원문의 경험과 공정 구분을 토대로 보강한 관점이다. 외부 자료에서 입증된 생산성 수치나 업계의 단일 표준으로 제시하지 않았다.
- **경험을 만들지 않음:** 프리비즈의 활용 방식과 기록 방법은 다음 작업을 위한 가정과 제안이다. 작성자가 해당 방식으로 프리비즈를 완료한 경험처럼 서술하지 않았다.

## 남아 있는 확인 범위

모델별 버전, 사용 시점, 프롬프트, 생성 설정, 원본 3D 파일, 결제 내역은 확보하지 못했다. 따라서 순위·보편적인 품질 차이·고정 가격은 검증했다고 주장하지 않는다. 공식 제품 소개의 성능 문구도 독립적인 품질 검증으로 취급하지 않았다.

Blender 매뉴얼 URL은 웹 도구에서 본문 열람이 실패했다. 리토폴로지 관련 문장은 Tripo 공식 설명도 함께 확인해 작성했으며, Blender 문서 원문 대조는 추가 확인 항목으로 남긴다.

## 문체 수정

작성자의 요청에 따라 제목을 원래대로 돌리고, 소제목의 긴 대시와 부제, 굵은 강조, 프리비즈 비교 표를 제거했다. 원문의 짧은 문단과 경험을 서술하는 말투를 살리고, 팩트체크 과정에 대한 해명은 줄였다. 모델명 수정과 기능 설명의 출처, 프리비즈의 가능성과 한계는 유지했다.
