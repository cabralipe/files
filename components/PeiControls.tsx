'use client'

import { useEffect, useState } from 'react'
import Link from '@/lib/m-link'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase-client'

export type PlanKind = 'plano' | 'pei'
export type PeiSource = 'create' | 'use'

export type PeiStudent = {
  id: string
  full_name: string
  school_name: string
  grade_level: string
  class_name?: string
  shift?: string
  student_aee_profiles?: Array<Record<string, unknown>>
}

export type ExistingPei = {
  id: string
  content: string
  plan_status: string
}

type PeiControlsProps = {
  user: User | null
  school: string
  planKind: PlanKind
  selectedStudentId: string
  onPlanKindChange: (value: PlanKind) => void
  onStudentChange: (studentId: string, student?: PeiStudent) => void
  // Opcionais: usados pelo portal que implementa "usar PEI do AEE x criar o meu".
  peiSource?: PeiSource
  onPeiSourceChange?: (value: PeiSource) => void
  onExistingPeiChange?: (existing: ExistingPei | null) => void
}

async function getAccessToken() {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token
}

const STATUS_LABEL: Record<string, string> = {
  rascunho: 'rascunho',
  aguardando_aee: 'aguardando validação do AEE',
  aguardando_familia: 'aguardando a família',
  vigente: 'vigente',
  arquivado: 'arquivado',
  substituido: 'substituído',
}

export default function PeiControls({
  user,
  school,
  planKind,
  selectedStudentId,
  peiSource = 'create',
  onPlanKindChange,
  onStudentChange,
  onPeiSourceChange,
  onExistingPeiChange,
}: PeiControlsProps) {
  const [students, setStudents] = useState<PeiStudent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [existing, setExisting] = useState<ExistingPei | null>(null)
  const [loadingExisting, setLoadingExisting] = useState(false)

  const role = String(user?.user_metadata?.role || '')
  const canManageAee = ['aee_teacher', 'coordinator', 'admin', 'municipality_admin', 'super_admin'].includes(role)
  const isAdminRole = ['admin', 'municipality_admin', 'super_admin'].includes(role)

  useEffect(() => {
    if (!user || planKind !== 'pei') return

    let cancelled = false
    async function loadStudents() {
      try {
        setLoading(true)
        setError('')
        const token = await getAccessToken()
        const params = school && !isAdminRole ? `?school=${encodeURIComponent(school)}` : ''
        const response = await fetch(`/api/students${params}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        const payload = await response.json()
        if (!response.ok) throw new Error(payload.error || 'Erro ao carregar alunos')
        if (!cancelled) setStudents(payload.data || [])
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Erro ao carregar alunos')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadStudents()
    return () => {
      cancelled = true
    }
  }, [planKind, school, user, isAdminRole])

  // Busca o PEI ja cadastrado (do AEE) para o aluno selecionado.
  useEffect(() => {
    if (!user || planKind !== 'pei' || !selectedStudentId) {
      setExisting(null)
      onExistingPeiChange?.(null)
      return
    }
    let cancelled = false
    async function loadExisting() {
      try {
        setLoadingExisting(true)
        const token = await getAccessToken()
        const res = await fetch(`/api/peis/by-student?student_id=${encodeURIComponent(selectedStudentId)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        const payload = await res.json()
        const data = payload?.data
        const found: ExistingPei | null = data && data.content
          ? { id: String(data.id || ''), content: String(data.content || ''), plan_status: String(data.plan_status || 'rascunho') }
          : null
        if (!cancelled) {
          setExisting(found)
          onExistingPeiChange?.(found)
          if (!found) onPeiSourceChange?.('create')
        }
      } catch {
        if (!cancelled) {
          setExisting(null)
          onExistingPeiChange?.(null)
        }
      } finally {
        if (!cancelled) setLoadingExisting(false)
      }
    }
    void loadExisting()
    return () => {
      cancelled = true
    }
  }, [planKind, selectedStudentId, user])

  function handleStudentChange(value: string) {
    onStudentChange(value, students.find((student) => student.id === value))
  }

  return (
    <div className="pei-mode-panel">
      <div className="pei-mode-options" role="radiogroup" aria-label="Tipo de documento">
        <button
          className={`pei-mode-option${planKind === 'plano' ? ' on' : ''}`}
          type="button"
          onClick={() => onPlanKindChange('plano')}
        >
          Plano
        </button>
        <button
          className={`pei-mode-option${planKind === 'pei' ? ' on' : ''}`}
          type="button"
          onClick={() => onPlanKindChange('pei')}
        >
          PEI
        </button>
      </div>

      {planKind === 'pei' && (
        <div className="pei-student-box">
          <div className="pei-tutorial" style={{ padding: '12px 14px', border: '2px solid var(--blue)', background: 'var(--blue-wash)', marginBottom: 4 }}>
            <div className="pei-tutorial-title" style={{ marginBottom: 6 }}>O que e o modo PEI?</div>
            <p className="pei-note">
              No modo PEI, a IA usa a ficha AEE do aluno para gerar um Plano Educacional Individualizado completo,
              com objetivos, estrategias, adaptacoes e rotina de acompanhamento personalizados.
              O PEI segue as diretrizes da LBI e da Politica Nacional de Educacao Especial Inclusiva.
            </p>
            <p className="pei-note" style={{ marginTop: 6 }}>
              <strong>Prerequisito:</strong> o aluno precisa ter ficha AEE cadastrada no painel AEE.
            </p>
          </div>

          {!user ? (
            <p className="pei-note">Para criar PEI, faca login com uma conta autorizada (professor, AEE, coordenacao ou administracao).</p>
          ) : (
            <>
              <label className="fgr">
                <span className="fl">Aluno vinculado ao PEI</span>
                <select value={selectedStudentId} onChange={(event) => handleStudentChange(event.target.value)}>
                  <option value="">{loading ? 'Carregando alunos...' : 'Selecione o aluno da escola'}</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.full_name} - {student.grade_level}{student.class_name ? ` / ${student.class_name}` : ''}
                    </option>
                  ))}
                </select>
              </label>
              {error && <p className="pei-note" style={{ color: 'var(--red)' }}>{error}</p>}
              {!loading && !students.length && (
                <p className="pei-note">
                  Nenhum aluno com ficha AEE encontrado para esta escola.
                  {canManageAee && ' Cadastre o aluno no painel AEE para que ele apareca aqui.'}
                </p>
              )}

              {/* Aluno selecionado: oferece reutilizar um PEI salvo ou gerar a partir da ficha AEE. */}
              {selectedStudentId && (
                <div className="pei-source" style={{ marginTop: 8, padding: '10px 12px', border: '2px solid var(--ink)', background: 'var(--paper-soft)' }}>
                  {loadingExisting ? (
                    <p className="pei-note">Verificando PEI cadastrado...</p>
                  ) : existing ? (
                    <>
                      <p className="pei-note" style={{ marginBottom: 8 }}>
                        Este aluno já tem um PEI cadastrado pelo professor AEE
                        {' '}(<strong>{STATUS_LABEL[existing.plan_status] || existing.plan_status}</strong>). O que deseja fazer?
                      </p>
                      <label className="pei-check" style={{ display: 'block', marginBottom: 4 }}>
                        <input
                          type="radio"
                          name="pei-source"
                          checked={peiSource === 'use'}
                          onChange={() => onPeiSourceChange?.('use')}
                        />{' '}
                        Usar o PEI do AEE
                      </label>
                      <label className="pei-check" style={{ display: 'block' }}>
                        <input
                          type="radio"
                          name="pei-source"
                          checked={peiSource === 'create'}
                          onChange={() => onPeiSourceChange?.('create')}
                        />{' '}
                        Criar o meu PEI (a IA combina o do AEE com o meu)
                      </label>
                    </>
                  ) : (
                    <p className="pei-note">
                      Ficha AEE encontrada para este aluno. O PEI será criado a partir dos dados já cadastrados.
                    </p>
                  )}
                </div>
              )}

              {canManageAee && (
                <Link className="btn btn-out" href="/aee" style={{ marginTop: 8 }}>
                  Cadastrar aluno / ficha AEE
                </Link>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
