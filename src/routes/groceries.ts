import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { AuthRequest } from '../middleware/auth'

export default function (prisma: PrismaClient) {
  const router = Router()

  router.get('/', async (req: AuthRequest, res) => {
    const items = await prisma.groceryItem.findMany({ where: { userId: req.userId } })
    res.json(items)
  })

  router.post('/', async (req: AuthRequest, res) => {
    const { name, quantity = 0, unit } = req.body
    if (!name) return res.status(400).json({ error: 'name is required' })
    const item = await prisma.groceryItem.create({ data: { name, quantity: Number(quantity), unit, userId: req.userId! } })
    res.json(item)
  })

  router.put('/:id', async (req: AuthRequest, res) => {
    const id = Number(req.params.id)
    const data: any = {}
    if (req.body.name) data.name = req.body.name
    if (req.body.quantity !== undefined) data.quantity = Number(req.body.quantity)
    if (req.body.unit !== undefined) data.unit = req.body.unit
    if (req.body.inStock !== undefined) data.inStock = Boolean(req.body.inStock)
    try {
      // Check ownership
      const item = await prisma.groceryItem.findUnique({ where: { id } })
      if (!item || item.userId !== req.userId) {
        return res.status(403).json({ error: 'Forbidden' })
      }
      const updated = await prisma.groceryItem.update({ where: { id }, data })
      res.json(updated)
    } catch (e) {
      res.status(404).json({ error: 'not found' })
    }
  })

  router.delete('/:id', async (req: AuthRequest, res) => {
    const id = Number(req.params.id)
    try {
      // Check ownership
      const item = await prisma.groceryItem.findUnique({ where: { id } })
      if (!item || item.userId !== req.userId) {
        return res.status(403).json({ error: 'Forbidden' })
      }
      await prisma.groceryItem.delete({ where: { id } })
      res.json({ ok: true })
    } catch (e) {
      res.status(404).json({ error: 'not found' })
    }
  })

  return router
}
