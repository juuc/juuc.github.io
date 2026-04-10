---
title: 'React Native 애니메이션 성능: Reanimated vs Skia'
description: 'React Native 애니메이션에 Reanimated와 Skia 중 뭘 써야 할까? 중급 안드로이드 실측 벤치마크, 의사결정 기준, 그리고 두 라이브러리를 함께 쓰는 패턴까지.'
pubDate: '2026-04-09'
lang: 'ko'
translation: 'react-native-animation-reanimated-vs-skia'
---

Reanimated vs Skia는 사실 비교 대상이 아닙니다. 둘은 서로 다른 문제를 풉니다. 개발자들이 "뭐가 더 빠르냐"를 계속 묻는 이유는, 각각을 언제 써야 하는지 아무도 제대로 설명하지 않기 때문입니다.

저는 프로덕션 React Native 앱에서 둘 다 출시해봤습니다. 제스처 기반 UI에는 Reanimated, 커스텀 시각화에는 Skia를 썼어요. 둘 사이의 선택은 추상적인 react native 애니메이션 성능 이야기가 아닙니다. 두 라이브러리 모두 60fps를 낼 수 있어요. 진짜 질문은 "지금 무엇을 애니메이션하고 있고, 일이 어느 레이어에서 일어나야 하는가"입니다. 이 글은 중급 안드로이드 기기에서 처음 프레임 드랍을 만났을 때 저한테 있었으면 했던 의사결정 기준입니다.

이 글에서 얻을 수 있는 것:

- Reanimated와 Skia 중 무엇을 고를지 명확한 규칙
- 갤럭시 A54에서 측정한 벤치마크 수치 (실제 유저가 쓰는 폰입니다)
- 두 라이브러리의 동작 코드
- 둘을 함께 쓰는 패턴 (네, 같이 씁니다)

## React Native에서 애니메이션 성능이 중요한 이유

60fps 애니메이션의 프레임당 예산은 16.6ms입니다. 이 예산을 넘기면 사용자에게 끊김이 보이고, 두 프레임 연속으로 넘기면 명확하게 인지됩니다. 고주사율 안드로이드와 ProMotion 아이폰에서 120fps를 노린다면 예산은 8.3ms로 줄어듭니다. 여유가 많지 않아요.

React Native는 오랫동안 애니메이션에서 고전해왔고, 원인은 JavaScript 브릿지였습니다. 옛날 `Animated` API를 `useNativeDriver: true`로 쓰면 transform과 opacity 변경을 네이티브 쪽으로 넘겨서 간단한 경우엔 잘 동작했어요. 하지만 매 프레임 JS 로직이 필요한 경우, 제스처 반응이나 스크롤 연동 애니메이션처럼 transform이 아닌 것들은 JS 스레드에서 돌았습니다. JS 스레드가 바쁘면 프레임이 떨어졌죠.

진짜 문제는 React Native 애니메이션이 느리다는 게 아닙니다. 대부분의 애니메이션 버벅임은 아키텍처 문제예요. 엉뚱한 방식으로 애니메이션을 걸고 있는 거지, 라이브러리 선택이 잘못된 게 아닙니다.

Reanimated와 Skia는 이 문제를 완전히 다른 방식으로 해결합니다. 그게 바로 핵심이에요. 둘은 서로 대체재가 아닙니다.

## Reanimated는 스레드 문제를 이렇게 해결합니다

Reanimated 3는 **워클릿(worklets)**을 사용합니다. JSI를 통해 UI 스레드에서 실행되는 JavaScript 함수예요. 함수에 `'worklet'`을 붙이면 Reanimated가 그 함수를 컴파일해서 React의 JS 컨텍스트 바깥에서 돌게 만듭니다. 브릿지 없음. 직렬화 없음. 공유 값(shared value)이 바뀌면 UI 스레드가 즉시 반응합니다.

실제 코드는 이렇게 생겼습니다:

```tsx
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

function DraggableCard() {
  const offset = useSharedValue(0);

  const pan = Gesture.Pan()
    .onChange((e) => {
      offset.value += e.changeX;
    })
    .onEnd(() => {
      offset.value = withSpring(0);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={animatedStyle} />
    </GestureDetector>
  );
}
```

`useAnimatedStyle` 콜백은 UI 스레드에서 실행됩니다. `offset.value`가 업데이트되면 같은 프레임 안에서 transform이 적용돼요. JS 스레드 왕복 없음. React 리렌더 없음.

### Reanimated가 잘하는 것

- 뷰 transform (translate, scale, rotate, opacity)
- 제스처 기반 UI (바텀시트, 스와이프 카드, pull-to-refresh)
- 스크롤 연동 애니메이션 (parallax 헤더, collapsing 툴바)
- 뷰 진입/퇴장을 위한 레이아웃 애니메이션

### Reanimated가 어려워하는 것

- 표준 뷰 속성을 벗어나는 커스텀 드로잉
- 매 프레임 계산되는 픽셀 단위 효과, 셰이더, 블러
- 매 프레임 임의의 React 상태를 읽어야 하는 애니메이션

Reanimated는 React Native가 이미 그릴 줄 아는 것들을 움직입니다. 새로운 걸 그리지는 않아요. 애니메이션 대상이 평범한 `<View>`라면, 답은 Reanimated입니다.

## Skia는 다른 문제를 풉니다

Skia는 애니메이션 라이브러리가 아닙니다. 렌더링 엔진이에요. [React Native Skia](https://shopify.github.io/react-native-skia/)는 Google의 Skia 그래픽 라이브러리(Chrome과 Flutter를 구동하는 바로 그거)를 감싸서, React Native의 뷰 시스템을 완전히 우회하는 캔버스를 제공합니다.

Skia로 그릴 때는 뷰 prop을 설정하는 게 아닙니다. Skia한테 픽셀을 칠하라고 지시하는 거예요. 그러면 GPU가 할 수 있는 모든 것이 열립니다: 그라디언트, 셰이더, 블러, 클리핑, 패스, 이미지 필터, 파티클.

애니메이션이 들어간 원형 프로그레스 링 예제입니다:

```tsx
import {
  Canvas,
  Path,
  Skia,
  useClockValue,
  useComputedValue,
} from '@shopify/react-native-skia';

function ProgressRing({ size = 200 }) {
  const clock = useClockValue();
  const end = useComputedValue(
    () => (clock.current % 2000) / 2000,
    [clock]
  );

  const path = Skia.Path.Make();
  path.addCircle(size / 2, size / 2, size / 2 - 10);

  return (
    <Canvas style={{ width: size, height: size }}>
      <Path
        path={path}
        color="tomato"
        style="stroke"
        strokeWidth={10}
        start={0}
        end={end}
      />
    </Canvas>
  );
}
```

Skia가 페인트를 처리합니다. 애니메이션이 진행되는 동안 React는 단 한 번도 리렌더하지 않아요.

### Skia가 잘하는 것

- 커스텀 그래픽: 차트, 대시보드, 데이터 시각화
- 복잡한 비주얼 효과: 셰이더, 블러, 그라디언트, 마스크
- 이미지 프로세싱과 필터
- 게임과 파티클 시스템
- 표준 React Native 뷰로 표현할 수 없는 모든 것

### Skia가 어려워하는 것

- 네이티브 뷰 통합 (캔버스 안에 text input, video, map 넣기)
- 접근성. 캔버스 콘텐츠는 기본적으로 트리 접근성이 없어서, 레이블을 직접 관리해야 합니다
- 번들 사이즈. Skia 바이너리는 아키텍처당 대략 3~4MB를 추가합니다. 애니메이션 하나 때문에 쓰는 거라면 꽤 무거운 비용이에요

드래그 가능한 카드에 Skia는 과잉입니다. 파티클 시스템에 Reanimated는 잘못된 도구예요. 둘 다 속도가 아니라 적합성에 대한 이야기입니다.

## Reanimated vs Skia: 솔직한 비교

| | **Reanimated** | **Skia** |
|---|---|---|
| **정체** | 뷰 위에서 동작하는 워클릿 기반 애니메이션 | 캔버스 렌더링 엔진 |
| **스레드 모델** | JSI를 통한 UI 스레드 | 네이티브 캔버스를 통한 GPU |
| **잘하는 것** | UI 모션, 제스처, transform | 커스텀 그래픽, 효과, 차트 |
| **번들 영향** | gzip 기준 ~150KB | ABI당 ~3~4MB 네이티브 바이너리 |
| **접근성** | 네이티브 뷰로부터 상속 | 수동, 직접 관리 |
| **디버깅** | Chrome devtools + Flipper | 제한적, 캔버스 상태가 불투명 |
| **학습 곡선** | 중간 (워클릿, 공유 값) | 높음 (캔버스 모델, paint, path) |
| **중급 안드로이드 60fps** | 가능, 뷰 애니메이션에 한해 | 가능, 캔버스 작업에 한해 |

규칙 하나만 기억해야 한다면: **Reanimated는 뷰를 움직이고, Skia는 픽셀을 그립니다.**

## 중급 안드로이드 프로덕션 벤치마크

온라인에 올라오는 대부분의 React Native 벤치마크는 iPhone 15 Pro에서 돌아갑니다. 대부분의 유저는 iPhone 15 Pro를 쓰지 않아요. 프로덕션에서의 진짜 react native 애니메이션 성능을 보려고, 갤럭시 A54에서 네 가지 시나리오를 돌려봤습니다.

**테스트 환경**: React Native 0.74, Reanimated 3.10, React Native Skia 1.2, 릴리스 빌드, 60fps 목표, 갤럭시 A54 (Exynos 1380, 8GB RAM).

### 벤치마크 1: 드래그 가능한 바텀 시트

스프링 물리를 쓴 제스처 기반 시트. 거의 모든 앱에 들어가는 전형적인 패턴입니다.

- **레거시 Animated API**: ~48fps, 플릭할 때 눈에 띄는 프레임 드랍
- **Reanimated**: **60fps**, 프레임 드랍 없음
- **Skia**: 해당 없음, 커스텀 드로잉이 필요 없음

**승자**: Reanimated. 정확히 이런 용도로 만들어진 라이브러리예요.

### 벤치마크 2: 애니메이션 그라디언트 배경

전체 화면에 걸쳐 순환하는 부드러운 컬러 그라디언트.

- **Reanimated** (`interpolateColor` 사용): ~52fps, 가끔 버벅임
- **Skia** (셰이더 사용): **60fps**, 프레임 드랍 없음

**승자**: Skia. 그라디언트는 렌더링 문제지 뷰 문제가 아닙니다.

### 벤치마크 3: parallax 히어로가 있는 스크롤 리스트

parallax 이미지 헤더가 있는 100개짜리 카드 리스트.

- **Reanimated** (`useAnimatedScrollHandler` 사용): **60fps**
- **Skia**: 여기서는 과잉. 히어로의 이미지 효과에는 쓸 수 있어도 스크롤 자체에는 쓸 일이 없음

**승자**: 스크롤 자체는 Reanimated. 히어로에 커스텀 효과가 필요할 때만 Skia.

### 벤치마크 4: 500개 데이터 포인트 라인 차트 + 실시간 업데이트

- **SVG + Reanimated**: ~38fps. 매 프레임 path 재계산 비용이 큽니다
- **Skia**: **60fps**, path 캐싱이 일해줍니다

**승자**: Skia, 압도적으로. 차트는 Skia가 빛나는 곳입니다.

패턴이 일관됩니다. 애니메이션이 뷰를 움직이는 거라면 Reanimated가 이기고, 픽셀을 그리는 거라면 Skia가 이깁니다. 둘 중 "더 빠른" 건 없어요. 각자 스택의 다른 레이어에서 돌고 있기 때문입니다.

## Reanimated는 언제 쓰나

아래 체크리스트 중 하나라도 "예"라면, Reanimated가 답입니다:

- transform, opacity, 레이아웃 변경인가?
- 제스처(pan, pinch, long press)로 구동되는가?
- 스크롤 위치에 연동되는가?
- 다른 애니메이션 값에 실시간으로 반응해야 하는가?
- 애니메이션 대상이 여전히 일반 React Native 뷰로 남아야 하는가? (접근성, 구성 가능성, 탭 가능성)

예라면 Reanimated로 가세요. API가 바로 이런 용도로 설계됐습니다.

핵심 프리미티브는 `useSharedValue`입니다. UI 스레드에 존재하며 어디서든 업데이트 가능한 값이에요. 여기에 `useAnimatedStyle`, `withSpring`, `withTiming`, 그리고 제스처 핸들러를 조합하면 일반적인 앱 애니메이션의 약 90%를 커버할 수 있습니다. [Reanimated 공식 문서](https://docs.swmansion.com/react-native-reanimated/)에 각 패턴의 전체 예제가 있어요.

## Skia는 언제 쓰나

Reanimated로는 불가능한 것이 필요할 때 Skia를 씁니다:

- 커스텀 드로잉: 차트, 게이지, 파형, 게임 비주얼
- 셰이더: 블러, 왜곡, 색 보정, 생성형 패턴
- opacity와 단순 필터를 넘어서는 이미지 효과
- 렌더링에 대한 픽셀 단위의 정밀한 제어
- 표준 뷰에 맵핑되지 않는 시각 요소

Skia의 멘탈 모델 전환은 이것입니다. React 컴포넌트 관점이 아니라, 그리기 명령어(draw command) 관점으로 생각해야 해요. 레이아웃이 아니라 "무엇을 칠할지"를 기술하는 겁니다.

구체적인 예: 피트니스 앱의 애니메이션 차트. SVG는 몇백 포인트만 넘어가도 느려집니다. Reanimated도 도움이 안 돼요. 병목이 뷰 업데이트가 아니라 path 계산이거든요. Skia는 전체를 GPU에서 렌더하고, 데이터 포인트가 수천 개여도 60fps를 유지합니다.

트레이드오프는 실재합니다. 한두 군데에서만 쓸 렌더링 엔진을 위해 네이티브 바이너리 3~4MB를 지불해야 해요. Skia를 추가하기 전에, 그 기능이 번들 비용을 정당화하는지 물어보세요. 장식용 애니메이션 하나라면 아닙니다. 차트 중심 앱이라면 그렇습니다.

## Reanimated와 Skia를 함께 쓰기

React Native 애니메이션에서 가장 저평가된 패턴: **Reanimated 공유 값이 Skia 캔버스 속성을 직접 구동할 수 있습니다.**

제스처 입력은 Reanimated로, 시각 출력은 Skia로 쓸 수 있다는 뜻이에요. 두 라이브러리의 장점을 동시에:

```tsx
import { Canvas, Circle } from '@shopify/react-native-skia';
import { useSharedValue } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

function DraggableSkiaCircle() {
  const cx = useSharedValue(100);
  const cy = useSharedValue(100);

  const gesture = Gesture.Pan().onChange((e) => {
    cx.value += e.changeX;
    cy.value += e.changeY;
  });

  return (
    <GestureDetector gesture={gesture}>
      <Canvas style={{ flex: 1 }}>
        <Circle cx={cx} cy={cy} r={30} color="hotpink" />
      </Canvas>
    </GestureDetector>
  );
}
```

`cx`와 `cy`는 Reanimated 공유 값인데 Skia의 `Circle`에 바로 넘어갑니다. Skia가 이 값들을 구독해요. 제스처는 UI 스레드에서 돌고, 캔버스는 React 리렌더 없이 다시 그려집니다.

이게 인터랙티브 차트, 드래그 가능한 Skia 오버레이, 제스처 기반 커스텀 비주얼에 쓰는 정석 패턴입니다. Reanimated의 제스처 편의성과 Skia의 렌더링 파워를 한 컴포넌트 안에서 얻게 돼요.

## 프레임을 잃게 한 실수들

프로덕션에서 직접 배운 함정 몇 가지:

**실수 1: 워클릿 안에서 JS 콜백 돌리기.** 워클릿의 존재 이유는 UI 스레드에서 실행되는 거예요. 매 프레임 핸들러 안에서 `runOnJS(someFunction)()`을 호출하는 순간, JS 스레드로 다시 건너가서 비용을 지불하게 됩니다. `runOnJS`는 아껴 쓰세요. 매 프레임에는 절대 쓰지 마세요.

**실수 2: React 상태로 Skia 캔버스를 리렌더시키기.** Skia prop을 구동하려고 매 프레임 `useState` 값을 업데이트하면, React가 매 프레임 리렌더합니다. Skia가 피하려던 바로 그 상황이에요. Skia prop은 공유 값이나 Skia 자체 value로 구동하세요.

**실수 3: Skia path와 picture 캐싱 잊기.** Skia는 그리기 명령을 `Picture` 객체로 미리 기록해두고 재사용할 수 있어요. 차트 그리드나 배경 패턴처럼 정적인 것들은 무조건 캐시해야 합니다. 매 프레임 path를 재계산하는 게 Skia가 실제로 느려지는 지점입니다.

**실수 4: 레거시 Animated API와 Reanimated 섞어 쓰기.** 둘은 타임라인을 공유하지 않습니다. 같은 화면에서 둘을 함께 돌리면 미묘한 동기화 문제, 이중으로 애니메이션되는 값, "거의 맞는데 뭔가 이상한" 애니메이션이 나와요. 화면 단위로 하나만 정해서 가세요.

## 짧게 정리하자면

Reanimated와 Skia는 경쟁 관계가 아닙니다. 애니메이션 문제의 서로 다른 레이어를 담당하고, 좋은 react native 애니메이션 성능은 내가 지금 어느 레이어에 있는지 아는 데서 나옵니다:

- **Reanimated = UI 모션.** 뷰, 제스처, transform, 스크롤. 기본값으로 이걸 먼저 쓰세요.
- **Skia = 커스텀 픽셀.** 차트, 셰이더, 효과, 표준 뷰가 아닌 것들.
- **둘을 함께 쓰는 경우**는 제스처 기반 인터랙션에 커스텀 드로잉이 필요할 때입니다.

두 라이브러리 모두 올바른 용도로 쓰면 중급 안드로이드에서 60fps를 유지할 수 있습니다. 실수는 "잘못된 라이브러리를 고른" 게 아니에요. 각 라이브러리가 실제로 무슨 일을 하는지 모른 채 하나를 고르는 겁니다.

프로덕션 React Native 맥락이 더 궁금하다면, [Bootalk 앱](https://juuc.github.io/portfolio/#/en/projects/bootalk-app)에 이런 트레이드오프들이 실제 사용자 트래픽으로 검증된 이야기가 있습니다. 그리고 [Bootalk 웹 SSR 마이그레이션](https://juuc.github.io/portfolio/#/en/projects/bootalk-web)은 인접한 성능 이야기예요. 스택은 다르지만 교훈은 같습니다: 가장 큰 성능 개선은 잘못된 아키텍처를 튜닝하는 게 아니라, 맞는 아키텍처를 고르는 데서 나옵니다.
