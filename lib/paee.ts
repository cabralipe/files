import { z } from 'zod'
import type { UserRole } from '@/lib/pei'

// PAEE — Plano de Atendimento Educacional Especializado.
// Documento do professor AEE: organiza atendimentos, recursos de acessibilidade
// e estrategias para eliminar barreiras. Complementa (nao substitui) o PEI, que
// organiza o ensino na sala regular. Os dois devem ser articulados.

export const paeeOrganizacaoSchema = z.object({
  frequencia_semanal: z.string().trim().optional().default('2 vezes por semana'),
  duracao_atendimento: z.string().trim().optional().default('50 minutos'),
  tipo_atendimento: z.enum(['individual', 'grupo', 'misto']).optional().default('individual'),
  local: z.string().trim().optional().default('Sala de Recursos Multifuncionais'),
  horario: z.string().trim().optional().default(''),
  turno_aee: z.enum(['manha', 'tarde', 'noite', 'contraturno']).optional().default('contraturno'),
  periodo_validade: z.string().trim().optional().default(''),
  metas_periodo: z.string().trim().optional().default(''),
})

export type PaeeOrganizacao = z.infer<typeof paeeOrganizacaoSchema>

export const generatePaeeSchema = z.object({
  student_id: z.string().uuid('Selecione um aluno cadastrado'),
  organizacao: paeeOrganizacaoSchema.optional().default({}),
  // Observacoes livres do professor AEE (avaliacao funcional, prioridades etc.)
  observacoes: z.string().trim().optional().default(''),
  // Quando true (padrao), o PEI mais recente do aluno e enviado a IA para que
  // o PAEE seja articulado com o trabalho da sala regular.
  articular_pei: z.boolean().optional().default(true),
})

// O PAEE e elaborado pelo professor do AEE (com apoio da coordenacao/gestao);
// o professor regente participa do PEI, nao da autoria do PAEE.
export function canGeneratePaee(role: UserRole) {
  return ['aee_teacher', 'coordinator', 'admin', 'municipality_admin', 'super_admin'].includes(role)
}

function listBlock(items?: string[]) {
  return items?.length ? items.map((item) => `- ${item}`).join('\n') : '- Nao informado'
}

function field(value: unknown, fallback = 'Nao informado') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

const TIPO_ATENDIMENTO_LABEL: Record<string, string> = {
  individual: 'Individual',
  grupo: 'Em grupo',
  misto: 'Individual e em grupo, conforme o objetivo',
}

const TURNO_LABEL: Record<string, string> = {
  manha: 'Manha',
  tarde: 'Tarde',
  noite: 'Noite',
  contraturno: 'Contraturno da sala regular',
}

export function buildPaeePrompt(input: {
  student: Record<string, unknown>
  profile: Record<string, unknown>
  organizacao: PaeeOrganizacao
  observacoes: string
  aeeTeacherName: string
  peiVigente?: string
}) {
  const { student, profile, organizacao, observacoes, aeeTeacherName, peiVigente } = input
  const p = profile
  const peiBlock = peiVigente && peiVigente.trim()
    ? `\nPEI DO ESTUDANTE NA SALA REGULAR (use para ARTICULAR o PAEE: o atendimento do AEE deve complementar os objetivos do PEI, sem repetir nem substituir o trabalho da sala comum; indique explicitamente os pontos de articulacao):
"""
${peiVigente.trim()}
"""
`
    : ''

  return `Voce e especialista em educacao inclusiva, Atendimento Educacional Especializado (AEE), Salas de Recursos Multifuncionais e eliminacao de barreiras a participacao.
Gere um PAEE (Plano de Atendimento Educacional Especializado) em portugues do Brasil, pronto para uso pela escola.

O QUE E O PAEE:
- E o plano do AEE, elaborado pelo professor da Sala de Recursos Multifuncionais/professor do AEE.
- Organiza os atendimentos, recursos pedagogicos e de acessibilidade, tecnologias assistivas e acoes para eliminar barreiras a participacao do estudante.
- Complementa ou suplementa a escolarizacao; NAO substitui a sala regular e NAO repete o PEI.
- Parte de uma avaliacao funcional/pedagogica do estudante, nao apenas do laudo. A pergunta central e: quais barreiras esse aluno enfrenta e quais recursos/estrategias o AEE precisa oferecer para supera-las?

DIRETRIZES DE QUALIDADE:
- Personalize tudo ao estudante: cada objetivo e recurso responde a uma barreira ou potencialidade concreta da ficha.
- Objetivos do AEE devem ser FUNCIONAIS e relacionados a acessibilidade (autonomia, comunicacao, recursos visuais, tecnologia assistiva, autorregulacao, interacao), nao objetivos curriculares de conteudo.
- Use linguagem pedagogica clara e respeitosa; evite jargao clinico e rotulos.
- Seja conciso e aplicavel: priorize acoes que o professor do AEE consegue executar na Sala de Recursos.

LIMITES OBRIGATORIOS:
- Nao diagnosticar, nao sugerir laudo, nao inferir condicao clinica e nao substituir avaliacao profissional.
- Usar somente as informacoes registradas pela escola, professor AEE, professor regente e familia.
- Tratar medicacao, laudo, CID e acompanhamentos externos apenas como informacao declarada, quando houver.

BASE LEGAL/PEDAGOGICA:
- LDB e diretrizes da Educacao Especial: AEE gratuito, transversal, preferencialmente na rede regular e no contraturno, realizado prioritariamente na Sala de Recursos Multifuncionais.
- Lei Brasileira de Inclusao: sistema educacional inclusivo e eliminacao de barreiras que impecam a participacao plena.
- Politica Nacional de Educacao Especial Inclusiva: publico-alvo do AEE inclui pessoas com deficiencia, TEA e altas habilidades/superdotacao; apoio complementar ou suplementar com participacao da familia.

IDENTIFICACAO DO ESTUDANTE:
- Nome: ${field(student.full_name)}
- Escola: ${field(student.school_name)}
- Ano/Turma: ${field(student.grade_level)}${student.class_name ? ` / ${String(student.class_name)}` : ''}
- Turno da sala regular: ${field(student.shift)}
- Professor(a) do AEE: ${field(aeeTeacherName, 'Professor(a) do AEE')}
- Publico-alvo informado: ${field(p.public_target)}
- Laudo/diagnostico informado: ${field(p.diagnosis_report, 'Nao informado (o PAEE nao depende de laudo)')}

FICHA AEE (AVALIACAO FUNCIONAL/PEDAGOGICA):
- Necessidades educacionais: ${field(p.educational_needs)}
- Barreiras de aprendizagem:
${listBlock(p.learning_barriers as string[] | undefined)}
- Comunicacao: ${field(p.communication_profile)}
- Autonomia: ${field(p.autonomy_profile)}
- Interacao social: ${field(p.social_interaction)}
- Aspectos sensoriais: ${field(p.sensory_aspects)}
- Aspectos motores: ${field(p.motor_aspects)}
- Aspectos cognitivos: ${field(p.cognitive_aspects)}
- Leitura/escrita: ${field(p.reading_writing_level)}
- Matematica: ${field(p.math_level)}
- Interesses:
${listBlock(p.interests as string[] | undefined)}
- Potencialidades:
${listBlock(p.strengths as string[] | undefined)}
- Dificuldades:
${listBlock(p.difficulties as string[] | undefined)}
- Recursos de acessibilidade ja utilizados:
${listBlock(p.accessibility_resources as string[] | undefined)}
- Tecnologia assistiva:
${listBlock(p.assistive_technology as string[] | undefined)}
- Observacoes da familia: ${field(p.family_notes)}
- Acompanhamentos externos informados: ${field(p.external_supports)}

ORGANIZACAO DO ATENDIMENTO DEFINIDA PELO PROFESSOR AEE:
- Frequencia semanal: ${field(organizacao.frequencia_semanal)}
- Duracao de cada atendimento: ${field(organizacao.duracao_atendimento)}
- Tipo: ${TIPO_ATENDIMENTO_LABEL[organizacao.tipo_atendimento] || 'Individual'}
- Local: ${field(organizacao.local)}
- Horario: ${field(organizacao.horario, 'A definir com a escola')}
- Turno do AEE: ${TURNO_LABEL[organizacao.turno_aee] || 'Contraturno da sala regular'}
- Periodo de validade do plano: ${field(organizacao.periodo_validade, 'Ano letivo vigente')}
- Metas por bimestre/trimestre indicadas: ${field(organizacao.metas_periodo)}

OBSERVACOES DO PROFESSOR AEE:
${field(observacoes, 'Nenhuma observacao adicional')}
${peiBlock}
Gere o PAEE com esta estrutura:

PAEE - PLANO DE ATENDIMENTO EDUCACIONAL ESPECIALIZADO

1. IDENTIFICACAO DO ESTUDANTE
2. CARACTERIZACAO DO ESTUDANTE (como se comunica, interage, aprende melhor, autonomia, atencao, habilidades consolidadas, dificuldades observadas)
3. BARREIRAS IDENTIFICADAS (comunicacao, motora, sensorial, atencional, compreensao, organizacao da rotina, interacao social, tecnologica, arquitetonica — conforme a ficha)
4. OBJETIVOS DO AEE (funcionais e de acessibilidade, com prazo por bimestre/trimestre)
5. RECURSOS E ESTRATEGIAS DO AEE (recursos pedagogicos, de acessibilidade e tecnologia assistiva, vinculados as barreiras)
6. ORGANIZACAO DO ATENDIMENTO (frequencia, duracao, tipo, local, horario, responsaveis, metas por periodo)
7. ARTICULACAO COM A SALA REGULAR (orientacoes ao professor regente, coordenacao, familia, profissional de apoio e gestao${peiBlock ? '; referencie o PEI vigente e indique como o AEE apoia seus objetivos' : ''})
8. ACOMPANHAMENTO E REAVALIACAO (avaliacao mensal pelo professor AEE, revisao bimestral com o regente, registro de avancos e dificuldades, atualizacao de estrategias)
9. CIENCIA DA FAMILIA E ASSINATURAS

Escreva de forma objetiva, aplicavel pela escola e sem linguagem clinica indevida.
${peiBlock ? 'Ha um PEI vigente: deixe explicita, na secao 7, a articulacao entre o atendimento do AEE e os objetivos do PEI da sala regular.' : 'Nao ha PEI cadastrado: registre na secao 7 a recomendacao de elaboracao do PEI pela equipe da sala regular, em articulacao com este PAEE.'}
Use titulos numerados exatamente como acima e preencha todas as secoes.`
}
