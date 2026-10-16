import AppKit

let inPath = CommandLine.arguments[1]
let outPath = CommandLine.arguments[2]
guard let src = NSImage(contentsOfFile: inPath) else {
  fputs("missing icon \(inPath)\n", stderr)
  exit(1)
}
let side: CGFloat = 1024
let out = NSImage(size: NSSize(width: side, height: side))
out.lockFocus()
src.draw(in: NSRect(x: 0, y: 0, width: side, height: side))
NSColor(calibratedRed: 0.84, green: 0.37, blue: 0, alpha: 1).setFill()
NSBezierPath(rect: NSRect(x: 0, y: 0, width: side, height: 220)).fill()
let text = "DEV" as NSString
let attrs: [NSAttributedString.Key: Any] = [
  .font: NSFont.boldSystemFont(ofSize: 150),
  .foregroundColor: NSColor.white,
]
let size = text.size(withAttributes: attrs)
text.draw(at: NSPoint(x: (side - size.width) / 2, y: (220 - size.height) / 2), withAttributes: attrs)
out.unlockFocus()
guard
  let tiff = out.tiffRepresentation,
  let rep = NSBitmapImageRep(data: tiff),
  let png = rep.representation(using: .png, properties: [:])
else {
  fputs("could not encode png\n", stderr)
  exit(1)
}
do {
  try png.write(to: URL(fileURLWithPath: outPath))
} catch {
  fputs("\(error)\n", stderr)
  exit(1)
}
