'use client'
import { useState, useEffect, useMemo } from 'react'
import type { Equipment } from '@/types'

type ParsedRow = { name: string; totalQty: number; photoUrl: string; description: string; error?: string }

function parseBulkText(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  return lines.map(line => {
    // Tab-separated (preferred for Excel paste); fall back to comma if no tabs
    const cols = line.includes('\t') ? line.split('\t') : line.split(',')
    const [name, qtyStr, photoUrl = '', description = ''] = cols.map(c => c.trim())
    const totalQty = parseInt(qtyStr, 10)
    let error: string | undefined
    if (!name) error = '교구명 누락'
    else if (!Number.isInteger(totalQty) || totalQty < 1) error = '총수량은 1 이상의 정수'
    return { name, totalQty: isNaN(totalQty) ? 0 : totalQty, photoUrl, description, error }
  })
}

export default function AdminInventoryPage() {
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [editId, setEditId] = useState<number | null>(null)
  const [editQty, setEditQty] = useState(0)
  const [newName, setNewName] = useState('')
  const [newQty, setNewQty] = useState(1)
  const [newPhoto, setNewPhoto] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const [bulkText, setBulkText] = useState('')
  const [bulkSubmitting, setBulkSubmitting] = useState(false)

  const parsedRows = useMemo(() => parseBulkText(bulkText), [bulkText])
  const hasErrors = parsedRows.some(r => r.error)

  async function load() {
    const res = await fetch('/api/inventory')
    if (!res.ok) return
    setEquipment(await res.json())
  }

  useEffect(() => { load() }, [])

  async function handleUpdate(id: number) {
    const res = await fetch(`/api/inventory/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ totalQty: editQty }),
    })
    const data = await res.json()
    setMsg({ text: res.ok ? '수정 완료' : data.error, ok: res.ok })
    if (res.ok) { setEditId(null); load() }
  }

  async function handleDelete(id: number) {
    if (!window.confirm('정말 삭제하시겠습니까?')) return
    const res = await fetch(`/api/inventory/${id}`, { method: 'DELETE' })
    const data = await res.json()
    setMsg({ text: res.ok ? '삭제 완료' : data.error, ok: res.ok })
    if (res.ok) load()
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName, totalQty: newQty, photoUrl: newPhoto, description: newDesc }),
    })
    const data = await res.json()
    setMsg({ text: res.ok ? '추가 완료' : data.error, ok: res.ok })
    if (res.ok) { setNewName(''); setNewQty(1); setNewPhoto(''); setNewDesc(''); load() }
  }

  async function handleBulkUpload() {
    if (parsedRows.length === 0 || hasErrors) return
    if (!window.confirm(`${parsedRows.length}개 교구를 일괄 추가합니다. 진행할까요?`)) return
    setBulkSubmitting(true)
    try {
      const res = await fetch('/api/inventory/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: parsedRows.map(({ error: _e, ...r }) => r) }),
      })
      const data = await res.json()
      setMsg({ text: res.ok ? `${data.count}개 추가 완료` : data.error, ok: res.ok })
      if (res.ok) { setBulkText(''); load() }
    } finally {
      setBulkSubmitting(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">교구 관리</h1>
      {msg && <p className={`mb-4 text-sm ${msg.ok ? 'text-blue-700' : 'text-red-600'}`}>{msg.text}</p>}

      <section className="mb-8 glass rounded-3xl p-5">
        <h2 className="font-semibold mb-3 text-gray-900">교구 추가 (개별)</h2>
        <form onSubmit={handleAdd} className="grid grid-cols-2 gap-3">
          <input required placeholder="교구명" value={newName} onChange={e => setNewName(e.target.value)} className="glass-input px-3 py-2" />
          <input required type="number" min={1} placeholder="총수량" value={newQty} onChange={e => setNewQty(Number(e.target.value))} className="glass-input px-3 py-2" />
          <input placeholder="사진 URL" value={newPhoto} onChange={e => setNewPhoto(e.target.value)} className="glass-input px-3 py-2 col-span-2" />
          <textarea placeholder="설명" value={newDesc} onChange={e => setNewDesc(e.target.value)} className="glass-input px-3 py-2 col-span-2 h-20" />
          <button type="submit" className="col-span-2 btn-liquid py-2">추가</button>
        </form>
      </section>

      <section className="mb-8 glass rounded-3xl p-5">
        <h2 className="font-semibold mb-3 text-gray-900">교구 일괄 업로드 (Excel 복사 → 붙여넣기)</h2>
        <div className="text-sm text-gray-600 mb-3 leading-relaxed">
          <p className="mb-1">📋 <strong>형식</strong>: Excel에서 4개 열(교구명 / 총수량 / 사진URL / 설명)을 선택해 복사 후 아래 영역에 붙여넣기</p>
          <p className="mb-1">• 한 줄에 한 교구 / 열 사이는 <strong>탭</strong> 또는 쉼표로 구분</p>
          <p>• 사진URL과 설명은 비워둬도 됩니다. 예시:</p>
          <pre className="glass-inner p-2 mt-1 text-xs text-gray-700 overflow-x-auto">{`레인보우 분수타일\t59\thttps://drive.google.com/...\t분수의 개념 이해
분수막대\t26\t\t분수와 소수, 퍼센트
정육면체 모형\t10`}</pre>
        </div>
        <textarea
          placeholder="여기에 Excel 데이터 붙여넣기"
          value={bulkText}
          onChange={e => setBulkText(e.target.value)}
          className="glass-input px-3 py-2 w-full h-40 text-sm font-mono"
        />

        {parsedRows.length > 0 && (
          <div className="mt-3 glass-inner overflow-hidden">
            <div className="bg-white/50 px-3 py-2 text-sm font-medium text-gray-700 border-b border-white/60">
              미리보기: {parsedRows.length}행 {hasErrors && <span className="text-red-600 ml-2">⚠ 오류 있음</span>}
            </div>
            <div className="max-h-60 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-white/50 text-gray-600">
                  <tr>
                    <th className="px-2 py-1 text-left">#</th>
                    <th className="px-2 py-1 text-left">교구명</th>
                    <th className="px-2 py-1 text-left">수량</th>
                    <th className="px-2 py-1 text-left">사진</th>
                    <th className="px-2 py-1 text-left">설명</th>
                    <th className="px-2 py-1 text-left">상태</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.map((row, i) => (
                    <tr key={i} className={`border-t ${row.error ? 'bg-red-50' : ''}`}>
                      <td className="px-2 py-1 text-gray-500">{i + 1}</td>
                      <td className="px-2 py-1 text-gray-900">{row.name}</td>
                      <td className="px-2 py-1 text-gray-900">{row.totalQty || '-'}</td>
                      <td className="px-2 py-1 text-gray-500 max-w-[150px] truncate">{row.photoUrl || '-'}</td>
                      <td className="px-2 py-1 text-gray-500 max-w-[200px] truncate">{row.description || '-'}</td>
                      <td className="px-2 py-1">
                        {row.error
                          ? <span className="text-red-600">{row.error}</span>
                          : <span className="text-green-600">✓</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <button
          onClick={handleBulkUpload}
          disabled={parsedRows.length === 0 || hasErrors || bulkSubmitting}
          className="mt-3 btn-liquid-green px-5 py-2"
        >
          {bulkSubmitting ? '업로드 중...' : `${parsedRows.length}개 일괄 추가`}
        </button>
      </section>

      <section>
        <h2 className="font-semibold mb-3 text-gray-900">교구 목록 ({equipment.length}종)</h2>
        <div className="flex flex-col gap-2">
          {equipment.map(item => (
            <div key={item.id} className="glass rounded-2xl p-3 flex items-center gap-3">
              <span className="flex-1 text-sm font-medium text-gray-900">{item.name}</span>
              <span className="text-sm text-gray-500">총 {item.totalQty} / 대여중 {item.rentedQty}</span>
              {editId === item.id ? (
                <>
                  <input type="number" min={item.rentedQty} value={editQty} onChange={e => setEditQty(Number(e.target.value))} className="glass-input w-20 px-2 py-1 text-sm" />
                  <button onClick={() => handleUpdate(item.id)} className="text-blue-600 text-sm">저장</button>
                  <button onClick={() => setEditId(null)} className="text-gray-400 text-sm">취소</button>
                </>
              ) : (
                <>
                  <button onClick={() => { setEditId(item.id); setEditQty(item.totalQty) }} className="text-blue-600 text-sm">수정</button>
                  <button onClick={() => handleDelete(item.id)} className="text-red-500 text-sm">삭제</button>
                </>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
