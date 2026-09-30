'use client'
import { useState } from 'react'
import type { StatsResult, StatsView, DateUnit } from '@/lib/stats'
import { VIEW_LABEL } from '@/lib/stats'
import { toKSTDate, addDays } from '@/lib/date-utils'

const VIEWS: StatsView[] = ['renter', 'equipment', 'date']

export default function AdminStatsPage() {
  const today = toKSTDate()
  const [from, setFrom] = useState(addDays(today, -90))
  const [to, setTo] = useState(today)
  const [view, setView] = useState<StatsView>('equipment')
  const [unit, setUnit] = useState<DateUnit>('day')
  const [includeReturned, setIncludeReturned] = useState(true)
  const [result, setResult] = useState<StatsResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [open, setOpen] = useState<Set<string>>(new Set())

  function query(fmt?: 'xlsx') {
    const p = new URLSearchParams({ from, to, view, unit, includeReturned: includeReturned ? '1' : '0' })
    if (fmt) p.set('format', fmt)
    return `/api/admin/stats?${p}`
  }

  async function load(e?: React.FormEvent) {
    e?.preventDefault()
    setLoading(true); setError(''); setOpen(new Set())
    try {
      const res = await fetch(query())
      if (res.status === 401) { window.location.assign('/admin/login'); return }
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? '조회 실패'); setResult(null); return }
      setResult(data)
    } finally {
      setLoading(false)
    }
  }

  function toggle(key: string) {
    setOpen(prev => { const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n })
  }

  const max = result ? Math.max(1, ...result.rows.map(r => r.qty)) : 1
  const keyHeader = view === 'renter' ? '대여자' : view === 'equipment' ? '교구' : (unit === 'month' ? '신청월' : '신청일')

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">대여 통계</h1>

      <form onSubmit={load} className="glass rounded-3xl p-4 mb-6 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <input type="date" required value={from} onChange={e => setFrom(e.target.value)} className="glass-input px-2 py-1 text-sm" />
          <span>~</span>
          <input type="date" required value={to} onChange={e => setTo(e.target.value)} className="glass-input px-2 py-1 text-sm" />
          <span className="text-xs text-gray-500">(신청일 기준)</span>
          <div className="flex gap-1 ml-2">
            {[['-30', '최근 30일'], ['-90', '최근 90일'], ['year', '올해']].map(([k, l]) => (
              <button key={k} type="button" onClick={() => { setTo(today); setFrom(k === 'year' ? `${today.slice(0, 4)}-01-01` : addDays(today, Number(k))) }} className="btn-glass px-3 py-1 text-xs">{l}</button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-full glass-inner p-0.5">
            {VIEWS.map(v => (
              <button key={v} type="button" onClick={() => setView(v)}
                className={`px-4 py-1 text-sm rounded-full transition ${view === v ? 'bg-blue-600 text-white' : 'text-gray-700'}`}>
                {VIEW_LABEL[v]}
              </button>
            ))}
          </div>
          {view === 'date' && (
            <select value={unit} onChange={e => setUnit(e.target.value as DateUnit)} className="glass-input px-2 py-1 text-sm">
              <option value="day">일별</option>
              <option value="month">월별</option>
            </select>
          )}
          <label className="flex items-center gap-1 text-sm cursor-pointer">
            <input type="checkbox" checked={includeReturned} onChange={e => setIncludeReturned(e.target.checked)} /> 반납완료 포함
          </label>
          <button type="submit" disabled={loading} className="btn-liquid px-5 py-1.5 text-sm">{loading ? '집계 중...' : '조회'}</button>
          {result && (
            <a href={query('xlsx')} className="btn-glass px-4 py-1.5 text-sm">📥 엑셀 내려받기</a>
          )}
        </div>
      </form>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      {result && (
        <section className="glass rounded-3xl p-5">
          <div className="flex flex-wrap gap-4 mb-4 text-sm">
            <span className="glass-inner px-3 py-1">대여 <b>{result.total.rentals}</b>건</span>
            <span className="glass-inner px-3 py-1">교구 <b>{result.total.kinds}</b>종</span>
            <span className="glass-inner px-3 py-1">수량 <b>{result.total.qty}</b>개</span>
            <span className="text-gray-500 self-center">{VIEW_LABEL[view]} · {from} ~ {to}</span>
          </div>
          {result.rows.length === 0 && <p className="text-gray-500 text-sm">해당 기간의 대여 기록이 없습니다.</p>}
          {result.rows.length > 0 && (
            <table className="w-full text-sm">
              <thead className="text-left text-gray-600 border-b border-white/70">
                <tr>
                  <th className="py-2 pr-2">{keyHeader}</th>
                  <th className="py-2 pr-2 text-right w-20">건수</th>
                  <th className="py-2 pr-2 text-right w-20">종수</th>
                  <th className="py-2 pr-2 text-right w-20">수량</th>
                  <th className="py-2 w-[30%] hidden sm:table-cell">수량 비율</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map(r => (
                  <RowGroup key={r.key} row={r} max={max} open={open.has(r.key)} onToggle={() => toggle(r.key)} />
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}
    </div>
  )
}

function RowGroup({ row, max, open, onToggle }: { row: StatsResult['rows'][number]; max: number; open: boolean; onToggle: () => void }) {
  return (
    <>
      <tr className="border-b border-white/50 hover:bg-white/30 cursor-pointer" onClick={onToggle}>
        <td className="py-2 pr-2">
          <span className="text-gray-400 mr-1 text-xs">{open ? '▾' : '▸'}</span>
          <span className="font-medium">{row.label}</span>
          {row.sub && <span className="ml-2 text-xs text-gray-500">{row.sub}</span>}
        </td>
        <td className="py-2 pr-2 text-right">{row.rentals}</td>
        <td className="py-2 pr-2 text-right">{row.kinds}</td>
        <td className="py-2 pr-2 text-right font-semibold">{row.qty}</td>
        <td className="py-2 hidden sm:table-cell">
          <div className="h-2.5 rounded-full bg-white/60 overflow-hidden">
            <div className="h-full rounded-full bg-blue-500/80" style={{ width: `${Math.round((row.qty / max) * 100)}%` }} />
          </div>
        </td>
      </tr>
      {open && row.details.map((d, i) => (
        <tr key={i} className="text-xs text-gray-600 bg-white/20">
          <td className="py-1 pl-6 pr-2" colSpan={3}>{d.label}<span className="ml-2 text-gray-400">{d.sub}</span></td>
          <td className="py-1 pr-2 text-right">{d.qty}</td>
          <td className="hidden sm:table-cell" />
        </tr>
      ))}
    </>
  )
}
