import request from 'supertest'
import { app } from '../src/app'
import { signJwt } from '../src/auth'

describe('Auth middleware', () => {
  it('rejects when Authorization header is missing', async () => {
    const res = await request(app).get('/api/chats')
    expect(res.status).toBe(401)
    expect(res.body.error).toMatch(/Unauthorized/i)
  })

  it('rejects when token is invalid', async () => {
    const res = await request(app).get('/api/chats').set('Authorization', 'Bearer invalid')
    expect(res.status).toBe(401)
  })

  it('allows when token is valid (me)', async () => {
    const token = signJwt({ id: 'test-user', email: 't@example.com' })
    const res = await request(app).get('/api/me').set('Authorization', `Bearer ${token}`)
    // In test mode with no DB, this may return null user; only assert 200 OK
    expect(res.status).toBe(200)
  })
})


