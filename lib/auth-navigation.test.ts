import { test } from 'node:test'
import assert from 'node:assert/strict'
import { postLoginPath, roleHomePath } from './auth-navigation.ts'

const municipality = { slug: 'colonia-leopoldina-al' }

test('destino inicial é derivado do papel confiável', () => {
  assert.equal(roleHomePath({ role: 'teacher', municipality }), '/colonia-leopoldina-al')
  assert.equal(roleHomePath({ role: 'aee_teacher', municipality }), '/colonia-leopoldina-al/aee')
  assert.equal(roleHomePath({ role: 'coordinator', municipality }), '/colonia-leopoldina-al/coordinator')
  assert.equal(roleHomePath({ role: 'municipality_admin', municipality }), '/colonia-leopoldina-al/admin')
  assert.equal(roleHomePath({ role: 'super_admin', municipality: null }), '/super-admin')
})

test('next não permite desviar usuário para outra rede ou para auth', () => {
  const profile = { role: 'teacher' as const, municipality }
  assert.equal(postLoginPath(profile, '/colonia-leopoldina-al/plans'), '/colonia-leopoldina-al/plans')
  assert.equal(postLoginPath(profile, '/atalaia-al/admin'), '/colonia-leopoldina-al')
  assert.equal(postLoginPath(profile, '//site.example'), '/colonia-leopoldina-al')
  assert.equal(postLoginPath(profile, '/auth/reset-password'), '/colonia-leopoldina-al')
})
