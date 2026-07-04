// lib/pdf-generator.ts
// Gerador de PDF para planos de aula usando PDFKit

import PDFDocument from 'pdfkit';
import { Readable } from 'stream';

interface PlanoPDFData {
  title: string;
  gradeLevel: string;
  duration: number; // em minutos
  content: string;
  skills: string[];
  author?: string;
  generatedAt?: string;
}

/**
 * Gerar PDF de plano de aula
 * Retorna buffer para ser enviado como resposta HTTP
 */
export async function generatePlanoPDF(data: PlanoPDFData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        bufferPages: true,
        margin: 50,
      });

      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      doc.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve(buffer);
      });

      doc.on('error', (error) => {
        reject(error);
      });

      // ===== CABEÇALHO =====
      doc.fontSize(24).font('Helvetica-Bold').text(data.title, {
        align: 'center',
      });

      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica').fillColor('#666666');
      doc.text(`Série: ${data.gradeLevel} | Duração: ${data.duration} minutos`, {
        align: 'center',
      });

      if (data.generatedAt) {
        doc.fontSize(9).text(`Gerado em: ${data.generatedAt}`, {
          align: 'center',
        });
      }

      doc.moveDown(1);
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke('#CCCCCC');

      // ===== INFORMAÇÕES DO PLANO =====
      doc.moveDown(0.8);
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#000000');
      doc.text('Informações do Plano');

      doc.moveDown(0.3);
      doc.fontSize(10).font('Helvetica');

      // Grade Level
      doc.fillColor('#333333').text('Série:', { continued: true });
      doc.fillColor('#666666').text(` ${data.gradeLevel}`);

      // Duration
      doc.fillColor('#333333').text('Duração:', { continued: true });
      doc.fillColor('#666666').text(` ${data.duration} minutos`);

      // Skills
      if (data.skills && data.skills.length > 0) {
        doc.moveDown(0.2);
        doc.fillColor('#333333').text('Habilidades BNCC:', { continued: true });
        doc.fillColor('#666666').text(` ${data.skills.join(', ')}`);
      }

      doc.moveDown(0.8);
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke('#CCCCCC');

      // ===== CONTEÚDO PRINCIPAL =====
      doc.moveDown(0.8);
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#000000');
      doc.text('Conteúdo do Plano');

      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica').fillColor('#333333');

      // Parse do conteúdo (espera markdown ou texto simples)
      const lines = data.content.split('\n');
      lines.forEach((line) => {
        if (!line.trim()) {
          doc.moveDown(0.3);
          return;
        }

        // Detectar cabeçalhos markdown
        if (line.startsWith('# ')) {
          doc.fontSize(14).font('Helvetica-Bold').fillColor('#000000');
          doc.text(line.replace('# ', ''));
          doc.moveDown(0.3);
        } else if (line.startsWith('## ')) {
          doc.fontSize(12).font('Helvetica-Bold').fillColor('#1a5490');
          doc.text(line.replace('## ', ''));
          doc.moveDown(0.2);
        } else if (line.startsWith('### ')) {
          doc.fontSize(11).font('Helvetica-Bold').fillColor('#333333');
          doc.text(line.replace('### ', ''));
          doc.moveDown(0.2);
        } else if (line.startsWith('- ') || line.startsWith('* ')) {
          // Bullet point
          doc.fontSize(10).font('Helvetica').fillColor('#333333');
          doc.text(line.replace(/^[\-\*]\s/, ''), {
            indent: 20,
          });
          doc.moveDown(0.1);
        } else {
          // Texto normal
          doc.fontSize(10).font('Helvetica').fillColor('#333333');
          doc.text(line, {
            align: 'left',
            width: 450,
          });
          doc.moveDown(0.1);
        }

        // Verificar se precisa de página nova
        if (doc.y > 750) {
          doc.addPage();
        }
      });

      // ===== RODAPÉ =====
      doc.moveDown(1);
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke('#CCCCCC');

      doc.moveDown(0.5);
      doc.fontSize(9).fillColor('#999999');
      doc.text(
        'Plano de aula gerado automaticamente pela BNCC Platform',
        {
          align: 'center',
        }
      );

      if (data.author) {
        doc.text(`Professor(a): ${data.author}`, {
          align: 'center',
        });
      }

      doc.text('© 2026 BNCC Platform - Todos os direitos reservados', {
        align: 'center',
      });

      // Finalizar documento
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Gerar PDF com formatação alternativa (mais simples)
 */
export async function generateSimplePlanoPDF(
  data: PlanoPDFData
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument();
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      doc.on('end', () => {
        resolve(Buffer.concat(chunks));
      });

      doc.on('error', reject);

      // Título
      doc.fontSize(20).font('Helvetica-Bold');
      doc.text(data.title, { align: 'center' });

      // Subtítulo
      doc.moveDown();
      doc.fontSize(12).font('Helvetica');
      doc.text(`${data.gradeLevel} | ${data.duration} minutos`, {
        align: 'center',
      });

      // Conteúdo
      doc.moveDown();
      doc.fontSize(11);
      doc.text(data.content);

      // Rodapé
      doc.moveDown();
      doc.fontSize(9).fillColor('#999999');
      doc.text('BNCC Platform', { align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Gerar PDF com múltiplas páginas para planos detalhados
 */
export async function generateDetailedPlanoPDF(data: PlanoPDFData & {
  objectives?: string[];
  activities?: Array<{
    title: string;
    duration: number;
    description: string;
  }>;
  resources?: string[];
  assessment?: string;
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 40,
      });

      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      doc.on('end', () => {
        resolve(Buffer.concat(chunks));
      });

      doc.on('error', reject);

      // PÁGINA 1: Capa
      doc.fontSize(28).font('Helvetica-Bold').text(data.title, {
        align: 'center',
      });

      doc.moveDown(2);
      doc.fontSize(14).font('Helvetica');
      doc.text(`Série: ${data.gradeLevel}`, { align: 'center' });
      doc.text(`Duração: ${data.duration} minutos`, { align: 'center' });

      if (data.author) {
        doc.moveDown(2);
        doc.text(`Professor(a): ${data.author}`, { align: 'center' });
      }

      if (data.generatedAt) {
        doc.moveDown(2);
        doc.fontSize(10).text(`Gerado em: ${data.generatedAt}`, {
          align: 'center',
        });
      }

      // PÁGINA 2: Objetivos
      if (data.objectives && data.objectives.length > 0) {
        doc.addPage();
        doc.fontSize(16).font('Helvetica-Bold').text('Objetivos');
        doc.moveDown();

        doc.fontSize(11).font('Helvetica');
        data.objectives.forEach((objective) => {
          doc.text(`• ${objective}`, {
            indent: 20,
          });
          doc.moveDown(0.3);
        });
      }

      // PÁGINA 3: Atividades
      if (data.activities && data.activities.length > 0) {
        doc.addPage();
        doc.fontSize(16).font('Helvetica-Bold').text('Atividades');
        doc.moveDown();

        data.activities.forEach((activity, index) => {
          doc.fontSize(12).font('Helvetica-Bold');
          doc.text(`${index + 1}. ${activity.title}`, { indent: 0 });

          doc.fontSize(10).font('Helvetica').fillColor('#666666');
          doc.text(`Duração: ${activity.duration} minutos`, { indent: 20 });

          doc.fillColor('#000000');
          doc.text(activity.description, { indent: 20, width: 400 });

          doc.moveDown(0.5);
        });
      }

      // PÁGINA 4: Recursos
      if (data.resources && data.resources.length > 0) {
        doc.addPage();
        doc.fontSize(16).font('Helvetica-Bold').text('Recursos Necessários');
        doc.moveDown();

        doc.fontSize(11).font('Helvetica');
        data.resources.forEach((resource) => {
          doc.text(`• ${resource}`, { indent: 20 });
        });
      }

      // PÁGINA 5: Avaliação
      if (data.assessment) {
        doc.addPage();
        doc.fontSize(16).font('Helvetica-Bold').text('Avaliação');
        doc.moveDown();

        doc.fontSize(11).font('Helvetica');
        doc.text(data.assessment);
      }

      // Rodapé em todas as páginas
      const pageCount = doc.bufferedPageRange().count;
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);
        doc.fontSize(8).fillColor('#999999');
        doc.text(
          `Página ${i + 1} de ${pageCount}`,
          40,
          doc.page.height - 30,
          { align: 'center' }
        );
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Exportar PDF como stream (para download direto)
 */
export function createPlanoPDFStream(data: PlanoPDFData): Readable {
  const doc = new PDFDocument({
    margin: 50,
  });

  // Adicionar conteúdo ao documento
  doc.fontSize(24).font('Helvetica-Bold').text(data.title, {
    align: 'center',
  });

  doc.moveDown();
  doc.fontSize(12).font('Helvetica').text(
    `${data.gradeLevel} | ${data.duration} minutos`,
    { align: 'center' }
  );

  doc.moveDown();
  doc.fontSize(11);
  doc.text(data.content);

  return doc;
}
