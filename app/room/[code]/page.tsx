'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Room, Player } from '@/lib/types'

export default function RoomPage() {
  const params = useParams()
  const code = (params.code as string).toUpperCase()
  const router = useRouter()

  const [room, setRoom] = useState<Room | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [myPlayer, setMyPlayer] = useState<Player | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [codeCopied, setCodeCopied] = useState(false)
  const [starting, setStarting] = useState(false)
  const [shareUrl, setShareUrl] = useState('')

  useEffect(() => {
    setShareUrl(`${window.location.origin}/join/${code}`)
  }, [code])

  const fetchPlayers = useCallback(async (roomId: string) => {
    const { data } = await supabase
      .from('players')
      .select('*')
      .eq('room_id', roomId)
      .order('joined_at')
    if (data) setPlayers(data as Player[])
  }, [])

  const fetchData = useCallback(async () => {
    const playerId = localStorage.getItem('gmr_player_id')
    if (!playerId) {
      router.replace(`/join/${code}`)
      return
    }

    const { data: roomData, error: roomErr } = await supabase
      .from('rooms')
      .select('*')
      .eq('code', code)
      .single()

    if (roomErr || !roomData) {
      setError('Room not found. The code may be wrong or the game expired.')
      setLoading(false)
      return
    }

    const { data: playersData } = await supabase
      .from('players')
      .select('*')
      .eq('room_id', roomData.id)
      .order('joined_at')

    const me = (playersData ?? []).find((p: Player) => p.id === playerId) ?? null

    if (!me) {
      router.replace(`/join/${code}`)
      return
    }

    setRoom(roomData as Room)
    setPlayers((playersData ?? []) as Player[])
    setMyPlayer(me as Player)
    setLoading(false)
  }, [code, router])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Realtime subscription — scoped to this room
  useEffect(() => {
    if (!room) return

    const channel = supabase
      .channel(`room-${room.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${room.id}` },
        (payload) => {
          setRoom(payload.new as Room)
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${room.id}` },
        () => fetchPlayers(room.id)
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [room?.id, fetchPlayers])

  async function handleStart() {
    if (!room || !myPlayer?.is_host || starting) return
    setStarting(true)
    await supabase
      .from('rooms')
      .update({ status: 'playing', updated_at: new Date().toISOString() })
      .eq('id', room.id)
    setStarting(false)
  }

  async function copyCode() {
    await navigator.clipboard.writeText(code)
    setCodeCopied(true)
    setTimeout(() => setCodeCopied(false), 2000)
  }

  async function handleShare() {
    if (navigator.share) {
      await navigator.share({
        title: 'Join my Guess My Rating game!',
        text: `Use code ${code} or tap the link to join.`,
        url: shareUrl,
      })
    } else {
      await navigator.clipboard.writeText(shareUrl)
      setCodeCopied(true)
      setTimeout(() => setCodeCopied(false), 2000)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400 text-lg animate-pulse">Loading…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center gap-4">
        <p className="text-red-500 text-lg">{error}</p>
        <Link href="/" className="text-indigo-600 underline">
          Back to home
        </Link>
      </div>
    )
  }

  // ── Game in progress (placeholder for Day 3) ──────────────────────────
  if (room?.status === 'playing') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center gap-4">
        <div className="text-5xl">🎮</div>
        <h1 className="text-2xl font-bold">Game on!</h1>
        <p className="text-gray-500">Round {(room.current_round ?? 0) + 1} of 10</p>
        <p className="text-sm text-gray-300 mt-6">Round screens coming in the next session…</p>
      </div>
    )
  }

  // ── Game finished (placeholder for Day 4) ──────────────────────────
  if (room?.status === 'finished') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center gap-4">
        <div className="text-5xl">🏆</div>
        <h1 className="text-2xl font-bold">Game over!</h1>
        <Link href="/" className="text-indigo-600 underline mt-4">
          Play again
        </Link>
      </div>
    )
  }

  // ── Lobby: both players present ──────────────────────────────────────
  if (players.length === 2) {
    const opponent = players.find((p) => p.id !== myPlayer?.id)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white">
        <div className="w-full max-w-sm">
          <div className="text-center mb-2">
            <span className="inline-block bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full">
              Both players ready
            </span>
          </div>
          <h1 className="text-2xl font-bold text-center mb-1">Ready to play?</h1>
          <p className="text-gray-400 text-center text-sm mb-8">10 rounds · rate 1–5 · guess each other</p>

          <div className="flex items-stretch gap-3 mb-10">
            <div className="flex-1 bg-indigo-50 rounded-2xl p-5 text-center">
              <div className="text-4xl mb-2">😊</div>
              <p className="font-bold text-gray-800 text-lg">{myPlayer?.name}</p>
              <p className="text-xs text-gray-400 mt-1">You</p>
            </div>
            <div className="flex items-center justify-center text-gray-300 font-black text-lg">
              VS
            </div>
            <div className="flex-1 bg-orange-50 rounded-2xl p-5 text-center">
              <div className="text-4xl mb-2">🙂</div>
              <p className="font-bold text-gray-800 text-lg">{opponent?.name}</p>
              <p className="text-xs text-gray-400 mt-1">Opponent</p>
            </div>
          </div>

          {myPlayer?.is_host ? (
            <button
              onClick={handleStart}
              disabled={starting}
              className="w-full h-16 bg-indigo-600 text-white font-bold text-xl rounded-2xl shadow-lg hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50"
            >
              {starting ? 'Starting…' : 'Start Game 🚀'}
            </button>
          ) : (
            <div className="flex items-center justify-center gap-2 text-gray-400 py-4">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse inline-block" />
              Waiting for host to start…
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Waiting for opponent (host sees this first) ──────────────────────
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white">
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-bold text-center text-gray-700 mb-1">
          Share with your friend
        </h1>
        <p className="text-gray-400 text-center text-sm mb-7">
          They need this code to join
        </p>

        {/* Big tap-to-copy code */}
        <button
          onClick={copyCode}
          className="w-full bg-indigo-50 rounded-3xl py-9 mb-4 active:scale-95 transition-transform"
          aria-label="Copy game code"
        >
          <p className="text-7xl font-black tracking-widest text-indigo-700 font-mono text-center leading-none">
            {code}
          </p>
          <p className="text-sm text-indigo-400 mt-3 text-center">
            {codeCopied ? '✓ Copied!' : 'tap to copy code'}
          </p>
        </button>

        {/* Link row */}
        <div className="flex items-center gap-2 mb-5">
          <div className="flex-1 bg-gray-50 rounded-xl px-3 py-3 text-sm text-gray-400 truncate font-mono">
            {shareUrl || `/join/${code}`}
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(shareUrl || `/join/${code}`)
              setCodeCopied(true)
              setTimeout(() => setCodeCopied(false), 2000)
            }}
            className="shrink-0 bg-gray-100 px-4 py-3 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-200 active:scale-95 transition-all"
          >
            Copy link
          </button>
        </div>

        {/* Native share */}
        <button
          onClick={handleShare}
          className="w-full h-14 bg-indigo-600 text-white font-semibold text-lg rounded-xl mb-9 hover:bg-indigo-700 active:scale-95 transition-all"
        >
          Share with friend 📤
        </button>

        {/* Presence indicator */}
        <div className="flex items-center justify-center gap-2 text-gray-400">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse inline-block" />
          Waiting for your friend…
        </div>
      </div>
    </div>
  )
}
