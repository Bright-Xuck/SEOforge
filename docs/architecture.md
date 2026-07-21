# Forge — Revised Architecture (v1.1)

### From "SEOForge, an SEO tool" → "Forge, a Website Intelligence system"

This document supersedes the SEO-specific framing of the previous architecture. Section 0 is my honest take on each of your 12 points — agree, agree-with-modification, or disagree — because a few of these have real costs you should walk in with eyes open. Everything after that is the revised design.

---

## 0. My Assessment of Each Point

| #   | Your idea                                               | My call                                                 | Why                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| --- | ------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Website Intelligence, SEO = one skill                   | **Agree, adopt fully**                                  | This was already latent in the layered design (analyzers/agents were mostly domain-agnostic). The rename forces the right generalization now instead of a painful retrofit later.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 2   | Skills, not Agents (Cursor model)                       | **Agree, with a clarification**                         | Renaming is right. But something still has to plan, hold multi-step context, and decide which Skills to invoke in what order — that's not gone, it's just not 13 named personas anymore. I'm calling that single thing the **Orchestrator Core**, and Skills are the stateless(ish) capability units it invokes. This is architecturally simpler than 13 agents, and it's what you actually described in point 12.                                                                                                                                                                                                                                                                                                        |
| 3   | Plan→Research→Think→Execute→Verify→Reflect→Memory loop  | **Agree, this is the right call**                       | Self-verification before showing the user is a genuine quality improvement, not just complexity for its own sake. Built into the Skill execution contract below.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 4   | Deep memory hierarchy                                   | **Agree, extend existing design**                       | The episodic/semantic split I had still holds; it just needed more scopes. Not a rearchitecture.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 5   | Don't build reports first                               | **Already the plan, reinforced**                        | My v1 roadmap already put reporting near the end. Confirmed, and I've pushed it later still.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 6   | Browser Vision instead of HTML-only                     | **Agree in principle, disagree on timing**              | Vision analysis (layout, whitespace, CTA position, trust signals) is genuinely something HTML can't give you. But: local vision models (llava, qwen2-vl via Ollama) are meaningfully weaker than GPT-4V/Claude vision, and screenshot+vision inference is slow and resource-heavy on top of an already resource-constrained local setup. **I'm making Vision a first-class, pluggable Skill capability with the seam built in v1, but not the default pipeline for every Skill run in v1.** Turning it on for a specific mission ("make the homepage convert better") is exactly where it earns its cost. Running vision analysis on every one of 200 crawled pages by default would make local-only Forge unusably slow. |
| 7   | Prompt Registry (versioned, tested, like code)          | **Agree, cheap and valuable, do it now**                | Formalizing what would've been ad-hoc prompt strings into first-class versioned artifacts costs little and pays off immediately once you have 10+ Skills.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 8   | Everything is a plugin (wordpress/, rankmath/, ga4/...) | **Agree, restructure folders now**                      | Previously I sequenced full plugin _loading_ as v2 but plugin-_shaped organization_ costs nothing to do from day one. Doing it now.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 9   | Universal Website Model                                 | **Strongly agree — this is the best idea in your list** | This is the actual architectural key that makes "Website Intelligence OS" coherent instead of a rebrand. Elevated to a first-class domain concept, detailed in §3.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 10  | Explainability on every recommendation                  | **Agree, formalize as a required schema**               | Cheap, high-trust-value, done in §6.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 11  | Desktop-only v1, skip responsive                        | **Agree**                                               | You're the only user. Ship faster.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 12  | Mission-driven, not agent-picking                       | **Agree — and this is the same idea as #2, done right** | "Improve buycleancart.com" → AI decides the plan → invokes Skills as needed. This _is_ the Orchestrator Core + Planner from the previous doc, just correctly framed as the primary interaction model instead of a power-user shortcut.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |

## Sprint 8 Update: Pipeline Architecture

Forge workflows are now expressed as pipelines composed of reusable pipeline steps. The Pipeline Engine only orchestrates ordered execution, dependency resolution, shared context, timing, and failure handling. Business logic stays inside existing packages and is wrapped by step adapters.

## Sprint 9 Update: Knowledge and Memory

Forge now separates slow-changing knowledge from event history.

- Knowledge Graph stores project facts, structure, and persistent site knowledge.
- Memory Engine stores historical events and timeline entries.
- Project Profile combines both for downstream consumers.
- Change Detection compares snapshots to surface deltas between runs.

## Sprint 10 Update: AI Skills Platform

Forge now treats AI as a reusable skills layer, not a monolithic integration.

- AI providers are interchangeable adapters behind a generic provider interface.
- Skills consume structured context, not raw HTML.
- Skills validate their own outputs before returning them.
- The pipeline layer registers skills as executable steps.

## Sprint 10 Hardening Update

The hardening pass removes implementation shortcuts before the platform grows further:

- Project resolution is explicit and ordered instead of silently falling back to `default-project`.
- Prompt definitions are first-class, versioned, and registry-backed.
- Skill execution consumes structured AI context rather than raw internal objects.
- Providers advertise capabilities before skill execution begins.
- AI-specific error types isolate provider, prompt, context, and validation failures.

## Sprint 11 Update: Agent Framework

Forge now adds an Agent layer above pipelines and skills.

- Agents make deterministic decisions from project context, findings, and memory.
- Agents orchestrate pipelines; they do not call providers or execute skills directly.
- Agent metadata and capabilities are explicit and registry-backed.
- Agent context includes project profile, knowledge, memory, registries, and execution history.

## Sprint 12 Update: Strategy Engine

Forge now inserts a Strategy layer between agents and pipelines.

- Agents generate strategies instead of selecting pipelines directly.
- Strategies capture objectives, selected pipelines, selected skills, risk, estimates, and approval requirements.
- Pipelines execute strategies by resolving each strategy step into one or more pipeline executions.
- Strategy validation and serialization are first-class concerns.

## Sprint 13 Update: Mission Engine

Forge now inserts a Mission layer above agents and below workspace/project context.

- Missions coordinate multiple agents and strategies for a single user goal.
- Mission planning selects agents, builds execution order, resolves dependencies, and estimates time, tokens, and risk.
- Built-in mission templates cover weekly optimization, homepage optimization, content optimization, metadata optimization, accessibility audits, technical audits, pre-launch audits, and store optimization.
- Mission lifecycle events are recorded in memory for later inspection and reuse.
- The orchestration chain is now Mission -> Agent -> Strategy -> Pipeline -> Skill -> Provider.

## Sprint 14 Update: WordPress Write Provider

Forge now supports safe WordPress write operations through the provider layer.

- Write flows remain gated by missions, agents, strategies, pipelines, and action approval.
- Preview and dry-run modes never mutate WordPress.
- Write results capture old value, new value, timestamp, resource ID, and revision ID where available.
- Rollback uses stored revision data or the provider's native revision support when possible.
- Content APIs should anticipate section-level editing in future content intelligence work.

## Sprint 15 Update: Homepage Optimization Vertical Slice

Forge now has its first production-ready vertical slice for homepage optimization.

- Homepage detection supports front page, static homepage, blog homepage, store homepage, and WordPress front-page settings.
- Homepage analysis is deterministic and rule-based only.
- Homepage optimization plans include preview objects before approval and execution.
- The workflow remains provider-independent and reuses the existing mission, strategy, pipeline, and execution layers.
- This sprint intentionally avoids AI generation and prepares structured content sections for future content intelligence.

Built-in pipelines currently include:

- Website Audit
- Weekly Optimization
- Validation Only

The CLI now routes legacy commands through pipeline execution and exposes a `forge pipeline` command group for listing, inspecting, and running pipelines.

## Sprint 16 Update: Content Intelligence Engine

Forge must understand website content before AI is allowed to modify it. Sprint 16 introduces a deterministic content-understanding layer that all future AI generation depends on. The output is structured intelligence, not rewritten text.

- Content Intelligence is a reusable understanding layer that sits **below** skills and providers. It consumes a `WebsiteSnapshot` (and re-parses `rawHtml` deterministically) and produces structured intelligence.
- It must **never** generate content, call an LLM, use the Prompt Registry, or use AI providers. Everything is deterministic and offline.
- The new understanding flow:

```text
Website

↓

DOM

↓

Content Intelligence

↓

Page DNA

↓

Content Graph

↓

Optimization Plan

↓

Content Generation (future)
```

- New package: `packages/content-intelligence` (`@forge/content-intelligence`, v0.16.0).
- Produces: `PageDNA` (page type, search intent, audience, heading distribution, reading level, section inventory, entities, topics, link/media/trust/schema/metadata summaries), a `ContentGraph` (Page → Section → Block → Paragraph → Sentence), deterministic quality scores, and content-gap detection.
- CLI gains a `forge content` command group: `analyze`, `graph`, `dna`, `sections`, `entities` (with `--json` and `--project`).
- Pipeline Engine gains five reusable steps — Content Analysis, Content Graph, Page DNA, Gap Detection, Entity Extraction — composed into a `content-intelligence` pipeline.
- Homepage Engine now **additively** consumes Content Intelligence outputs (section detection + Page DNA) to enrich its deterministic analysis without changing existing output shapes.

The orchestration chain remains Mission → Agent → Strategy → Pipeline → Skill → Provider. Content Intelligence is a building block that future Missions, Agents, Strategies, and Skills consume.

## Sprint 17 Update: Section Content Generation Engine

Forge's first AI-powered content generation layer — but scoped strictly to **sections**, never whole pages. AI produces only candidate improvements; Content Intelligence remains the source of truth.

- New package: `packages/content-generation` (`@forge/content-generation`, v1.7.0-beta.1).
- **One-way dependency:** `content-generation → content-intelligence`. Content Intelligence must never import AI, prompt-registry, or skills. Generation is additive and sits above understanding.
- The generation workflow:

```text
Page
  ↓
Content Intelligence
  ↓
Page DNA
  ↓
Content Graph
  ↓
Section Selection
  ↓
Prompt Builder
  ↓
AI Provider (via AI Engine)
  ↓
Structured Output
  ↓
Validation (content safety)
  ↓
ContentPatch + SectionDiff
  ↓
Preview
  ↓
Approval (Sprint 18)
  ↓
Execution (Sprint 18)
```

- A dedicated `PromptBuilder` composes registry-backed `PromptDefinition`s from Page DNA + Knowledge + Memory + Audience + Intent + Tone + Brand + existing section + target keywords + missing topics. Prompts are **never** built by manual string concatenation.
- AI providers are integrated through the existing AI Engine. Sprint 17 keeps all providers **mocked** but adds `AIProviderConfig` + `ProviderFactory` scaffolding so real providers swap in later without changing callers.
- Every AI output becomes a self-contained `ContentPatch` (id, sectionId, operation, selector, currentContent, proposedContent, diff, validation, confidence, estimatedImpact, warnings, generatedBy, provider, model, promptVersion, createdAt) plus a `SectionDiff` for review.
- A `validator` enforces content safety (length bounds, heading count, keyword stuffing, repeated phrases, malformed markdown/HTML, broken links, empty output, unsafe placeholders) before any patch is emitted.
- CLI gains a `forge generate` command group: `hero|faq|cta|section|page --preview` with `--provider --model --project --dry-run --json`.
- Pipeline Engine gains five reusable steps — Section Generation, Patch Creation, Output Validation, Diff Generation, Patch Packaging.
- Skills are rewired to call the Prompt Builder instead of embedding prompts; the Homepage Optimization Mission can detect a weak Hero and generate a section-level replacement (preview only).
- **Out of scope (Sprint 18):** visual review, scheduling, execution/WordPress writes, real provider API keys, publishing.

**Where I disagree, specifically:**

- **Electron.** I'd push back on this one directly (see §11). I don't think you want Electron yet, for reasons below — I think you want a plain local web app, and Electron is a v3/v4 decision, not a v1 one.
- **Dropping Next.js entirely, immediately.** I agree with _not defaulting to Next.js reflexively_, and I agree the reasoning ("everyone uses it because it's familiar") is a bad reason to pick a framework. But I'd land somewhere more specific than "Electron or Express+React" — see §11 for the actual recommendation and why.
- **Making Vision the default lens (implicitly suggested by "not HTML, Vision")** — I'd keep HTML/DOM analysis as the fast, cheap, always-on default, and Vision as an escalation the Orchestrator invokes when a mission is visual in nature (homepage conversion, UX, trust signals) or when HTML analysis alone can't explain something (e.g., DOM says heading hierarchy is fine, but is it _visually_ clear which is the primary CTA?).

Everything below reflects the agreed changes.

---

## Sprint 18 Update: Review Engine

Forge's review/approval layer — the gate between Content Generation and Execution. Nothing reaches WordPress until it has passed through Review.

- New package: `packages/review-engine` (`@forge/review-engine`, v0.18.0).
- **Deterministic and provider-independent.** The Review Engine contains **no LLM calls** and **must never import** `ai-engine`, `skills`, or `prompt-registry`. AI never makes approval decisions and never overrides the reviewer.
- **One-way dependency:** `review-engine → content-generation` (types only), `action-engine`, `homepage-engine`, `preflight-validator`, `memory-engine`, `knowledge-engine`, `core`. Generation/understanding remain the source of truth; Review sits above them and never feeds back into them.
- The review workflow:

```text
ContentPatch (from Content Generation)
  ↓
ReviewSession (one item per patch)
  ↓
compareContent() — pure deterministic diff (word/sentence/entity/keyword/heading deltas, readability + SEO delta)
  ↓
Approval Policies (Strict | Balanced | Automatic | Enterprise)
  ↓
Reviewer Decision (approve | reject | edit | comment)
  ↓
Metrics + Report (Markdown | JSON | HTML)
  ↓
Execution Plan (built from approved patches)
  ↓
Execution Engine (dry-run OR real — provider decides)
  ↓
Provider (WordPress write)
```

- A `ReviewSession` aggregates `ReviewItem`s (one per `ContentPatch`), each carrying the deterministic comparison, policy evaluation, and reviewer state.
- `compareContent()` is a pure function — no network, no randomness, no AI. It produces structured deltas used by both the UI/report and the metrics layer.
- Approval policies are deterministic rule sets (confidence thresholds, severity gates, keyword-stuffing guards, high-risk change detection). The Automatic policy auto-approves only low-risk, high-confidence, policy-passing patches; everything else requires a human reviewer.
- Memory events (`review-created`, `review-approved`, `review-rejected`, `review-commented`, `review-completed`) are recorded per session. Per-project knowledge tracks average approval rate, preferred review style, common rejected patterns, and frequently edited sections.
- Sessions persist under `projects/<project>/reviews/{active,completed}/<sessionId>.json` with a lightweight `index.json` for fast listing.
- Pipeline Engine gains seven reusable steps — review-create, review-filter, review-sort, review-approve, review-export, review-summary, review-metrics.
- Homepage Optimization (`forge homepage optimize`) now stops at a Review Session: Analyze → Generate patches → Create Review Session → Stop. Execution begins only after the reviewer applies the session.
- **Out of scope (Sprint 19+):** visual review UI, scheduling, background workers, publishing, WordPress writes, real AI approval.

---

## 1. Product Framing

**Product name:** Forge
**v1 edition scope:** Forge for WordPress (the engine is general-purpose from day one; v1's _installed capabilities_ are WordPress + SEO + accessibility + basic UX, not the whole vision — same discipline as before, just renamed)

**Core interaction model:**

```
User: "Improve buycleancart.com"

Forge does NOT ask "SEO or accessibility or performance?"

Forge:
  1. Loads Universal Website Model + full memory hierarchy for the site
  2. Orchestrator Core reasons about what's actually wrong/opportunity-rich
  3. Builds a Mission Plan (which Skills, in what order, why)
  4. Executes Skills through the verification loop
  5. Presents a prioritized, explained, evidence-backed set of proposed changes
  6. User approves selectively
  7. Forge applies only approved changes
```

SEO becomes one entry in a Skill registry, not the organizing principle of the whole system.

---

## 2. Core Conceptual Shift: Orchestrator + Skills (not Agents)

Replacing 13 named Agents with:

- **One Orchestrator Core** — plans missions, sequences Skills, owns the verification loop, owns memory read/write coordination. This is application-layer, not a "personality."
- **A Skill Registry** — many small, composable, mostly-stateless capability units. A Skill is closer to a well-defined function-with-a-brain than an autonomous character.

```ts
interface Skill<TInput, TOutput> {
  readonly id: string; // "seo.metadata", "a11y.contrast", "ux.cta-clarity"
  readonly category: SkillCategory; // seo | accessibility | performance | ux | content | technical | vision
  readonly requires: SkillRequirement[]; // e.g. ["dom", "vision"?, "wordpress.read"]
  readonly version: string;
  run(input: TInput, ctx: SkillContext): Promise<SkillResult<TOutput>>;
}
```

This is almost entirely a rename + slight interface simplification from the previous `IAgent` — **the orchestration mechanics (job queue, event bus, DAG execution) are unchanged**, which is exactly why this pivot is cheap to make now and would have been expensive to make after building out 13 agent packages.

Naming migration from the old design:
`Homepage Agent → homepage.audit skill (composed of several smaller skills)`, `Technical SEO Agent → seo.technical.* skills`, `Accessibility Agent → a11y.* skills`, `WordPress Agent → becomes the wordpress plugin's capability surface, not a "skill" per se — it's how skills reach the CMS`.

---

## 3. Universal Website Model (UWM) — the architectural core

This is the idea that actually makes "Website Intelligence OS" real instead of marketing. Every CMS adapter's job is to produce this one canonical structure; every Skill's job is to consume it. No Skill should ever contain WordPress-specific or Shopify-specific logic — that logic lives entirely in the adapter that builds the UWM.

```ts
interface WebsiteModel {
  siteId: string;
  pages: PageModel[];
  globalNav: NavModel;
  sitemap: SitemapModel;
  robots: RobotsModel;
}

interface PageModel {
  url: string;
  cmsRef: { type: "wordpress" | "shopify" | "webflow" | "html" | "ghost" | "drupal"; id: string };
  sections: SectionModel[]; // hero, content-block, product-grid, footer, ...
  headings: HeadingModel[];
  media: MediaModel[];
  links: LinkModel[]; // internal/external, anchor text, position
  forms: FormModel[];
  scripts: ScriptRef[];
  metadata: MetadataModel; // title, description, canonical, robots meta
  schema: SchemaOrgBlock[];
  screenshot?: ScreenshotRef; // populated only when a Vision-capable skill requests it
  raw: { html: string; renderedDom?: string }; // renderedDom via Playwright when JS-heavy
}

interface SectionModel {
  type:
    | "hero"
    | "cta"
    | "content"
    | "product-grid"
    | "testimonial"
    | "form"
    | "footer"
    | "nav"
    | "unknown";
  boundingBox?: BoundingBox; // present when vision analysis has run
  components: ComponentModel[];
}
```

- **CMS adapters** (`plugins/wordpress`, `plugins/shopify`, etc.) are the _only_ place that knows CMS-specific APIs/data shapes. Their entire job: read from the CMS → produce a `WebsiteModel`/`PageModel`; and the reverse — take a proposed `PageModel` diff → translate into a CMS-specific draft update.
- **Every Skill operates purely against `WebsiteModel`/`PageModel`.** This is what lets a Skill written once ("weak-cta-visibility") work identically on a WordPress site and a Shopify site — it was the whole point of your idea, and it's now enforced structurally, not just aspirationally: Skills literally cannot import a CMS client, only the domain model.
- **Section classification** (hero/cta/product-grid/etc.) is itself a Skill (`structure.section-classifier`) that runs early in most missions and populates `sections` — other Skills depend on its output rather than re-parsing raw HTML each time. This becomes a genuinely reusable, cacheable intermediate layer.

---

## 4. Skill Execution Loop

Every Skill run goes through this pipeline (not every phase is heavy for every Skill — a simple deterministic check like "canonical tag present?" skips straight to Execution/Verification with no real "Thinking" phase; the pipeline shape is uniform, the depth per phase is Skill-dependent):

```
Plan        — Orchestrator decides this Skill is needed, with what scope/params
Research    — Skill pulls what it needs: UWM data, memory (episodic + semantic),
              competitor data if relevant, external tool calls (Lighthouse, GSC...)
Thinking    — LLM reasoning step (only for judgment-based skills): draft findings/
              recommendations, using AI provider
Execution   — Produce concrete output: a Finding, a Draft change, a Score
Verification— Re-read own output against the source. For content-generating skills:
              re-run a critique pass ("does this draft actually satisfy the goal,
              is it accurate, does it introduce new issues?")
Reflection  — Compare against confidence threshold; low confidence → flag for
              extra human review rather than presenting as a firm recommendation
Memory      — Write outcome to the memory hierarchy (episodic always; semantic
              embedding for anything likely to be recalled by similarity later)
```

```ts
interface SkillResult<T> {
  findings: Finding[];
  output: T;
  confidence: number; // 0–1, drives Reflection phase
  verificationNotes?: string; // what the self-check looked at and concluded
  status: "success" | "needs-review" | "failed";
  durationMs: number;
  tokensUsed?: number;
}
```

The **Verification phase is where local-model weakness gets partially compensated** — a second, cheaper LLM call whose only job is "does this claim/draft hold up against the evidence?" catches a meaningful fraction of hallucinated or unsupported findings before they ever reach the user, regardless of provider quality.

---

## 5. Memory Hierarchy

Extends the previous episodic/semantic split into explicit scopes, all still backed by the same two physical stores (SQLite for exact records, LanceDB for embeddings) — this is a taxonomy change, not a new subsystem:

```
Website Memory     — top-level facts about the site (industry, brand tone, goals)
  └─ Page Memory    — per-page history: edits, scores over time, notes
Brand Memory       — voice, tone, terminology preferences, things to never say
Project Memory     — the current Mission's working context (multi-step state)
Conversation Memory— this chat session's context (short-lived, not persisted long-term)
Learning Memory     — what recommendations were accepted/rejected, and *why* if the
                       user gave a reason — this is the highest-value memory type
Execution Memory    — exact record of what changes were actually applied, when,
                       by what Mission, so future Missions know "already done"
```

```ts
interface MemoryService {
  recordEpisode(scope: MemoryScope, entry: MemoryEpisode): Promise<void>;
  recall(scope: MemoryScope, filter: EpisodeFilter): Promise<MemoryEpisode[]>;
  recallSimilar(scope: MemoryScope, query: string, k: number): Promise<MemoryEpisode[]>;
}

type MemoryScope =
  | { level: "website"; websiteId: string }
  | { level: "page"; websiteId: string; pageUrl: string }
  | { level: "brand"; websiteId: string }
  | { level: "project"; missionId: string }
  | { level: "learning"; websiteId: string }
  | { level: "execution"; websiteId: string };
```

Practical example matching yours directly: before Forge proposes a homepage headline change, it can `recall({level:"page", pageUrl}, {type:"edit-history"})` for the last N edits and their outcome data (CTR/bounce if GA4 is connected) — turning "AI knows all of it" from a slogan into an actual query against real stored data.

---

## 6. Explainability Contract

Every `Recommendation` — regardless of which Skill produced it — must populate this shape before it can be shown to the user. Enforced at the domain layer (a `Recommendation` cannot be constructed without these fields), not left to Skill authors' discipline:

```ts
interface Recommendation {
  id: string;
  title: string;
  evidence: Evidence[]; // what was observed, with source (UWM path, screenshot ref, tool output)
  reasoning: string; // plain-language "why this matters"
  confidence: number; // from the Skill's Reflection phase
  expectedGain: {
    metric: string; // "organic traffic", "conversion rate", "a11y score"
    magnitude: "low" | "medium" | "high";
    rationale: string;
  };
  risk: {
    level: "low" | "medium" | "high";
    description: string;
  };
  rollback: {
    possible: boolean;
    method: string; // "revert draft", "restore previous meta", ...
  };
  diff?: ProposedDiff;
}
```

No black box, exactly as you specified — and this also directly strengthens the "no auto-publish" security posture from the original doc, since a human reviewing a change now sees risk/rollback/confidence right next to the diff, not just the diff.

---

## 7. Mission-Driven Planning (replaces fixed audit workflows)

```ts
interface Mission {
  id: string;
  websiteId: string;
  goal: string; // "Increase organic traffic 30%" or "Improve buycleancart.com"
  status: "planning" | "running" | "awaiting-approval" | "completed";
  plan: MissionStep[]; // produced by Orchestrator, not hardcoded
}

interface MissionStep {
  skillId: string;
  reason: string; // why the Orchestrator chose this skill for this goal
  dependsOn: string[]; // other step ids
}
```

The Orchestrator's planning prompt takes: the stated goal, the Universal Website Model summary, relevant memory (especially Learning Memory — don't re-plan things already rejected), and the full Skill Registry with each Skill's declared `category`/`description`/`requires` — and produces a `MissionStep[]` plan, which is itself shown to the user as a preview _before_ execution starts (cheap trust-building step: "here's what I'm about to do and why," not just "here's what I found" after the fact).

This directly replaces the old "type a command → fixed agent list runs" flow with what you described: the AI decides the problem, not a hardcoded mapping.

---

## 8. Browser Vision — designed in, gated by default

```ts
interface IVisionProvider {
  readonly name: string; // "ollama-llava" | "claude-vision" | "gpt4v"
  analyzeScreenshot(req: VisionRequest): Promise<VisionAnalysis>;
}

interface VisionAnalysis {
  layoutSummary: string;
  ctaPosition?: BoundingBox;
  visualHierarchyIssues: string[];
  contrastIssues: ContrastFinding[];
  whitespaceAssessment: string;
  trustSignalsDetected: string[];
}
```

- Same provider-abstraction pattern as `ILlmProvider` — Ollama vision model by default, swappable to a cloud vision model per-site/per-mission via config.
- A dedicated `vision.layout-audit` Skill wraps: Playwright screenshot → `IVisionProvider.analyzeScreenshot()` → Findings, in the same Skill contract as everything else — it's not a separate subsystem, just a Skill with a heavier `requires: ["screenshot", "vision-provider"]`.
- **Gating rule**: the Orchestrator only invokes vision Skills when (a) the Mission goal is visually-relevant (conversion, UX, trust, layout, accessibility-contrast), or (b) a cheaper HTML-based Skill flags something ambiguous that vision could resolve. Full-site vision sweeps are opt-in, not default, given local compute cost — this is the one place I'm asking you to accept a v1 constraint in exchange for not making local-only Forge painfully slow.

---

## 9. Prompt Registry

```
packages/prompts/
├── registry.ts                 # PromptRegistry: get(id, version?)
├── seo/
│   ├── metadata-analysis.prompt.ts     # { id, version, template, variables, tests }
│   └── metadata-analysis.test.ts
├── ux/
│   └── cta-clarity.prompt.ts
└── ...
```

```ts
interface PromptDefinition {
  id: string;
  version: string;
  owner?: string; // useful once this is a team, not just you
  template: string; // with {{variable}} interpolation
  variables: string[];
  metrics?: { avgConfidence?: number; acceptRate?: number }; // populated over time from Recommendation outcomes
  changelog: { version: string; date: string; note: string }[];
}
```

Prompts are versioned artifacts with their own tests (given fixture input, does the prompt + a mock/real model produce output matching the expected schema and rough content?) exactly like code — cheap to build now, and it gives you the `acceptRate` metric per prompt version for free later (join `Recommendation.status` back to the prompt version that generated it), which is genuinely useful product data once you have real usage.

---

## 10. Plugin-First Folder Structure

> **Note:** This section shows a strategic sketch of the eventual folder structure. For the authoritative build-time package layout, see `project-structure.md`. The mapping from conceptual names here to actual packages is documented in ADR-0017.

```
forge/
├── apps/
│   ├── web/                      # frontend — see §11 for stack decision
│   └── worker/
│
├── packages/
│   ├── domain/                   # WebsiteModel, PageModel, Mission, Recommendation,
│   │                              # Skill contract, MemoryScope — CMS/AI agnostic
│   ├── application/               # Orchestrator Core, Mission Planner, Verification loop
│   ├── skills/                    # capability units, organized by category not by "agent"
│   │   ├── seo/
│   │   ├── accessibility/
│   │   ├── performance/
│   │   ├── ux/
│   │   ├── content/
│   │   ├── technical/
│   │   ├── vision/
│   │   └── structure/             # section-classifier and other shared foundation skills
│   ├── ai-providers/               # unchanged from v1 doc: ollama/lmstudio/openrouter/gemini/claude/openai
│   ├── vision-providers/           # new: ollama-vision/claude-vision/gpt4v
│   ├── prompts/                    # Prompt Registry
│   ├── memory/                     # extended scopes, same physical stores
│   ├── crawler/                    # produces raw HTML/DOM; feeds into UWM builders
│   ├── uwm/                        # Universal Website Model types + builders + validators
│   ├── database/ · queue/ · tools/ · reporting/ · auth/ · config/ · shared/   # unchanged
│
├── plugins/                        # THE reorganized part — one folder per integration
│   ├── wordpress/                  # UWM adapter (read+draft) + credential handling
│   ├── woocommerce/
│   ├── rankmath/                   # reads/reconciles with existing RankMath schema data
│   ├── yoast/
│   ├── shopify/                    # v3, stubbed
│   ├── webflow/                    # v3, stubbed
│   ├── cloudflare/                 # v2+, optional
│   ├── github/                     # v2+, optional
│   ├── search-console/             # optional, off by default
│   ├── ga4/                        # optional, off by default
│   └── semrush-import/             # CSV-based, no API key needed
│
├── docs/
└── docker-compose.yml
```

Each `plugins/*` folder is self-contained: manifest, UWM adapter (if it's a CMS) or Skill/tool provider (if it's a data source), own tests, own docs page. This is the real version of "install/remove/done" — even though v1 doesn't have hot-loading yet (that's still v2, per the original risk callout about sandboxing arbitrary code), the _codebase_ is already organized as if plugins were independently removable, which is most of the value and all of the discipline.

---

## 11. Frontend/Backend Stack — the actual decision

You're right to question Next.js-by-default. Here's where I actually land, and it's not quite either of your two suggestions:

**Recommendation: React + Vite (SPA) + Fastify backend. Not Electron, not Next.js, for v1.**

Why not Electron, specifically:

- Electron's value is _distributing a native-feeling app to other people's machines_ — auto-updates, code signing, OS integration, offline installers. You are the only user, running this on your own dev machine. You get zero benefit from that packaging machinery right now.
- Electron adds real, ongoing complexity: main/renderer process separation, IPC boundaries, native module rebuilding (which matters here since you're integrating Playwright and possibly native SQLite bindings), and a slower iteration loop than a browser tab with hot reload.
- Everything you actually want from your reasoning (fast startup, local file access, easy Ollama/Playwright integration) is achieved by **running a local Node backend and opening it in a normal browser tab** — you get local file access and process control from the Node backend, not from Electron specifically. Electron only matters when you need to _not_ use a browser at all (offline installer, systray app, etc.) — not a v1 concern.

Why not Next.js, specifically:

- You're right that SSR, the App Router's server/client component split, and Next's deployment assumptions are solving problems you don't have yet (no public-facing pages, no SEO-for-Forge-itself, single operator). That complexity is real overhead for zero benefit at this stage.

Why not "just Express + React" without more structure:

- Fastify over Express: faster, better TypeScript support out of the box, first-class schema validation (pairs well with zod) — strictly better for a new TS project, same mental model as Express so no real learning cost.
- Vite over CRA/plain bundler: this part of your suggestion is simply correct, no notes.

**What you actually get with this stack:**

- `apps/web`: Vite + React SPA, client-side routing (React Router), talks to the backend via the same tRPC-style typed API (tRPC works fine over Fastify, not just Next API routes) — so you keep end-to-end type safety.
- `apps/worker`: unchanged from before, standalone Node process for Skill execution.
- **Migration paths stay open and cheap**, because the boundary discipline from the original doc still holds: domain/application/skills packages have zero knowledge of Vite, Fastify, tRPC, or React. If v3/v4 genuinely needs a public SaaS marketing site or SSR for some reason, that's a _new_ `apps/marketing` (Next.js) sitting alongside `apps/web`, not a rewrite of it. If v4 wants a distributable desktop app for other agencies, Electron becomes a thin wrapper around the same `apps/web` build — again additive, not a rewrite, because Electron would just be loading the same Vite-built SPA against a bundled local backend.

This is the version of your suggestion I'd actually ship: you get the simplicity you're after immediately, without pre-paying for Electron's packaging complexity before you have a second user who needs it.

---

## 12. Reports — confirmed deprioritized

No change in position, just reinforced: Markdown export (cheapest, given structured `Recommendation`/`Evidence` data already exists) is the only report format that ships anywhere near v1, and only after the "propose → approve → apply" loop is solid. PDF/HTML/CSV exporters move even later than they were before. Automation (the loop actually doing useful work) is the v1 measure of success, not reporting polish.

---

## 13. Revised Version Roadmap

- **v1 — Forge for WordPress (Website Assistant)**: Universal Website Model + WordPress adapter only; Orchestrator Core + Mission planning; Skills: SEO (technical + metadata), Accessibility (structural, non-vision), basic UX/structure skills, Content drafting; full verification loop; memory hierarchy (episodic first; semantic once the loop is proven); explainability contract; desktop-only local web app (Vite+Fastify); Prompt Registry from day one; Vision Skill seam present but off by default; draft+approve WordPress workflow; Markdown export only.
- **v2 — Forge Operator**: Vision Skills turned on for relevant missions; RankMath/Yoast reconciliation plugins; semantic memory fully wired; Prompt Registry metrics feeding back into Mission planning quality; PDF/HTML/CSV export; GSC/GA4 plugins; real plugin hot-loading with sandboxing (still the highest-risk item, unchanged caution from the original doc).
- **v3 — Forge Agency Platform**: Shopify/Webflow/Ghost/Drupal UWM adapters; multi-site portfolio views; RBAC for agency staff; client-facing report/approval portal; possibly the point where Electron or a hosted SaaS deployment becomes worth its cost, decided based on actual usage pattern at that point rather than guessed now.
- **v4 — Forge (general AI Operations Platform)**: The UWM generalizes to "Universal Domain Models" for other target types (APIs, docs, codebases) if you actually pursue that — genuinely out of scope to design now, but nothing above blocks it, since the Orchestrator/Skill/Memory/Explainability layers were never SEO-specific or even website-specific in their contracts.

### Sprint 16 — Content Intelligence Engine (v0.16.0)

Forge now understands website content deterministically before any AI is allowed to modify it.

- New package `@forge/content-intelligence` produces structured understanding (Page DNA, Content Graph, quality scores, content gaps) from a `WebsiteSnapshot`.
- No LLM, no Prompt Registry, no AI providers, no text generation, no content rewriting — everything is deterministic and offline.
- New flow: `Website → DOM → Content Intelligence → Page DNA → Content Graph → Optimization Plan → Content Generation (future)`.
- CLI gains `forge content {analyze,graph,dna,sections,entities}` with `--json` and `--project`.
- Pipeline Engine gains five reusable steps (Content Analysis, Content Graph, Page DNA, Gap Detection, Entity Extraction) composed into a `content-intelligence` pipeline.
- Homepage Engine additively consumes Content Intelligence outputs to enrich its deterministic analysis while preserving backwards compatibility.

---

## 14. What Stayed the Same

For completeness, everything from the original architecture document that this revision does **not** change: Clean Architecture layering and lint-enforced boundaries, SQLite+Drizzle+LanceDB as the default zero-cost data layer, the AI provider abstraction (`ILlmProvider`), the job queue design (SQLite v1 → BullMQ v2), the security architecture (encrypted credentials, publish-gateway isolation, no-auto-publish enforcement), error handling and logging strategy, and the testing strategy. The pivot is real but it's a pivot in _framing, naming, and a few new subsystems_ (UWM, Vision, Prompt Registry, expanded memory) — not a rewrite of the infrastructure decisions that were already sound.
