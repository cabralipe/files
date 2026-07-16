import assert from 'node:assert/strict'
import test from 'node:test'
import { parseAiJson, samCompatibility, samDraftQuestionSchema } from './sam-integration.ts'

test('mapeia apenas componentes e anos aceitos pelo SAM', () => {
  assert.deepEqual(samCompatibility('Língua Portuguesa', '5º ano'), { subject: 'LP', grade: 5 })
  assert.deepEqual(samCompatibility('Matemática', '9º Ano'), { subject: 'MT', grade: 9 })
  assert.equal(samCompatibility('Ciências', '9º ano'), null)
  assert.equal(samCompatibility('Matemática', '6º ano'), null)
})

test('extrai o array JSON de uma resposta cercada por markdown', () => {
  assert.deepEqual(parseAiJson('```json\n[{"descriptor":"D1"}]\n```'), [{ descriptor: 'D1' }])
})

test('recusa alternativas duplicadas', () => {
  const result = samDraftQuestionSchema.safeParse({
    subject: 'LP',
    grade: 5,
    descriptor: 'D1',
    difficulty: 'medio',
    statement: 'Enunciado suficientemente completo.',
    options: ['Resposta', ' resposta ', 'Outra', 'Mais uma'],
    answer: 0,
    explanation: 'Explicação válida.',
    bnccCodes: ['EF05LP01'],
  })
  assert.equal(result.success, false)
})
