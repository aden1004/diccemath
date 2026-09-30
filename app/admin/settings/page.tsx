'use client'
import { useState, useEffect } from 'react'
import type { AdminEmail } from '@/types'

export default function AdminSettingsPage() {
  const [emails, setEmails] = useState<AdminEmail[]>([])
  const [newEmail, setNewEmail] = useState('')
  const [newName, setNewName] = useState('')
  const [editId, setEditId] = useState<number | null>(null)
  const [editEmail, setEditEmail] = useState('')
  const [editName, setEditName] = useState('')
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [emailMsg, setEmailMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const [pwMsg, setPwMsg] = useState<{ text: string; ok: boolean } | null>(null)
  // 신청서 서식(HWPX)
  const [tpl, setTpl] = useState<{ source: 'default' | 'uploaded'; name: string; updatedAt: string; required: string[] } | null>(null)
  const [tplFile, setTplFile] = useState<File | null>(null)
  const [tplMsg, setTplMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const [tplBusy, setTplBusy] = useState(false)

  async function loadTemplate() {
    const res = await fetch('/api/admin/settings/template')
    if (res.ok) setTpl(await res.json())
  }

  async function loadEmails() {
    const res = await fetch('/api/admin/settings/emails')
    if (res.status === 401) { window.location.assign('/admin/login'); return }
    if (!res.ok) return
    setEmails(await res.json())
  }

  useEffect(() => {
    fetch('/api/admin/settings/emails')
      .then(res => {
        if (res.status === 401) { window.location.href = '/admin/login'; return null }
        return res.ok ? res.json() : null
      })
      .then(data => { if (data) setEmails(data) })
      .catch(() => {})
    fetch('/api/admin/settings/template')
      .then(res => (res.ok ? res.json() : null))
      .then(data => { if (data) setTpl(data) })
      .catch(() => {})
  }, [])

  async function handleUploadTemplate(e: React.FormEvent) {
    e.preventDefault()
    if (!tplFile) { setTplMsg({ text: 'HWPX 파일을 선택해주세요.', ok: false }); return }
    setTplBusy(true)
    setTplMsg(null)
    try {
      const fd = new FormData()
      fd.append('file', tplFile)
      const res = await fetch('/api/admin/settings/template', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) { setTplMsg({ text: data.error, ok: false }); return }
      setTplMsg({ text: `서식이 등록되었습니다. 인식된 자리표시자: ${data.found.map((k: string) => `{{${k}}}`).join(', ')}`, ok: true })
      setTplFile(null)
      loadTemplate()
    } finally {
      setTplBusy(false)
    }
  }

  async function handleResetTemplate() {
    if (!window.confirm('업로드한 서식을 삭제하고 기본 내장 서식으로 되돌리시겠습니까?')) return
    const res = await fetch('/api/admin/settings/template', { method: 'DELETE' })
    const data = await res.json()
    setTplMsg({ text: res.ok ? '기본 서식으로 되돌렸습니다.' : data.error, ok: res.ok })
    if (res.ok) loadTemplate()
  }

  async function handleAddEmail(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/admin/settings/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: newEmail, name: newName }),
    })
    const data = await res.json()
    setEmailMsg({ text: res.ok ? '추가 완료' : data.error, ok: res.ok })
    if (res.ok) { setNewEmail(''); setNewName(''); loadEmails() }
  }

  async function handleUpdateEmail(id: number) {
    const res = await fetch(`/api/admin/settings/emails/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: editEmail, name: editName }),
    })
    const data = await res.json()
    setEmailMsg({ text: res.ok ? '수정 완료' : data.error, ok: res.ok })
    if (res.ok) { setEditId(null); loadEmails() }
  }

  async function handleDeleteEmail(id: number) {
    const res = await fetch(`/api/admin/settings/emails/${id}`, { method: 'DELETE' })
    const data = await res.json()
    setEmailMsg({ text: res.ok ? '삭제 완료' : data.error, ok: res.ok })
    if (res.ok) loadEmails()
  }

  async function handleChangePw(e: React.FormEvent) {
    e.preventDefault()
    if (newPw !== confirmPw) { setPwMsg({ text: '새 비밀번호가 일치하지 않습니다.', ok: false }); return }
    const res = await fetch('/api/admin/settings/password', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
    })
    const data = await res.json()
    if (!res.ok) { setPwMsg({ text: data.error, ok: false }); return }
    setPwMsg({ text: '비밀번호가 변경되었습니다. 다시 로그인해주세요.', ok: true })
    setTimeout(() => { window.location.href = '/admin/login' }, 1500)
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">설정</h1>

      {/* Email management */}
      <section className="glass rounded-3xl p-5 mb-6">
        <h2 className="font-semibold mb-3">관리자 이메일</h2>
        {emailMsg && <p className={`text-sm mb-2 ${emailMsg.ok ? 'text-blue-700' : 'text-red-600'}`}>{emailMsg.text}</p>}
        <div className="flex flex-col gap-2 mb-4">
          {emails.map(em => (
            <div key={em.id} className="flex items-center gap-2">
              {editId === em.id ? (
                <>
                  <input value={editEmail} onChange={e => setEditEmail(e.target.value)} className="glass-input px-2 py-1 text-sm flex-1" />
                  <input value={editName} onChange={e => setEditName(e.target.value)} className="glass-input px-2 py-1 text-sm w-24" />
                  <button onClick={() => handleUpdateEmail(em.id)} className="text-blue-600 text-sm">저장</button>
                  <button onClick={() => setEditId(null)} className="text-gray-400 text-sm">취소</button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm">{em.email}</span>
                  <span className="text-gray-500 text-sm">{em.name}</span>
                  <button onClick={() => { setEditId(em.id); setEditEmail(em.email); setEditName(em.name) }} className="text-blue-600 text-sm">수정</button>
                  <button onClick={() => handleDeleteEmail(em.id)} className="text-red-500 text-sm">삭제</button>
                </>
              )}
            </div>
          ))}
        </div>
        <form onSubmit={handleAddEmail} className="flex gap-2">
          <input required type="email" placeholder="이메일" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="glass-input px-2 py-1 text-sm flex-1" />
          <input placeholder="이름" value={newName} onChange={e => setNewName(e.target.value)} className="glass-input px-2 py-1 text-sm w-24" />
          <button type="submit" className="btn-liquid px-4 py-1 text-sm">추가</button>
        </form>
      </section>

      {/* Rental form template */}
      <section className="glass rounded-3xl p-5 mb-6">
        <h2 className="font-semibold mb-1">신청서 서식(HWPX)</h2>
        <p className="text-xs text-gray-500 mb-3">
          대시보드의 [신청서 HWP] 버튼으로 생성되는 한글 문서의 서식입니다. 한글에서 서식을 만든 뒤 <b>HWPX</b>로 저장해 업로드하세요.
        </p>
        {tpl && (
          <div className="glass-inner px-3 py-2 text-sm mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className={`text-xs px-2 py-0.5 rounded-full ${tpl.source === 'uploaded' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'}`}>
              {tpl.source === 'uploaded' ? '업로드 서식 사용 중' : '기본 내장 서식 사용 중'}
            </span>
            <span className="font-medium">{tpl.name}</span>
            {tpl.updatedAt && <span className="text-gray-500 text-xs">등록일 {tpl.updatedAt}</span>}
            <a href="/api/admin/settings/template?download=1" className="text-blue-600 text-xs hover:underline ml-auto">현재 서식 내려받기</a>
            {tpl.source === 'uploaded' && (
              <button type="button" onClick={handleResetTemplate} className="text-red-500 text-xs hover:underline">기본 서식으로 되돌리기</button>
            )}
          </div>
        )}
        {tplMsg && <p className={`text-sm mb-2 ${tplMsg.ok ? 'text-blue-700' : 'text-red-600'}`}>{tplMsg.text}</p>}
        <form onSubmit={handleUploadTemplate} className="flex gap-2 items-center flex-wrap">
          <input
            type="file"
            accept=".hwpx"
            onChange={e => setTplFile(e.target.files?.[0] ?? null)}
            className="text-sm flex-1 min-w-0"
          />
          <button type="submit" disabled={tplBusy || !tplFile} className="btn-liquid px-4 py-1 text-sm disabled:opacity-50">
            {tplBusy ? '업로드 중...' : '서식 업로드'}
          </button>
        </form>
        <details className="mt-3 text-xs text-gray-600">
          <summary className="cursor-pointer text-gray-700">자리표시자 안내 (서식에 그대로 입력)</summary>
          <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
            <li><code>{'{{소속}}'}</code> 학교명 <span className="text-red-500">*</span></li>
            <li><code>{'{{직위}}'}</code> &quot;교사&quot; 고정</li>
            <li><code>{'{{성명}}'}</code> 선생님 성함 <span className="text-red-500">*</span></li>
            <li><code>{'{{학교전화}}'}</code> 공란</li>
            <li><code>{'{{휴대폰}}'}</code> 휴대폰 <span className="text-red-500">*</span></li>
            <li><code>{'{{대여기간}}'}</code> 수령일 ~ 반납예정일 <span className="text-red-500">*</span></li>
            <li><code>{'{{대여ID}}'}</code> 대여 ID</li>
            <li><code>{'{{신청일}}'}</code> 신청일</li>
            <li><code>{'{{교구명}}'}</code> 교구명 (교구별 반복) <span className="text-red-500">*</span></li>
            <li><code>{'{{수량}}'}</code> 수량 (교구별 반복) <span className="text-red-500">*</span></li>
            <li><code>{'{{비고}}'}</code> 수령방법·연장 여부 (교구별 반복)</li>
          </ul>
          <p className="mt-2">표 안에서 {'{{교구명}}'}·{'{{수량}}'}·{'{{비고}}'}가 들어 있는 행(연속 구간)은 교구 수만큼 자동으로 복제됩니다. * 표시는 필수 항목입니다.</p>
        </details>
      </section>

      {/* Password change */}
      <section className="glass rounded-3xl p-5">
        <h2 className="font-semibold mb-3">비밀번호 변경</h2>
        {pwMsg && <p className={`text-sm mb-2 ${pwMsg.ok ? 'text-blue-700' : 'text-red-600'}`}>{pwMsg.text}</p>}
        <form onSubmit={handleChangePw} className="flex flex-col gap-3">
          {[
            { label: '현재 비밀번호', value: currentPw, onChange: setCurrentPw },
            { label: '새 비밀번호', value: newPw, onChange: setNewPw },
            { label: '새 비밀번호 확인', value: confirmPw, onChange: setConfirmPw },
          ].map(({ label, value, onChange }) => (
            <div key={label}>
              <label className="text-sm text-gray-600 block mb-1">{label}</label>
              <input type="password" required value={value} onChange={e => onChange(e.target.value)} className="glass-input px-3 py-2 w-full" />
            </div>
          ))}
          <button type="submit" className="btn-liquid py-2">변경 (변경 후 재로그인)</button>
        </form>
      </section>
    </div>
  )
}
