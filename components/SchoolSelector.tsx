'use client'

export type SchoolOption = { id: string; name: string; municipality_id?: string }

export default function SchoolSelector({ schools, value, onChange }: { schools: SchoolOption[]; value: string; onChange: (id: string) => void }) {
  if (schools.length <= 1) return null
  return (
    <select aria-label="Escola do documento" value={value} onChange={(event) => onChange(event.target.value)} required>
        <option value="">Selecione a escola</option>
        {schools.map((school) => <option key={school.id} value={school.id}>{school.name}</option>)}
    </select>
  )
}
