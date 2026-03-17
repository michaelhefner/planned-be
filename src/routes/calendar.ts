import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { AuthRequest } from '../middleware/auth'

export default function (prisma: PrismaClient) {
  const router = Router()

  router.get('/', async (req: AuthRequest, res) => {
    const entries = await prisma.calendarEntry.findMany({ where: { userId: req.userId }, include: { recipe: true }, orderBy: { date: 'asc' } })
    res.json(entries)
  })

  router.post('/', async (req: AuthRequest, res) => {
    const { date, recipeId, notes } = req.body
    if (!date || !recipeId) return res.status(400).json({ error: 'date and recipeId required' })
    // Parse date string - handle both YYYY-MM-DD and ISO formats
    let localDate: Date
    if (date.includes('T')) {
      // ISO format (e.g., 2026-03-20T19:00:00Z) - extract date part and parse as local
      const dateOnly = date.split('T')[0]
      const [year, month, day] = dateOnly.split('-').map(Number)
      localDate = new Date(year, month - 1, day)
    } else {
      // YYYY-MM-DD format - parse as local date
      const [year, month, day] = date.split('-').map(Number)
      localDate = new Date(year, month - 1, day)
    }
    const entry = await prisma.calendarEntry.create({ data: { date: localDate, recipeId: Number(recipeId), userId: req.userId!, notes }, include: { recipe: true } })
    res.json(entry)
  })

  router.put('/:id', async (req: AuthRequest, res) => {
    const id = Number(req.params.id)
    const data: any = {}
    if (req.body.date) {
      // Parse date string - handle both YYYY-MM-DD and ISO formats
      let localDate: Date
      if (req.body.date.includes('T')) {
        // ISO format (e.g., 2026-03-20T19:00:00Z) - extract date part and parse as local
        const dateOnly = req.body.date.split('T')[0]
        const [year, month, day] = dateOnly.split('-').map(Number)
        localDate = new Date(year, month - 1, day)
      } else {
        // YYYY-MM-DD format - parse as local date
        const [year, month, day] = req.body.date.split('-').map(Number)
        localDate = new Date(year, month - 1, day)
      }
      data.date = localDate
    }
    if (req.body.recipeId) data.recipeId = Number(req.body.recipeId)
    if (req.body.notes !== undefined) data.notes = req.body.notes
    try {
      // Check ownership
      const entry = await prisma.calendarEntry.findUnique({ where: { id } })
      if (!entry || entry.userId !== req.userId) {
        return res.status(403).json({ error: 'Forbidden' })
      }
      const updated = await prisma.calendarEntry.update({ where: { id }, data, include: { recipe: true } })
      res.json(updated)
    } catch (e) {
      res.status(404).json({ error: 'not found' })
    }
  })

  router.delete('/:id', async (req: AuthRequest, res) => {
    const id = Number(req.params.id)
    try {
      // Check ownership
      const entry = await prisma.calendarEntry.findUnique({ where: { id } })
      if (!entry || entry.userId !== req.userId) {
        return res.status(403).json({ error: 'Forbidden' })
      }
      await prisma.calendarEntry.delete({ where: { id } })
      res.json({ ok: true })
    } catch (e) {
      res.status(404).json({ error: 'not found' })
    }
  })

  return router
}
