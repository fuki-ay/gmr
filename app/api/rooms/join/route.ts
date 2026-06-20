import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function serverSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export async function POST(req: NextRequest) {
  const { code, name } = await req.json()

  if (!code?.trim() || !name?.trim() || name.length > 20) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const supabase = serverSupabase()
  const upperCode = code.trim().toUpperCase()

  const { data: room, error: roomErr } = await supabase
    .from('rooms')
    .select('id, status')
    .eq('code', upperCode)
    .single()

  if (roomErr || !room) {
    return NextResponse.json({ error: 'Room not found. Check the code and try again.' }, { status: 404 })
  }

  if (room.status !== 'waiting') {
    return NextResponse.json({ error: 'This game has already started.' }, { status: 409 })
  }

  // Guard against full room
  const { data: existingPlayers } = await supabase
    .from('players')
    .select('id')
    .eq('room_id', room.id)

  if ((existingPlayers?.length ?? 0) >= 2) {
    return NextResponse.json({ error: 'This game is full.' }, { status: 409 })
  }

  const { data: player, error: playerErr } = await supabase
    .from('players')
    .insert({ room_id: room.id, name: name.trim(), slot: 'B', is_host: false })
    .select('id')
    .single()

  if (playerErr || !player) {
    console.error('Join player insert error:', playerErr)
    return NextResponse.json({ error: 'Failed to join room.' }, { status: 500 })
  }

  return NextResponse.json({ code: upperCode, roomId: room.id, playerId: player.id })
}
