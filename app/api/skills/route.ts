import { NextResponse } from 'next/server'
import { listSkills } from '@/lib/public-backend'
import { resolveMunicipality } from '@/lib/municipality'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')?.toLowerCase().trim()
  const grade = searchParams.get('grade_level')
  const subject = searchParams.get('subject')
  const axis = searchParams.get('axis')

  // Isolamento por tenant: cada município enxerga apenas o seu currículo.
  const municipality = await resolveMunicipality(request)
  let skills = await listSkills(municipality?.id)

  if (query) {
    skills = skills.filter((skill) =>
      [skill.code, skill.name, skill.description, skill.subject, skill.axis, skill.competency]
        .join(' ')
        .toLowerCase()
        .includes(query),
    )
  }

  if (grade) {
    skills = skills.filter((skill) => skill.grade_level === grade)
  }

  if (subject) {
    skills = skills.filter((skill) => skill.subject === subject)
  }

  if (axis) {
    skills = skills.filter((skill) => skill.axis === axis)
  }

  return NextResponse.json({ data: skills, total: skills.length })
}
