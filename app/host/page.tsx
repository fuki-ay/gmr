'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function HostPage() {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/rooms/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to create game.')
        setLoading(false)
        return
      }
      localStorage.setItem('gmr_player_id', data.playerId)
      localStorage.setItem('gmr_player_name', name.trim())
      router.push(`/room/${data.code}`)
    } catch {
      setError('Failed to create game. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white">
      <div className="w-full max-w-sm">
        <Link href="/" className="text-indigo-500 text-sm mb-8 block">
          ← Back
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">What&apos;s your name?</h1>
        <p className="text-gray-400 mb-8">Your friend will see this during the game.</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value.slice(0, 20))
              setError('')
            }}
            placeholder="Your name"
            className="w-full h-14 px-4 text-lg rounded-xl border-2 border-gray-200 focus:border-indigo-500 focus:outline-none transition-colors"
            maxLength={20}
            autoFocus
            autoComplete="off"
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={!name.trim() || loading}
            className="w-full h-14 bg-indigo-600 text-white font-semibold text-lg rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:bg-indigo-700 active:scale-95 transition-all"
          >
            {loading ? 'Creating game…' : 'Continue →'}
          </button>
        </form>
      </div>
    </div>
  )
}
