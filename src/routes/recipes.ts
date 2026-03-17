import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { AuthRequest } from '../middleware/auth'

export default function (prisma: PrismaClient) {
  const router = Router()

  // Get all recipes with ingredients
  router.get('/', async (req: AuthRequest, res) => {
    const recipes = await prisma.recipe.findMany({ where: { userId: req.userId }, include: { ingredients: { include: { groceryItem: true } } } })
    res.json(recipes)
  })

  // Get single recipe with ingredients
  router.get('/:id', async (req: AuthRequest, res) => {
    const recipe = await prisma.recipe.findUnique({
      where: { id: Number(req.params.id) },
      include: { ingredients: { include: { groceryItem: true } } }
    })
    if (!recipe) return res.status(404).json({ error: 'recipe not found' })
    if (recipe.userId !== req.userId) return res.status(403).json({ error: 'Forbidden' })
    res.json(recipe)
  })

  // Create recipe with optional ingredients
  router.post('/', async (req: AuthRequest, res) => {
    const { name, description, servings, ingredients } = req.body
    // ingredients: [{ groceryItemId, amount, unit }]
    if (!name) return res.status(400).json({ error: 'name required' })
    const recipe = await prisma.recipe.create({
      data: {
        name,
        description,
        servings: servings ? Number(servings) : undefined,
        userId: req.userId!,
        ingredients: ingredients && ingredients.length ? { create: ingredients.map((ing: any) => ({ groceryItemId: Number(ing.groceryItemId), amount: Number(ing.amount), unit: ing.unit })) } : undefined
      },
      include: { ingredients: { include: { groceryItem: true } } }
    })
    res.json(recipe)
  })

  // Add ingredient to recipe
  router.post('/:id/ingredients', async (req: AuthRequest, res) => {
    const { groceryItemId, amount, unit } = req.body
    if (!groceryItemId || amount === undefined) {
      return res.status(400).json({ error: 'groceryItemId and amount required' })
    }
    try {
      // Check recipe ownership
      const recipe = await prisma.recipe.findUnique({ where: { id: Number(req.params.id) } })
      if (!recipe || recipe.userId !== req.userId) {
        return res.status(403).json({ error: 'Forbidden' })
      }
      const recipeIngredient = await prisma.recipeIngredient.create({
        data: {
          recipeId: Number(req.params.id),
          groceryItemId: Number(groceryItemId),
          amount: Number(amount),
          unit: unit || undefined
        },
        include: { groceryItem: true }
      })
      res.json(recipeIngredient)
    } catch (error: any) {
      res.status(400).json({ error: error.message })
    }
  })

  // Delete ingredient from recipe
  router.delete('/:recipeId/ingredients/:ingredientId', async (req: AuthRequest, res) => {
    try {
      // Check recipe ownership
      const recipe = await prisma.recipe.findUnique({ where: { id: Number(req.params.recipeId) } })
      if (!recipe || recipe.userId !== req.userId) {
        return res.status(403).json({ error: 'Forbidden' })
      }
      await prisma.recipeIngredient.delete({
        where: { id: Number(req.params.ingredientId) }
      })
      res.json({ ok: true })
    } catch (error: any) {
      res.status(400).json({ error: error.message })
    }
  })

  return router
}
