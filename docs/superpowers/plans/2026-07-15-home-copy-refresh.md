# ChurchOS Home Copy Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a reviewable home-page preview using the approved ChurchOS co-creation copy.

**Architecture:** Keep the existing semantic application shell and stable button IDs. Replace only the home content structure in `public/index.html`, add page-specific layout rules in the existing stylesheets, and protect the copy contract with a static Node test.

**Tech Stack:** HTML5, CSS3, Lucide, Node Test Runner.

## Global Constraints

- Do not change authentication, wish-wall, sharing, notification, or administrator behavior.
- Preserve `hero-join-button`, `hero-wall-button`, and the quick drawer controls.
- Keep cards at 8px radius or less.
- Verify 375x812, 430x932, 768x1024, and 1440x900.

---

### Task 1: Home Copy Preview

**Files:**
- Modify: `test/final-polish.test.mjs`
- Modify: `public/index.html`
- Modify: `public/styles/pages.css`
- Modify: `public/styles/responsive.css`

**Interfaces:**
- Consumes: existing semantic home view and stable hero button IDs.
- Produces: `#pain-points`, `#co-creation-path`, `#home-final-cta`, and the revised home copy.

- [ ] **Step 1: Write the failing static page test**

Assert that `public/index.html` contains the revised hero headline and the three new section IDs while retaining `hero-join-button` and `hero-wall-button`.

- [ ] **Step 2: Run the focused test and verify failure**

Run: `node --test test/final-polish.test.mjs`

Expected: FAIL because the revised headline and new section IDs do not exist.

- [ ] **Step 3: Implement the semantic home-page copy structure**

Replace the hero copy and add the pain-point, co-creation path, acknowledgement, and final CTA content. Keep all existing JavaScript hooks unchanged.

- [ ] **Step 4: Add responsive presentation rules**

Use full-width section bands, compact icon rows, a three-column co-creation path on desktop, and single-column layouts below 640px.

- [ ] **Step 5: Run focused and complete tests**

Run: `node --test test/final-polish.test.mjs` and `npm run check`.

Expected: all tests pass.

- [ ] **Step 6: Verify in the browser**

Check the home page at 375x812, 430x932, 768x1024, and 1440x900 for overflow, clipped text, drawer overlap, and visual hierarchy.

