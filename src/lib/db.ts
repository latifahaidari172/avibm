import { Pool } from 'pg'

// Single shared connection pool against the local auction-intel Postgres
// (the merged "one engine"). AVIBM's tables live in the `avibm` schema;
// `public` stays on the search_path so the cross-schema vehicle-lookup can
// read auction-intel's scraped vehicles + listings directly.
//
// Guarded on globalThis so Next.js hot-reload in dev doesn't leak pools.
const g = globalThis as unknown as { __avibmPool?: Pool }

export const pool: Pool =
  g.__avibmPool ??
  (g.__avibmPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
  }))

// Every pooled connection resolves unqualified names to avibm first.
pool.on('connect', (client) => {
  client.query('SET search_path TO avibm, public').catch(() => {})
})

function ident(name: string): string {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw new Error(`unsafe identifier: ${name}`)
  }
  return `"${name}"`
}

export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const r = await pool.query(text, params)
  return r.rows as T[]
}

export async function one<T = any>(text: string, params?: any[]): Promise<T | null> {
  const rows = await query<T>(text, params)
  return rows[0] ?? null
}

// INSERT INTO avibm.<table> (...) VALUES (...) RETURNING <returning>
export async function insertRow<T = any>(
  table: string,
  data: Record<string, any>,
  returning = '*',
): Promise<T> {
  const cols = Object.keys(data)
  const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ')
  const sql = `INSERT INTO ${ident(table)} (${cols.map(ident).join(', ')}) VALUES (${placeholders}) RETURNING ${returning}`
  const rows = await query<T>(sql, cols.map((c) => data[c]))
  return rows[0]
}

// UPDATE avibm.<table> SET ... WHERE id = $1 RETURNING <returning>
export async function updateById<T = any>(
  table: string,
  id: string | number,
  patch: Record<string, any>,
  returning = '*',
): Promise<T | null> {
  const cols = Object.keys(patch)
  if (cols.length === 0) return null
  const set = cols.map((c, i) => `${ident(c)} = $${i + 2}`).join(', ')
  const sql = `UPDATE ${ident(table)} SET ${set} WHERE id = $1 RETURNING ${returning}`
  const rows = await query<T>(sql, [id, ...cols.map((c) => patch[c])])
  return rows[0] ?? null
}

// DELETE FROM avibm.<table> WHERE id = $1
export async function deleteById(table: string, id: string | number): Promise<void> {
  await query(`DELETE FROM ${ident(table)} WHERE id = $1`, [id])
}
