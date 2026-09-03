// Simple pure Node script to create basic valid PNGs for icon-192 and icon-512
// using the built-in zlib
import fs from 'fs';
import zlib from 'zlib';

function createPNG(size, bgR, bgG, bgB, fgR, fgG, fgB) {
  const width = size;
  const height = size;
  
  // Uncompressed raw scanlines: (1 byte filter (0) + width * 4 bytes RGBA) * height
  const rawData = Buffer.alloc(height * (1 + width * 4));
  
  let offset = 0;
  const radius = size / 2;
  const cx = size / 2;
  const cy = size / 2;

  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // Filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      // Draw circular badge
      if (dist <= radius * 0.88 && dist >= radius * 0.82) {
        // Gold border
        rawData[offset++] = 194; // R
        rawData[offset++] = 142; // G
        rawData[offset++] = 92;  // B
        rawData[offset++] = 255; // A
      } else if (dist < radius * 0.82) {
        // Inner warm dark background
        rawData[offset++] = bgR;
        rawData[offset++] = bgG;
        rawData[offset++] = bgB;
        rawData[offset++] = 255;
      } else {
        // Dark background outer
        rawData[offset++] = 30;
        rawData[offset++] = 25;
        rawData[offset++] = 21;
        rawData[offset++] = 255;
      }
    }
  }

  const compressedData = zlib.deflateSync(rawData);

  // PNG Header
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8 bit depth
  ihdrData[9] = 6; // Color type 6 (RGBA)
  ihdrData[10] = 0; // Compression
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // Interlace

  const ihdrChunk = createChunk('IHDR', ihdrData);
  const idatChunk = createChunk('IDAT', compressedData);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const length = data.length;
  const chunk = Buffer.alloc(8 + length + 4);
  chunk.writeUInt32BE(length, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  
  // Calculate CRC
  const crc = crc32(chunk.subarray(4, 8 + length));
  chunk.writeInt32BE(crc, 8 + length);
  return chunk;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    const byte = buf[i];
    crc = (crc >>> 8) ^ table[(crc ^ byte) & 0xff];
  }
  return (crc ^ 0xffffffff) | 0;
}

const table = new Int32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  table[i] = c;
}

const png192 = createPNG(192, 42, 34, 28, 243, 234, 216);
const png512 = createPNG(512, 42, 34, 28, 243, 234, 216);

fs.writeFileSync('public/icon-192.png', png192);
fs.writeFileSync('public/icon-512.png', png512);

console.log('✅ Generated valid public/icon-192.png and public/icon-512.png');
