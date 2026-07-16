// Testes de autorização (Bloco 4 — item 20). Rode com: npm test
// Cobrem o checklist da auditoria sobre as regras PURAS de lib/authz-rules.ts.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  canAssignRole,
  canDeletePlan,
  canEditPlan,
  canSeeSensitiveStudentData,
  isAdminRole,
  isSameTenant,
  sameSchool,
  getRolePermissions,
  type PlanActor,
  type PlanInfo,
} from './authz-rules.ts'

const MUNI_A = 'muni-a'
const MUNI_B = 'muni-b'

const actor = (over: Partial<PlanActor> = {}): PlanActor => ({
  role: 'teacher',
  userId: 'u1',
  municipalityId: MUNI_A,
  school: 'Escola X',
  ...over,
})

const plan = (over: Partial<PlanInfo> = {}): PlanInfo => ({
  userId: 'u2',
  municipalityId: MUNI_A,
  school: 'Escola X',
  isPei: false,
  isPaee: false,
  ...over,
})

// ── isAdminRole / isValidRole ────────────────────────────────
test('isAdminRole distingue gestão de papéis comuns', () => {
  assert.equal(isAdminRole('super_admin'), true)
  assert.equal(isAdminRole('municipality_admin'), true)
  assert.equal(isAdminRole('admin'), true)
  assert.equal(isAdminRole('teacher'), false)
  assert.equal(isAdminRole('coordinator'), false)
})

// ── Escalada de privilégio (admin/users) ─────────────────────
test('municipality_admin NÃO pode promover a admin/super_admin', () => {
  assert.equal(canAssignRole('municipality_admin', 'super_admin'), false)
  assert.equal(canAssignRole('municipality_admin', 'admin'), false)
  assert.equal(canAssignRole('municipality_admin', 'coordinator'), true)
  assert.equal(canAssignRole('municipality_admin', 'teacher'), true)
})

test('super_admin pode atribuir qualquer papel válido; papel inválido é rejeitado', () => {
  assert.equal(canAssignRole('super_admin', 'super_admin'), true)
  assert.equal(canAssignRole('super_admin', 'admin'), true)
  assert.equal(canAssignRole('super_admin', 'hacker'), false)
})

test('papel não-admin não pode atribuir papéis', () => {
  assert.equal(canAssignRole('teacher', 'teacher'), false)
  assert.equal(canAssignRole('coordinator', 'teacher'), false)
})

test('família só é criada pelo vínculo com aluno e gestão municipal não cria outros gestores', () => {
  assert.equal(canAssignRole('super_admin', 'family'), false)
  assert.equal(canAssignRole('municipality_admin', 'family'), false)
  assert.equal(canAssignRole('municipality_admin', 'municipality_admin'), false)
  assert.equal(canAssignRole('admin', 'admin'), false)
  assert.equal(canAssignRole('admin', 'coordinator'), true)
})

// ── Isolamento por município (tenant) ────────────────────────
test('isSameTenant bloqueia municípios diferentes e libera super_admin', () => {
  assert.equal(isSameTenant(MUNI_A, { role: 'teacher', municipalityId: MUNI_A }), true)
  assert.equal(isSameTenant(MUNI_B, { role: 'teacher', municipalityId: MUNI_A }), false)
  assert.equal(isSameTenant(MUNI_B, { role: 'super_admin', municipalityId: MUNI_A }), true)
  assert.equal(isSameTenant(null, { role: 'teacher', municipalityId: MUNI_A }), false)
})

// ── Dados sensíveis do aluno (ficha AEE) ─────────────────────
test('professor comum e família NÃO veem ficha AEE; AEE/coordenação/gestão veem', () => {
  assert.equal(canSeeSensitiveStudentData('teacher'), false)
  assert.equal(canSeeSensitiveStudentData('family'), false)
  assert.equal(canSeeSensitiveStudentData('aee_teacher'), true)
  assert.equal(canSeeSensitiveStudentData('coordinator'), true)
  assert.equal(canSeeSensitiveStudentData('municipality_admin'), true)
})

// ── IDOR / edição de planos ──────────────────────────────────
test('professor NÃO edita plano de outro professor (mesma escola)', () => {
  assert.equal(canEditPlan(actor({ userId: 'u1' }), plan({ userId: 'u2' })), false)
})

test('professor NÃO edita plano de outro município', () => {
  assert.equal(canEditPlan(actor({ municipalityId: MUNI_A }), plan({ userId: 'u1', municipalityId: MUNI_B })), false)
})

test('dono edita o próprio plano; coordenador da mesma escola também', () => {
  assert.equal(canEditPlan(actor({ userId: 'u1' }), plan({ userId: 'u1' })), true)
  assert.equal(canEditPlan(actor({ role: 'coordinator', school: 'Escola X' }), plan({ userId: 'u9', school: 'Escola X' })), true)
  assert.equal(canEditPlan(actor({ role: 'coordinator', school: 'Escola Y' }), plan({ userId: 'u9', school: 'Escola X' })), false)
})

// ── Exclusão de PEI/PAEE ─────────────────────────────────────
test('professor (mesmo autor) NÃO exclui PEI; coordenação/AEE da escola sim', () => {
  assert.equal(canDeletePlan(actor({ role: 'teacher', userId: 'u1' }), plan({ userId: 'u1', isPei: true })), false)
  assert.equal(canDeletePlan(actor({ role: 'coordinator', school: 'Escola X' }), plan({ isPei: true, school: 'Escola X' })), true)
  assert.equal(canDeletePlan(actor({ role: 'aee_teacher', school: 'Escola X' }), plan({ isPaee: true, school: 'Escola X' })), true)
  assert.equal(canDeletePlan(actor({ role: 'super_admin' }), plan({ isPei: true, municipalityId: MUNI_B })), true)
})

test('exclusão de plano comum: dono ou coordenador da escola', () => {
  assert.equal(canDeletePlan(actor({ userId: 'u1' }), plan({ userId: 'u1' })), true)
  assert.equal(canDeletePlan(actor({ role: 'teacher', userId: 'u1' }), plan({ userId: 'u2' })), false)
})

// ── sameSchool ───────────────────────────────────────────────
test('sameSchool ignora caixa/espaços e trata nulos', () => {
  assert.equal(sameSchool(' Escola X ', 'escola x'), true)
  assert.equal(sameSchool('Escola X', 'Escola Y'), false)
  assert.equal(sameSchool(null, 'Escola X'), false)
})

test('permissoes derivadas nao concedem gestao a professor comum', () => {
  assert.equal(getRolePermissions('teacher').manageAeeStudents, false)
  assert.equal(getRolePermissions('teacher').generatePei, true)
  assert.equal(getRolePermissions('aee_teacher').generatePaee, true)
  assert.equal(getRolePermissions('municipality_admin').manageMunicipality, true)
  assert.equal(getRolePermissions('super_admin').managePlatform, true)
})

test('school_id prevalece sobre nomes iguais na autorizacao de planos', () => {
  const scopedActor = actor({ role: 'coordinator', userId: 'coord', schoolId: 'school-a' })
  const scopedPlan = plan({ userId: 'teacher', schoolId: 'school-b' })
  assert.equal(canEditPlan(scopedActor, scopedPlan), false)
  assert.equal(canDeletePlan(scopedActor, scopedPlan), false)
})
