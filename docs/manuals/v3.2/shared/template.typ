// Composer OS V3.2 manuals — shared page system.
// Fonts: Source Serif 4, Source Sans 3, JetBrains Mono (SIL OFL).

#let qs-accent = rgb("#0072B2")
#let hb-accent = rgb("#D55E00")
#let ink = rgb("#1A1A1A")
#let muted = rgb("#5A5A5A")
#let rule = rgb("#CFCFCF")
#let tint = rgb("#F3F6F9")
#let ok = rgb("#009E73")
#let verify = rgb("#E69F00")
#let manual = rgb("#CC79A7")

#let accent = state("accent", qs-accent)

#let ui(body) = box(
  stroke: 0.6pt + rgb("#9A9A9A"),
  inset: (x: 3pt, y: 1pt),
  radius: 1.5pt,
  fill: rgb("#F6F6F6"),
  baseline: 20%,
)[#text(font: "Source Sans 3", size: 8.6pt, weight: 600, fill: ink)[#body]]

#let badge(kind) = {
  let spec = if kind == "ok" { (ok, "✓ Verified") } else if kind == "verify" { (verify, "? Verify") } else { (manual, "✎ Manual") }
  box(
    stroke: 0.7pt + spec.at(0),
    inset: (x: 4pt, y: 1pt),
    radius: 2pt,
    baseline: 20%,
  )[#text(font: "Source Sans 3", size: 7.5pt, weight: 700, fill: spec.at(0))[#spec.at(1)]]
}

#let callout(title, body, tone: none) = context {
  let col = if tone == none { accent.get() } else { tone }
  block(breakable: false, width: 100%, inset: (x: 8pt, y: 6pt), fill: tint, stroke: (left: 2.4pt + col))[
    #text(font: "Source Sans 3", size: 8pt, weight: 700, fill: col, tracking: 0.06em)[#upper(title)]
    #v(1.5pt)
    #text(size: 9.5pt)[#body]
  ]
}

#let kicker(body) = context {
  text(font: "Source Sans 3", size: 8.5pt, weight: 700, fill: accent.get(), tracking: 0.08em)[#upper(body)]
}

#let duo(main, rail) = grid(
  columns: (112mm, 52mm),
  column-gutter: 4mm,
  main,
  rail,
)

#let configure(book-title, edition-line, book-accent, body) = {
  accent.update(book-accent)
  set document(title: book-title, author: "Composer OS")
  set text(font: "Source Serif 4", size: 10.5pt, fill: ink, lang: "en", region: "GB", hyphenate: true)
  set par(leading: 4.5pt, justify: false)
  show heading.where(level: 1): it => {
    set text(font: "Source Sans 3", size: 22pt, weight: 700, fill: ink)
    set par(leading: 2pt)
    block(above: 8pt, below: 6pt, breakable: false)[#it.body]
  }
  show heading.where(level: 2): it => {
    set text(font: "Source Sans 3", size: 11.5pt, weight: 700, fill: ink)
    block(above: 10pt, below: 4pt, breakable: false)[#it.body]
  }
  show heading.where(level: 3): it => {
    set text(font: "Source Sans 3", size: 11.5pt, weight: 700, fill: ink)
    block(above: 8pt, below: 3pt, breakable: false)[#it.body]
  }
  set page(
    paper: "a4",
    margin: (left: 20mm, right: 18mm, top: 18mm, bottom: 16mm),
    // A header is a PDF artifact, and PDF/UA forbids links inside artifacts.
    // The Contents link sits in the foreground so every page has a real annotation.
    foreground: place(
      top + right,
      dx: -18mm,
      dy: 7.2mm,
      link(<contents>)[#text(font: "Source Sans 3", size: 8pt, fill: book-accent, weight: 600)[Back to Contents]],
    ),
    header: context {
      set text(font: "Source Sans 3", size: 8pt, fill: muted)
      book-title
      v(1.5mm)
      line(length: 100%, stroke: 0.4pt + rule)
    },
    footer: context {
      set text(font: "Source Sans 3", size: 8pt, fill: muted)
      line(length: 100%, stroke: 0.4pt + rule)
      v(1.5mm)
      grid(
        columns: (1fr, auto),
        edition-line,
        counter(page).display("1"),
      )
    },
  )
  set heading(bookmarked: true)
  body
}

#let contents-page(depth) = [
  #heading(level: 1, outlined: false)[Contents] <contents>
  #outline(title: none, depth: depth, indent: auto)
]
