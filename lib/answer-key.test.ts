import { test } from 'node:test'
import assert from 'node:assert/strict'
import { hasAnswerKey, withoutAnswerKey } from './answer-key.ts'

test('oculta gabarito comentado e mantém as questões', () => {
  const content = 'QUESTÕES\n1. Questão\n\nGABARITO COMENTADO\n1. Resposta'
  assert.equal(hasAnswerKey(content), true)
  assert.equal(withoutAnswerKey(content), 'QUESTÕES\n1. Questão')
})

test('aceita título markdown e preserva rodapé institucional', () => {
  const content = 'QUESTÕES\n1. Questão\n\n**GABARITO E CRITÉRIOS DE CORREÇÃO**\n1. Resposta\n\nDocumento elaborado pela Secretaria.'
  assert.equal(withoutAnswerKey(content), 'QUESTÕES\n1. Questão\n\nDocumento elaborado pela Secretaria.')
})

test('não altera documento sem gabarito', () => {
  const content = 'PLANO DE AULA\nAVALIAÇÃO\nObservação formativa.'
  assert.equal(hasAnswerKey(content), false)
  assert.equal(withoutAnswerKey(content), content)
})
