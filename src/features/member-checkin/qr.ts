// 자체 QR 인코더 (외부 의존성 없음). byte 모드 · ECC Level Q · 자동 버전 선택.
// 구조는 Nayuki QR Code generator(공개 도메인) 알고리즘을 TypeScript로 구현.
// 반환: boolean[][] 모듈 매트릭스(true=검정). 키오스크 스캔용 동적 페이로드 인코딩 전용.

const ECC_CODEWORDS_PER_BLOCK: number[][] = [
  // Version 1..40, ordered by ECC level L,M,Q,H (index by [level][version])
  [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
  [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
];
const NUM_ERROR_CORRECTION_BLOCKS: number[][] = [
  [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
  [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
  [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
  [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81],
];

// ECC Level index: L=0, M=1, Q=2, H=3. 동적 QR + 짧은 페이로드 → Q(25% 복원)로 스캔 견고성 확보.
const ECC_LEVEL = 2;
const ECC_FORMAT_BITS = 0b11; // Q

class GF {
  static readonly exp = new Uint8Array(512);
  static readonly log = new Uint8Array(256);
  static init(): void {
    let x = 1;
    for (let i = 0; i < 255; i++) {
      GF.exp[i] = x;
      GF.log[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11d;
    }
    for (let i = 255; i < 512; i++) GF.exp[i] = GF.exp[i - 255];
  }
  static mul(a: number, b: number): number {
    if (a === 0 || b === 0) return 0;
    return GF.exp[GF.log[a] + GF.log[b]];
  }
}
GF.init();

function rsGeneratorPoly(degree: number): Uint8Array {
  const poly = new Uint8Array(degree);
  poly[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < degree; j++) {
      poly[j] = GF.mul(poly[j], root);
      if (j + 1 < degree) poly[j] ^= poly[j + 1];
    }
    root = GF.mul(root, 2);
  }
  return poly;
}

function rsRemainder(data: Uint8Array, gen: Uint8Array): Uint8Array {
  const result = new Uint8Array(gen.length);
  for (const b of data) {
    const factor = b ^ result[0];
    result.copyWithin(0, 1);
    result[result.length - 1] = 0;
    for (let j = 0; j < result.length; j++) result[j] ^= GF.mul(gen[j], factor);
  }
  return result;
}

function numDataCodewords(ver: number): number {
  const totalCodewords = Math.floor(getNumRawDataModules(ver) / 8);
  const eccPerBlock = ECC_CODEWORDS_PER_BLOCK[ECC_LEVEL][ver];
  const numBlocks = NUM_ERROR_CORRECTION_BLOCKS[ECC_LEVEL][ver];
  return totalCodewords - eccPerBlock * numBlocks;
}

function getNumRawDataModules(ver: number): number {
  let result = (16 * ver + 128) * ver + 64;
  if (ver >= 2) {
    const numAlign = Math.floor(ver / 7) + 2;
    result -= (25 * numAlign - 10) * numAlign - 55;
    if (ver >= 7) result -= 36;
  }
  return result;
}

function selectVersion(dataLen: number): number {
  for (let ver = 1; ver <= 40; ver++) {
    const capacityBits = numDataCodewords(ver) * 8;
    const charCountBits = ver <= 9 ? 8 : 16;
    const needed = 4 + charCountBits + dataLen * 8;
    if (needed <= capacityBits) return ver;
  }
  throw new Error('QR: 데이터가 너무 깁니다.');
}

class BitBuffer {
  bits: number[] = [];
  append(val: number, len: number): void {
    for (let i = len - 1; i >= 0; i--) this.bits.push((val >>> i) & 1);
  }
}

function encodeData(bytes: Uint8Array, ver: number): Uint8Array {
  const bb = new BitBuffer();
  bb.append(0b0100, 4); // byte mode
  bb.append(bytes.length, ver <= 9 ? 8 : 16);
  for (const b of bytes) bb.append(b, 8);

  const dataCapacityBits = numDataCodewords(ver) * 8;
  bb.append(0, Math.min(4, dataCapacityBits - bb.bits.length));
  while (bb.bits.length % 8 !== 0) bb.bits.push(0);

  const dataCodewords = new Uint8Array(numDataCodewords(ver));
  for (let i = 0; i < bb.bits.length; i++) {
    dataCodewords[i >>> 3] |= bb.bits[i] << (7 - (i & 7));
  }
  // 패딩 바이트
  for (let i = Math.ceil(bb.bits.length / 8), pad = 0xec; i < dataCodewords.length; i++, pad ^= 0xec ^ 0x11) {
    dataCodewords[i] = pad;
  }
  return dataCodewords;
}

function interleave(dataCodewords: Uint8Array, ver: number): Uint8Array {
  const numBlocks = NUM_ERROR_CORRECTION_BLOCKS[ECC_LEVEL][ver];
  const blockEccLen = ECC_CODEWORDS_PER_BLOCK[ECC_LEVEL][ver];
  const rawCodewords = Math.floor(getNumRawDataModules(ver) / 8);
  const numShortBlocks = numBlocks - (rawCodewords % numBlocks);
  const shortBlockLen = Math.floor(rawCodewords / numBlocks);

  const gen = rsGeneratorPoly(blockEccLen);
  const blocks: number[][] = [];
  let k = 0;
  for (let i = 0; i < numBlocks; i++) {
    const datLen = shortBlockLen - blockEccLen + (i < numShortBlocks ? 0 : 1);
    const dat = Array.from(dataCodewords.slice(k, k + datLen));
    k += datLen;
    const ecc = Array.from(rsRemainder(Uint8Array.from(dat), gen));
    if (i < numShortBlocks) dat.push(0); // short block 데이터 패딩(인터리브 정렬용)
    blocks.push(dat.concat(ecc));
  }

  const result: number[] = [];
  for (let i = 0; i < blocks[0].length; i++) {
    for (let j = 0; j < blocks.length; j++) {
      // short block의 패딩 바이트는 건너뜀
      if (i !== shortBlockLen - blockEccLen || j >= numShortBlocks) {
        result.push(blocks[j][i]);
      }
    }
  }
  return Uint8Array.from(result);
}

// ── 매트릭스 구성 ──
class Matrix {
  size: number;
  modules: boolean[][];
  isFunction: boolean[][];
  constructor(ver: number) {
    this.size = ver * 4 + 17;
    this.modules = Array.from({ length: this.size }, () => new Array<boolean>(this.size).fill(false));
    this.isFunction = Array.from({ length: this.size }, () => new Array<boolean>(this.size).fill(false));
  }
  set(x: number, y: number, dark: boolean): void {
    this.modules[y][x] = dark;
    this.isFunction[y][x] = true;
  }
}

function drawFinder(m: Matrix, cx: number, cy: number): void {
  for (let dy = -4; dy <= 4; dy++) {
    for (let dx = -4; dx <= 4; dx++) {
      const x = cx + dx;
      const y = cy + dy;
      if (x < 0 || x >= m.size || y < 0 || y >= m.size) continue;
      const dist = Math.max(Math.abs(dx), Math.abs(dy));
      m.set(x, y, dist !== 2 && dist !== 4);
    }
  }
}

function drawAlignment(m: Matrix, cx: number, cy: number): void {
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      m.set(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }
  }
}

function alignmentPositions(ver: number): number[] {
  if (ver === 1) return [];
  const numAlign = Math.floor(ver / 7) + 2;
  const step = Math.ceil((ver * 4 + 4) / (numAlign * 2 - 2)) * 2;
  const result = [6];
  for (let pos = ver * 4 + 10; result.length < numAlign; pos -= step) result.splice(1, 0, pos);
  return result;
}

function drawFunctionPatterns(m: Matrix, ver: number): void {
  const size = m.size;
  // timing
  for (let i = 0; i < size; i++) {
    if (!m.isFunction[6][i]) m.set(i, 6, i % 2 === 0);
    if (!m.isFunction[i][6]) m.set(6, i, i % 2 === 0);
  }
  drawFinder(m, 3, 3);
  drawFinder(m, size - 4, 3);
  drawFinder(m, 3, size - 4);
  // separators already handled by finder radius (light border)
  const aligns = alignmentPositions(ver);
  for (const ay of aligns) {
    for (const ax of aligns) {
      const nearFinder =
        (ax <= 8 && ay <= 8) || (ax <= 8 && ay >= size - 9) || (ax >= size - 9 && ay <= 8);
      if (!nearFinder) drawAlignment(m, ax, ay);
    }
  }
  // reserve format info regions (set as function, value filled later)
  for (let i = 0; i < 9; i++) {
    if (!m.isFunction[i][8]) m.set(8, i, false);
    if (!m.isFunction[8][i]) m.set(i, 8, false);
  }
  for (let i = 0; i < 8; i++) {
    m.set(size - 1 - i, 8, false);
    m.set(8, size - 1 - i, false);
  }
  m.set(8, size - 8, true); // dark module
  // version info (ver >= 7)
  if (ver >= 7) {
    let rem = ver;
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    const bits = (ver << 12) | rem;
    for (let i = 0; i < 18; i++) {
      const bit = ((bits >>> i) & 1) === 1;
      const a = size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      m.set(a, b, bit);
      m.set(b, a, bit);
    }
  }
}

function drawCodewords(m: Matrix, data: Uint8Array): void {
  const size = m.size;
  let i = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? size - 1 - vert : vert;
        if (!m.isFunction[y][x] && i < data.length * 8) {
          m.modules[y][x] = ((data[i >>> 3] >>> (7 - (i & 7))) & 1) === 1;
          i++;
        }
      }
    }
  }
}

function applyMask(m: Matrix, mask: number): void {
  for (let y = 0; y < m.size; y++) {
    for (let x = 0; x < m.size; x++) {
      if (m.isFunction[y][x]) continue;
      let invert = false;
      switch (mask) {
        case 0: invert = (x + y) % 2 === 0; break;
        case 1: invert = y % 2 === 0; break;
        case 2: invert = x % 3 === 0; break;
        case 3: invert = (x + y) % 3 === 0; break;
        case 4: invert = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break;
        case 5: invert = ((x * y) % 2) + ((x * y) % 3) === 0; break;
        case 6: invert = (((x * y) % 2) + ((x * y) % 3)) % 2 === 0; break;
        case 7: invert = (((x + y) % 2) + ((x * y) % 3)) % 2 === 0; break;
      }
      if (invert) m.modules[y][x] = !m.modules[y][x];
    }
  }
}

function drawFormatBits(m: Matrix, mask: number): void {
  const data = (ECC_FORMAT_BITS << 3) | mask;
  let rem = data;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  const bits = ((data << 10) | rem) ^ 0x5412;
  const size = m.size;
  for (let i = 0; i <= 5; i++) m.modules[8][i] = ((bits >>> i) & 1) === 1;
  m.modules[8][7] = ((bits >>> 6) & 1) === 1;
  m.modules[8][8] = ((bits >>> 7) & 1) === 1;
  m.modules[7][8] = ((bits >>> 8) & 1) === 1;
  for (let i = 9; i < 15; i++) m.modules[14 - i][8] = ((bits >>> i) & 1) === 1;
  for (let i = 0; i < 8; i++) m.modules[8][size - 1 - i] = ((bits >>> i) & 1) === 1;
  for (let i = 8; i < 15; i++) m.modules[size - 15 + i][8] = ((bits >>> i) & 1) === 1;
  m.modules[size - 8][8] = true;
}

function penalty(m: Matrix): number {
  const size = m.size;
  let p = 0;
  const mods = m.modules;
  // rule 1: runs
  for (let y = 0; y < size; y++) {
    let run = 1;
    for (let x = 1; x < size; x++) {
      if (mods[y][x] === mods[y][x - 1]) { run++; if (run === 5) p += 3; else if (run > 5) p++; }
      else run = 1;
    }
  }
  for (let x = 0; x < size; x++) {
    let run = 1;
    for (let y = 1; y < size; y++) {
      if (mods[y][x] === mods[y - 1][x]) { run++; if (run === 5) p += 3; else if (run > 5) p++; }
      else run = 1;
    }
  }
  // rule 2: 2x2 blocks
  for (let y = 0; y < size - 1; y++) {
    for (let x = 0; x < size - 1; x++) {
      const c = mods[y][x];
      if (c === mods[y][x + 1] && c === mods[y + 1][x] && c === mods[y + 1][x + 1]) p += 3;
    }
  }
  // rule 3: finder-like patterns (approx)
  const pat1 = [true, false, true, true, true, false, true, false, false, false, false];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size - 10; x++) {
      let f1 = true, f2 = true;
      for (let k = 0; k < 11; k++) { if (mods[y][x + k] !== pat1[k]) f1 = false; if (mods[y][x + k] !== pat1[10 - k]) f2 = false; }
      if (f1 || f2) p += 40;
    }
  }
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size - 10; y++) {
      let f1 = true, f2 = true;
      for (let k = 0; k < 11; k++) { if (mods[y + k][x] !== pat1[k]) f1 = false; if (mods[y + k][x] !== pat1[10 - k]) f2 = false; }
      if (f1 || f2) p += 40;
    }
  }
  // rule 4: balance
  let dark = 0;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (mods[y][x]) dark++;
  const ratio = (dark * 100) / (size * size);
  p += Math.floor(Math.abs(ratio - 50) / 5) * 10;
  return p;
}

/** UTF-8 문자열 → QR 모듈 매트릭스(boolean[][], true=검정) */
export function encodeQR(text: string): boolean[][] {
  const bytes = new TextEncoder().encode(text);
  const ver = selectVersion(bytes.length);
  const dataCodewords = encodeData(bytes, ver);
  const allCodewords = interleave(dataCodewords, ver);

  let best: Matrix | null = null;
  let bestPenalty = Infinity;
  for (let mask = 0; mask < 8; mask++) {
    const m = new Matrix(ver);
    drawFunctionPatterns(m, ver);
    drawCodewords(m, allCodewords);
    drawFormatBits(m, mask);
    applyMask(m, mask);
    const pen = penalty(m);
    if (pen < bestPenalty) { bestPenalty = pen; best = m; }
  }
  return best!.modules;
}
