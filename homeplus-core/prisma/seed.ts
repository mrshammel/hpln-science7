import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
});

async function main() {
  console.log('🌱 Seeding database...\n');

  // ─── Subject ───
  const science = await prisma.subject.upsert({
    where: { id: 'g7-science' },
    update: {},
    create: {
      id: 'g7-science',
      gradeLevel: 7,
      name: 'Science',
      icon: '🔬',
      order: 1,
      active: true,
    },
  });
  console.log(`✅ Subject: ${science.name} (Grade ${science.gradeLevel})`);

  // ─── Unit ───
  const unitA = await prisma.unit.upsert({
    where: { id: 'g7-sci-unit-a' },
    update: {},
    create: {
      id: 'g7-sci-unit-a',
      subjectId: science.id,
      title: 'Interactions & Ecosystems',
      description: 'Explore how living things interact with each other and their environment.',
      icon: '🌿',
      order: 1,
    },
  });
  console.log(`✅ Unit: ${unitA.title}`);

  // ─── Lessons ───
  const lesson1 = await prisma.lesson.upsert({
    where: { id: 'g7-sci-ua-l1' },
    update: {},
    create: {
      id: 'g7-sci-ua-l1',
      unitId: unitA.id,
      title: 'What Is an Ecosystem?',
      subtitle: 'Understand the components of ecosystems and how they interact.',
      order: 1,
    },
  });
  console.log(`✅ Lesson 1: ${lesson1.title}`);

  const lesson2 = await prisma.lesson.upsert({
    where: { id: 'g7-sci-ua-l2' },
    update: {},
    create: {
      id: 'g7-sci-ua-l2',
      unitId: unitA.id,
      title: 'Producers, Consumers, and Decomposers',
      subtitle: 'Learn about the roles organisms play in food chains and food webs.',
      order: 2,
    },
  });
  console.log(`✅ Lesson 2: ${lesson2.title}`);

  // ─── Activities ───
  const quiz1 = await prisma.activity.upsert({
    where: { id: 'g7-sci-ua-l1-quiz' },
    update: {},
    create: {
      id: 'g7-sci-ua-l1-quiz',
      lessonId: lesson1.id,
      type: 'QUIZ',
      title: 'Ecosystem Basics Quiz',
      points: 10,
      order: 1,
      content: {
        questions: [
          {
            question: 'What are the two main components of an ecosystem?',
            options: ['Living and non-living things', 'Water and air', 'Plants and animals', 'Sun and soil'],
            answer: 0,
          },
          {
            question: 'Which of these is an abiotic factor?',
            options: ['Tree', 'Sunlight', 'Deer', 'Bacteria'],
            answer: 1,
          },
        ],
      },
    },
  });
  console.log(`✅ Activity: ${quiz1.title} (${quiz1.type}, ${quiz1.points}pts)`);

  const assignment1 = await prisma.activity.upsert({
    where: { id: 'g7-sci-ua-l2-assign' },
    update: {},
    create: {
      id: 'g7-sci-ua-l2-assign',
      lessonId: lesson2.id,
      type: 'ASSIGNMENT',
      title: 'Food Web Drawing',
      points: 20,
      order: 1,
      content: {
        prompt: 'Draw a food web that includes at least 5 organisms. Label each as a producer, consumer, or decomposer.',
        rubric: [
          { criterion: 'Includes 5+ organisms', maxPoints: 5 },
          { criterion: 'Correctly labeled roles', maxPoints: 5 },
          { criterion: 'Arrows show energy flow', maxPoints: 5 },
          { criterion: 'Neat and clear', maxPoints: 5 },
        ],
      },
    },
  });
  console.log(`✅ Activity: ${assignment1.title} (${assignment1.type}, ${assignment1.points}pts)`);

  console.log('\n🎉 Seed complete!');
  console.log('   1 subject, 1 unit, 2 lessons, 2 activities');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
