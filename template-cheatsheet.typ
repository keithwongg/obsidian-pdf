// Typst 5-Column Landscape Cheatsheet Template for Pandoc & Obsidian

#let section-idx = state("section-idx", 0)

#let palette = (
  rgb("#1e3a5f"), // Navy
  rgb("#0d5c63"), // Teal
  rgb("#7b1e26"), // Crimson
  rgb("#1f5133"), // Forest Green
  rgb("#4a2574"), // Royal Purple
  rgb("#8a3b12"), // Burnt Orange
  rgb("#2b4560"), // Slate Blue
  rgb("#6b1d4a"), // Burgundy
)

#set page(
  paper: "$if(papersize)$$papersize$$else$a4$endif$",
  flipped: true,
  columns: 5,
  margin: (
    x: $if(margin-x)$$margin-x$$else$0.3cm$endif$,
    top: $if(margin-top)$$margin-top$$else$0.6cm$endif$,
    bottom: $if(margin-bottom)$$margin-bottom$$else$0.3cm$endif$
  ),
  fill: rgb("#ffffff"),
  header-ascent: 20%,
  header: context {
    set text(size: 8pt, fill: rgb("#333333"), weight: "bold")
    grid(
      columns: (1fr, auto),
      align: (left + horizon, right + horizon),
      [$if(title)$$title$$endif$$if(date)$ | $date$$endif$],
      [#counter(page).display("1")]
    )
  }
)

#set columns(gutter: 2pt)

#set text(
  size: 8pt,
  fill: rgb("#000000"),
  font: ("Helvetica Neue", "Arial", "Times New Roman", "New Computer Modern"),
  lang: "$if(lang)$$lang$$else$en$endif$"
)

#set par(justify: false, leading: 0.25em, spacing: 0.35em)
#set list(spacing: 1pt, indent: 1pt, body-indent: 2pt)
#set enum(spacing: 1pt, indent: 1pt, body-indent: 2pt)
#set terms(spacing: 1pt, hanging-indent: 4pt)

// Pandoc horizontal rule `---` triggers next section color invisibly
#let horizontalRule = section-idx.update(n => n + 1)
#let divider() = horizontalRule

// Colored section & sub-heading banners (10pt bold + underlined white text, progressively lighter per level)
#show heading: it => context {
  let idx = section-idx.get()
  let base-color = palette.at(calc.rem(idx, palette.len()))
  let lighten-pct = calc.min((it.level - 1) * 10%, 40%)
  let bg = color.mix((base-color, 100% - lighten-pct), (white, lighten-pct))
  block(
    fill: bg,
    width: 100%,
    inset: (x: 3pt, y: 2pt),
    radius: 1.5pt,
    above: 3pt,
    below: 2pt,
    breakable: false,
    text(size: 10pt, weight: "bold", fill: white)[#underline(stroke: 0.6pt + white)[#it.body]]
  )
}

#show image: set image(width: 100%, fit: "contain")
#show figure: set block(inset: 0pt, above: 2pt, below: 2pt)
#show figure.caption: set text(size: 7pt)

// Compact tables for narrow columns
#set table(
  stroke: 0.4pt + rgb("#d0d7de"),
  inset: (x: 2pt, y: 1.5pt),
  align: left
)
#show table.cell: it => {
  set align(left)
  set text(size: 7pt)
  show regex("([_./\\\\:\\-@?&=+~%,;()\\[\\]{}|])"): m => m + sym.zws
  show regex("([^\\s\\u{200B}]{8})"): m => m + sym.zws
  it
}

// Compact code blocks
#show raw: set text(font: ("DejaVu Sans Mono", "Courier New"), size: 7pt)
#show raw: it => {
  show regex("([_./\\\\:\\-@?&=+~%,;()\\[\\]{}|])"): m => m + sym.zws
  show regex("([^\\s\\u{200B}]{8})"): m => m + sym.zws
  it
}
#show raw.where(block: false): it => highlight(
  fill: rgb("#f0f2f4"),
  radius: 1.5pt,
  top-edge: "ascender",
  bottom-edge: "descender",
  it
)
#show raw.where(block: true): it => block(
  fill: rgb("#f6f8fa"),
  inset: 3pt,
  radius: 2pt,
  width: 100%,
  above: 2pt,
  below: 2pt,
  stroke: 0.4pt + rgb("#e1e4e8"),
  it
)

#show quote: it => block(
  inset: (left: 4pt),
  above: 2pt,
  below: 2pt,
  stroke: (left: 1.5pt + rgb("#666666")),
  text(fill: rgb("#333333"), style: "italic")[#it.body]
)

$body$
