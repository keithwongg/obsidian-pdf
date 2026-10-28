// Typst 5-Column Landscape Cheatsheet Template for Pandoc & Obsidian

#let section-idx = state("section-idx", 0)
#let heading-counter = state("heading-counter", 0)
#let active-headings = state("active-headings", (:))
#let appendix-items = state("appendix-items", ())
#let in-appendix = state("in-appendix", false)

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
#let appendix-gray = rgb("#333333")

#set page(
  paper: "$if(papersize)$$papersize$$else$a4$endif$",
  flipped: true,
  columns: 5,
  margin: (
    x: $if(margin-x)$$margin-x$$else$0.5cm$endif$,
    top: $if(margin-top)$$margin-top$$else$0.7cm$endif$,
    bottom: $if(margin-bottom)$$margin-bottom$$else$0.5cm$endif$
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
  size: 6pt,
  fill: rgb("#000000"),
  font: ("Helvetica Neue", "Arial", "Times New Roman", "New Computer Modern"),
  lang: "$if(lang)$$lang$$else$en$endif$"
)

#set par(justify: true, leading: 0.25em, spacing: 0.35em)
#set list(spacing: 1pt, indent: 1pt, body-indent: 2pt)
#set enum(spacing: 1pt, indent: 1pt, body-indent: 2pt)
#set terms(spacing: 1pt, hanging-indent: 4pt)

// Pandoc horizontal rule `---` triggers next section color invisibly
#let horizontalRule = section-idx.update(n => n + 1)
#let divider() = horizontalRule

// Colored section & sub-heading banners (6pt bold white text, centered, progressively lighter per level)
#let render-heading-banner(body, level, base-color) = {
  let lighten-pct = calc.min((level - 1) * 10%, 40%)
  let bg = color.mix((base-color, 100% - lighten-pct), (white, lighten-pct))
  block(
    fill: bg,
    width: 100%,
    inset: (x: 3pt, y: 2pt),
    radius: 1.5pt,
    above: 3pt,
    below: 2pt,
    breakable: false,
    sticky: true,
    align(center)[#set par(justify: false); #text(size: 6pt, weight: "bold", fill: white)[#body]]
  )
}

#show heading: it => context {
  if not in-appendix.get() {
    let sec = section-idx.get()
    let hid = heading-counter.get()
    heading-counter.update(n => n + 1)
    active-headings.update(st => {
      let next = st
      next.insert(str(it.level), (level: it.level, body: it.body, sec: sec, id: hid))
      for lv in range(it.level + 1, 7) {
        let _ = next.remove(str(lv), default: none)
      }
      next
    })
    let base-color = palette.at(calc.rem(sec, palette.len()))
    render-heading-banner(it.body, it.level, base-color)
  } else {
    render-heading-banner(it.body, it.level, appendix-gray)
  }
}

#show image: set image(width: 100%, fit: "contain")
#show image: it => [
  #block(height: 0pt, width: 0pt, inset: 0pt, above: 0pt, below: 0pt)[#metadata("anchor") <img-anchor>]
  #context {
    if not in-appendix.get() {
      let st = active-headings.get()
      let anchors = query(selector(<img-anchor>).before(here()))
      let pos = if anchors.len() > 0 { anchors.last().location().position() } else { here().position() }
      let img-id = repr(pos)
      if not appendix-items.get().any(x => x.id == img-id) {
        appendix-items.update(items => {
          let next = items
          next.push((id: img-id, headings: st, img: it))
          next
        })
      }
      let avail-h = calc.min(page.width, page.height) - 0.5cm.to-absolute() - pos.y - 4pt
      layout(size => {
        let dim = measure(block(width: size.width, it))
        if dim.height > avail-h and avail-h > 10pt {
          block(width: 100%, height: avail-h, align(center, it))
        } else {
          it
        }
      })
    } else {
      it
    }
  }
]
#show figure: set block(inset: 0pt, above: 2pt, below: 2pt, breakable: true)
#show figure.where(kind: table): set block(breakable: true)
#show figure.caption: none

// Compact tables for narrow columns (matched with 2-col report template)
#set table(
  stroke: 0.4pt + rgb("#d0d7de"),
  inset: (x: 2pt, y: 1.5pt),
  align: left
)
#let balance-columns(cols) = {
  if type(cols) == int {
    (1fr,) * cols
  } else if type(cols) == array {
    let n = cols.len()
    if n == 0 { cols }
    else if cols.all(c => c == auto) {
      (1fr,) * n
    } else {
      let is-ratio-like = cols.all(c => type(c) == ratio or type(c) == relative)
      if is-ratio-like {
        let ratios = cols.map(c => if type(c) == relative { c.ratio } else { c })
        let min-ratio = (0.7 / n) * 100%
        let below = ratios.filter(r => r < min-ratio)
        if below.len() > 0 and below.len() < n {
          let fixed-total = below.len() * min-ratio
          let remaining = 100% - fixed-total
          let above = ratios.filter(r => r >= min-ratio)
          let above-sum = above.sum()
          ratios.map(r => {
            if r < min-ratio { min-ratio }
            else { (r / above-sum) * remaining }
          })
        } else {
          cols
        }
      } else {
        cols
      }
    }
  } else {
    cols
  }
}

#show table: it => {
  let new-cols = balance-columns(it.columns)
  let has-header = it.children.any(c => c.func() == table.header)
  if new-cols != it.columns or has-header {
    let fields = it.fields()
    let _ = fields.remove("columns")
    let _ = fields.remove("children")
    let _ = fields.remove("align", default: none)
    let children = it.children.map(c => if c.func() == table.header { c.children } else { (c,) }).flatten()
    table(
      columns: new-cols,
      align: left,
      ..fields,
      ..children
    )
  } else {
    it
  }
}
#show table.cell: it => {
  set align(left)
  set par(justify: false)
  set text(size: 5.5pt)
  show regex("([_./\\\\:\\-@?&=+~%,;()\\[\\]{}|])"): m => m + sym.zws
  show regex("([^\\s\\u{200B}]{8})"): m => m + sym.zws
  it
}
#show figure.where(kind: table): set align(left)
#show figure.where(kind: table): it => {
  if it.body.func() == align {
    it.body.body
  } else {
    it.body
  }
}

// Compact code blocks
#show raw: set text(font: ("DejaVu Sans Mono", "Courier New"), size: 5.5pt)
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

#context {
  let items = appendix-items.get()
  if items.len() > 0 {
    page(
      columns: 3,
      header: context {
        set text(size: 8pt, fill: rgb("#333333"), weight: "bold")
        grid(
          columns: (1fr, auto),
          align: (left + horizon, right + horizon),
          [$if(title)$$title$$endif$$if(date)$ | $date$$endif$ | Appendix],
          [#counter(page).display("1")]
        )
      }
    )[
      #in-appendix.update(_ => true)
      #let shown = ()
      #for item in items {
        for lv in range(1, 7) {
          let k = str(lv)
          if k in item.headings {
            let h = item.headings.at(k)
            if not shown.contains(h.id) {
              shown.push(h.id)
              let base-color = palette.at(calc.rem(h.sec, palette.len()))
              render-heading-banner(h.body, h.level, base-color)
            }
          }
        }
        block(width: 100%, above: 2pt, below: 4pt, item.img)
      }
    ]
  }
}
