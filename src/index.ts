import express from 'express'
import cors from 'cors'
import { PrismaClient } from '@prisma/client'
import authRouter from './routes/auth'
import groceriesRouter from './routes/groceries'
import recipesRouter from './routes/recipes'
import calendarRouter from './routes/calendar'
import { authMiddleware } from './middleware/auth'

export function createApp(prisma: PrismaClient) {
  const app = express()

  app.use(cors())
  app.use(express.json())

  app.get('/health', async (req, res) => {
    res.json({ ok: true })
  })

  // Auth routes (no auth required)
  app.use('/auth', authRouter(prisma))

  // Protected routes (auth required)
  app.use('/groceries', authMiddleware, groceriesRouter(prisma))
  app.use('/recipes', authMiddleware, recipesRouter(prisma))
  app.use('/calendar', authMiddleware, calendarRouter(prisma))

  app.post('/generate-list', authMiddleware, async (req: any, res) => {
    // payload: { itemIds: number[] } or { lowStockOnly: true }
    const { itemIds, lowStockOnly } = req.body
    if (Array.isArray(itemIds)) {
      const items = await prisma.groceryItem.findMany({ where: { id: { in: itemIds }, userId: req.userId } })
      return res.json({ items })
    }
    if (lowStockOnly) {
      // simple heuristic: quantity <= 1 means low
      const items = await prisma.groceryItem.findMany({ where: { quantity: { lte: 1 }, userId: req.userId } })
      return res.json({ items })
    }
    return res.status(400).json({ error: 'invalid payload' })
  })

  return app
}

// Only start server if this is the main module
if (require.main === module) {
  const prisma = new PrismaClient()
  const app = createApp(prisma)
  const port = process.env.PORT ? Number(process.env.PORT) : 4000

  app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`)
  })
}
