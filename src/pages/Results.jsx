import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'

// Auto-grade a score against the school's grading_scales table.
export function gradeFor(scales, score) {
  const band = (scales || []).find((g) => score >= g.min_score && score <= g.max_score)
  return band ? { grade: band.grade, remark: band.remark } : { grade: '-', remark: '' }
}

export default function Results() {
  const { profile } = useAuth()
  const [assessments, setAssessments] = useState([])
  const [selected, setSelected] = useState('')
  const [scales, setScales] = useState([])
  const [students, setStudents] = useState([])
  const [scores, setScores] = useState({})

  useEffect(() => {
    supabase.from('assessments').select('id, name, class_id, max_score')
      .order('date', { ascending: false }).then(({ data }) => setAssessments(data || []))
    supabase.from('grading_scales').select('*').then(({ data }) => setScales(data || []))
  }, [])

  async function pick(id) {
    setSelected(id)
    const a = assessments.find((x) => x.id === id)
    const { data } = await supabase.from('students')
      .select('id, first_name, last_name').eq('class_id', a.class_id).order('last_name')
    setStudents(data || [])
  }

  async function save() {
    const rows = students.map((s) => {
      const score = Number(scores[s.id] ?? 0)
      return {
        school_id: profile.school_id,
        assessment_id: selected,
        student_id: s.id,
        score,
        grade: gradeFor(scales, score).grade,
      }
    })
    // upsert so re-entry overwrites a student's score for this assessment.
    await supabase.from('results').upsert(rows, { onConflict: 'assessment_id,student_id' })
    alert('Results saved')
  }

  return (
    <div>
      <h1>Test &amp; Exam Results</h1>
      <select value={selected} onChange={(e) => pick(e.target.value)}>
        <option value="">Choose an assessment…</option>
        {assessments.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
      </select>
      {selected && (
        <>
          <table className="tbl">
            <thead><tr><th>Student</th><th>Score</th><th>Grade</th></tr></thead>
            <tbody>
              {students.map((s) => {
                const v = scores[s.id] ?? ''
                return (
                  <tr key={s.id}>
                    <td>{s.last_name}, {s.first_name}</td>
                    <td><input type="number" value={v}
                      onChange={(e) => setScores({ ...scores, [s.id]: e.target.value })} /></td>
                    <td>{v === '' ? '—' : gradeFor(scales, Number(v)).grade}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <button className="btn" onClick={save}>Save results</button>
        </>
      )}
    </div>
  )
}
