---
name: Praveen Ponduru portfolio
description: A technical data sheet for a person. One yellow field, black ink, measured facts in ruled rows.
colors:
  stock-yellow: "oklch(0.85 0.172 86)"
  dmax-black: "oklch(0.17 0.012 85)"
  paper: "oklch(0.98 0.006 90)"
  zone-1: "oklch(0.155 0.008 85)"
  zone-2: "oklch(0.215 0.008 85)"
  zone-3: "oklch(0.38 0.014 85)"
  zone-5: "oklch(0.66 0.01 86)"
  zone-7: "oklch(0.76 0.012 88)"
  zone-8: "oklch(0.84 0.008 88)"
  zone-9: "oklch(0.925 0.008 88)"
  zone-10: "oklch(0.95 0.008 90)"
typography:
  display:
    fontFamily: "Archivo Variable, Archivo Fallback, sans-serif"
    fontSize: "clamp(3.25rem, 1.6rem + 7.4vw, 6rem)"
    fontWeight: 900
    lineHeight: 0.88
    letterSpacing: "normal"
  lead:
    fontFamily: "Archivo Variable, Archivo Fallback, sans-serif"
    fontSize: "clamp(1.375rem, 1.05rem + 1.4vw, 2rem)"
    fontWeight: 420
    lineHeight: 1.18
    letterSpacing: "-0.012em"
  title:
    fontFamily: "Archivo Variable, Archivo Fallback, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.008em"
  body:
    fontFamily: "Archivo Variable, Archivo Fallback, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 420
    lineHeight: 1.55
    letterSpacing: "normal"
  label:
    fontFamily: "Archivo Variable, Archivo Fallback, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 500
    lineHeight: 1.55
    letterSpacing: "0.01em"
rounded:
  none: "0"
spacing:
  gutter: "clamp(1rem, 4vw, 3rem)"
  section: "clamp(4.5rem, 3rem + 7vw, 9rem)"
  rule: "0.5rem"
components:
  wedge-step:
    backgroundColor: "{colors.dmax-black}"
    textColor: "{colors.paper}"
    typography: "{typography.display}"
    rounded: "{rounded.none}"
    padding: "0.875rem 1.125rem"
  link-hover:
    backgroundColor: "{colors.stock-yellow}"
    textColor: "{colors.dmax-black}"
  icon-button:
    textColor: "{colors.dmax-black}"
    rounded: "{rounded.none}"
    size: "2.75rem"
  icon-button-hover:
    backgroundColor: "{colors.stock-yellow}"
    textColor: "{colors.dmax-black}"
---

# Design System: Praveen Ponduru portfolio

Recorded from the built site (`src/styles/global.css` and the components), not from a plan. Where this file and the code disagree, the code is right and this file is stale.

## Overview

The site borrows the form of photographic technical documentation: the film manufacturer's data sheet and the grey-scale control strip. One saturated field, one black ink, facts set in ruled rows, and a single typeface doing every job. The films, photographs and chess board are the only pictures; the interface draws nothing decorative of its own.

It refuses the usual developer portfolio: no dark gradient hero, no grid of project cards with technology badges, no terminal costume.

## Colors

Strategy: committed. Yellow owns whole regions (the hero in the light theme, the contact card in both); it is never sprinkled as a small accent on a neutral page.

### Primary
- **Stock Yellow** (`oklch(0.85 0.172 86)`, about `#ffc410`): the hero field in the light theme, the contact section always, display type and rules in the dark theme, star ratings, the highlighter stroke on link hover, the dark squares of the chess board.

### Neutral
- **D-max Black** (`oklch(0.17 0.012 85)`): ink in the light theme and on every yellow field.
- **Paper** (`oklch(0.98 0.006 90)`): the light ground.
- **Zones 1 to 10**: neutrals between black and paper, all tinted toward the yellow's hue. Zone 1 is the dark ground, zone 2 the raised dark ground, zone 3 and zone 7 the secondary text of the light and dark themes, zone 9 the light alternate ground, zone 10 the dark theme's ink.

### Named Rules
- **Two inks.** Yellow and black, plus neutrals. No third hue anywhere, including placeholders and icons.
- **Yellow is never text on paper.** It fails contrast there. On light grounds yellow is a fill behind black text; on dark grounds it may be the text.
- **A scheme is a property, not a stylesheet.** Roles are written with `light-dark()`. A region changes theme by setting `color-scheme`: Films, the lightbox and the footer are always dark; Contact is always light on yellow.
- **Secondary text on yellow is tinted, not grey** (`oklch(0.34 0.05 80)`).

## Typography

One family, Archivo, used across its width axis. Exactly four instances are allowed, because each one costs layout time (measured):

| Role | Weight | Width | Used for |
| --- | --- | --- | --- |
| Display | 900 | 62% | Name, section titles, film feature title, wedge labels, email. Always uppercase except the email. |
| Text | 420 | 100% | Body copy and the large lead paragraphs. |
| Strong | 700 | 100% | Item titles, block labels, standalone links. |
| Data | 500 | 80% | Dates, ratings, EXIF, chess moves. Tabular numerals, `0.01em` tracking. |

### Hierarchy
- **Display** (900, `clamp(3.25rem, 1.6rem + 7.4vw, 6rem)`, 0.88): section titles. The hero name is the one exception to the 6rem ceiling: it is sized to span the full measure.
- **Lead** (420, `clamp(1.375rem, 1.05rem + 1.4vw, 2rem)`, 1.18): hero line, bio opening, featured review. Emphasis comes from size, not weight.
- **Title** (700, 1.25rem, 1.2): roles, projects, diary entries.
- **Body** (420, 1.0625rem, 1.55): measure capped at 68ch.
- **Label / data** (500 at 80% width, 1.0625rem or 0.9375rem): anything measured.

### Named Rules
- **No fifth instance.** A new weight or width must replace one of the four.
- **No italics.** The italic file is not loaded; a synthesised slant is not acceptable.
- **No eyebrows.** Headings carry themselves; block labels sit beside their content, not above a heading.

## Layout

- Content width `min(100% - 2 × gutter, 82rem)`, gutter `clamp(1rem, 4vw, 3rem)`.
- Every section opens with a `0.5rem` rule in the display colour, then the title, with an optional one-paragraph introduction at the foot of the right-hand column from 60rem up.
- Inside a section, a **block** is a labelled row: label in a 3/12 column, content in 9/12, separated from the next block by a hairline. Below 60rem the label stacks above.
- Lists are ruled rows, not cards. Nothing is boxed.
- The hero fills the viewport: mark and theme switch at the top, the name and positioning line at the foot, then the step wedge bleeding to both edges. From 60rem the wedge is five columns; below that it is five stacked rows.
- The photo gallery is a justified layout in flex: each item's basis and growth are its aspect ratio, so rows share a height with no cropping and no layout shift.

## Elevation & Depth

Flat. There are no shadows, blurs or gradients anywhere. Depth comes from tone alone: paper, alternate ground, dark ground, and the yellow field.

## Shapes

Square corners everywhere; the theme switch's circular hit area is the single exception. Rules are either the heavy `0.5rem` section rule or a 1px hairline at about 20% ink. Icons are drawn on a 24px grid with a 2px square-ended stroke.

## Components

### Step wedge (signature)
Five links as a photographic step wedge: black, zone 3, zone 5, zone 8, paper. Text is paper on the two dark steps and black on the three light ones. Labels are display type. On hover the label underlines and the arrow drops `0.25rem`. On load the steps rise from the bottom edge one after another (`clip-path`, 0.9s, 80ms stagger); this is the page's only entrance animation.

### Links
Underlined in the theme's link colour (black on light, yellow on dark). Hover is a highlighter stroke: yellow background, black text. On yellow fields the stroke inverts to black with yellow text. Text selection uses the same pair.

### Icon buttons
2.75rem or 3rem square, no fill. Hover fills yellow with black ink. The chess controls carry a 1px ink border; unavailable ones use `aria-disabled` with a hairline border so keyboard focus is not lost.

### Film entries
A poster at 2:3 on its own dominant colour, title, a row of stars, year, date, and an excerpt. One link per entry, stretched over the row. Ratings are a single element: a two-colour bar masked into five stars.

### Lightbox
A full-viewport `<dialog>`, always dark. The photo is sized with container units to the largest box of its aspect ratio that fits. Caption, EXIF and the counter sit in a bar beneath, never over the image. Where supported, opening and closing morph the thumbnail into place with a view transition.

### Chess board
A printed diagram, identical in both themes: paper and yellow squares, a 1px ink edge, the last move marked by a 20% black tint, coordinates outside the board in data type.

## Do's and Don'ts

### Do:
- **Do** let yellow own a whole region or stay out of it.
- **Do** set anything measured (dates, ratings, EXIF, moves) in the data instance with tabular numerals.
- **Do** separate with rules and space. Add a hairline before adding a box.
- **Do** keep every image on a neutral ground so its own colour reads true.
- **Do** honour `prefers-reduced-motion`; the wedge entrance and the lightbox morph both switch off.

### Don't:
- **Don't** add a third hue, a gradient, a shadow or a rounded card.
- **Don't** set yellow text on paper.
- **Don't** add a font weight or width beyond the four instances.
- **Don't** put a small label above a heading.
- **Don't** apply `content-visibility: auto` to sections. It was tried for performance and made the hero's jump links land in the wrong place.
