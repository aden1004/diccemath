'use client'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { searchSchools, inferSchoolLevel, ALL_SCHOOLS } from '@/lib/schools'

type Props = {
  value: string
  onChange: (name: string) => void
  required?: boolean
}

// 학교명 검색형 선택: 글자를 입력하면 시작 일치 → 포함 일치 순으로 목록 표시. 학교급은 이름으로 자동 판별.
export function SchoolCombobox({ value, onChange, required }: Props) {
  const [query, setQuery] = useState(value)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const wrapRef = useRef<HTMLDivElement>(null)
  const listId = useId()

  const options = useMemo(() => searchSchools(query), [query])
  const selected = ALL_SCHOOLS.includes(value) ? value : ''
  const level = selected ? inferSchoolLevel(selected) : null

  // 외부 클릭 시 닫기
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  function select(name: string) {
    onChange(name)
    setQuery(name)
    setOpen(false)
  }

  function handleInput(text: string) {
    setQuery(text)
    setActive(0)
    setOpen(true)
    // 정확히 일치하는 이름을 입력하면 즉시 선택, 아니면 선택 해제
    onChange(ALL_SCHOOLS.includes(text) ? text : '')
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || options.length === 0) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, options.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); select(options[active]) }
    else if (e.key === 'Escape') setOpen(false)
  }

  return (
    <div ref={wrapRef} className="relative flex flex-col gap-1 min-w-0">
      <label className="text-sm font-medium">
        학교명
        {level && <span className="ml-2 text-xs font-normal text-blue-700">{level}</span>}
      </label>
      <input
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        required={required}
        value={query}
        onChange={e => handleInput(e.target.value)}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKey}
        placeholder="학교명 일부 입력 (예: 대구송)"
        autoComplete="off"
        className={`glass-input px-3 py-2 w-full ${query && !selected ? 'border-amber-400' : ''}`}
      />
      {/* 서버 검증용: 목록에서 선택된 값만 유효 */}
      {query && !selected && (
        <p className="text-xs text-amber-600">목록에서 학교를 선택해주세요.</p>
      )}
      {open && query && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full mt-1 z-40 glass rounded-2xl max-h-60 overflow-y-auto py-1 shadow-xl"
        >
          {options.length === 0 && (
            <li className="px-3 py-2 text-sm text-gray-500">일치하는 학교가 없습니다.</li>
          )}
          {options.map((name, i) => (
            <li
              key={name}
              role="option"
              aria-selected={i === active}
              onMouseDown={e => { e.preventDefault(); select(name) }}
              onMouseEnter={() => setActive(i)}
              className={`px-3 py-2 text-sm cursor-pointer flex justify-between gap-2 ${i === active ? 'bg-blue-100/70' : ''}`}
            >
              <span>{name}</span>
              <span className="text-xs text-gray-500 shrink-0">{inferSchoolLevel(name)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
