// Simple seed script with Prisma 7 adapter
require('dotenv').config({ path: '.env.local' });

const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...');

  const science = await prisma.subject.upsert({
    where: { id: 'g7-science' },
    update: {},
    create: { id: 'g7-science', gradeLevel: 7, name: 'Science', icon: '🔬', order: 1, active: true },
  });
  console.log('Subject:', science.name);

  const unitA = await prisma.unit.upsert({
    where: { id: 'g7-sci-unit-a' },
    update: {},
    create: { id: 'g7-sci-unit-a', subjectId: science.id, title: 'Interactions & Ecosystems', description: 'Explore how living things interact.', icon: '🌿', order: 1 },
  });
  console.log('Unit:', unitA.title);

  const l1 = await prisma.lesson.upsert({
    where: { id: 'g7-sci-ua-l1' },
    update: {},
    create: { id: 'g7-sci-ua-l1', unitId: unitA.id, title: 'What Is an Ecosystem?', subtitle: 'Components of ecosystems.', order: 1 },
  });
  console.log('Lesson 1:', l1.title);

  const l2 = await prisma.lesson.upsert({
    where: { id: 'g7-sci-ua-l2' },
    update: {},
    create: { id: 'g7-sci-ua-l2', unitId: unitA.id, title: 'Producers, Consumers, Decomposers', subtitle: 'Roles in food chains.', order: 2 },
  });
  console.log('Lesson 2:', l2.title);

  const q1 = await prisma.activity.upsert({
    where: { id: 'g7-sci-ua-l1-quiz' },
    update: {},
    create: {
      id: 'g7-sci-ua-l1-quiz', lessonId: l1.id, type: 'QUIZ', title: 'Ecosystem Basics Quiz', points: 10, order: 1,
      content: { questions: [{ question: 'What are the two main components?', options: ['Living and non-living things', 'Water and air'], answer: 0 }] },
    },
  });
  console.log('Activity:', q1.title);

  const a1 = await prisma.activity.upsert({
    where: { id: 'g7-sci-ua-l2-assign' },
    update: {},
    create: {
      id: 'g7-sci-ua-l2-assign', lessonId: l2.id, type: 'ASSIGNMENT', title: 'Food Web Drawing', points: 20, order: 1,
      content: { prompt: 'Draw a food web with 5+ organisms.' },
    },
  });
  console.log('Activity:', a1.title);

  console.log('\nSeed complete! 1 subject, 1 unit, 2 lessons, 2 activities');
}

main().catch(e => { console.error('Seed failed:', e.message); process.exit(1); }).finally(() => { pool.end(); prisma.$disconnect(); });
