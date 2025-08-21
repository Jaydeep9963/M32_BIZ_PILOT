process.env.OFFLINE_MODE = '1'
process.env.JWT_SECRET = 'test-secret'
process.env.CLIENT_URL = 'http://localhost:5173'

// Disable Mongoose by clearing MONGO_URI so routes use in-memory store
delete process.env.MONGO_URI


