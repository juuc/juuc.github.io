# Seomachine Context — Ju Woocheol Dev Blog

This file contains pre-filled content for seomachine's `context/` files.
Copy each section into the corresponding file when setting up seomachine.

---

## → `context/brand-voice.md`

### Who I Am
Ju Woocheol (주우철) — frontend engineer with 4+ years of React Native and React experience.
Previously Data Engineer → Tech Lead / Product Owner at a Korean PropTech startup.
Seoul National University graduate (Civil & Environmental Engineering, 2025).

### Voice Pillars
1. **Practical over theoretical** — every post has working code and real-world context
2. **Show the why** — not just "how to do X" but why the approach matters
3. **Honest about tradeoffs** — acknowledge when a solution has downsides
4. **Concise** — respect the reader's time, cut filler

### Tone
- Direct, first-person ("I built X", "I ran into Y")
- Technical but accessible — assume the reader knows React basics
- No hype words ("amazing", "game-changing", "revolutionary")
- Numbers over adjectives ("60% faster" not "much faster")

### Target Audience
React Native and React frontend developers, mostly mid-level engineers looking for
practical guides on real problems: performance, architecture, migration, tooling.

### Do's
- Lead with the problem, then the solution
- Include code snippets for every key concept
- Link to relevant PRs or repos when possible
- Mention specific tools and versions

### Don'ts
- No "In this article we will..." intros
- No padding paragraphs to hit word count
- Don't oversimplify — readers can handle nuance

---

## → `context/features.md`

### Blog Topics (Primary)
- React Native performance optimization (LCP, bundle size, render cycles)
- React architecture patterns (monorepo, component design, state management)
- TypeScript in React/React Native projects
- Testing strategies (unit, E2E, coverage)
- Migration stories (CRA → Vite, bare RN → Expo, CSR → SSR)
- CI/CD and deployment for frontend projects
- AI-assisted development workflows

### Unique Angle
Real production experience from a startup where I owned the entire frontend stack:
3 repos → 1 monorepo, PageSpeed 20→80, mobile LCP 3.3s→1.3s, 48K-URL dynamic sitemap.
Posts are grounded in things I actually shipped, not toy examples.

### Blog URL
https://juuc.github.io

### Related Portfolio
https://juuc.github.io/portfolio/

---

## → `context/target-keywords.md`

### Primary Keywords
- react native performance optimization
- react monorepo setup
- expo migration react native
- vite react setup
- typescript react native
- react native e2e testing
- mobile lcp optimization
- react native vs expo

### Secondary Keywords
- react native bundle size
- framer motion react
- react hashrouter github pages
- astro blog setup
- react native ota updates
- dagster etl pipeline

---

## Workflow: Seomachine → Astro Blog

1. In seomachine workspace: `/research [topic]` → review brief
2. In seomachine workspace: `/write [topic]` → draft lands in `seomachine/drafts/`
3. Review and edit the draft
4. Copy to `juuc.github.io/src/content/blog/your-post-slug.md`
5. Add frontmatter:
   ```md
   ---
   title: 'Your Post Title'
   description: 'One-line description for SEO'
   pubDate: 'YYYY-MM-DD'
   heroImage: '/blog-placeholder-1.jpg'
   ---
   ```
6. `git push` → live at `https://juuc.github.io/blog/your-post-slug`
