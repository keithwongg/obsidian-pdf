// Typst Academic 2-Column Template for Pandoc & Obsidian
// Generated with minimal, clean academic layout

#set page(
  paper: "$if(papersize)$$papersize$$else$a4$endif$",
  margin: (
    x: $if(margin-x)$$margin-x$$else$1.2cm$endif$,
    top: $if(margin-top)$$margin-top$$else$1.6cm$endif$,
    bottom: $if(margin-bottom)$$margin-bottom$$else$1.6cm$endif$
  ),
  fill: rgb("#ffffff"),
  footer: context {
    set text(size: 8pt, fill: rgb("#666666"))
    grid(
      columns: (1fr, 1fr),
      align: (left + horizon, right + horizon),
      [$if(date)$$date$$else$#datetime.today().display()$endif$],
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
#set table(inset: 6pt, stroke: none)
#show figure.where(kind: table): set figure.caption(position: top)
#show figure.where(kind: image): set figure.caption(position: bottom)

// Palette definitions
#let navy = rgb("#002060")
#let dirty-yellow = rgb("#B58900")

// Heading styles: navy blue, with distinct 8pt step between title, H1 (24pt) and H2 (16pt)
#show heading: set text(fill: navy, weight: "bold")
#show heading.where(level: 1): set text(size: 24pt)
#show heading.where(level: 2): set text(size: 16pt)
#show heading.where(level: 3): set text(size: 13pt)
#show heading.where(level: 4): set text(size: 11pt)
#show heading.where(level: 5): set text(size: 10pt)
#show heading.where(level: 6): set text(size: 10pt)

// Spacing around headings
#show heading: it => {
  v(10pt)
  it
  v(4pt)
}

// Bold text: dirty yellow and bold
#show strong: set text(fill: dirty-yellow)

// Code blocks styling
#show raw: set text(font: ("DejaVu Sans Mono", "Courier New"), size: 8.5pt)
#show raw.where(block: true): it => block(
  fill: rgb("#f6f8fa"),
  inset: 6pt,
  radius: 3pt,
  width: 100%,
  stroke: 0.5pt + rgb("#e1e4e8"),
  it
)
#show raw.where(block: false): it => box(
  fill: rgb("#f6f8fa"),
  inset: (x: 2pt, y: 0pt),
  radius: 2pt,
  it
)

// Blockquotes
#show quote: it => block(
  inset: (left: 8pt),
  stroke: (left: 2pt + navy),
  text(fill: rgb("#333333"), style: "italic")[#it.body]
)

// Document Title across both columns on the first page
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

// Table of Contents across full width
$if(toc)$
#block(width: 100%, inset: (bottom: 10pt))[
  #text(fill: navy, weight: "bold", size: 14pt)[Table of Contents]
  #v(4pt)
  #outline(title: none, indent: auto, depth: $if(toc-depth)$$toc-depth$$else$3$endif$)
  #v(8pt)
  #line(length: 100%, stroke: 0.3pt + rgb("#cccccc"))
]
#v(6pt)
$endif$

// Body content placed in 2 columns
#columns(2, gutter: 12pt)[
$body$
]
