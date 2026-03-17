import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { generateToken } from '../middleware/auth'

export default function (prisma: PrismaClient) {
  const router = Router()

  router.post('/signup', async (req, res) => {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' })
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }

    try {
      // Check if user exists
      const existing = await prisma.user.findUnique({ where: { email } })
      if (existing) {
        return res.status(400).json({ error: 'User already exists' })
      }

      // Hash password and create user
      const hashedPassword = await bcrypt.hash(password, 10)
      const user = await prisma.user.create({
        data: { email, password: hashedPassword }
      })

      const token = generateToken(user.id, user.email)
      res.json({ token, user: { id: user.id, email: user.email } })
    } catch (error) {
      res.status(500).json({ error: 'Failed to create user' })
    }
  })

  router.post('/login', async (req, res) => {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' })
    }

    try {
      const user = await prisma.user.findUnique({ where: { email } })
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' })
      }

      const passwordMatch = await bcrypt.compare(password, user.password)
      if (!passwordMatch) {
        return res.status(401).json({ error: 'Invalid credentials' })
      }

      const token = generateToken(user.id, user.email)
      res.json({ token, user: { id: user.id, email: user.email } })
    } catch (error) {
      res.status(500).json({ error: 'Failed to login' })
    }
  })

  return router
}
