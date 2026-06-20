import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateRoomCode } from '@/lib/utils'

function serverSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export async function POST(req: NextRequest) {
  const { name } = await req.json()

  if (!name?.trim() || name.length > 20) {
    return NextResponse.json({ error: 'Invalid name' }, { status: 400 })
  }

  const supabase = serverSupabase()
  let roomId = ''
  let finalCode = ''

  // Retry up to 5 times in case of code collision (extremely rare)
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateRoomCode()
    const { data, error } = await supabase
      .from('rooms')
      .insert({ code, status: 'waiting' })
      .select('id')
      .single()

    if (!error && data) {
      roomId = data.id
      finalCode = code
      break
    }

    // 23505 = unique_violation — code already exists, retry
    if (error?.code !== '23505') {
      console.error('Room insert error:', error)
      return NextResponse.json({ error: 'Failed to create room' }, { status: 500 })
    }
  }

  if (!roomId) {
    return NextResponse.json({ error: 'Could not generate unique room code' }, { status: 500 })
  }

  // Insert host player
  const { data: player, error: playerErr } = await supabase
    .from('players')
    .insert({ room_id: roomId, name: name.trim(), slot: 'A', is_host: true })
    .select('id')
    .single()

  if (playerErr || !player) {
    console.error('Player insert error:', playerErr)
    return NextResponse.json({ error: 'Failed to create player' }, { status: 500 })
  }

  // Attach host player ID to the room
  await supabase
    .from('rooms')
    .update({ host_player_id: player.id })
    .eq('id', roomId)

  return NextResponse.json({ code: finalCode, roomId, playerId: player.id })
}
