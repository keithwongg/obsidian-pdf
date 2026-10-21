// Typst Academic Single-Column Template for Pandoc & Obsidian
// Generated with clean academic layout in a single-column format

#set page(
  paper: "$if(papersize)$$papersize$$else$a4$endif$",
  columns: 1,
  margin: (
    x: $if(margin-x)$$margin-x$$else$1.8cm$endif$,
    top: $if(margin-top)$$margin-top$$else$1.8cm$endif$,
    bottom: $if(margin-bottom)$$margin-bottom$$else$1.8cm$endif$
  ),
  fill: rgb("#ffffff"),
  footer: context {
    let current-page = here().page()
    let page-h1s = query(selector(heading.where(level: 1))).filter(h => h.location().page() == current-page)
    let h1-label = if page-h1s.len() > 0 {
      page-h1s.map(h => h.body).join(", ")
    } else {
      let prev-h1s = query(selector(heading.where(level: 1)).before(here()))
      if prev-h1s.len() > 0 {
        prev-h1s.last().body
      } else {
        "$if(title)$$title$$endif$"
      }
    }
    set text(size: 8pt, fill: rgb("#666666"))
    grid(
      columns: (1fr, 1fr),
      align: (left + horizon, right + horizon),
      [#h1-label | $if(date)$$date$$else$#datetime.today().display()$endif$],
      [#counter(page).display("1")]
    )
  }
)

#set text(
  size: 10pt,
  fill: rgb("#000000"),
  font: ("Times New Roman", "New Computer Modern"),
  lang: "$if(lang)$$lang$$else$en$endif$"
)

#set par(justify: false, leading: 0.6em)

// Pandoc compatibility helpers
#let horizontalRule = line(start: (0%,0%), end: (100%,0%), stroke: 0.5pt + rgb("#cccccc"))
#let divider() = horizontalRule
#set terms(hanging-indent: 1.5em)

// Table styling: left-aligned table, figure container, cell padding & borders
#set table(
  stroke: 0.5pt + rgb("#d0d7de"),
  inset: (x: 4pt, y: 3.5pt),
  align: left
)
#show table: it => {
  let cols = it.columns
  let is-all-auto = if type(cols) == int {
    true
  } else if type(cols) == array {
    cols.all(c => c == auto)
  } else {
    false
  }
  if is-all-auto {
    let num-cols = if type(cols) == int { cols } else { cols.len() }
    let fields = it.fields()
    let _ = fields.remove("columns")
    let _ = fields.remove("children")
    table(
      columns: (1fr,) * num-cols,
      ..fields,
      ..it.children
    )
  } else {
    it
  }
}
#show table.cell: it => {
  set align(left)
  show regex("([_./\\\\:\\-@?&=+~%,;()\\[\\]{}|])"): m => m + sym.zws
  show regex("([^\\s\\u{200B}]{8})"): m => m + sym.zws
  it
}
#show figure.where(kind: table): set align(left)
#show figure.where(kind: table): it => {
  set align(left)
  show align.where(alignment: center): a => align(left)[#a.body]
  it
}
#show figure.where(kind: table): set figure.caption(position: top)
#show figure.where(kind: image): set figure.caption(position: bottom)
#show image: set image(width: 100%, fit: "contain")

// Palette definitions
#let navy = rgb("#002060")
#let dirty-yellow = rgb("#B58900")

// Heading styles: navy blue, with 8pt decrements down to body text size (10pt)
#show heading: set text(fill: navy, weight: "bold")
#show heading.where(level: 1): set text(size: 24pt)
#show heading.where(level: 2): set text(size: 16pt)
#show heading.where(level: 3): set text(size: 10pt)
#show heading.where(level: 4): set text(size: 10pt)
#show heading.where(level: 5): set text(size: 10pt)
#show heading.where(level: 6): set text(size: 10pt)

// Spacing around headings (restored to previous margin spacing)
#show heading.where(level: 1): it => {
  v(10pt)
  it
  v(4pt)
}
#show heading.where(level: 2): it => {
  v(10pt)
  it
  v(4pt)
}
#show heading.where(level: 3): it => {
  v(8pt)
  it
  v(3pt)
}
#show heading.where(level: 4): it => {
  v(6pt)
  it
  v(2pt)
}
#show heading.where(level: 5): it => {
  v(4pt)
  it
  v(2pt)
}
#show heading.where(level: 6): it => {
  v(4pt)
  it
  v(2pt)
}

// Bold text: dirty yellow and bold
#show strong: set text(fill: dirty-yellow)

// Code styling: hyphenate and wrap within single column
#show raw: set text(font: ("DejaVu Sans Mono", "Courier New"), size: 8.5pt)
#show raw: it => {
  show regex("([_./\\\\:\\-@?&=+~%,;()\\[\\]{}|])"): m => m + sym.zws
  show regex("([^\\s\\u{200B}]{8})"): m => m + sym.zws
  it
}
#show raw.where(block: false): it => highlight(
  fill: rgb("#f6f8fa"),
  radius: 2pt,
  top-edge: "ascender",
  bottom-edge: "descender",
  it
)
#show raw.where(block: true): it => block(
  fill: rgb("#f6f8fa"),
  inset: 6pt,
  radius: 3pt,
  width: 100%,
  stroke: 0.5pt + rgb("#e1e4e8"),
  it
)

// Blockquotes
#show quote: it => block(
  inset: (left: 8pt),
  stroke: (left: 2pt + navy),
  text(fill: rgb("#333333"), style: "italic")[#it.body]
)

// Document Title in single column flow
$if(title)$
#align(left)[
  #block(width: 100%, below: 14pt)[
    #text(size: 32pt, weight: "bold", fill: navy)[$title$]
    $if(subtitle)$
    #v(4pt)
    #text(size: 13pt, fill: rgb("#444444"))[$subtitle$]
    $endif$
    $if(author)$
    #v(6pt)
    #text(size: 10.5pt, fill: rgb("#333333"))[$for(author)$$author$$sep$, $endfor$]
    $endif$
    #v(8pt)
    #line(length: 100%, stroke: 0.5pt + navy)
  ]
]
$endif$

// Table of Contents
$if(toc)$
#block(width: 100%, breakable: true, inset: (bottom: 10pt))[
  #text(fill: navy, weight: "bold", size: 14pt)[Table of Contents]
  #v(4pt)
  #outline(title: none, indent: auto, depth: $if(toc-depth)$$toc-depth$$else$6$endif$)
  #v(8pt)
  #line(length: 100%, stroke: 0.3pt + rgb("#cccccc"))
]
#v(6pt)
$endif$

$body$
