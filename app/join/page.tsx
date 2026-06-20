'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function JoinPage() {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
      .replace(/[^A-Za-z0-9]/g, '')
      .toUpperCase()
      .slice(0, 4)
    setCode(val)
    setError('')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (code.length !== 4) {
      setError('Please enter the full 4-character code.')
      return
    }
    router.push(`/join/${code}`)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white">
      <div className="w-full max-w-sm">
        <Link href="/" className="text-indigo-500 text-sm mb-8 block">
          ← Back
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Enter game code</h1>
        <p className="text-gray-400 mb-8">Ask your friend for their 4-character code.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            inputMode="text"
            value={code}
            onChange={handleChange}
            placeholder="e.g. K7XQ"
            className="w-full h-16 px-4 text-3xl font-black text-center tracking-widest rounded-xl border-2 border-gray-200 focus:border-indigo-500 focus:outline-none font-mono uppercase transition-colors"
            maxLength={4}
            autoFocus
            autoComplete="off"
            autoCapitalize="characters"
          />
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <button
            type="submit"
            disabled={code.length !== 4}
            className="w-full h-14 bg-indigo-600 text-white font-semibold text-lg rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:bg-indigo-700 active:scale-95 transition-all"
          >
            Continue →
          </button>
        </form>
      </div>
    </div>
  )
}
