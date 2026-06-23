const fs = require("node:fs");
const path = require("node:path");

const sourcePath = process.argv[2];
const outputPath =
  process.argv[3] ||
  path.join(process.cwd(), "public", "saeb-descriptors.json");

if (!sourcePath) {
  throw new Error(
    "Uso: node scripts/build-saeb-descriptors.cjs <matriz.md> [saida.json]",
  );
}

const lines = fs
  .readFileSync(sourcePath, "utf8")
  .split(/\r?\n/)
  .map((line) => line.replace(/^##\s*/, "").trim());

let subject = "Língua Portuguesa";
let inMatrix = false;
let grade = "";
let topic = "";
let current = null;
const descriptors = [];

function finishDescriptor() {
  if (!current) return;
  current.habilidade = current.habilidade
    .replace(/\s+/g, " ")
    .replace(/emfunção/g, "em função")
    .replace(/dascondições/g, "das condições")
    .replace(/serár ecebido/g, "será recebido")
    .trim();
  current.habilidade_raw = `(${current.code}) ${current.habilidade}`;
  descriptors.push(current);
  current = null;
}

for (const line of lines) {
  if (/MATEM[ÁA]T(?:I|C)C?ICA DO SAEB/i.test(line)) subject = "Matemática";

  if (/T[ÓO]PICOS E SEUS DESCRITORES|TEMAS E SEUS DESCRITORES/i.test(line)) {
    inMatrix = true;
    topic = "";
    grade = /5[ºO]/i.test(line)
      ? "5º Ano"
      : /9[ºO]/i.test(line)
        ? "9º Ano"
        : /3[ªA]/i.test(line)
          ? "3ª Série do Ensino Médio"
          : "";
    continue;
  }

  if (!inMatrix) continue;
  if (/^Fonte:/i.test(line)) {
    finishDescriptor();
    inMatrix = false;
    continue;
  }

  const topicMatch = line.match(/^(I|II|III|IV|V|VI)\s*[.\-]\s*(.+)$/);
  if (topicMatch) {
    finishDescriptor();
    topic = topicMatch[2].replace(/\s+/g, " ").trim();
    continue;
  }

  const descriptorMatch = line.match(/^D(\d+)\s*(.*)$/);
  if (descriptorMatch) {
    finishDescriptor();
    const code = `D${descriptorMatch[1]}`;
    const id = `saeb-${subject}-${grade}-${code}`
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/-$/, "");

    current = {
      id,
      code,
      disciplina: subject,
      ano: grade,
      unidade_tematica: topic,
      objeto_conhecimento:
        "Matriz de Referência do SAEB — Documento de Referência do Ano de 2001",
      fonte:
        "INEP. Matrizes de referência de língua portuguesa e matemática do SAEB: documento de referência do ano de 2001. Brasília, DF: INEP, 2020.",
      habilidade: descriptorMatch[2].trim(),
      habilidade_raw: "",
    };
    continue;
  }

  if (
    !current &&
    topic &&
    line &&
    /^[A-ZÁÉÍÓÚÂÊÔÃÕÇ]/.test(line) &&
    !/^\(?continua|^\(?conclus|^\d+$|^MATRIZ DE REFERÊNCIA/i.test(line)
  ) {
    topic = `${topic} ${line}`.replace(/\s+/g, " ").trim();
    continue;
  }

  if (
    current &&
    line &&
    !/^\(?continua|^\(?conclus|^\d+$|^MATRIZ DE REFERÊNCIA/i.test(line)
  ) {
    current.habilidade += `${current.habilidade ? " " : ""}${line}`;
  }
}

const expected = {
  "Língua Portuguesa|5º Ano": 15,
  "Língua Portuguesa|9º Ano": 21,
  "Língua Portuguesa|3ª Série do Ensino Médio": 21,
  "Matemática|5º Ano": 28,
  "Matemática|9º Ano": 37,
  "Matemática|3ª Série do Ensino Médio": 35,
};

for (const [key, count] of Object.entries(expected)) {
  const [expectedSubject, expectedGrade] = key.split("|");
  const actual = descriptors.filter(
    (item) => item.disciplina === expectedSubject && item.ano === expectedGrade,
  ).length;
  if (actual !== count)
    throw new Error(`${key}: esperado ${count}, extraído ${actual}`);
}

fs.writeFileSync(
  outputPath,
  `${JSON.stringify(descriptors, null, 2)}\n`,
  "utf8",
);
console.log(
  `Gerados ${descriptors.length} descritores oficiais em ${outputPath}`,
);
