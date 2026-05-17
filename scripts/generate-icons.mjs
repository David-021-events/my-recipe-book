#!/usr/bin/env node
/**
 * Generates placeholder PWA icons as solid-colour PNGs.
 * Replace the output files with real branded assets before launch.
 *
 * Usage: node scripts/generate-icons.mjs
 */

import { deflateSync } from 'zlib'
import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '..', 'public', 'icons')
mkdirSync(outDir, { recursive: true })

// Brand rust colour from tailwind.config (brand-500 = #C2714F)
const R = 0xC2, G = 0x71, B = 0x4F

function crc32(buf) {
  let crc = 0xffffffff
  const table = crc32.table ??= buildTable()
  for (const byte of buf) crc = (crc >>> 8) ^ table[(crc ^ byte) & 0xff]
  return (crc ^ 0xffffffff) >>> 0
}
function buildTable() {
  const t = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[i] = c
  }
  return t
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii')
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const crcVal = crc32(Buffer.concat([typeBytes, data]))
  const crcBytes = Buffer.alloc(4); crcBytes.writeUInt32BE(crcVal)
  return Buffer.concat([len, typeBytes, data, crcBytes])
}

function makePNG(size) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8   // bit depth
  ihdr[9] = 2   // color type: RGB
  // compression, filter, interlace = 0

  // Scanlines: each row is 1 filter byte (0=None) + RGB bytes
  const row = Buffer.alloc(1 + size * 3)
  row[0] = 0 // filter type None
  for (let x = 0; x < size; x++) {
    row[1 + x * 3] = R
    row[2 + x * 3] = G
    row[3 + x * 3] = B
  }
  const rawPixels = Buffer.concat(Array(size).fill(row))
  const compressed = deflateSync(rawPixels)

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

for (const size of [192, 512]) {
  const path = join(outDir, `icon-${size}.png`)
  writeFileSync(path, makePNG(size))
  console.log(`wrote ${path} (${size}×${size})`)
}
console.log('Done — replace with real branded assets before launch.')
