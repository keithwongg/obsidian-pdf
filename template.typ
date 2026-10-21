// Typst Academic 2-Column Template for Pandoc & Obsidian
// Generated with minimal, clean academic layout

#set page(
  paper: "$if(papersize)$$papersize$$else$a4$endif$",
  columns: 2,
  margin: (
    x: $if(margin-x)$$margin-x$$else$1.2cm$endif$,
    top: $if(margin-top)$$margin-top$$else$1.6cm$endif$,
    bottom: $if(margin-bottom)$$margin-bottom$$else$1.6cm$endif$
  ),
  fill: rgb("#ffffff"),
  footer: context {
    set text(size: 8pt, fill: rgb("#666666"))
    let h1-list = query(selector(heading.where(level: 1)).before(here()))
    let h1-title = if h1-list.len() > 0 {
      h1-list.last().body
    } else {
      "$if(title)$$title$$endif$"
    }
    grid(
      columns: (1fr, 1fr),
      align: (left + horizon, right + horizon),
      [#h1-title | $if(date)$$date$$else$#datetime.today().display()$endif$],
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

// Table styling: left-aligned tables and cells
#set table(inset: 6pt, stroke: none, align: left)
#show figure.where(kind: table): set align(left)
#show figure.where(kind: table): it => {
  set align(left)
  show align.where(alignment: center): a => a.body
  it
}
#show figure.where(kind: table): set figure.caption(position: top)
#show figure.where(kind: image): set figure.caption(position: bottom)
#show image: set image(width: 100%, fit: "contain")

// Palette definitions
#let navy = rgb("#002060")
#let dirty-yellow = rgb("#B58900")

// Heading styles: navy blue, H1=24pt down to H6=14pt (2pt decrements)
#show heading: set text(fill: navy, weight: "bold")
#show heading.where(level: 1): set text(size: 24pt)
#show heading.where(level: 2): set text(size: 22pt)
#show heading.where(level: 3): set text(size: 20pt)
#show heading.where(level: 4): set text(size: 18pt)
#show heading.where(level: 5): set text(size: 16pt)
#show heading.where(level: 6): set text(size: 14pt)

// Spacing around headings: compact margin spacing, H1 always starts on a new page
#show heading: set block(above: 7pt, below: 3pt)
#show heading.where(level: 1): it => {
  pagebreak(weak: true)
  it
}

// Bold text: dirty yellow and bold
#show strong: set text(fill: dirty-yellow)

// Code styling: hyphenate and wrap within column
#show raw: set text(font: ("DejaVu Sans Mono", "Courier New"), size: 8.5pt, hyphenate: auto)
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

// Document Title & TOC placed across both columns on the first page
$if(title)$
#place(top, scope: "parent", float: true)[
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
    $if(toc)$
    #block(width: 100%, inset: (bottom: 10pt))[
      #text(fill: navy, weight: "bold", size: 14pt)[Table of Contents]
      #v(4pt)
      #outline(title: none, indent: auto, depth: $if(toc-depth)$$toc-depth$$else$6$endif$)
      #v(8pt)
      #line(length: 100%, stroke: 0.3pt + rgb("#cccccc"))
    ]
    #v(6pt)
    $endif$
  ]
]
$else$
$if(toc)$
#place(top, scope: "parent", float: true)[
  #align(left)[
    #block(width: 100%, inset: (bottom: 10pt))[
      #text(fill: navy, weight: "bold", size: 14pt)[Table of Contents]
      #v(4pt)
      #outline(title: none, indent: auto, depth: $if(toc-depth)$$toc-depth$$else$6$endif$)
      #v(8pt)
      #line(length: 100%, stroke: 0.3pt + rgb("#cccccc"))
    ]
  ]
]
#v(6pt)
$endif$
$endif$

$body$
