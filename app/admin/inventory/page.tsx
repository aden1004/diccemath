'use client'
import { useState, useEffect, useMemo, useRef } from 'react'
import Image from 'next/image'
import type { Equipment } from '@/types'

type ImportRow = {
  row: number; name: string; totalQty: number; photoUrl: string; description: string; noDelivery: boolean
  error?: string; action: 'add' | 'update' | 'error'; current?: { totalQty: number; rentedQty: number }
}

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
  // 엑셀 업로드
  const [xlsxFile, setXlsxFile] = useState<File | null>(null)
  const [importRows, setImportRows] = useState<ImportRow[] | null>(null)
  const [importBusy, setImportBusy] = useState(false)
  const xlsxInputRef = useRef<HTMLInputElement>(null)
  // 사진 업로드
  const [photoBusyId, setPhotoBusyId] = useState<number | null>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [photoTargetId, setPhotoTargetId] = useState<number | null>(null)

  const parsedRows = useMemo(() => parseBulkText(bulkText), [bulkText])
  const hasErrors = parsedRows.some(r => r.error)

  async function load() {
    const res = await fetch('/api/inventory')
    if (!res.ok) return
    setEquipment(await res.json())
  }

  useEffect(() => {
    // 최초 1회 목록 로드 (setState는 fetch 완료 후 비동기로 호출됨)
    fetch('/api/inventory')
      .then(res => (res.ok ? res.json() : null))
      .then(data => { if (data) setEquipment(data) })
      .catch(() => {})
  }, [])

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

  async function handleXlsxPreview(e: React.FormEvent) {
    e.preventDefault()
    if (!xlsxFile) { setMsg({ text: '엑셀 파일을 선택해주세요.', ok: false }); return }
    setImportBusy(true)
    setImportRows(null)
    try {
      const fd = new FormData()
      fd.append('file', xlsxFile)
      const res = await fetch('/api/inventory/import', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) { setMsg({ text: data.error, ok: false }); return }
      setImportRows(data.rows)
      setMsg(null)
    } finally {
      setImportBusy(false)
    }
  }

  async function handleXlsxCommit() {
    if (!importRows) return
    const valid = importRows.filter(r => r.action !== 'error')
    if (valid.length === 0) return
    const adds = valid.filter(r => r.action === 'add').length
    const ups = valid.length - adds
    if (!window.confirm(`추가 ${adds}건, 갱신 ${ups}건을 반영합니다. 진행할까요?`)) return
    setImportBusy(true)
    try {
      const res = await fetch('/api/inventory/import', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: valid.map(r => ({ name: r.name, totalQty: r.totalQty, photoUrl: r.photoUrl, description: r.description, noDelivery: r.noDelivery })) }),
      })
      const data = await res.json()
      setMsg({ text: res.ok ? `반영 완료: 추가 ${data.added}건, 갱신 ${data.updated}건` : data.error, ok: res.ok })
      if (res.ok) { setImportRows(null); setXlsxFile(null); if (xlsxInputRef.current) xlsxInputRef.current.value = ''; load() }
    } finally {
      setImportBusy(false)
    }
  }

  function pickPhoto(id: number) {
    setPhotoTargetId(id)
    photoInputRef.current?.click()
  }

  async function handlePhotoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    const id = photoTargetId
    e.target.value = ''
    if (!file || id == null) return
    setPhotoBusyId(id)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch(`/api/inventory/${id}/photo`, { method: 'POST', body: fd })
      const data = await res.json()
      setMsg({ text: res.ok ? '사진이 변경되었습니다.' : data.error, ok: res.ok })
      if (res.ok) load()
    } finally {
      setPhotoBusyId(null)
    }
  }

  async function handleBulkUpload() {
    if (parsedRows.length === 0 || hasErrors) return
    if (!window.confirm(`${parsedRows.length}개 교구를 일괄 추가합니다. 진행할까요?`)) return
    setBulkSubmitting(true)
    try {
      const res = await fetch('/api/inventory/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: parsedRows.map(r => ({ name: r.name, totalQty: r.totalQty, photoUrl: r.photoUrl, description: r.description })) }),
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
        <h2 className="font-semibold mb-1 text-gray-900">교구 일괄 업로드 (엑셀 파일)</h2>
        <p className="text-sm text-gray-600 mb-3">
          서식을 내려받아 작성한 뒤 업로드하세요. 이미 등록된 교구명은 <b>갱신</b>(총수량·사진·설명·택배불가), 없는 교구명은 <b>추가</b>됩니다.
          현재 목록을 내려받아 수정 후 올리면 현행화가 간편합니다.
        </p>
        <div className="flex flex-wrap gap-2 mb-3">
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- 파일 다운로드 API */}
          <a href="/api/inventory/template" className="btn-glass px-4 py-1.5 text-sm">📄 서식 내려받기</a>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- 파일 다운로드 API */}
          <a href="/api/inventory/export" className="btn-glass px-4 py-1.5 text-sm">📥 현재 목록 내려받기</a>
        </div>
        <form onSubmit={handleXlsxPreview} className="flex gap-2 items-center flex-wrap">
          <input ref={xlsxInputRef} type="file" accept=".xlsx" onChange={e => setXlsxFile(e.target.files?.[0] ?? null)} className="text-sm flex-1 min-w-0" />
          <button type="submit" disabled={importBusy || !xlsxFile} className="btn-liquid px-4 py-1.5 text-sm disabled:opacity-50">
            {importBusy ? '읽는 중...' : '미리보기'}
          </button>
        </form>
        {importRows && (
          <div className="mt-3 glass-inner overflow-hidden">
            <div className="bg-white/50 px-3 py-2 text-sm font-medium text-gray-700 border-b border-white/60 flex flex-wrap gap-x-4">
              <span>총 {importRows.length}행</span>
              <span className="text-green-700">추가 {importRows.filter(r => r.action === 'add').length}</span>
              <span className="text-blue-700">갱신 {importRows.filter(r => r.action === 'update').length}</span>
              {importRows.some(r => r.action === 'error') && <span className="text-red-600">오류 {importRows.filter(r => r.action === 'error').length} (제외됨)</span>}
            </div>
            <div className="max-h-72 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-white/50 text-gray-600">
                  <tr>
                    <th className="px-2 py-1 text-left">행</th>
                    <th className="px-2 py-1 text-left">구분</th>
                    <th className="px-2 py-1 text-left">교구명</th>
                    <th className="px-2 py-1 text-left">총수량</th>
                    <th className="px-2 py-1 text-left">택배불가</th>
                    <th className="px-2 py-1 text-left">설명</th>
                    <th className="px-2 py-1 text-left">비고</th>
                  </tr>
                </thead>
                <tbody>
                  {importRows.map(r => (
                    <tr key={r.row} className={`border-t ${r.action === 'error' ? 'bg-red-50' : ''}`}>
                      <td className="px-2 py-1 text-gray-500">{r.row}</td>
                      <td className="px-2 py-1">
                        {r.action === 'add' && <span className="text-green-700">추가</span>}
                        {r.action === 'update' && <span className="text-blue-700">갱신</span>}
                        {r.action === 'error' && <span className="text-red-600">오류</span>}
                      </td>
                      <td className="px-2 py-1 text-gray-900">{r.name}</td>
                      <td className="px-2 py-1 text-gray-900">
                        {r.totalQty || '-'}
                        {r.current && r.current.totalQty !== r.totalQty && <span className="text-gray-400"> (현재 {r.current.totalQty})</span>}
                      </td>
                      <td className="px-2 py-1">{r.noDelivery ? 'O' : ''}</td>
                      <td className="px-2 py-1 text-gray-500 max-w-[220px] truncate">{r.description || '-'}</td>
                      <td className="px-2 py-1 text-red-600">{r.error ?? ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-3 py-2 border-t border-white/60 flex gap-2">
              <button
                type="button"
                onClick={handleXlsxCommit}
                disabled={importBusy || importRows.every(r => r.action === 'error')}
                className="btn-liquid-green px-5 py-1.5 text-sm disabled:opacity-50"
              >
                {importBusy ? '반영 중...' : '등록(추가·갱신 반영)'}
              </button>
              <button type="button" onClick={() => setImportRows(null)} className="btn-glass px-4 py-1.5 text-sm">취소</button>
            </div>
          </div>
        )}
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

      <input ref={photoInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handlePhotoSelected} className="hidden" />

      <section>
        <h2 className="font-semibold mb-3 text-gray-900">교구 목록 ({equipment.length}종) <span className="text-xs font-normal text-gray-500">— 사진을 누르면 변경</span></h2>
        <div className="flex flex-col gap-2">
          {equipment.map(item => (
            <div key={item.id} className="glass rounded-2xl p-3 flex items-center gap-3">
              <button
                type="button"
                onClick={() => pickPhoto(item.id)}
                disabled={photoBusyId === item.id}
                title="사진 변경"
                className="relative w-12 h-12 rounded-xl bg-white/80 overflow-hidden shrink-0 ring-1 ring-white/70 hover:ring-blue-400"
              >
                {item.photoUrl
                  ? <Image src={item.photoUrl} alt="" fill className="object-contain p-0.5" unoptimized />
                  : <span className="text-[10px] text-gray-400 flex items-center justify-center h-full">사진</span>}
                {photoBusyId === item.id && <span className="absolute inset-0 bg-white/70 text-[10px] flex items-center justify-center">업로드…</span>}
              </button>
              <span className="flex-1 text-sm font-medium text-gray-900">
                {item.name}
                {item.noDelivery && <span className="ml-2 text-[10px] text-orange-600">택배불가</span>}
              </span>
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
