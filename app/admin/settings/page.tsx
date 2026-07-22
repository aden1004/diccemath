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

  async function loadEmails() {
    const res = await fetch('/api/admin/settings/emails')
    if (res.status === 401) { window.location.href = '/admin/login'; return }
    if (!res.ok) return
    setEmails(await res.json())
  }

  useEffect(() => { loadEmails() }, [])

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
      <section className="bg-white rounded shadow p-5 mb-6">
        <h2 className="font-semibold mb-3">관리자 이메일</h2>
        {emailMsg && <p className={`text-sm mb-2 ${emailMsg.ok ? 'text-blue-700' : 'text-red-600'}`}>{emailMsg.text}</p>}
        <div className="flex flex-col gap-2 mb-4">
          {emails.map(em => (
            <div key={em.id} className="flex items-center gap-2">
              {editId === em.id ? (
                <>
                  <input value={editEmail} onChange={e => setEditEmail(e.target.value)} className="border rounded px-2 py-1 text-sm flex-1" />
                  <input value={editName} onChange={e => setEditName(e.target.value)} className="border rounded px-2 py-1 text-sm w-24" />
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
          <input required type="email" placeholder="이메일" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="border rounded px-2 py-1 text-sm flex-1" />
          <input placeholder="이름" value={newName} onChange={e => setNewName(e.target.value)} className="border rounded px-2 py-1 text-sm w-24" />
          <button type="submit" className="bg-blue-600 text-white px-3 py-1 rounded text-sm">추가</button>
        </form>
      </section>

      {/* Password change */}
      <section className="bg-white rounded shadow p-5">
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
              <input type="password" required value={value} onChange={e => onChange(e.target.value)} className="border rounded px-3 py-2 w-full" />
            </div>
          ))}
          <button type="submit" className="bg-gray-800 text-white py-2 rounded">변경 (변경 후 재로그인)</button>
        </form>
      </section>
    </div>
  )
}
