'use client'

import { useEffect, useState } from 'react'
import Link from '@/lib/m-link'
import { createClient } from '@supabase/supabase-js'
import type { User } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '',
)

export type PlanKind = 'plano' | 'pei'

export type PeiStudent = {
  id: string
  full_name: string
  school_name: string
  grade_level: string
  class_name?: string
  shift?: string
  student_aee_profiles?: Array<Record<string, unknown>>
}

type PeiControlsProps = {
  user: User | null
  school: string
  planKind: PlanKind
  selectedStudentId: string
  onPlanKindChange: (value: PlanKind) => void
  onStudentChange: (studentId: string, student?: PeiStudent) => void
}

async function getAccessToken() {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token
}

export default function PeiControls({
  user,
  school,
  planKind,
  selectedStudentId,
  onPlanKindChange,
  onStudentChange,
}: PeiControlsProps) {
  const [students, setStudents] = useState<PeiStudent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const role = String(user?.user_metadata?.role || '')
  const canManageAee = ['aee_teacher', 'coordinator', 'admin', 'municipality_admin', 'super_admin'].includes(role)

  useEffect(() => {
    if (!user || planKind !== 'pei') return

    let cancelled = false
    async function loadStudents() {
      try {
        setLoading(true)
        setError('')
        const token = await getAccessToken()
        const params = school ? `?school=${encodeURIComponent(school)}` : ''
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
  }, [planKind, school, user])

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
          Plano normal
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
              {canManageAee && (
                <Link className="btn btn-out" href="/aee">
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
