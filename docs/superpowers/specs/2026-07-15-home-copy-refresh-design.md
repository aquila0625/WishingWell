# ChurchOS Home Copy Refresh Design

## Goal

Turn the approved long-form ChurchOS invitation into a scannable H5 home page preview without changing authentication, wish-wall, sharing, or administrator behavior.

## Content Structure

1. Hero: make `ChurchOS 教会通 APP` the H1, state that the APP is in preparation, and explain that this site collects requirements for its first release.
2. Pain points: a short pastoral greeting followed by four operational challenges.
3. Ministry matrix: retain the eight existing modules with more specific descriptions and an expansion note.
4. Co-creation path: three steps covering submission, peer support, and product planning.
5. Acknowledgement: explain how contributors and churches appear on the acknowledgement board without showing a named person or poster preview.
6. Final action band: repeat the primary contribution action and sharing action.

## Visual Direction

- Preserve the approved navy and cyan visual system.
- Use unframed full-width sections rather than stacking decorative cards.
- Use Lucide icons for pain points and steps.
- Keep the first viewport concise on mobile; long explanatory content begins below the hero.
- Maintain the existing quick drawer. The hero does not repeat contribution or wall buttons because the drawer already provides those actions.
- Ministry and co-creation items place their Lucide icon and title on the same row.
- Section eyebrow labels use a stronger 1rem desktop size and remain visually secondary to the H2.
- The quick drawer starts expanded and only changes state when the user clicks its handle; scrolling never collapses it.

## Acceptance Criteria

- The hero contains `ChurchOS 教会通 APP`, the early requirements co-creation label, and explicit pre-development positioning.
- The page contains dedicated pain-point, ministry, co-creation, acknowledgement, and final CTA sections.
- Existing hero buttons and application behavior remain available.
- The page has no horizontal overflow at 375px, 430px, 768px, or 1440px.
