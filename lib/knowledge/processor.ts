import { inflateRawSync, inflateSync } from "node:zlib"

function decodePdfLiteral(input: string) {
  let out = ""
  for (let i = 0; i < input.length; i++) {
    const ch = input[i]
    if (ch !== "\\") { out += ch; continue }
    i++
    if (i >= input.length) break
    const next = input[i]
    const escapes: Record<string,string> = { n:"\n", r:"\r", t:"\t", b:"\b", f:"\f", "(":"(", ")":")", "\\":"\\" }
    if (escapes[next]) { out += escapes[next]; continue }
    if (/[0-7]/.test(next)) {
      let oct = next
      while (i + 1 < input.length && oct.length < 3 && /[0-7]/.test(input[i + 1])) oct += input[++i]
      out += String.fromCharCode(parseInt(oct, 8))
      continue
    }
    out += next
  }
  return out
}

function decodePdfHex(input: string) {
  const hex = input.replace(/\s/g, "")
  const bytes: number[] = []
  for (let i = 0; i + 1 < hex.length; i += 2) bytes.push(parseInt(hex.slice(i, i + 2), 16))
  return new TextDecoder("latin1").decode(new Uint8Array(bytes))
}

function extractPdfStrings(text: string) {
  const pieces: string[] = []
  const literal = /\(((?:\\.|[^\\])*)\)\s*Tj/g
  let match: RegExpExecArray | null
  while ((match = literal.exec(text))) pieces.push(decodePdfLiteral(match[1]))

  const hex = /<([0-9A-Fa-f\s]+)>\s*Tj/g
  while ((match = hex.exec(text))) pieces.push(decodePdfHex(match[1]))

  const arrays = /\[(.*?)\]\s*TJ/gs
  while ((match = arrays.exec(text))) {
    const body = match[1]
    const local = []
    const re = /\(((?:\\.|[^\\])*)\)|<([0-9A-Fa-f\s]+)>/g
    let m: RegExpExecArray | null
    while ((m = re.exec(body))) local.push(m[1] !== undefined ? decodePdfLiteral(m[1]) : decodePdfHex(m[2]))
    if (local.length) pieces.push(local.join(" "))
  }
  return pieces.join("\n")
}

function decodePdfStream(raw: Buffer, compressed: boolean) {
  if (!compressed) return raw.toString("latin1")
  try { return inflateSync(raw).toString("latin1") } catch {
    try { return inflateRawSync(raw).toString("latin1") } catch { return "" }
  }
}

export function extractPdfText(buffer: Buffer) {
  const source = buffer.toString("latin1")
  const streams: string[] = []
  let cursor = 0
  while (true) {
    const start = source.indexOf("stream", cursor)
    if (start < 0) break
    const dataStart = source[start + 6] === "\r" && source[start + 7] === "\n" ? start + 8 : source[start + 6] === "\n" ? start + 7 : start + 6
    const end = source.indexOf("endstream", dataStart)
    if (end < 0) break
    const dictStart = Math.max(0, source.lastIndexOf("<<", start))
    const dict = source.slice(dictStart, start)
    const raw = buffer.subarray(dataStart, end)
    const decoded = decodePdfStream(raw, /\/FlateDecode/.test(dict))
    if (decoded) streams.push(extractPdfStrings(decoded))
    cursor = end + 9
  }
  const result = streams.join("\n\n").replace(/\u0000/g, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim()
  if (!result) throw new Error("No readable text was found in this PDF. Scanned/image-only PDFs need OCR in a later processing stage.")
  return result
}

function readUInt32(buf: Buffer, offset: number) { return buf.readUInt32LE(offset) }
function readUInt16(buf: Buffer, offset: number) { return buf.readUInt16LE(offset) }

function extractZipEntry(buffer: Buffer, wanted: string) {
  const eocd = buffer.lastIndexOf(Buffer.from([0x50,0x4b,0x05,0x06]))
  if (eocd < 0) throw new Error("Invalid DOCX archive.")
  const count = readUInt16(buffer, eocd + 10)
  const centralOffset = readUInt32(buffer, eocd + 16)
  let offset = centralOffset
  for (let i = 0; i < count; i++) {
    if (readUInt32(buffer, offset) !== 0x02014b50) break
    const method = readUInt16(buffer, offset + 10)
    const compressedSize = readUInt32(buffer, offset + 20)
    const nameLen = readUInt16(buffer, offset + 28)
    const extraLen = readUInt16(buffer, offset + 30)
    const commentLen = readUInt16(buffer, offset + 32)
    const localOffset = readUInt32(buffer, offset + 42)
    const name = buffer.subarray(offset + 46, offset + 46 + nameLen).toString("utf8")
    if (name === wanted) {
      if (readUInt32(buffer, localOffset) !== 0x04034b50) throw new Error("Invalid DOCX local entry.")
      const localNameLen = readUInt16(buffer, localOffset + 26)
      const localExtraLen = readUInt16(buffer, localOffset + 28)
      const dataStart = localOffset + 30 + localNameLen + localExtraLen
      const compressed = buffer.subarray(dataStart, dataStart + compressedSize)
      if (method === 0) return compressed
      if (method === 8) return inflateRawSync(compressed)
      throw new Error("Unsupported DOCX compression method.")
    }
    offset += 46 + nameLen + extraLen + commentLen
  }
  throw new Error("DOCX document.xml was not found.")
}

function decodeXml(value: string) {
  return value.replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&apos;/g,"'")
}

export function extractDocxText(buffer: Buffer) {
  const xml = extractZipEntry(buffer, "word/document.xml").toString("utf8")
  const paragraphs = xml.split(/<\/w:p(?:\s[^>]*)?>/i).map(block => {
    const text = [...block.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/gi)].map(m => decodeXml(m[1])).join("")
    return text.trim()
  }).filter(Boolean)
  const result = paragraphs.join("\n\n").trim()
  if (!result) throw new Error("No readable text was found in this Word document.")
  return result
}

function stripPdfArtifacts(text: string) {
  return text
    .replace(/(?:>>|<<)?\/?(?:BDC|EMC)\b/gi, " ")
    .replace(/\/(?:C[0-9A-Za-z_]+|Span|ActualText)\b/gi, " ")
    .replace(/\b(?:BT|ET|Tf|Tj|TJ|Do|cm|gs|CS|cs|SC|sc|G|g|RG|rg|K|k)\b/gi, " ")
    .replace(/<<\/?BDC[\s\S]*?<</gi, " ")
    .replace(/\([^)]*\b(?:Tf|Tj|TJ|BDC|EMC)\b[^)]*\)/gi, " ")
    .replace(/\b(?:ActualText|Span)\b/gi, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
}

export function normalizeText(text: string) {
  return stripPdfArtifacts(text)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

export type KnowledgeChunkDraft = {
  chunk_index: number
  heading: string | null
  content: string
  source_locator: string
  metadata: Record<string, unknown>
}

export function buildChunks(text: string, maxChars = 1800): KnowledgeChunkDraft[] {
  const clean = normalizeText(text)
  const blocks = clean.split(/\n{2,}/).map(s => s.trim()).filter(Boolean)
  const chunks: KnowledgeChunkDraft[] = []
  let currentHeading: string | null = null
  let current = ""

  const looksLikeHeading = (value: string) =>
    value.length <= 100 &&
    !/[.!?]$/.test(value) &&
    (/^(chapter|unit|topic|lesson|section|module|objective|introduction|conclusion|references?)\b/i.test(value) ||
      /^[A-Z0-9][A-Z0-9 &:/()'-]{4,}$/.test(value))

  const flush = () => {
    if (!current.trim()) return
    const pieces = current.match(new RegExp("[\\s\\S]{1," + maxChars + "}", "g")) || []
    for (const piece of pieces) {
      chunks.push({
        chunk_index: chunks.length,
        heading: currentHeading,
        content: piece.trim(),
        source_locator: currentHeading ? "section:" + currentHeading : "document:body",
        metadata: { extractor: "wigod-knowledge-processor-v1" }
      })
    }
    current = ""
  }

  for (const block of blocks) {
    if (looksLikeHeading(block)) {
      flush()
      currentHeading = block
      continue
    }
    const candidate = current ? current + "\n\n" + block : block
    if (candidate.length > maxChars && current) flush()
    current = current ? current + "\n\n" + block : block
  }
  flush()
  return chunks
}

export function inferTopics(chunks: KnowledgeChunkDraft[], subject?: string | null) {
  const stop = new Set(["about","after","again","being","could","their","there","these","those","which","where","while","with","from","into","that","this","have","will","your"])
  const scores = new Map<string, number>()
  for (const chunk of chunks) {
    const words = chunk.content.toLowerCase().match(/[a-z][a-z0-9-]{3,}/g) || []
    for (const word of words) {
      if (stop.has(word) || word.length < 5) continue
      scores.set(word, (scores.get(word) || 0) + 1)
    }
  }
  const keywords = [...scores.entries()].sort((a,b)=>b[1]-a[1]).slice(0,12).map(([word])=>word)
  return Array.from(new Set([...(subject ? [subject] : []), ...keywords]))
}
