---
title: 'React Native Animation Performance: Reanimated vs Skia'
description: 'Reanimated or Skia for React Native animations? Production benchmarks on mid-range Android, a decision framework, and code for shipping both in a real app.'
pubDate: '2026-04-09'
lang: 'en'
translation: 'ko/react-native-animation-reanimated-vs-skia'
---

Reanimated vs Skia isn't really a comparison. They solve different problems. The reason developers keep asking which is "faster" is that nobody explains when each one is even the right tool.

I've shipped both in production React Native apps. Reanimated for gesture-driven UI, Skia for custom visualizations. Picking between them isn't about react native animation performance in the abstract. Both libraries can hold 60fps. The question is what kind of thing you're animating, and where the work should actually happen. This is the decision framework I wish I'd had the first time I hit animation jank on a mid-range Android phone.

Here's what you'll leave with:

- A clear rule for picking between Reanimated and Skia
- Benchmark numbers from a Galaxy A54, the phone your users actually have
- Working code for both libraries
- A pattern for using them together (yes, you can)

## Why Animation Performance Matters in React Native

A 60fps animation has a 16.6ms budget per frame. Miss that budget and the user sees a hitch. Miss it twice in a row and they notice. On high-refresh Android and ProMotion iPhones, the budget drops to 8.3ms for 120fps. The room for error is small.

React Native historically struggled with animation because of the JavaScript bridge. The old `Animated` API with `useNativeDriver: true` offloaded transform and opacity changes to the native side, which worked for simple cases. Anything involving per-frame JS logic, gesture response, or scroll-linked animations, ran on the JS thread. When the JS thread was busy, frames dropped.

The real issue isn't that React Native animations are slow. It's that most animation jank is architectural. You're animating the wrong way, not on the wrong library.

Reanimated and Skia both solve this, in completely different ways. That's the whole point: they're not interchangeable.

## How Reanimated Solves the Thread Problem

Reanimated 3 uses **worklets**: JavaScript functions that run on the UI thread via JSI. You mark a function as `'worklet'`, and Reanimated compiles it so it runs outside the React JS context. No bridge. No serialization. Shared values change, the UI thread reacts immediately.

In practice, you write this:

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

The `useAnimatedStyle` callback runs on the UI thread. When `offset.value` updates, the transform applies in the same frame. No round trip to the JS thread. No React re-render.

### What Reanimated is best at

- View transforms (translate, scale, rotate, opacity)
- Gesture-driven UI (bottom sheets, swipeable cards, pull-to-refresh)
- Scroll-linked animations (parallax headers, collapsing toolbars)
- Layout animations for entering and exiting views

### Where Reanimated struggles

- Custom drawing that goes beyond standard view properties
- Per-pixel effects, shaders, or blurs computed per frame
- Animations that need to read arbitrary React state on every frame

Reanimated animates things React Native already knows how to render. It doesn't render anything new. If your animation target is a plain `<View>`, Reanimated is the answer.

## How Skia Solves a Different Problem

Skia isn't an animation library. It's a rendering engine. [React Native Skia](https://shopify.github.io/react-native-skia/) wraps Google's Skia graphics library, the same one that powers Chrome and Flutter, and gives you a canvas that bypasses the React Native view system entirely.

When you draw with Skia, you're not setting view props. You're telling Skia to paint pixels. That unlocks anything a GPU can do: gradients, shaders, blurs, clipping, paths, image filters, particles.

Here's an animated circular progress ring:

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

Skia handles the paint. React never re-renders during the animation.

### What Skia is best at

- Custom graphics: charts, dashboards, data visualizations
- Complex visual effects: shaders, blurs, gradients, masks
- Image processing and filters
- Games and particle systems
- Anything that doesn't map to a standard React Native view

### Where Skia struggles

- Integrating with native views (text inputs, video, maps inside a canvas)
- Accessibility. Canvas content isn't tree-accessible by default, so you own the labels
- Bundle size. The Skia binary adds roughly 3 to 4MB per architecture. If you're using it for one animation, that's a lot to ship

Skia is overkill for a draggable card. Reanimated is the wrong tool for a particle system. Both statements are about fit, not speed.

## Reanimated vs Skia: The Honest Comparison

| | **Reanimated** | **Skia** |
|---|---|---|
| **What it is** | Worklet-based animation on views | Canvas rendering engine |
| **Thread model** | UI thread via JSI | GPU via native canvas |
| **Best for** | UI motion, gestures, transforms | Custom graphics, effects, charts |
| **Bundle impact** | ~150KB gzipped | ~3 to 4MB native binary per ABI |
| **Accessibility** | Inherits from native views | Manual, you own it |
| **Debugging** | Chrome devtools + Flipper | Limited, canvas state is opaque |
| **Learning curve** | Medium (worklets, shared values) | Steep (canvas model, paints, paths) |
| **60fps on mid-range Android** | Yes, for view animations | Yes, for canvas work |

If you only need one rule: **Reanimated animates views. Skia draws pixels.**

## Production Benchmarks on Mid-Range Android

Most React Native benchmarks you see online run on an iPhone 15 Pro. Most of your users aren't on an iPhone 15 Pro. I ran four scenarios on a Galaxy A54, which is much closer to what real react native animation performance looks like in production.

**Test setup**: React Native 0.74, Reanimated 3.10, React Native Skia 1.2, release build, 60fps target, Galaxy A54 (Exynos 1380, 8GB RAM).

### Benchmark 1: Draggable bottom sheet

Gesture-driven sheet with spring physics. Classic pattern, used in almost every app.

- **Legacy Animated API**: ~48fps, visible drops during flick
- **Reanimated**: **60fps**, no dropped frames
- **Skia**: Not applicable, no custom drawing needed

**Winner**: Reanimated. This is exactly what it's built for.

### Benchmark 2: Animated gradient background

A smooth color gradient cycling across the full screen.

- **Reanimated** with `interpolateColor`: ~52fps, occasional hitches
- **Skia** with a shader: **60fps**, no drops

**Winner**: Skia. Gradients are a rendering problem, not a view problem.

### Benchmark 3: Scrollable list with parallax hero

A list of 100 cards with a parallax image header.

- **Reanimated** with `useAnimatedScrollHandler`: **60fps**
- **Skia**: Overkill here. You'd use Skia for the image effects, not the scroll itself

**Winner**: Reanimated for the scroll. Skia only if the hero needs a custom effect.

### Benchmark 4: Line chart, 500 data points, animated updates

- **SVG with Reanimated**: ~38fps. Path recalculation on every frame is expensive
- **Skia**: **60fps**, with path caching doing the work

**Winner**: Skia, by a lot. Charts are where Skia shines.

The pattern is consistent. When the animation is about moving views, Reanimated wins. When it's about drawing pixels, Skia wins. Neither is universally "faster" because they're running in different parts of the stack.

## When to Use Reanimated

Use this checklist. If you answer yes to any of these, Reanimated is your tool:

- Is it a transform, opacity, or layout change?
- Is it driven by a gesture (pan, pinch, long press)?
- Is it linked to scroll position?
- Does it need to react to other animated values in real time?
- Does the animated element need to remain a regular React Native view (accessible, composable, tappable)?

If yes, reach for Reanimated. Its API is purpose-built for this.

The key primitive is `useSharedValue`, a value that lives on the UI thread and can be updated from anywhere. Combine it with `useAnimatedStyle`, `withSpring`, `withTiming`, and a gesture handler, and you cover about 90% of the animations a typical app needs. The [Reanimated docs](https://docs.swmansion.com/react-native-reanimated/) have full examples for each pattern.

## When to Use Skia

Use Skia when Reanimated literally can't do what you need:

- Custom drawing: charts, meters, waveforms, game visuals
- Shaders: blur, distortion, color grading, generative patterns
- Image effects that go beyond opacity and simple filters
- Tight per-pixel control over rendering
- A visual element that doesn't map to any standard view

The mental shift with Skia is that you stop thinking in terms of React components and start thinking in terms of draw commands. You describe what to paint, not what to lay out.

Concrete example: animated charts in a fitness app. SVG gets slow past a few hundred points. Reanimated can't help, because the bottleneck is path calculation, not view updates. Skia renders the whole thing on the GPU and stays at 60fps with thousands of points.

The tradeoff is real. You pay 3 to 4MB of native binary for a rendering engine you may only use in one place. Before adding Skia, ask whether the feature justifies the bundle cost. For a single flourish animation, it doesn't. For a chart-heavy app, it does.

## Using Reanimated and Skia Together

The most underrated pattern in React Native animation: **Reanimated shared values can drive Skia canvas properties directly**.

This means you can use Reanimated for gesture input and Skia for the visual output. Best of both worlds:

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

`cx` and `cy` are Reanimated shared values, passed straight into Skia's `Circle`. Skia subscribes to them. The gesture runs on the UI thread. The canvas repaints without any React re-render.

This is the right pattern for interactive charts, draggable Skia overlays, and gesture-driven custom visuals. You get Reanimated's gesture ergonomics and Skia's rendering power in the same component.

## The Mistakes That Cost Me Frames

A few production gotchas I learned the hard way:

**Mistake 1: Running JS callbacks inside worklets.** The whole point of a worklet is that it runs on the UI thread. The moment you call `runOnJS(someFunction)()` inside a per-frame handler, you've bridged back to the JS thread and paid the cost. Use `runOnJS` sparingly, and never on every frame.

**Mistake 2: Re-rendering Skia canvas from React state.** If you update a `useState` value on every frame to drive a Skia prop, React re-renders on every frame, which is exactly what Skia was supposed to avoid. Drive Skia props from shared values or Skia values instead.

**Mistake 3: Forgetting to cache Skia paths and pictures.** Skia lets you pre-record draw commands into a `Picture` object and reuse it. For anything static like a chart grid or a background pattern, always cache. Recomputing paths every frame is where Skia actually gets slow.

**Mistake 4: Mixing the legacy Animated API with Reanimated.** They don't share a timeline. Running both in the same screen leads to subtle sync issues, double-animated values, and animations that look "almost right." Pick one per screen and stick with it.

## The Short Version

Reanimated and Skia aren't rivals. They cover different layers of the animation problem, and good react native animation performance comes from knowing which layer you're in:

- **Reanimated = UI motion.** Views, gestures, transforms, scroll. Use it by default.
- **Skia = custom pixels.** Charts, shaders, effects, anything that isn't a standard view.
- **Use both together** when a gesture-driven interaction needs a custom-drawn visual.

Both libraries can hold 60fps on mid-range Android if you use them for the right job. The mistake isn't picking the wrong library. It's picking one without understanding what each is actually doing.

If you want more production React Native context, [the Bootalk app](https://juuc.github.io/portfolio/#/en/projects/bootalk-app) is where a lot of these tradeoffs got stress-tested on real user traffic. And [the Bootalk web SSR migration](https://juuc.github.io/portfolio/#/en/projects/bootalk-web) is the adjacent performance story. Different stack, same lesson: the biggest wins come from picking the right architecture, not tuning the wrong one.
