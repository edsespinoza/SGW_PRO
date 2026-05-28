/**
 * build.js — Gera sgw_pro_final_v11.html a partir de sgw_pro.html
 * com imagens reais extraídas do PDF de certificado Aberama Brasil.
 *
 * Uso: node build.js
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

// ── Config ──────────────────────────────────────────────────────────────────
const B64DIR = path.join(os.homedir(),
  'Documents', 'Documentação AutoTech', 'Cadastro de Clientes',
  'Aberama', 'Ferramenta Certificado', 'pdf_extracted_imgs', 'b64parts');
const SRC = __filename.replace('build.js', 'sgw_pro.html');
const DST = __filename.replace('build.js', 'sgw_pro_final_v11.html');

// Mapeamento: chave PIMG -> nome do arquivo b64
const FILE_MAP = {
  shield:  'LOGO_SHIELD',
  seal:    'SEAL_LOGO',
  logo:    'ABERAMA_LOGO',
  footer:  'FOOTER_BANNER',
  certBan: 'CERT_BANNER',
  stella:  'STELLANTIS',
  bgA:     'BG_CARD_A',
  bgB:     'BG_CARD_B',
};

// ── Leitura dos b64 ─────────────────────────────────────────────────────────
function readB64(name) {
  const p = path.join(B64DIR, name + '.txt');
  const raw = fs.readFileSync(p, 'utf8').trim();
  return raw;
}

console.log('Lendo imagens...');
const imgs = {};
for (const [key, file] of Object.entries(FILE_MAP)) {
  imgs[key] = readB64(file);
}
const totalChars = Object.values(imgs).reduce((a, b) => a + b.length, 0);
console.log(`OK — carregadas ${totalChars} chars de b64`);

// ── Montar novo bloco PIMG ──────────────────────────────────────────────────
const pad = (k, len) => k.padEnd(len);
const maxKeyLen = Math.max(...Object.keys(FILE_MAP).map(k => k.length));

const newPIMG = 'const PIMG = {\n' +
  Object.entries(FILE_MAP)
    .map(([key]) => `  ${pad(key + ':', maxKeyLen + 2)} 'data:image/jpeg;base64,${imgs[key]}'`)
    .join(',\n') +
  ',\n};';

// ── Ler sgw_pro.html ────────────────────────────────────────────────────────
console.log(`Lendo ${path.basename(SRC)}...`);
let src = fs.readFileSync(SRC, 'utf8');

// ── Substituir bloco PIMG ───────────────────────────────────────────────────
const PIMG_START = 'const PIMG = {';
const PIMG_END = '};';

let idxStart = src.indexOf(PIMG_START);
if (idxStart === -1) {
  console.error('ERRO: não encontrou "const PIMG = {"');
  process.exit(1);
}

// Encontra o '};' que fecha o PIMG
const afterStart = idxStart + PIMG_START.length;
const END_MARKER = '\n' + PIMG_END; // \n};
let idxEnd = src.indexOf(END_MARKER, afterStart);
if (idxEnd === -1) {
  // fallback: busca só };
  idxEnd = src.indexOf(PIMG_END, afterStart);
  if (idxEnd === -1) {
    console.error('ERRO: não encontrou fechamento do PIMG');
    process.exit(1);
  }
  idxEnd += PIMG_END.length; // +2 chars: };
} else {
  idxEnd += END_MARKER.length; // +3 chars: \n};
}

console.log(`Substituindo PIMG em [${idxStart}..${idxEnd}]`);

src = src.slice(0, idxStart) + newPIMG + src.slice(idxEnd);

// ── Bump version ────────────────────────────────────────────────────────────
const verMatch = src.match(/VER:\s*'(\d+)\.(\d+)\.(\d+)'/);
if (verMatch) {
  const major = parseInt(verMatch[1], 10);
  const minor = parseInt(verMatch[2], 10);
  const patch = parseInt(verMatch[3], 10);
  const newVer = `${major}.${minor}.${patch + 1}`;
  src = src.replace(verMatch[0], `VER: '${newVer}'`);
  console.log(`Versão: ${verMatch[1]}.${verMatch[2]}.${verMatch[3]} → ${newVer}`);
}

// Atualiza BUILD date
const buildMatch = src.match(/BUILD:\s*'(\d{4}\.\d{2})'/);
if (buildMatch) {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const newBuild = `${y}.${m}`;
  src = src.replace(buildMatch[0], `BUILD: '${newBuild}'`);
  console.log(`Build: ${buildMatch[1]} → ${newBuild}`);
}

// ── Escrever saída ──────────────────────────────────────────────────────────
console.log(`Escrevendo ${path.basename(DST)}...`);
fs.writeFileSync(DST, src, 'utf8');

const size = fs.statSync(DST).size;
console.log(`Pronto! ${DST}`);
console.log(`Tamanho: ${size.toLocaleString()} bytes (${(size / 1024).toFixed(1)} KB)`);
