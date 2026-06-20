export interface Room {
  id: string
  code: string
  status: 'waiting' | 'playing' | 'finished'
  current_round: number
  host_player_id: string | null
  created_at: string
  updated_at: string
}

export interface Player {
  id: string
  room_id: string
  name: string
  slot: 'A' | 'B'
  is_host: boolean
  last_seen: string
  joined_at: string
}

export interface RoundAnswer {
  id: string
  room_id: string
  round_index: number
  player_id: string
  rating: number | null
  guess: number | null
  dont_know: boolean
  rating_at: string | null
  guess_at: string | null
}
