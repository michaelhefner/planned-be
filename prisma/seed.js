"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    // Create a test user
    const hashedPassword = await bcryptjs_1.default.hash('password123', 10);
    const user = await prisma.user.create({
        data: {
            email: 'test@example.com',
            password: hashedPassword
        }
    });
    await prisma.groceryItem.createMany({
        data: [
            { name: 'Eggs', quantity: 12, unit: 'pcs', userId: user.id },
            { name: 'Milk', quantity: 1, unit: 'L', userId: user.id },
            { name: 'Flour', quantity: 0.5, unit: 'kg', userId: user.id }
        ]
    });
    const pancakes = await prisma.recipe.create({
        data: {
            name: 'Pancakes',
            description: 'Simple pancakes',
            servings: 4,
            userId: user.id,
            ingredients: {
                create: [
                    { groceryItemId: 1, amount: 2, unit: 'pcs' },
                    { groceryItemId: 2, amount: 0.5, unit: 'L' }
                ]
            }
        }
    });
    await prisma.calendarEntry.create({
        data: {
            date: new Date(),
            recipeId: pancakes.id,
            userId: user.id,
            notes: 'Breakfast'
        }
    });
}
main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
