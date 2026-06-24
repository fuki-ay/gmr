'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { questions, type Question } from '@/lib/questions'
import { getPointsForDistance, getReactionCopy } from '@/lib/utils'
import type { Room, Player, RoundAnswer } from '@/lib/types'

type RoundPhase =
  | 'idle'
  | 'rating'
  | 'waiting_rating'
  | 'guessing'
  | 'waiting_guess'
  | 'results'

const ROUND_SECONDS = 15

// Returns the label for a given 1-5 value on a question's scale.
function scaleLabel(q: Question, value: number): string {
  if (q.scale_labels) return q.scale_labels[value - 1]
  if (value === 1 && q.scale_low) return q.scale_low
  if (value === 5 && q.scale_high) return q.scale_high
  return String(value)
}

// Visual 1-5 bar: indigo = actual answer, orange = guess, green = match.
function DistanceBar({ actual, guess }: { actual: number | null; guess: number | null }) {
  const lo = Math.min(actual ?? 99, guess ?? 99)
  const hi = Math.max(actual ?? 0, guess ?? 0)
  return (
    <div className="grid grid-cols-5 gap-1.5">
      {[1, 2, 3, 4, 5].map(n => {
        const isActual = n === actual
        const isGuess = n === guess
        const isBoth = isActual && isGuess
        const between = n > lo && n < hi
        return (
          <div
            key={n}
            className={`h-11 rounded-xl flex items-center justify-center font-bold text-sm
              ${isBoth ? 'bg-green-500 text-white ring-2 ring-green-300'
                : isActual ? 'bg-indigo-500 text-white'
                : isGuess ? 'bg-orange-400 text-white'
                : between ? 'bg-gray-200 text-gray-400'
                : 'bg-gray-100 text-gray-300'}`}
          >
            {n}
          </div>
        )
      })}
    </div>
  )
}

export default function RoomPage() {
  const params = useParams()
  const code = (params.code as string).toUpperCase()
  const router = useRouter()

  // ── Core state ────────────────────────────────────────────────────────
  const [room, setRoom] = useState<Room | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [myPlayer, setMyPlayer] = useState<Player | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [codeCopied, setCodeCopied] = useState(false)
  const [starting, setStarting] = useState(false)
  const [shareUrl, setShareUrl] = useState('')

  // ── Round state ───────────────────────────────────────────────────────
  const [roundAnswers, setRoundAnswers] = useState<RoundAnswer[]>([])
  const [selectedRating, setSelectedRating] = useState<number | null>(null)
  const [selectedGuess, setSelectedGuess] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS)

  // Refs so timer callbacks always read current values without stale closures
  const roomRef = useRef<Room | null>(null)
  const myPlayerRef = useRef<Player | null>(null)
  const selectedRatingRef = useRef<number | null>(null)
  const selectedGuessRef = useRef<number | null>(null)

  useEffect(() => { roomRef.current = room }, [room])
  useEffect(() => { myPlayerRef.current = myPlayer }, [myPlayer])

  // ── Derived values (at component level so timer effect can read them) ──
  const opponent = players.find(p => p.id !== myPlayer?.id) ?? null
  const myAnswer = myPlayer
    ? (roundAnswers.find(a => a.player_id === myPlayer.id) ?? null)
    : null
  const opponentAnswer = opponent
    ? (roundAnswers.find(a => a.player_id === opponent.id) ?? null)
    : null

  // Use *_at timestamps as the "done" signal so a timeout null-submission
  // still advances the phase for both players.
  const myRatingDone = myAnswer?.rating_at != null
  const opponentRatingDone = opponentAnswer?.rating_at != null
  const myGuessDone = myAnswer?.guess_at != null
  const opponentGuessDone = opponentAnswer?.guess_at != null
  const bothRatingsDone = myRatingDone && opponentRatingDone
  const bothGuessesDone = myGuessDone && opponentGuessDone

  const roundPhase: RoundPhase =
    room?.status !== 'playing' ? 'idle'
    : bothGuessesDone ? 'results'
    : myGuessDone ? 'waiting_guess'
    : myRatingDone && bothRatingsDone ? 'guessing'
    : myRatingDone ? 'waiting_rating'
    : 'rating'

  // ── 15-second countdown + auto-submit on timeout ───────────────────────
  useEffect(() => {
    if (roundPhase !== 'rating' && roundPhase !== 'guessing') return
    setTimeLeft(ROUND_SECONDS)
    let t = ROUND_SECONDS
    const id = setInterval(() => {
      t -= 1
      setTimeLeft(t)
      if (t > 0) return
      clearInterval(id)
      const r = roomRef.current
      const me = myPlayerRef.current
      if (!r || !me) return
      if (roundPhase === 'rating') {
        supabase
          .from('round_answers')
          .upsert(
            {
              room_id: r.id,
              round_index: r.current_round,
              player_id: me.id,
              rating: selectedRatingRef.current,   // null if nothing selected
              rating_at: new Date().toISOString(),
            },
            { onConflict: 'room_id,round_index,player_id' }
          )
          .then(() => {})
      } else {
        supabase
          .from('round_answers')
          .update({ guess: selectedGuessRef.current, guess_at: new Date().toISOString() })
          .eq('room_id', r.id)
          .eq('round_index', r.current_round)
          .eq('player_id', me.id)
          .then(() => {})
      }
    }, 1000)
    return () => clearInterval(id)
  }, [roundPhase]) // re-runs on phase change; cleanup stops prior interval

  useEffect(() => {
    setShareUrl(`${window.location.origin}/join/${code}`)
  }, [code])

  // ── Data fetching ─────────────────────────────────────────────────────
  const fetchPlayers = useCallback(async (roomId: string) => {
    const { data } = await supabase
      .from('players')
      .select('*')
      .eq('room_id', roomId)
      .order('joined_at')
    if (data) setPlayers(data as Player[])
  }, [])

  const fetchRoundAnswers = useCallback(async (roomId: string, roundIndex: number) => {
    const { data } = await supabase
      .from('round_answers')
      .select('*')
      .eq('room_id', roomId)
      .eq('round_index', roundIndex)
    if (data) setRoundAnswers(data as RoundAnswer[])
  }, [])

  const fetchData = useCallback(async () => {
    const playerId = localStorage.getItem('gmr_player_id')
    if (!playerId) { router.replace(`/join/${code}`); return }

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
    if (!me) { router.replace(`/join/${code}`); return }

    setRoom(roomData as Room)
    setPlayers((playersData ?? []) as Player[])
    setMyPlayer(me as Player)
    setLoading(false)
  }, [code, router])

  useEffect(() => { fetchData() }, [fetchData])

  // Reset selections + re-fetch when round index changes
  useEffect(() => {
    if (!room || room.status !== 'playing') return
    setSelectedRating(null)
    setSelectedGuess(null)
    selectedRatingRef.current = null
    selectedGuessRef.current = null
    fetchRoundAnswers(room.id, room.current_round)
  }, [room?.id, room?.current_round, room?.status, fetchRoundAnswers])

  // Realtime: rooms, players, round_answers
  useEffect(() => {
    if (!room) return
    const channel = supabase
      .channel(`room-${room.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${room.id}` },
        (payload) => setRoom(payload.new as Room)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${room.id}` },
        () => fetchPlayers(room.id)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'round_answers', filter: `room_id=eq.${room.id}` },
        () => {
          const r = roomRef.current
          if (r) fetchRoundAnswers(r.id, r.current_round)
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [room?.id, fetchPlayers, fetchRoundAnswers])

  // ── Game actions ──────────────────────────────────────────────────────
  async function handleStart() {
    if (!room || !myPlayer?.is_host || starting) return
    setStarting(true)
    await supabase
      .from('rooms')
      .update({ status: 'playing', updated_at: new Date().toISOString() })
      .eq('id', room.id)
    setStarting(false)
  }

  async function submitRating() {
    const r = roomRef.current
    const me = myPlayerRef.current
    if (!r || !me || selectedRatingRef.current === null || submitting) return
    setSubmitting(true)
    await supabase
      .from('round_answers')
      .upsert(
        {
          room_id: r.id,
          round_index: r.current_round,
          player_id: me.id,
          rating: selectedRatingRef.current,
          rating_at: new Date().toISOString(),
        },
        { onConflict: 'room_id,round_index,player_id' }
      )
    setSubmitting(false)
  }

  async function submitGuess() {
    const r = roomRef.current
    const me = myPlayerRef.current
    if (!r || !me || selectedGuessRef.current === null || submitting) return
    setSubmitting(true)
    await supabase
      .from('round_answers')
      .update({ guess: selectedGuessRef.current, guess_at: new Date().toISOString() })
      .eq('room_id', r.id)
      .eq('round_index', r.current_round)
      .eq('player_id', me.id)
    setSubmitting(false)
  }

  async function advanceRound() {
    if (!room || !myPlayer?.is_host) return
    const next = room.current_round + 1
    if (next >= 10) {
      await supabase
        .from('rooms')
        .update({ status: 'finished', updated_at: new Date().toISOString() })
        .eq('id', room.id)
    } else {
      await supabase
        .from('rooms')
        .update({ current_round: next, updated_at: new Date().toISOString() })
        .eq('id', room.id)
    }
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

  // ── Loading / error ───────────────────────────────────────────────────
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
        <Link href="/" className="text-indigo-600 underline">Back to home</Link>
      </div>
    )
  }

  // ── Game in progress ──────────────────────────────────────────────────
  if (room?.status === 'playing') {
    const question = questions[room.current_round]

    const myGuessDistance =
      myAnswer?.guess != null && opponentAnswer?.rating != null
        ? Math.abs(myAnswer.guess - opponentAnswer.rating) : null
    const oppGuessDistance =
      opponentAnswer?.guess != null && myAnswer?.rating != null
        ? Math.abs(opponentAnswer.guess - myAnswer.rating) : null
    const myPoints = myGuessDistance != null ? getPointsForDistance(myGuessDistance) : null
    const oppPoints = oppGuessDistance != null ? getPointsForDistance(oppGuessDistance) : null

    const timerUrgent = timeLeft <= 5

    return (
      <div className="min-h-screen flex flex-col bg-white">
        {/* Top progress bar */}
        <div className="h-1.5 bg-gray-100">
          <div
            className="h-full bg-indigo-500 transition-all duration-700"
            style={{ width: `${(room.current_round / 10) * 100}%` }}
          />
        </div>

        <div className="flex-1 flex flex-col p-5 max-w-sm mx-auto w-full">
          {/* Header: round label + countdown */}
          <div className="flex items-center justify-between mt-2 mb-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Round {room.current_round + 1} / 10
            </p>
            {(roundPhase === 'rating' || roundPhase === 'guessing') && (
              <span
                className={`text-sm font-mono font-bold tabular-nums px-2.5 py-0.5 rounded-full
                  ${timerUrgent ? 'bg-red-50 text-red-500' : 'bg-gray-100 text-gray-500'}`}
              >
                {timeLeft}s
              </span>
            )}
          </div>

          {/* Question card */}
          <div className="bg-gray-50 rounded-2xl p-5 mb-5">
            <p className="text-lg font-bold text-gray-800 text-center leading-snug">
              {question.text}
            </p>
          </div>

          {/* ── Rating phase ── */}
          {roundPhase === 'rating' && (
            <>
              <p className="text-sm text-gray-500 text-center mb-4">
                How would <span className="font-semibold text-gray-700">you</span> rate this?
              </p>

              {!question.scale_labels && (question.scale_low || question.scale_high) && (
                <div className="flex justify-between text-xs text-gray-400 mb-2 px-1">
                  <span>1 · {question.scale_low}</span>
                  <span>{question.scale_high} · 5</span>
                </div>
              )}

              <div className="grid grid-cols-5 gap-2 mb-2">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    onClick={() => {
                      setSelectedRating(n)
                      selectedRatingRef.current = n
                    }}
                    className={`h-14 rounded-xl font-bold text-lg transition-all active:scale-95
                      ${selectedRating === n
                        ? 'bg-indigo-600 text-white shadow-md scale-105'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    {n}
                  </button>
                ))}
              </div>

              {question.scale_labels && (
                <div className="grid grid-cols-5 gap-2 mb-3">
                  {question.scale_labels.map((label, i) => (
                    <p key={i} className="text-center text-[9px] text-gray-400 leading-tight">
                      {label}
                    </p>
                  ))}
                </div>
              )}

              {selectedRating && !question.scale_labels && (
                <p className="text-center text-sm text-indigo-600 font-medium mb-3">
                  {scaleLabel(question, selectedRating)}
                </p>
              )}

              <div className="flex-1" />

              <button
                onClick={submitRating}
                disabled={selectedRating === null || submitting}
                className="w-full h-14 bg-indigo-600 text-white font-bold text-lg rounded-2xl shadow transition-all hover:bg-indigo-700 active:scale-95 disabled:opacity-40"
              >
                {submitting ? 'Locking in…' : 'Lock in rating'}
              </button>
            </>
          )}

          {/* ── Waiting for opponent to rate ── */}
          {roundPhase === 'waiting_rating' && (
            <div className="flex-1 flex flex-col items-center justify-center gap-5">
              <div className="bg-indigo-50 rounded-2xl p-6 text-center w-full">
                <p className="text-sm text-gray-500 mb-2">Your rating</p>
                <p className="text-6xl font-black text-indigo-600">{myAnswer?.rating ?? '–'}</p>
                {myAnswer?.rating && (
                  <p className="text-sm text-gray-500 mt-2">{scaleLabel(question, myAnswer.rating)}</p>
                )}
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse inline-block" />
                Waiting for {opponent?.name ?? 'opponent'} to rate…
              </div>
            </div>
          )}

          {/* ── Guessing phase ── */}
          {roundPhase === 'guessing' && (
            <>
              <div className="flex items-center gap-3 mb-5">
                <div className="bg-indigo-50 rounded-xl px-4 py-3 text-center shrink-0">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">You rated</p>
                  <p className="text-3xl font-black text-indigo-600">{myAnswer?.rating ?? '–'}</p>
                </div>
                <p className="text-sm font-semibold text-gray-700 flex-1 text-center">
                  What did {opponent?.name ?? 'they'} answer?
                </p>
              </div>

              {!question.scale_labels && (question.scale_low || question.scale_high) && (
                <div className="flex justify-between text-xs text-gray-400 mb-2 px-1">
                  <span>1 · {question.scale_low}</span>
                  <span>{question.scale_high} · 5</span>
                </div>
              )}

              <div className="grid grid-cols-5 gap-2 mb-2">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    onClick={() => {
                      setSelectedGuess(n)
                      selectedGuessRef.current = n
                    }}
                    className={`h-14 rounded-xl font-bold text-lg transition-all active:scale-95
                      ${selectedGuess === n
                        ? 'bg-orange-500 text-white shadow-md scale-105'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    {n}
                  </button>
                ))}
              </div>

              {question.scale_labels && (
                <div className="grid grid-cols-5 gap-2 mb-3">
                  {question.scale_labels.map((label, i) => (
                    <p key={i} className="text-center text-[9px] text-gray-400 leading-tight">
                      {label}
                    </p>
                  ))}
                </div>
              )}

              {/* Presence indicator */}
              <div className="flex items-center gap-2 text-gray-400 text-sm my-2">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" />
                {opponent?.name ?? 'Opponent'} is answering…
              </div>

              <div className="flex-1" />

              <button
                onClick={submitGuess}
                disabled={selectedGuess === null || submitting}
                className="w-full h-14 bg-orange-500 text-white font-bold text-lg rounded-2xl shadow transition-all hover:bg-orange-600 active:scale-95 disabled:opacity-40"
              >
                {submitting ? 'Locking in…' : 'Lock in guess'}
              </button>
            </>
          )}

          {/* ── Waiting for opponent to guess ── */}
          {roundPhase === 'waiting_guess' && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <div className="grid grid-cols-2 gap-3 w-full">
                <div className="bg-indigo-50 rounded-2xl p-4 text-center">
                  <p className="text-xs text-gray-400 mb-1">Your rating</p>
                  <p className="text-4xl font-black text-indigo-600">{myAnswer?.rating ?? '–'}</p>
                </div>
                <div className="bg-orange-50 rounded-2xl p-4 text-center">
                  <p className="text-xs text-gray-400 mb-1">Your guess</p>
                  <p className="text-4xl font-black text-orange-500">{myAnswer?.guess ?? '–'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-gray-400 mt-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse inline-block" />
                Waiting for {opponent?.name ?? 'opponent'} to guess…
              </div>
            </div>
          )}

          {/* ── Results / reveal phase ── */}
          {roundPhase === 'results' && (
            <div className="flex-1 flex flex-col gap-4 overflow-y-auto pb-2">

              {/* Both ratings */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-indigo-50 rounded-2xl p-4 text-center">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">You rated</p>
                  <p className="text-4xl font-black text-indigo-600">{myAnswer?.rating ?? '–'}</p>
                  {myAnswer?.rating && (
                    <p className="text-[10px] text-gray-500 mt-1 leading-tight">
                      {scaleLabel(question, myAnswer.rating)}
                    </p>
                  )}
                </div>
                <div className="bg-orange-50 rounded-2xl p-4 text-center">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">
                    {opponent?.name} rated
                  </p>
                  <p className="text-4xl font-black text-orange-500">
                    {opponentAnswer?.rating ?? '–'}
                  </p>
                  {opponentAnswer?.rating && (
                    <p className="text-[10px] text-gray-500 mt-1 leading-tight">
                      {scaleLabel(question, opponentAnswer.rating)}
                    </p>
                  )}
                </div>
              </div>

              {/* Distance bar — your guess vs their actual */}
              <div>
                <div className="flex justify-between items-baseline mb-1.5">
                  <p className="text-xs text-gray-500">
                    You guessed{' '}
                    <span className="font-semibold text-orange-500">
                      {myAnswer?.guess ?? '–'}
                    </span>{' '}
                    for {opponent?.name}
                  </p>
                  <p className="text-xs font-bold text-indigo-600">+{myPoints ?? 0} pts</p>
                </div>
                <DistanceBar
                  actual={opponentAnswer?.rating ?? null}
                  guess={myAnswer?.guess ?? null}
                />
                <div className="flex justify-between text-[9px] text-gray-400 mt-1 px-0.5">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-sm bg-indigo-500 inline-block" />
                    their actual
                  </span>
                  <span className="flex items-center gap-1">
                    your guess
                    <span className="w-2 h-2 rounded-sm bg-orange-400 inline-block" />
                  </span>
                </div>
              </div>

              {/* Distance bar — their guess vs your actual */}
              <div>
                <div className="flex justify-between items-baseline mb-1.5">
                  <p className="text-xs text-gray-500">
                    {opponent?.name} guessed{' '}
                    <span className="font-semibold text-orange-500">
                      {opponentAnswer?.guess ?? '–'}
                    </span>{' '}
                    for you
                  </p>
                  <p className="text-xs font-bold text-orange-500">+{oppPoints ?? 0} pts</p>
                </div>
                <DistanceBar
                  actual={myAnswer?.rating ?? null}
                  guess={opponentAnswer?.guess ?? null}
                />
                <div className="flex justify-between text-[9px] text-gray-400 mt-1 px-0.5">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-sm bg-indigo-500 inline-block" />
                    your actual
                  </span>
                  <span className="flex items-center gap-1">
                    their guess
                    <span className="w-2 h-2 rounded-sm bg-orange-400 inline-block" />
                  </span>
                </div>
              </div>

              {/* Reaction */}
              {myGuessDistance != null && (
                <p className="text-center text-base font-semibold text-gray-700">
                  {getReactionCopy(myGuessDistance)}
                </p>
              )}

              {/* Advance button (host) / waiting (non-host) */}
              {myPlayer?.is_host ? (
                <button
                  onClick={advanceRound}
                  className="w-full h-14 bg-indigo-600 text-white font-bold text-lg rounded-2xl shadow hover:bg-indigo-700 active:scale-95 transition-all mt-auto"
                >
                  {room.current_round >= 9 ? 'See final results 🏆' : 'Next round →'}
                </button>
              ) : (
                <div className="flex items-center justify-center gap-2 text-gray-400 py-3 mt-auto">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse inline-block" />
                  Waiting for {players.find(p => p.is_host)?.name ?? 'host'} to continue…
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Game finished ─────────────────────────────────────────────────────
  if (room?.status === 'finished') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center gap-4">
        <div className="text-5xl">🏆</div>
        <h1 className="text-2xl font-bold">Game over!</h1>
        <Link href="/" className="text-indigo-600 underline mt-4">Play again</Link>
      </div>
    )
  }

  // ── Lobby: both players present ───────────────────────────────────────
  if (players.length === 2) {
    const lobbyOpponent = players.find(p => p.id !== myPlayer?.id)
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
            <div className="flex items-center justify-center text-gray-300 font-black text-lg">VS</div>
            <div className="flex-1 bg-orange-50 rounded-2xl p-5 text-center">
              <div className="text-4xl mb-2">🙂</div>
              <p className="font-bold text-gray-800 text-lg">{lobbyOpponent?.name}</p>
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

  // ── Waiting for opponent (host lobby) ─────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white">
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-bold text-center text-gray-700 mb-1">Share with your friend</h1>
        <p className="text-gray-400 text-center text-sm mb-7">They need this code to join</p>

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

        <button
          onClick={handleShare}
          className="w-full h-14 bg-indigo-600 text-white font-semibold text-lg rounded-xl mb-9 hover:bg-indigo-700 active:scale-95 transition-all"
        >
          Share with friend 📤
        </button>

        <div className="flex items-center justify-center gap-2 text-gray-400">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse inline-block" />
          Waiting for your friend…
        </div>
      </div>
    </div>
  )
}
