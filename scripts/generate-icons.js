import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 1. Create SVG Icon
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0d5c4a" />
      <stop offset="100%" stop-color="#148369" />
    </linearGradient>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffd54f" />
      <stop offset="100%" stop-color="#ffb300" />
    </linearGradient>
  </defs>
  <!-- Background with safe zone -->
  <rect width="512" height="512" rx="100" fill="url(#bg)" />
  
  <!-- Book Spine & Open Pages -->
  <g transform="translate(256, 260)">
    <!-- Left Page -->
    <path d="M-170,80 C-120,40 -60,40 0,60 L0,-120 C-60,-140 -120,-140 -170,-100 Z" fill="#ffffff" opacity="0.95"/>
    <!-- Right Page -->
    <path d="M170,80 C120,40 60,40 0,60 L0,-120 C60,-140 120,-140 170,-100 Z" fill="#f0fdf4" opacity="0.95"/>
    
    <!-- Spine Center -->
    <path d="M-6,-125 L6,-125 L6,70 L-6,70 Z" fill="#094336"/>

    <!-- Left lines (text representation) -->
    <rect x="-140" y="-80" width="100" height="12" rx="6" fill="#0d5c4a" opacity="0.4"/>
    <rect x="-140" y="-50" width="80" height="12" rx="6" fill="#0d5c4a" opacity="0.4"/>
    <rect x="-140" y="-20" width="110" height="12" rx="6" fill="#0d5c4a" opacity="0.4"/>
    <rect x="-140" y="10" width="70" height="12" rx="6" fill="#0d5c4a" opacity="0.4"/>

    <!-- Right lines -->
    <rect x="40" y="-80" width="100" height="12" rx="6" fill="#0d5c4a" opacity="0.4"/>
    <rect x="60" y="-50" width="80" height="12" rx="6" fill="#0d5c4a" opacity="0.4"/>
    <rect x="30" y="-20" width="110" height="12" rx="6" fill="#0d5c4a" opacity="0.4"/>
    <rect x="50" y="10" width="90" height="12" rx="6" fill="#0d5c4a" opacity="0.4"/>
    
    <!-- Audio Wave / Sparkle Symbol (Golden Sound / Speech) -->
    <circle cx="0" cy="-150" r="32" fill="url(#gold)"/>
    <path d="M-10,-150 L-4,-158 L6,-158 L12,-164 L12,-136 L6,-142 L-4,-142 Z" fill="#0d5c4a"/>
    <path d="M16,-156 A8,8 0 0,1 16,-144" fill="none" stroke="#0d5c4a" stroke-width="3" stroke-linecap="round"/>
    <path d="M21,-161 A15,15 0 0,1 21,-139" fill="none" stroke="#0d5c4a" stroke-width="3" stroke-linecap="round"/>
  </g>
</svg>`;

fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgContent, 'utf8');

// Function to generate raw uncompressed PNG with crc32 and zlib
function createSolidPNG(width, height, r, g, b) {
  // Construct a valid PNG buffer
  const signature = Buffer.from([137, 80, 78, 72, 13, 10, 26, 10]);
  
  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // bit depth 8
  ihdrData.writeUInt8(2, 9); // color type 2: RGB
  ihdrData.writeUInt8(0, 10); // compression
  ihdrData.writeUInt8(0, 11); // filter
  ihdrData.writeUInt8(0, 12); // interlace

  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // Raw image data: for each scanline: filter byte (0) + RGB for each pixel
  const scanlineLength = 1 + width * 3;
  const rawData = Buffer.alloc(height * scanlineLength);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * scanlineLength;
    rawData[rowOffset] = 0; // Filter None
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 3;
      // create subtle rounded corners and inner book icon motif
      const cx = width / 2;
      const cy = height / 2;
      const distCenter = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      const isInner = distCenter < width * 0.35 && y > cy * 0.4 && y < cy * 1.5;
      
      if (isInner) {
        // Light book area
        rawData[pxOffset] = 255;
        rawData[pxOffset + 1] = 255;
        rawData[pxOffset + 2] = 255;
      } else {
        // Emerald brand color
        rawData[pxOffset] = r;
        rawData[pxOffset + 1] = g;
        rawData[pxOffset + 2] = b;
      }
    }
  }

  const deflated = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', deflated);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(8 + len + 4);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);
  const crc = crc32(Buffer.concat([Buffer.from(type, 'ascii'), data]));
  buf.writeUInt32BE(crc, 8 + len);
  return buf;
}

function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

const table = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  table[i] = c >>> 0;
}

const emerald = [13, 92, 74];
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createSolidPNG(192, 192, ...emerald));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createSolidPNG(512, 512, ...emerald));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), createSolidPNG(512, 512, ...emerald));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createSolidPNG(180, 180, ...emerald));
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), createSolidPNG(32, 32, ...emerald));

console.log('✅ Icons generated successfully in public/');
