import request from 'supertest'
import { PrismaClient } from '@prisma/client'
import { createApp } from '../index'

describe('Scheduled API', () => {
  let prisma: PrismaClient
  let app: any
  let token: string
  let userId: number

  beforeAll(async () => {
    prisma = new PrismaClient()
    app = createApp(prisma)
    // Reset database
    try {
      await prisma.$executeRawUnsafe('DELETE FROM CalendarEntry')
      await prisma.$executeRawUnsafe('DELETE FROM RecipeIngredient')
      await prisma.$executeRawUnsafe('DELETE FROM Recipe')
      await prisma.$executeRawUnsafe('DELETE FROM GroceryListItem')
      await prisma.$executeRawUnsafe('DELETE FROM GroceryList')
      await prisma.$executeRawUnsafe('DELETE FROM GroceryItem')
      await prisma.$executeRawUnsafe('DELETE FROM User')
    } catch (e) {
      // ignore
    }

    // Sign up and get token
    const signupRes = await request(app)
      .post('/auth/signup')
      .send({ email: 'test@example.com', password: 'password123' })
    token = signupRes.body.token
    userId = signupRes.body.user.id
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  describe('Health Check', () => {
    test('GET /health returns ok', async () => {
      const res = await request(app).get('/health')
      expect(res.status).toBe(200)
      expect(res.body).toEqual({ ok: true })
    })
  })

  describe('Auth', () => {
    test('POST /auth/signup creates a new user', async () => {
      const res = await request(app)
        .post('/auth/signup')
        .send({ email: 'newuser@example.com', password: 'password123' })
      expect(res.status).toBe(200)
      expect(res.body.token).toBeDefined()
      expect(res.body.user.email).toBe('newuser@example.com')
    })

    test('POST /auth/login returns token for valid credentials', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'password123' })
      expect(res.status).toBe(200)
      expect(res.body.token).toBeDefined()
      expect(res.body.user.email).toBe('test@example.com')
    })

    test('POST /auth/login returns 401 for invalid password', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'wrongpassword' })
      expect(res.status).toBe(401)
    })
  })

  describe('Groceries CRUD', () => {
    let groceryId: number

    test('POST creates a grocery item', async () => {
      const res = await request(app)
        .post('/groceries')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Eggs', quantity: 12, unit: 'pcs' })
      expect(res.status).toBe(200)
      expect(res.body.id).toBeGreaterThan(0)
      expect(res.body.name).toBe('Eggs')
      expect(res.body.userId).toBe(userId)
      groceryId = res.body.id
    })

    test('GET lists all items', async () => {
      const res = await request(app)
        .get('/groceries')
        .set('Authorization', `Bearer ${token}`)
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
      expect(res.body.length).toBeGreaterThan(0)
      expect(res.body.every((item: any) => item.userId === userId)).toBe(true)
    })

    test('PUT updates an item', async () => {
      const res = await request(app)
        .put(`/groceries/${groceryId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ quantity: 8 })
      expect(res.status).toBe(200)
      expect(res.body.quantity).toBe(8)
    })

    test('DELETE removes an item', async () => {
      const res = await request(app)
        .delete(`/groceries/${groceryId}`)
        .set('Authorization', `Bearer ${token}`)
      expect(res.status).toBe(200)
      expect(res.body.ok).toBe(true)
    })
  })

  describe('Recipes CRUD', () => {
    let recipeId: number
    let groceryId: number
    let ingredientId: number

    beforeAll(async () => {
      const gres = await request(app)
        .post('/groceries')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Flour', quantity: 5, unit: 'kg' })
      groceryId = gres.body.id
    })

    test('POST creates a recipe', async () => {
      const res = await request(app)
        .post('/recipes')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Bread', description: 'Homemade', servings: 2 })
      expect(res.status).toBe(200)
      expect(res.body.id).toBeGreaterThan(0)
      expect(res.body.name).toBe('Bread')
      expect(res.body.userId).toBe(userId)
      recipeId = res.body.id
    })

    test('POST creates recipe with ingredients', async () => {
      const res = await request(app)
        .post('/recipes')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Cake',
          ingredients: [{ groceryItemId: groceryId, amount: 2, unit: 'cups' }]
        })
      expect(res.status).toBe(200)
      expect(res.body.ingredients.length).toBeGreaterThan(0)
    })

    test('GET lists all recipes', async () => {
      const res = await request(app)
        .get('/recipes')
        .set('Authorization', `Bearer ${token}`)
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
      expect(res.body.length).toBeGreaterThan(0)
      expect(res.body.every((recipe: any) => recipe.userId === userId)).toBe(true)
    })

    test('POST adds ingredient to recipe', async () => {
      const res = await request(app)
        .post(`/recipes/${recipeId}/ingredients`)
        .set('Authorization', `Bearer ${token}`)
        .send({ groceryItemId: groceryId, amount: 3, unit: 'tbsp' })
      expect(res.status).toBe(200)
      expect(res.body.id).toBeGreaterThan(0)
      expect(res.body.recipeId).toBe(recipeId)
      ingredientId = res.body.id
    })

    test('DELETE removes ingredient from recipe', async () => {
      const res = await request(app)
        .delete(`/recipes/${recipeId}/ingredients/${ingredientId}`)
        .set('Authorization', `Bearer ${token}`)
      expect(res.status).toBe(200)
      expect(res.body.ok).toBe(true)
    })

    test('GET recipe returns all ingredients', async () => {
      const res = await request(app)
        .get(`/recipes/${recipeId}`)
        .set('Authorization', `Bearer ${token}`)
      expect(res.status).toBe(200)
      expect(res.body.id).toBe(recipeId)
      expect(Array.isArray(res.body.ingredients)).toBe(true)
    })
  })

  describe('Calendar CRUD', () => {
    let recipeId: number
    let calendarId: number

    beforeAll(async () => {
      const rres = await request(app)
        .post('/recipes')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Pizza', servings: 4 })
      recipeId = rres.body.id
    })

    test('POST creates a calendar entry', async () => {
      const res = await request(app)
        .post('/calendar')
        .set('Authorization', `Bearer ${token}`)
        .send({
          date: '2026-03-20T19:00:00Z',
          recipeId,
          notes: 'Friday dinner'
        })
      expect(res.status).toBe(200)
      expect(res.body.id).toBeGreaterThan(0)
      expect(res.body.recipeId).toBe(recipeId)
      expect(res.body.userId).toBe(userId)
      calendarId = res.body.id
    })

    test('GET lists calendar entries', async () => {
      const res = await request(app)
        .get('/calendar')
        .set('Authorization', `Bearer ${token}`)
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
      expect(res.body.every((entry: any) => entry.userId === userId)).toBe(true)
    })

    test('PUT updates a calendar entry', async () => {
      const res = await request(app)
        .put(`/calendar/${calendarId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ notes: 'Updated dinner' })
      expect(res.status).toBe(200)
      expect(res.body.notes).toBe('Updated dinner')
    })

    test('DELETE removes a calendar entry', async () => {
      const res = await request(app)
        .delete(`/calendar/${calendarId}`)
        .set('Authorization', `Bearer ${token}`)
      expect(res.status).toBe(200)
      expect(res.body.ok).toBe(true)
    })
  })

  describe('Generate List', () => {
    let itemId: number

    beforeAll(async () => {
      const res = await request(app)
        .post('/groceries')
        .send({ name: 'Sugar', quantity: 0.5, unit: 'kg' })
      itemId = res.body.id
    })

    test.skip('POST with itemIds returns selected items', async () => {
      const res = await request(app)
        .post('/generate-list')
        .set('Authorization', `Bearer ${token}`)
        .send({ itemIds: [itemId] })
      expect(res.status).toBe(200)
      expect(res.body.items).toBeInstanceOf(Array)
    }, 10000)

    test('POST with lowStockOnly returns low-stock items', async () => {
      const res = await request(app)
        .post('/generate-list')
        .set('Authorization', `Bearer ${token}`)
        .send({ lowStockOnly: true })
      expect(res.status).toBe(200)
      expect(res.body.items).toBeInstanceOf(Array)
    })

    test('POST without payload returns 400', async () => {
      const res = await request(app)
        .post('/generate-list')
        .set('Authorization', `Bearer ${token}`)
        .send({})
      expect(res.status).toBe(400)
    })
  })
})
