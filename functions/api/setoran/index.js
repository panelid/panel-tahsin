export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' },
  })
}

export async function onRequestGet(context) {
  const { env, request } = context
  try {
    const db = env.DB
    const url = new URL(request.url)
    const userId = url.searchParams.get('user_id')
    const role = url.searchParams.get('role')

    let query = "SELECT s.*, u.name as murid_name FROM setoran s JOIN users u ON s.user_id = u.id"
    let stmt
    if (role === 'murid' && userId) {
      stmt = db.prepare(query + " WHERE s.user_id = ? ORDER BY s.created_at DESC").bind(userId)
    } else {
      stmt = db.prepare(query + " ORDER BY s.created_at DESC")
    }
    const { results } = await stmt.all()
    return new Response(JSON.stringify({ success: true, setoran: results }), { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } })
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } })
  }
}
