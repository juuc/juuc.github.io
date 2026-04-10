---
title: 'React Native OTA Updates in 2026: Why I Ship Bootalk on Expo EAS Update'
description: 'CodePush is deprecated. I ship React Native OTA updates on Expo EAS Update in production. Here''s how, why, and the CodePush alternatives I rejected.'
pubDate: '2026-04-10'
lang: 'en'
translation: 'ko/react-native-ota-updates-codepush-alternatives'
---

Microsoft retired App Center on March 31, 2025, and CodePush went with it. Anyone still shipping through CodePush today is flying with no one at the wheel: no security patches, no updates, no support. If you run a React Native app in production, you needed a replacement yesterday.

I was in that boat last year for [Bootalk](https://juuc.github.io/portfolio/#/en/projects/bootalk-app), our Korean PropTech app. I evaluated the main CodePush alternatives, picked Expo EAS Update, and I've been shipping on it ever since. This post is the first-hand version of that decision, not the marketing pitch. Here's why EAS Update won, the alternatives I considered, what actually breaks in production, and the cost math that killed my "EAS gets expensive at scale" fear.

## What React Native OTA Updates Actually Do

An OTA (over-the-air) update lets you push JavaScript and asset changes to a deployed React Native app without going through the App Store or Play Store review process. The app downloads a new JS bundle at runtime, and the next time a user opens the app, they're running your latest code. You never recompile the native binary.

That distinction defines what you can and can't ship OTA. You can push JavaScript changes, React component updates, business logic fixes, and asset swaps like images and copy. You cannot push native module changes, a new version of React Native itself, new permissions, or anything that modifies the compiled binary. Those still require a fresh App Store or Play Store submission.

For a product team, OTA is the difference between a same-day hotfix and a weeklong App Store review queue. At Bootalk, a JavaScript-only fix I ship in the morning is live on users' phones by lunch.

<svg viewBox="0 0 720 290" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="ota-flow-title ota-flow-desc" style="max-width: 100%; height: auto; display: block; margin: 2em auto;">
  <title id="ota-flow-title">React Native OTA update flow</title>
  <desc id="ota-flow-desc">Three-stage flow: a developer runs eas update on their laptop, Expo bundles and hosts the JavaScript on a CDN, and the user's React Native app downloads the new bundle on next cold start.</desc>
  <defs>
    <marker id="ota-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
    </marker>
  </defs>
  <g>
    <rect x="20" y="50" width="200" height="170" rx="14" ry="14" fill="none" stroke="currentColor" stroke-width="2" />
    <text x="120" y="86" text-anchor="middle" font-size="18" font-weight="700" fill="currentColor">1. You</text>
    <text x="120" y="110" text-anchor="middle" font-size="14" fill="currentColor" fill-opacity="0.65">laptop + Expo CLI</text>
    <rect x="36" y="134" width="168" height="68" rx="8" ry="8" fill="currentColor" fill-opacity="0.08" stroke="none" />
    <text x="120" y="162" text-anchor="middle" font-size="13" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" fill="currentColor">eas update</text>
    <text x="120" y="184" text-anchor="middle" font-size="13" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" fill="currentColor">--branch production</text>
  </g>
  <line x1="228" y1="135" x2="268" y2="135" stroke="currentColor" stroke-width="2" marker-end="url(#ota-arrow)" />
  <g>
    <rect x="276" y="50" width="200" height="170" rx="14" ry="14" fill="none" stroke="currentColor" stroke-width="2" />
    <text x="376" y="86" text-anchor="middle" font-size="18" font-weight="700" fill="currentColor">2. Expo</text>
    <text x="376" y="110" text-anchor="middle" font-size="14" fill="currentColor" fill-opacity="0.65">build + CDN</text>
    <text x="376" y="146" text-anchor="middle" font-size="14" fill="currentColor">bundles JS</text>
    <text x="376" y="170" text-anchor="middle" font-size="14" fill="currentColor">uploads to CDN</text>
    <text x="376" y="194" text-anchor="middle" font-size="14" fill="currentColor">tags runtime version</text>
  </g>
  <line x1="484" y1="135" x2="524" y2="135" stroke="currentColor" stroke-width="2" marker-end="url(#ota-arrow)" />
  <g>
    <rect x="532" y="50" width="168" height="170" rx="14" ry="14" fill="none" stroke="currentColor" stroke-width="2" />
    <text x="616" y="86" text-anchor="middle" font-size="18" font-weight="700" fill="currentColor">3. User</text>
    <text x="616" y="110" text-anchor="middle" font-size="14" fill="currentColor" fill-opacity="0.65">RN app on phone</text>
    <text x="616" y="146" text-anchor="middle" font-size="13" fill="currentColor">checks on open</text>
    <text x="616" y="170" text-anchor="middle" font-size="13" fill="currentColor">downloads bundle</text>
    <text x="616" y="194" text-anchor="middle" font-size="13" fill="currentColor">runs new code</text>
  </g>
  <text x="360" y="258" text-anchor="middle" font-size="13" font-style="italic" fill="currentColor" fill-opacity="0.6">JavaScript and assets only · no App Store review · minutes end to end</text>
</svg>

## Why CodePush Is Deprecated and What It Means for You

Microsoft officially retired App Center on March 31, 2025, and CodePush was part of that shutdown. The SDK still technically exists as a community fork on GitHub, but there's no one landing new features, patching security issues, or guaranteeing compatibility with future React Native releases.

Microsoft's own migration guidance points directly at Expo EAS Update. That's the loudest signal in the room: the team that built and ran CodePush for years is telling its users to move to Expo.

The hidden risk if you're still on CodePush isn't that updates stop working today. It's that the next React Native release, the next Hermes change, or the next iOS security patch could break something inside the deprecated stack, and there's no one on call to fix it. Production OTA infrastructure isn't the place to ride a frozen dependency.

## Why I Picked Expo EAS Update for Bootalk

I'll cut to the decision: I shipped Bootalk on EAS Update because the dev loop is faster than anything else I tested, the pricing is honest at my scale, and Expo owns the whole stack from dev client to production delivery. Here's what that looks like in practice.

### The Setup: Three Channels and appVersion Runtime

Bootalk runs on an Expo-managed workflow with three EAS Update channels: `production`, `staging`, and `preview`. Every build declares which channel it listens to, and updates ship to whichever channel matches. There's no canary channel, no gradual rollout layer on top. I kept it boring on purpose.

Runtime version is set to `appVersion`, which auto-links every OTA update to the native app version declared in `app.config.ts`. That means an update targeted at version `1.4.2` never reaches users still running `1.4.1`. It's tighter than a fingerprint-based strategy, but it's also simpler to reason about. I don't have to think about bundle compatibility across native changes because the runtime version enforces it for me.

### The Expo Dev Client Sealed the Deal

Here's the feature Expo doesn't oversell enough: the Expo dev client lets me switch between update branches on the fly during testing. I can have a development build on my phone and instantly pull in whatever branch I want to preview, `staging`, `preview`, or a specific feature branch. No rebuild. No reinstall. Pick the branch in the dev client, the app reloads itself, and I'm running that update seconds later.

For a team that ships daily, this is a massive speedup. QA can verify three branches in five minutes. I can check a fix against the production bundle before promoting it. None of the self-hosted alternatives I tested come close to this developer experience.

### One Command to Ship

Shipping a production OTA update at Bootalk is one command:

```bash
eas update --branch production --message "fix: property detail crash on iOS 18"
```

That's it. Expo's CLI builds the JS bundle, uploads it to their CDN, and within minutes every user on the `production` channel pulls the new code on their next app open. No SSH, no S3 upload, no version manifest to hand-edit. The ergonomics match what CodePush used to be, minus the deprecation anxiety.

I wire this into the CI workflow for merges to `main`, but honestly I run it by hand about half the time. The command is fast enough that automating it doesn't save meaningful effort.

### The Cost Math That Killed My "EAS Gets Expensive" Fear

This is where I pushed back hard on the Reddit folklore. Every "CodePush alternative" thread has someone warning that EAS Update gets expensive at scale. Here's what actually happens at Bootalk's scale: I'm on the Expo Pro plan, running 8,000+ monthly active users, and my monthly overage on top of the Pro plan base is about $5. Total cost: under $25 per month for the whole team.

That's the cost of a team lunch, and it covers a production OTA pipeline plus the rest of EAS Build and Submit. Compared to the engineering hours I'd burn maintaining a self-hosted CodePush server, S3 bucket, CDN, update manifest database, and monitoring, it's not even close.

The "EAS gets expensive" warning has a kernel of truth at genuinely large scale, roughly 100K+ MAU or apps that push OTA updates multiple times per day. If you're a typical mid-size React Native team, the cost fear is overblown. Run the numbers for your actual MAU before you buy the FUD. And verify current pricing on [expo.dev/pricing](https://expo.dev/pricing) before you commit, because Expo adjusts plans over time.

## The CodePush Alternatives I Considered (and Why They Didn't Win)

EAS Update wasn't the only option on the table. Here are the alternatives I actually evaluated, and why each one lost.

### Self-Hosted code-push-server (the Community Fork)

After Microsoft deprecated App Center, a community fork called `code-push-server` kept the original CodePush architecture alive as a self-hostable service. You run it on your own infrastructure, point your React Native CodePush SDK at your server, and in theory nothing changes in your app code.

The "in theory" is doing a lot of work there. Self-hosting means you own the S3 bucket, the CDN, the update manifest database, the monitoring, and the on-call rotation when something breaks at 2 a.m. The total cost of ownership dwarfs Bootalk's EAS bill, and I'd be paying that cost in engineering hours, which are the most expensive hours I have.

I considered it seriously only because of data residency concerns. If I had a compliance requirement that forced me to keep update manifests inside a specific region, I might have picked this. Bootalk doesn't, so I didn't.

### Pushy / cresc (the Chinese Open-Source Path)

Pushy (also known as `cresc`) is a popular OTA update service used heavily in the Chinese React Native ecosystem. It's open-source, battle-tested at large scale, and the hosted version is cheap.

Two things kept me from picking it. First, the primary documentation is Chinese, and while the code itself is universal, I didn't want my team to rely on translated docs for production infrastructure. Second, I didn't have a Chinese payment method for the hosted tier, and self-hosting brings back the same TCO problem as `code-push-server`.

Pushy is a real option if you're already operating in the Chinese market or you have Mandarin-speaking engineers on call. Neither was true for Bootalk.

### Sticking with Deprecated CodePush (the Do-Nothing Option)

The easiest path is always to do nothing. The community-forked CodePush SDK still works on most React Native versions, and if your app isn't upgrading frequently, you can coast for a while.

I ruled this out because "coast for a while" is code for "accrue risk until something breaks, then scramble." I'd rather migrate once, on my own schedule, than be forced into a panic migration after the next React Native release breaks the deprecated stack.

## EAS Update vs CodePush Alternatives at a Glance

| Option | Cost at 8K MAU | Dev Loop | Self-Host? | Bare RN Support | Docs |
|---|---|---|---|---|---|
| **Expo EAS Update** | ~$25/mo (Pro plan) | Excellent (dev client branch switching) | No (hosted) | Yes, with friction | English, first-party |
| **code-push-server (community)** | Infra + eng hours | Average | Yes (required) | Yes | Community, patchy |
| **Pushy / cresc** | Cheap or free (self-host) | Good | Optional | Yes | Primarily Chinese |
| **Deprecated CodePush** | $0 | Frozen | N/A | Yes | No maintenance |

The comparison isn't close for a typical mid-size team: EAS Update wins on dev loop, TCO, and documentation. It loses only if you have a specific constraint (data residency, Chinese market, extreme scale) that forces you off the hosted path.

## What Actually Breaks in Production (the Part Tutorials Skip)

Every "set up EAS Update in 5 minutes" post skips the parts where production OTA updates go sideways. Here's what I've actually had to think about.

### Runtime Version Drift

If your update targets a runtime version that doesn't match any installed app binary, users never receive it. The symptom is brutal: update shipped successfully, Expo dashboard says it's live, zero install rate. What happened is that the update was targeting `1.4.2` but everyone was still on `1.4.1` because the new binary hadn't finished rolling out through the App Store.

Fix: always push the native binary first, wait for adoption to hit whatever threshold you care about (I watch for 80%), and only then start shipping OTA updates targeting the new runtime version.

### Rollback UX Mid-Session

When you ship an OTA rollback, users already in the app don't see the replacement until their next cold start. That's a real gotcha if your bad update is actively crashing: users in the middle of a session are stuck on the broken build until they close and reopen the app.

EAS Update's rollback primitive is simple to the point of being boring. I delete the bad update from the Expo console and push a replacement. The replacement propagates the same way any update does, on next app open. There's no "poison pill" that forces a hot reload mid-session. If I needed that level of control, I'd add a forced version check inside the app, but I haven't needed it yet.

### Apple App Store Guideline 4.3 Risk

Apple's App Review Guidelines include a clause commonly called 4.3, which lets Apple reject apps that substantially change behavior after review. OTA updates are legal, but they exist in an uncomfortable zone: if your OTA ships features or flows that look like a different app from what Apple approved, you can trip the guideline.

I've never had a Bootalk rejection over this, but I've been cautious. My rule of thumb: if an OTA update would warrant a changelog entry like "new feature," I ship it as a native release instead. If it's a bug fix, a copy tweak, or a visual polish pass, OTA is fine.

### Hermes Fingerprint Mismatches

If you're on Hermes (and you probably are, it's the React Native default now), the JS engine fingerprints the bundle format. When Hermes or React Native version changes between your native binary and your OTA bundle, the app rejects the update silently. Users stay on the old code, no error toast, no notification, no log line you'll notice unless you're looking.

At Bootalk I've dodged this by keeping the runtime version strategy tight (`appVersion`) and treating every major React Native upgrade as a binary-only release. No OTAs targeting the new version until the binary has saturated.

### Staged Rollout Math

If you push an update to 10% of users and 5% of those users crash, that's 0.5% of your total user base in a crash loop. That sounds small until you do the arithmetic on a real MAU count. At 8,000 MAU, 0.5% is 40 people opening the app to a broken experience. At 100,000 MAU, it's 500.

I keep two hard rules: no OTA update goes out on a Friday, and nothing ships without a teammate looking at the diff. The best rollback strategy is still the one you never have to use.

## How I Ship OTA Updates at Bootalk (the Real Workflow)

Here's the actual flow, stripped down to what matters:

1. Merge a JavaScript fix to `main`.
2. Run `eas update --branch staging --message "fix: ..."`.
3. Open the Expo dev client on a test device, switch to the `staging` branch, verify the fix.
4. Run `eas update --branch production --message "fix: ..."`.
5. Watch the Expo dashboard for adoption metrics.
6. If something looks wrong, delete the production update in the Expo console and push a replacement.

I don't use staged rollout percentages at the EAS layer. I don't run a canary channel. The `production` channel gets the full user base as soon as I push, and if I'm worried about a change, I stage it through `staging` or `preview` first. Boring, but it fits the scale.

The native binary side of the workflow is separate: any change that touches native modules, bumps React Native, adds a permission, or changes the app version goes through a full EAS Build and App Store submission. OTA updates only ever ship JavaScript and assets targeted at the already-released runtime version.

## Honest Tradeoffs: Where EAS Update Struggles

I've made the case for EAS Update, but it isn't perfect for every team. Here are the tradeoffs worth naming honestly.

**Cost at very large scale.** Under roughly 100K MAU with moderate update frequency, EAS Update is cheap enough to ignore. Above that, or if you push OTAs multiple times per day, the overage line on your invoice starts to matter. Do the math against self-hosting, including engineering TCO.

**Data residency and compliance.** Expo runs updates through their CDN. If you have regulatory requirements that force you to host update manifests in a specific region or keep them on your own infrastructure, EAS Update isn't a fit. Self-hosted `code-push-server` or Pushy make more sense there.

**Bare React Native friction.** Bootalk is Expo-managed, and EAS Update is clearly optimized for that workflow. Teams on bare React Native report more setup friction, especially around build configuration and config plugins. I haven't run EAS Update on bare myself, so I can't speak to that experience first-hand. If you're bare, budget extra time for integration and verify against Expo's docs before committing.

**The appVersion coupling tradeoff.** Using `appVersion` as runtime version is simple, but it means every native change requires a full App Store release before you can ship OTAs targeting the new version. If your team wants to decouple native and JS release cadence more aggressively, a fingerprint-based runtime version is more flexible at the cost of complexity.

**Vendor lock-in.** Your channels, branches, and update manifests all live inside Expo's infrastructure. Migrating out isn't trivial if Expo ever changes pricing or shuts down a product. I'm comfortable with that risk because the Expo team has been steady for years, but it's a real consideration.

## Should You Use EAS Update for React Native OTA Updates?

Default yes for most React Native teams. Specifically:

- **Yes** if you're on Expo-managed workflow, under 100K MAU, and you want the fastest dev loop with the least infrastructure babysitting. EAS Update is the pragmatic default. It's what I ship at Bootalk, and I don't regret the choice.
- **Consider self-hosted code-push-server** only if you have data residency or compliance requirements that force update manifests onto your own infrastructure.
- **Consider Pushy / cresc** only if you're already operating in the Chinese market or you have Mandarin-speaking engineers who can own docs and support.
- **Don't rebuild a CodePush clone yourself.** I've seen teams try. It always costs more engineering time than they expect, and the OTA layer is the last place you want bespoke infrastructure.

The real skill isn't picking the vendor. It's designing for runtime version drift, rollback UX, and binary compatibility. EAS Update makes the vendor choice easy so you can spend your attention on the parts that actually matter.

If you're running React Native in production and you haven't planned your CodePush exit yet, start this week. The deprecated stack isn't going to break tomorrow, but the migration window is shorter than it feels. I'd rather migrate on my own schedule than in the middle of a production fire.

---

*Working on React Native in production? I write about what actually ships at [Bootalk](https://juuc.github.io/portfolio/#/en/projects/bootalk-app) and other apps I've built. Also worth a read: [React Native Animation Performance: Reanimated vs Skia](https://juuc.github.io/blog/react-native-animation-reanimated-vs-skia). Code and side projects live on [GitHub](https://github.com/juuc).*
