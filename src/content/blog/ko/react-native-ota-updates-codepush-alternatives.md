---
title: 'React Native OTA 업데이트 2026: Bootalk가 Expo EAS Update를 쓰는 이유'
description: 'CodePush는 deprecated되었습니다. Bootalk 프로덕션에서 Expo EAS Update로 React Native OTA 업데이트를 운영하는 방법과 이유, 고려했던 CodePush 대안들을 정리합니다.'
pubDate: '2026-04-10'
lang: 'ko'
translation: 'react-native-ota-updates-codepush-alternatives'
---

Microsoft는 2025년 3월 31일에 App Center를 서비스 종료했고, CodePush도 함께 사라졌습니다. 지금도 CodePush로 업데이트를 배포하고 있다면 조종사 없는 비행기를 타고 있는 셈입니다. 보안 패치도, 업데이트도, 지원도 더 이상 없습니다. React Native 앱을 프로덕션에서 운영 중이라면 대체재는 어제쯤 이미 골랐어야 합니다.

저는 작년에 [Bootalk](https://juuc.github.io/portfolio/#/en/projects/bootalk-app)에서 바로 그 상황이었습니다. 주요 CodePush 대안들을 평가한 끝에 Expo EAS Update를 선택했고, 그 이후로 계속 이걸로 배포하고 있습니다. 이 글은 마케팅 홍보문이 아니라 그 결정의 1인칭 기록입니다. EAS Update가 왜 이겼는지, 어떤 대안들을 고려했는지, 프로덕션에서 실제로 무엇이 깨지는지, 그리고 EAS는 규모가 커지면 비싸진다는 막연한 불안을 날려버린 실제 비용 계산까지 모두 담았습니다.

## React Native OTA 업데이트가 실제로 하는 일

OTA(over-the-air) 업데이트는 App Store나 Play Store 심사를 거치지 않고 배포된 React Native 앱에 JavaScript와 에셋 변경을 푸시할 수 있게 해줍니다. 앱은 런타임에 새 JS 번들을 다운로드하고, 다음에 사용자가 앱을 열면 최신 코드가 실행됩니다. 네이티브 바이너리를 다시 빌드하는 일은 없습니다.

이 구분이 OTA로 무엇을 보낼 수 있고 없는지를 정의합니다. JavaScript 변경, React 컴포넌트 업데이트, 비즈니스 로직 수정, 이미지나 카피 같은 에셋 교체는 푸시할 수 있습니다. 네이티브 모듈 변경, React Native 자체 버전 업, 새 권한 추가, 컴파일된 바이너리를 수정하는 모든 것은 푸시할 수 없습니다. 이런 것들은 여전히 App Store나 Play Store에 새로 제출해야 합니다.

프로덕트 팀에게 OTA는 당일 핫픽스와 일주일짜리 App Store 심사 대기열 사이의 차이를 만듭니다. Bootalk에서는 아침에 제가 배포한 JavaScript 전용 수정이 점심 무렵이면 사용자들 폰에 살아있습니다.

<svg viewBox="0 0 720 290" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="ota-flow-title ota-flow-desc" style="max-width: 100%; height: auto; display: block; margin: 2em auto;">
  <title id="ota-flow-title">React Native OTA 업데이트 흐름</title>
  <desc id="ota-flow-desc">세 단계 흐름: 개발자가 노트북에서 eas update 명령을 실행하면, Expo가 JavaScript를 번들링해 CDN에 호스팅하고, 사용자의 React Native 앱이 다음 콜드 스타트에 새 번들을 다운로드합니다.</desc>
  <defs>
    <marker id="ota-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
    </marker>
  </defs>
  <g>
    <rect x="20" y="50" width="200" height="170" rx="14" ry="14" fill="none" stroke="currentColor" stroke-width="2" />
    <text x="120" y="86" text-anchor="middle" font-size="18" font-weight="700" fill="currentColor">1. 나</text>
    <text x="120" y="110" text-anchor="middle" font-size="14" fill="currentColor" fill-opacity="0.65">노트북 + Expo CLI</text>
    <rect x="36" y="134" width="168" height="68" rx="8" ry="8" fill="currentColor" fill-opacity="0.08" stroke="none" />
    <text x="120" y="162" text-anchor="middle" font-size="13" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" fill="currentColor">eas update</text>
    <text x="120" y="184" text-anchor="middle" font-size="13" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" fill="currentColor">--branch production</text>
  </g>
  <line x1="228" y1="135" x2="268" y2="135" stroke="currentColor" stroke-width="2" marker-end="url(#ota-arrow)" />
  <g>
    <rect x="276" y="50" width="200" height="170" rx="14" ry="14" fill="none" stroke="currentColor" stroke-width="2" />
    <text x="376" y="86" text-anchor="middle" font-size="18" font-weight="700" fill="currentColor">2. Expo</text>
    <text x="376" y="110" text-anchor="middle" font-size="14" fill="currentColor" fill-opacity="0.65">빌드 + CDN</text>
    <text x="376" y="146" text-anchor="middle" font-size="14" fill="currentColor">JS 번들링</text>
    <text x="376" y="170" text-anchor="middle" font-size="14" fill="currentColor">CDN에 업로드</text>
    <text x="376" y="194" text-anchor="middle" font-size="14" fill="currentColor">런타임 버전 태깅</text>
  </g>
  <line x1="484" y1="135" x2="524" y2="135" stroke="currentColor" stroke-width="2" marker-end="url(#ota-arrow)" />
  <g>
    <rect x="532" y="50" width="168" height="170" rx="14" ry="14" fill="none" stroke="currentColor" stroke-width="2" />
    <text x="616" y="86" text-anchor="middle" font-size="18" font-weight="700" fill="currentColor">3. 사용자</text>
    <text x="616" y="110" text-anchor="middle" font-size="14" fill="currentColor" fill-opacity="0.65">폰의 RN 앱</text>
    <text x="616" y="146" text-anchor="middle" font-size="13" fill="currentColor">오픈 시 확인</text>
    <text x="616" y="170" text-anchor="middle" font-size="13" fill="currentColor">번들 다운로드</text>
    <text x="616" y="194" text-anchor="middle" font-size="13" fill="currentColor">새 코드 실행</text>
  </g>
  <text x="360" y="258" text-anchor="middle" font-size="13" font-style="italic" fill="currentColor" fill-opacity="0.6">JavaScript와 에셋만 · App Store 심사 없음 · 몇 분이면 끝</text>
</svg>

## CodePush가 deprecated된 이유와 그 의미

Microsoft는 2025년 3월 31일에 App Center를 공식적으로 서비스 종료했고, CodePush도 그 셧다운에 포함되었습니다. SDK 자체는 GitHub에 커뮤니티 포크로 존재하지만, 새 기능을 추가하거나 보안 이슈를 패치하거나 앞으로의 React Native 릴리스와의 호환성을 보장해주는 사람이 아무도 없습니다.

Microsoft 본인들의 마이그레이션 가이드는 곧바로 Expo EAS Update를 가리킵니다. 이게 가장 큰 신호입니다. CodePush를 몇 년간 만들고 운영했던 팀이 사용자들에게 Expo로 가라고 직접 안내하고 있는 겁니다.

아직 CodePush에 남아있다면 오늘 당장 업데이트가 작동을 멈추는 게 숨은 리스크는 아닙니다. 진짜 리스크는 다음 React Native 릴리스, 다음 Hermes 변경, 다음 iOS 보안 패치가 deprecated된 스택 내부에서 무언가를 깨뜨릴 수 있고, 그때 고쳐줄 사람이 아무도 없다는 겁니다. 프로덕션 OTA 인프라는 얼려둔 의존성 위에 얹어둘 자리가 아닙니다.

## Bootalk에 Expo EAS Update를 선택한 이유

결론부터 말씀드리면, 저는 Bootalk에 EAS Update를 올렸습니다. 테스트해본 어떤 것보다 개발 루프가 빠르고, 제 규모에서 가격이 정직하고, Expo가 dev client부터 프로덕션 전송까지 스택 전체를 소유하고 있기 때문입니다. 실제로 이게 어떤 모습인지 보여드리겠습니다.

### 세 개의 채널과 appVersion 런타임

Bootalk는 Expo-managed 워크플로우 위에서 `production`, `staging`, `preview` 세 개의 EAS Update 채널을 사용합니다. 모든 빌드는 자신이 어떤 채널을 수신할지 선언하고, 업데이트는 일치하는 채널로 배포됩니다. canary 채널도, 위에 얹은 gradual rollout 레이어도 없습니다. 일부러 단순하게 유지했습니다.

런타임 버전은 `appVersion`으로 설정되어 있어서 모든 OTA 업데이트가 `app.config.ts`에 선언된 네이티브 앱 버전에 자동으로 연결됩니다. 즉 버전 `1.4.2`를 타깃으로 한 업데이트는 여전히 `1.4.1`에서 실행 중인 사용자들에게 절대 전달되지 않습니다. fingerprint 기반 전략보다 더 타이트하지만, 대신 훨씬 생각하기 쉽습니다. 네이티브 변경에 걸친 번들 호환성을 걱정할 필요가 없습니다. 런타임 버전이 대신 강제해주기 때문입니다.

### Expo dev client가 결정타였습니다

Expo가 충분히 홍보하지 않는 기능이 있습니다. Expo dev client는 테스트 중에 업데이트 브랜치 사이를 즉시 전환할 수 있게 해줍니다. 제 폰에 development build를 깔아두고 원하는 브랜치, `staging`이든 `preview`든 특정 feature 브랜치든 즉시 가져올 수 있습니다. 리빌드 없음. 재설치 없음. dev client에서 브랜치를 고르면 앱이 스스로 리로드되고, 몇 초 뒤에는 그 업데이트가 실행되고 있습니다.

매일 배포하는 팀에게 이건 엄청난 속도 향상입니다. QA는 5분 안에 세 개의 브랜치를 검증할 수 있습니다. 저는 프로덕션 번들에 대해 수정을 검증한 뒤에 승격할 수 있습니다. 제가 테스트해본 자체 호스팅 대안 중에 이 개발 경험에 근접하는 것은 없었습니다.

### 배포는 명령어 한 줄

Bootalk에서 프로덕션 OTA 업데이트를 배포하는 것은 명령어 하나입니다.

```bash
eas update --branch production --message "fix: property detail crash on iOS 18"
```

끝입니다. Expo CLI가 JS 번들을 빌드하고, CDN에 업로드하고, 몇 분 안에 `production` 채널의 모든 사용자는 다음 앱 오픈 때 새 코드를 받습니다. SSH도, S3 업로드도, 손으로 편집할 버전 매니페스트도 없습니다. CodePush가 예전에 주던 그 편안함과 같은 감촉이되, deprecation 불안은 없습니다.

CI 워크플로우에 `main`으로의 merge 이벤트로 물려두긴 했지만, 솔직히 절반 정도는 손으로 직접 실행합니다. 명령어 자체가 이미 충분히 빠르기 때문에 자동화로 얻는 이득이 크지 않습니다.

### EAS는 비싸진다는 두려움을 죽인 비용 계산

이 부분에서는 Reddit에 도는 속설에 강하게 반박하고 싶습니다. CodePush 대안을 다루는 스레드마다 EAS Update는 규모가 커지면 비싸진다고 경고하는 사람이 꼭 한 명은 있습니다. Bootalk 규모에서 실제로 일어나는 일은 이렇습니다. 저는 Expo Pro plan을 쓰고 있고, 월간 활성 사용자(MAU)가 8,000명 이상이며, Pro plan 기본료에 더해지는 월 overage는 약 $5입니다. 총 비용은 팀 전체 기준 월 $25 미만입니다.

팀 점심 한 번 값이고, 프로덕션 OTA 파이프라인에 EAS Build와 Submit까지 다 포함된 가격입니다. 자체 호스팅 CodePush 서버, S3 버킷, CDN, 업데이트 매니페스트 데이터베이스, 모니터링을 유지하면서 태울 엔지니어링 시간과 비교하면 비교 자체가 안 됩니다.

EAS는 비싸진다는 경고에도 일리는 있습니다. 진짜로 큰 규모, 대략 100K+ MAU이거나 하루에 OTA를 여러 번 배포하는 앱의 경우입니다. 일반적인 중간 규모 React Native 팀이라면 비용 공포는 과장된 것입니다. FUD를 사기 전에 본인의 실제 MAU로 숫자를 돌려보십시오. 그리고 커밋하기 전에 [expo.dev/pricing](https://expo.dev/pricing)에서 현재 가격을 확인하세요. Expo는 시간이 지나면서 플랜을 조정합니다.

## 제가 고려했던 CodePush 대안들 (그리고 떨어진 이유)

EAS Update가 유일한 선택지는 아니었습니다. 제가 실제로 평가한 대안들과, 각각이 왜 졌는지 정리합니다.

### 자체 호스팅 code-push-server (커뮤니티 포크)

Microsoft가 App Center를 deprecate한 뒤, `code-push-server`라는 커뮤니티 포크가 원래 CodePush 아키텍처를 자체 호스팅 가능한 서비스로 살려두었습니다. 본인 인프라에서 돌리고, React Native CodePush SDK를 본인 서버로 가리키기만 하면 이론상 앱 코드에는 변화가 없습니다.

문제는 바로 그 이론상이라는 말에 숨어 있습니다. 자체 호스팅은 S3 버킷, CDN, 업데이트 매니페스트 DB, 모니터링, 그리고 새벽 2시에 뭔가 터졌을 때의 on-call 로테이션을 모두 본인이 소유한다는 뜻입니다. 총소유비용(TCO)은 Bootalk의 EAS 청구서를 훨씬 능가하고, 그 비용은 제가 가진 시간 중 가장 비싼 시간인 엔지니어링 시간으로 치러야 합니다.

진지하게 고려했던 유일한 이유는 데이터 레지던시(data residency) 이슈였습니다. 업데이트 매니페스트를 특정 리전 안에 두도록 강제하는 컴플라이언스 요구사항이 있었다면 이걸 골랐을 수도 있습니다. Bootalk는 그런 요구사항이 없어서 선택하지 않았습니다.

### Pushy / cresc (중국 오픈소스 경로)

Pushy(또는 `cresc`)는 중국 React Native 생태계에서 널리 쓰이는 인기 OTA 업데이트 서비스입니다. 오픈소스이고, 대규모에서 검증되었으며, 호스팅 버전 가격이 저렴합니다.

두 가지 이유로 선택하지 않았습니다. 첫째, 주요 문서가 중국어입니다. 코드 자체는 보편적이지만, 저는 프로덕션 인프라를 번역된 문서에 의존시키고 싶지 않았습니다. 둘째, 호스팅 티어를 결제할 중국 결제 수단이 없었고, 자체 호스팅은 다시 `code-push-server`와 동일한 TCO 문제로 돌아갑니다.

Pushy는 이미 중국 시장에서 운영 중이거나, 지원을 맡을 수 있는 중국어 화자 엔지니어가 있는 팀에게는 진지한 선택지입니다. Bootalk에게는 둘 다 해당되지 않았습니다.

### Deprecated CodePush 그대로 두기 (아무것도 안 하기)

가장 쉬운 길은 언제나 아무것도 안 하는 것입니다. 커뮤니티 포크 CodePush SDK는 대부분의 React Native 버전에서 여전히 동작하고, 앱이 자주 업그레이드되지 않는다면 한동안 버틸 수 있습니다.

이걸 제외한 이유는, 한동안 버틴다는 말이 결국 뭔가 깨질 때까지 리스크를 쌓다가 허둥지둥 대응한다는 뜻이기 때문입니다. 저는 다음 React Native 릴리스가 deprecated 스택을 깨뜨린 뒤 급하게 마이그레이션하는 것보다, 제 일정에 맞춰서 한 번 마이그레이션하는 쪽이 낫다고 판단했습니다.

## 한눈에 보는 EAS Update vs CodePush 대안 비교

| 옵션 | 8K MAU 기준 비용 | 개발 루프 | 자체 호스팅? | Bare RN 지원 | 문서 |
|---|---|---|---|---|---|
| **Expo EAS Update** | 월 ~$25 (Pro plan) | 우수 (dev client 브랜치 전환) | 불가 (호스팅) | 가능, 마찰 있음 | 영어, 1st party |
| **code-push-server (커뮤니티)** | 인프라 + 엔지니어링 시간 | 평균 | 필수 | 가능 | 커뮤니티, 듬성듬성 |
| **Pushy / cresc** | 저렴 또는 자체 호스팅 무료 | 양호 | 선택 | 가능 | 주로 중국어 |
| **Deprecated CodePush** | $0 | 얼어있음 | 해당 없음 | 가능 | 유지보수 없음 |

일반적인 중간 규모 팀 입장에서는 비교가 근접하지 않습니다. EAS Update가 개발 루프, TCO, 문서 측면에서 이깁니다. 특정 제약(data residency, 중국 시장, 극단적 스케일) 때문에 호스팅 경로에서 벗어나야만 할 때만 EAS Update가 집니다.

## 프로덕션에서 실제로 깨지는 것들 (튜토리얼이 건너뛰는 부분)

EAS Update를 5분 만에 세팅하는 식의 글들은 프로덕션 OTA 업데이트가 삐끗하는 지점들을 전부 건너뜁니다. 제가 실제로 신경 써야 했던 것들을 정리합니다.

### Runtime Version Drift

업데이트가 설치된 어떤 앱 바이너리에도 없는 런타임 버전을 타깃으로 하면, 사용자들은 그걸 절대 받지 못합니다. 증상이 꽤 잔인합니다. 업데이트는 성공적으로 배포되었고, Expo 대시보드에도 라이브로 표시되는데, 설치율은 0입니다. 업데이트가 `1.4.2`를 타깃으로 했지만 모두가 아직 `1.4.1`에 있었던 겁니다. 새 바이너리가 App Store를 통해 완전히 롤아웃되지 않은 상태였기 때문입니다.

해결책: 네이티브 바이너리를 먼저 배포하고, 본인이 원하는 임계값(저는 80%를 봅니다)까지 채택률이 올라갈 때까지 기다린 뒤에, 그제서야 새 런타임 버전을 타깃으로 한 OTA 업데이트를 보내기 시작합니다.

### 세션 중 롤백 UX

OTA 롤백을 배포하면, 이미 앱 안에 있는 사용자들은 다음 콜드 스타트가 있기 전까지 대체 버전을 보지 못합니다. 나쁜 업데이트가 활발히 크래시를 내고 있을 때 진짜 함정입니다. 세션 중간에 있는 사용자들은 앱을 닫았다가 다시 열기 전까지 그 깨진 빌드에 갇혀 있습니다.

EAS Update의 롤백 프리미티브는 지루할 정도로 단순합니다. Expo 콘솔에서 나쁜 업데이트를 삭제하고, 대체 업데이트를 밀어 넣습니다. 대체 업데이트는 다른 모든 업데이트와 같은 방식, 다음 앱 오픈 때 전파됩니다. 세션 중간에 핫 리로드를 강제하는 poison pill 같은 장치는 없습니다. 그런 수준의 통제가 필요했다면 앱 내부에 강제 버전 체크를 추가했을 텐데, 아직 필요한 적은 없습니다.

### Apple App Store Guideline 4.3 리스크

Apple의 App Review Guidelines에는 흔히 4.3이라고 불리는 조항이 있습니다. Apple이 심사 이후에 앱의 동작을 실질적으로 바꾸는 경우에 거절할 수 있도록 해주는 조항입니다. OTA 업데이트 자체는 합법이지만 불편한 회색 지대에 존재합니다. OTA로 보낸 기능이나 플로우가 Apple이 승인한 앱과 다른 앱처럼 보인다면, 이 가이드라인에 걸릴 수 있습니다.

Bootalk에서는 이 문제로 거절당한 적은 없지만, 저는 늘 신중하게 접근해 왔습니다. 기준은 단순합니다. changelog에 새 기능(new feature)으로 올릴 만한 변경이라면 그냥 네이티브 릴리스로 배포하고, 버그 수정이나 문구 수정, 간단한 UI 다듬기 정도라면 OTA로 보냅니다.

### Hermes Fingerprint 불일치

Hermes 위에 있다면(아마 그럴 겁니다, 이제 React Native 기본값입니다), JS 엔진이 번들 포맷을 fingerprint합니다. 네이티브 바이너리와 OTA 번들 사이에서 Hermes나 React Native 버전이 바뀌면, 앱이 업데이트를 조용히 거부합니다. 사용자들은 옛날 코드에 머물러 있고, 에러 토스트도 없고, 알림도 없고, 찾아서 보지 않으면 눈치채지 못할 로그 한 줄도 없습니다.

Bootalk에서는 런타임 버전 전략을 타이트하게(`appVersion`) 유지하고, 모든 major React Native 업그레이드를 바이너리 전용 릴리스로 다루는 방식으로 이 문제를 피하고 있습니다. 바이너리가 포화될 때까지 새 버전을 타깃으로 한 OTA는 보내지 않습니다.

### Staged Rollout 산수

업데이트를 사용자 10%에게 밀고, 그중 5%가 크래시한다면, 이건 전체 유저 기반의 0.5%가 크래시 루프에 있다는 뜻입니다. 숫자만 보면 작아 보입니다. 실제 MAU에 곱해보기 전까지는요. 8,000 MAU에서 0.5%는 40명이 앱을 열었을 때 깨진 경험을 봅니다. 100,000 MAU에서는 500명입니다.

저는 두 가지 확고한 룰을 지킵니다. 금요일에는 OTA 업데이트를 내보내지 않고, diff를 팀원이 보지 않은 상태로는 아무것도 배포하지 않습니다. 가장 좋은 롤백 전략은 여전히 한 번도 쓰지 않아도 되는 전략입니다.

## Bootalk에서 OTA 업데이트를 실제로 배포하는 흐름

실제 흐름을 군더더기 없이 정리하면 이렇습니다.

1. `main`에 JavaScript 수정을 merge합니다.
2. `eas update --branch staging --message "fix: ..."`를 실행합니다.
3. 테스트 기기에서 Expo dev client를 열고, `staging` 브랜치로 전환해 수정을 검증합니다.
4. `eas update --branch production --message "fix: ..."`를 실행합니다.
5. Expo 대시보드에서 채택률 지표를 확인합니다.
6. 뭔가 이상해 보이면 Expo 콘솔에서 프로덕션 업데이트를 삭제하고 대체 업데이트를 밀어 넣습니다.

EAS 레이어에서 staged rollout 퍼센트를 쓰지 않습니다. canary 채널도 운영하지 않습니다. `production` 채널은 배포하는 즉시 전체 사용자 기반을 받고, 변경이 걱정되면 `staging`이나 `preview`로 먼저 스테이징합니다. 지루하지만 제 규모에 맞습니다.

네이티브 바이너리 측 워크플로우는 별개입니다. 네이티브 모듈을 건드리거나, React Native를 bump하거나, 권한을 추가하거나, 앱 버전을 바꾸는 변경은 전부 full EAS Build와 App Store 제출을 거칩니다. OTA 업데이트는 이미 릴리스된 런타임 버전을 타깃으로 한 JavaScript와 에셋만 보냅니다.

## 솔직한 트레이드오프: EAS Update가 약한 지점들

EAS Update를 변호해 왔지만, 모든 팀에게 완벽한 선택은 아닙니다. 솔직하게 이름 붙일 가치가 있는 트레이드오프들입니다.

**정말 큰 규모에서의 비용.** 대략 100K MAU 미만에 업데이트 빈도가 보통이라면, EAS Update는 무시할 만큼 쌉니다. 그 위로 가거나 하루에 OTA를 여러 번 푸시한다면, 청구서의 overage 라인이 의미를 갖기 시작합니다. 엔지니어링 TCO까지 포함해서 자체 호스팅과의 수식을 돌려보세요.

**Data residency와 컴플라이언스.** Expo는 자기들 CDN을 통해 업데이트를 서빙합니다. 업데이트 매니페스트를 특정 리전에 호스팅하도록 하거나 본인 인프라에 두도록 강제하는 규제 요구사항이 있다면, EAS Update는 선택지가 아닙니다. 자체 호스팅 `code-push-server`나 Pushy가 더 맞습니다.

**Bare React Native 마찰.** Bootalk는 Expo-managed이고, EAS Update는 명백히 그 워크플로우에 최적화되어 있습니다. Bare React Native 팀들은 특히 빌드 설정과 config plugin 주변에서 더 많은 세팅 마찰을 보고합니다. 저는 bare에서 EAS Update를 직접 운영해본 적이 없어서, 그 경험에 대해 1인칭으로 말할 수 없습니다. bare라면 통합에 여유 시간을 잡고, 커밋하기 전에 Expo 문서로 검증하십시오.

**appVersion 커플링 트레이드오프.** `appVersion`을 런타임 버전으로 쓰는 것은 단순하지만, 모든 네이티브 변경마다 full App Store 릴리스를 먼저 한 뒤에 새 버전을 타깃으로 한 OTA를 보낼 수 있다는 뜻입니다. 팀이 네이티브와 JS 릴리스 주기를 더 공격적으로 분리하고 싶다면, fingerprint 기반 런타임 버전이 복잡성을 대가로 더 유연한 선택입니다.

**벤더 락인.** 채널, 브랜치, 업데이트 매니페스트 전부가 Expo 인프라 안에 있습니다. Expo가 언젠가 가격을 바꾸거나 제품을 종료한다면 이전이 쉽지 않습니다. 저는 Expo 팀이 몇 년간 꾸준했다는 이유로 그 리스크를 감당하고 있지만, 분명히 고려할 만한 지점입니다.

## React Native OTA 업데이트에 EAS Update를 써야 할까요?

대부분의 React Native 팀에게 기본은 yes입니다. 구체적으로는:

- **Yes**: Expo-managed 워크플로우 위에 있고, 100K MAU 미만이고, 인프라 관리를 최소화하면서 가장 빠른 개발 루프를 원한다면. EAS Update가 실용적인 기본값입니다. 저는 Bootalk에 이걸 올렸고 후회하지 않습니다.
- **code-push-server 자체 호스팅 고려**: 업데이트 매니페스트를 본인 인프라 위에 두도록 강제하는 data residency나 컴플라이언스 요구사항이 있을 때만.
- **Pushy / cresc 고려**: 이미 중국 시장에서 운영 중이거나, 문서와 지원을 감당할 수 있는 중국어 화자 엔지니어가 있을 때만.
- **CodePush 클론을 직접 다시 짓지 마세요.** 시도한 팀들을 봤습니다. 항상 예상보다 엔지니어링 시간이 더 듭니다. 그리고 OTA 레이어는 bespoke 인프라를 짓기 가장 안 좋은 곳입니다.

진짜 스킬은 벤더를 고르는 게 아닙니다. runtime version drift, 롤백 UX, binary compatibility를 위해 설계하는 것입니다. EAS Update는 벤더 선택을 쉽게 만들어주기 때문에, 실제로 중요한 부분에 주의를 쏟을 수 있습니다.

React Native를 프로덕션에서 운영 중인데 CodePush 탈출 계획을 아직 세우지 않았다면, 이번 주에 시작하세요. deprecated 스택이 내일 깨지진 않겠지만, 마이그레이션 창은 느끼는 것보다 짧습니다. 저는 프로덕션 불이 난 한가운데가 아니라 제 일정에 맞춰 마이그레이션하는 쪽을 택하고 싶습니다.

---

*React Native를 프로덕션에서 운영하고 계신가요? [Bootalk](https://juuc.github.io/portfolio/#/en/projects/bootalk-app)과 다른 React Native 앱들에서 실제로 출시되는 것들에 대해 글을 쓰고 있습니다. 함께 읽을 만한 글: [React Native 애니메이션 성능: Reanimated vs Skia](https://juuc.github.io/blog/ko/react-native-animation-reanimated-vs-skia). 코드와 사이드 프로젝트는 [GitHub](https://github.com/juuc)에 있습니다.*
