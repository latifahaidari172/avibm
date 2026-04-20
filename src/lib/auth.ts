import { createHmac } from 'crypto'

const getSecret = () => {
  const s = process.env.ADMIN_JWT_SECRET
  if (!s) throw new Error('ADMIN_JWT_SECRET env var is not set')
  return s
}

export function signToken(payload: object): string {
  const data = Buffer.from(JSON.stringify({ ...payload, iat: Date.now() })).toString('base64url')
  const sig = createHmac('sha256', getSecret()).update(data).digest('base64url')
  return `${data}.${sig}`
}

export function verifyToken(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 2) return null
    const [data, sig] = parts
    const expected = createHmac('sha256', getSecret()).update(data).digest('base64url')
    if (sig !== expected) return null
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString())
    return payload
  } catch {
    return null
  }
}

export function getAuthToken(request: Request): Record<string, unknown> | null {
  const auth = request.headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) return null
  return verifyToken(auth.slice(7))
}

export function unauthorized() {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  })
}
