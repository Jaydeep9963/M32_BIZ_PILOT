import request from 'supertest'
import { app } from '../src/app'

describe('API', () => {
  it('GET /health', async () => {
    const res = await request(app).get('/health')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
  })

  it('Auth signup/login and chat (offline mode)', async () => {
    process.env.OFFLINE_MODE = '1'
    const email = `u${Date.now()}@t.com`
    const password = 'secret123'

    // signup
    const s = await request(app).post('/api/auth/signup').send({ name: 'Test', email, password })
    expect(s.status).toBe(200)
    expect(s.body.token).toBeTruthy()

    // login
    const l = await request(app).post('/api/auth/login').send({ email, password })
    expect(l.status).toBe(200)
    const token = l.body.token
    expect(token).toBeTruthy()

    // chat (context retention offline)
    const c1 = await request(app)
      .post('/api/chat')
      .set('Authorization', `Bearer ${token}`)
      .send({ message: 'My name is David.' })
    expect(c1.status).toBe(200)
    expect(c1.body.chatId).toBeTruthy()

    const c2 = await request(app)
      .post('/api/chat')
      .set('Authorization', `Bearer ${token}`)
      .send({ chatId: c1.body.chatId, message: 'What is my name?' })
    expect(c2.status).toBe(200)
    const assistantMsg = c2.body.messages.find((m: any) => m.role === 'assistant')
    expect(assistantMsg?.content).toMatch(/David/i)
  })
})


