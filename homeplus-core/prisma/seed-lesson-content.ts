// ============================================
// Seed Lesson Content — "What Is an Ecosystem?"
// ============================================
// Populates lesson blocks, quiz questions, and
// metadata for the demo ecosystem lesson.
// Run: npx tsx prisma/seed-lesson-content.ts

import { config } from 'dotenv';
config({ path: '.env.local' });

import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const adapter = new PrismaPg(pool as any);
const prisma = new PrismaClient({ adapter });

const LESSON_ID = 'g7-sci-ua-l1'; // "What Is an Ecosystem?"

async function main() {
  console.log('🌱 Seeding lesson content for "What Is an Ecosystem?"...\n');

  // ─── 1. Update lesson metadata ───
  await prisma.lesson.update({
    where: { id: LESSON_ID },
    data: {
      subjectMode: 'SCIENCE',
      estimatedMinutes: 35,
      learningGoal: 'Identify the living and non-living components of an ecosystem and explain how they interact.',
      successCriteria: 'I can name examples of biotic and abiotic factors and describe at least one way they depend on each other.',
      materials: 'Science notebook, coloured pencils',
      reflectionPrompt: 'Return to your warm-up prediction about the pond ecosystem. Now that you know about biotic and abiotic factors, revise your prediction using the correct vocabulary.',
      warmUpConfig: {
        type: 'prediction',
        prompt: 'Look at the image below. What do you think would happen to this pond ecosystem if all the sunlight was blocked for a month?',
        options: [
          { label: 'Nothing would change', value: 'a', correct: false },
          { label: 'Plants would die first, then animals', value: 'b', correct: true },
          { label: 'Only fish would be affected', value: 'c', correct: false },
          { label: 'The water would freeze', value: 'd', correct: false },
        ],
      },
      masteryConfig: {
        passPercent: 80,
        maxRetries: 5,
        reteachEnabled: true,
        immediateCorrectiveFeedback: false,
      },
    },
  });
  console.log('✅ Lesson metadata updated');

  // ─── 2. Clear existing blocks and questions ───
  await prisma.lessonBlock.deleteMany({ where: { lessonId: LESSON_ID } });
  await prisma.quizQuestion.deleteMany({ where: { lessonId: LESSON_ID } });
  console.log('✅ Cleared existing blocks and questions');

  // ─── 3. LEARN Section Blocks ───
  const learnBlocks = [
    {
      id: 'eco-learn-1',
      section: 'LEARN' as const,
      blockType: 'TEXT' as const,
      order: 1,
      content: {
        html: `
          <h2>🌍 What Is an Ecosystem?</h2>
          <p>An <strong>ecosystem</strong> is a community of living things (organisms) interacting with each other <em>and</em> their non-living environment. Ecosystems can be as large as a tropical rainforest or as small as a puddle.</p>
          <p>Every ecosystem has two main types of components:</p>
          <ul>
            <li><strong>Biotic factors</strong> — all the <em>living</em> things: plants, animals, fungi, bacteria</li>
            <li><strong>Abiotic factors</strong> — all the <em>non-living</em> things: sunlight, water, temperature, soil, air</li>
          </ul>
          <p>These components don't exist in isolation — they constantly interact. Plants need sunlight and water (abiotic) to grow, and animals (biotic) depend on plants for food and oxygen.</p>
        `,
      },
    },
    {
      id: 'eco-learn-2',
      section: 'LEARN' as const,
      blockType: 'VOCABULARY' as const,
      order: 2,
      content: {
        terms: [
          { term: 'Ecosystem', definition: 'A community of living organisms interacting with their non-living environment.', example: 'A pond with fish, frogs, algae, water, rocks, and sunlight.' },
          { term: 'Biotic', definition: 'Relating to living things in an ecosystem.', example: 'Trees, insects, mushrooms, bacteria.' },
          { term: 'Abiotic', definition: 'Relating to non-living things in an ecosystem.', example: 'Water, sunlight, temperature, minerals in soil.' },
          { term: 'Habitat', definition: 'The natural home or environment of an organism.', example: 'A beaver\u0027s habitat includes rivers and forests.' },
          { term: 'Community', definition: 'All the different species living together in one area.', example: 'All the fish, plants, insects, and birds living in a wetland.' },
        ],
      },
    },
    {
      id: 'eco-learn-3',
      section: 'LEARN' as const,
      blockType: 'VIDEO' as const,
      order: 3,
      content: {
        url: 'https://www.youtube.com/embed/6v5VPpg-kMU',
        title: 'Ecosystems for Kids — Science Video',
        transcript: 'This video introduces the concept of ecosystems, explaining biotic and abiotic factors with real-world examples from forests, oceans, and deserts.',
      },
    },
    {
      id: 'eco-learn-4',
      section: 'LEARN' as const,
      blockType: 'TEXT' as const,
      order: 4,
      content: {
        html: `
          <h3>🔗 How Biotic and Abiotic Factors Interact</h3>
          <p>In every ecosystem, living and non-living things are connected. Here are some key interactions:</p>
          <table style="width:100%; border-collapse:collapse; margin:1rem 0;">
            <thead>
              <tr style="background:#e0f2fe;">
                <th style="padding:8px; text-align:left; border:1px solid #cbd5e1;">Abiotic Factor</th>
                <th style="padding:8px; text-align:left; border:1px solid #cbd5e1;">How It Affects Living Things</th>
              </tr>
            </thead>
            <tbody>
              <tr><td style="padding:8px; border:1px solid #cbd5e1;">☀️ Sunlight</td><td style="padding:8px; border:1px solid #cbd5e1;">Plants use it for photosynthesis; animals rely on plants for food</td></tr>
              <tr><td style="padding:8px; border:1px solid #cbd5e1;">💧 Water</td><td style="padding:8px; border:1px solid #cbd5e1;">All organisms need water to survive; aquatic ecosystems depend on water quality</td></tr>
              <tr><td style="padding:8px; border:1px solid #cbd5e1;">🌡️ Temperature</td><td style="padding:8px; border:1px solid #cbd5e1;">Affects migration, hibernation, and which species can survive</td></tr>
              <tr><td style="padding:8px; border:1px solid #cbd5e1;">🪨 Soil</td><td style="padding:8px; border:1px solid #cbd5e1;">Provides nutrients for plants; home for insects and decomposers</td></tr>
            </tbody>
          </table>
          <p><strong>Key idea:</strong> If you remove or change one factor, it creates a <em>ripple effect</em> throughout the entire ecosystem.</p>
        `,
      },
    },
  ];

  // ─── 3b. LEARN Micro-Check ───
  const learnMicroCheck = [
    {
      id: 'eco-learn-mc1',
      section: 'LEARN' as const,
      blockType: 'MICRO_CHECK' as const,
      order: 5,
      content: {
        question: 'A student visits a lake and sees fish, lily pads, rocks, and warm sunshine. Which TWO items are abiotic factors?',
        options: [
          { label: 'Fish and lily pads', value: 'a' },
          { label: 'Rocks and sunshine', value: 'b', correct: true },
          { label: 'Lily pads and rocks', value: 'c' },
          { label: 'Fish and sunshine', value: 'd' },
        ],
        explanation: 'Rocks and sunshine are non-living (abiotic). Fish and lily pads are living (biotic). Remember: biotic = alive, abiotic = never alive.',
      },
    },
    {
      id: 'eco-learn-bridge',
      section: 'LEARN' as const,
      blockType: 'TEXT' as const,
      order: 6,
      content: {
        html: `
          <h3>👀 Looking Ahead</h3>
          <p>Now you know <em>what</em> makes up an ecosystem — biotic and abiotic factors that interact.</p>
          <p>But here's a bigger question: <strong>How does energy move through an ecosystem?</strong> Where does the energy that keeps animals alive actually come from?</p>
          <p>In the next lesson, you'll trace the path of energy from the sun all the way through food chains — and discover why every ecosystem needs <em>producers</em>, <em>consumers</em>, and <em>decomposers</em>.</p>
        `,
      },
    },
  ];

  // ─── 4. PRACTICE Section Blocks ───
  const practiceBlocks = [
    {
      id: 'eco-practice-1',
      section: 'PRACTICE' as const,
      blockType: 'MATCHING' as const,
      order: 1,
      content: {
        instruction: 'Match each factor to whether it is BIOTIC or ABIOTIC:',
        pairs: [
          { left: 'Mushroom', right: 'Biotic' },
          { left: 'Sunlight', right: 'Abiotic' },
          { left: 'Bacteria', right: 'Biotic' },
          { left: 'Temperature', right: 'Abiotic' },
          { left: 'Oak tree', right: 'Biotic' },
          { left: 'Rocks', right: 'Abiotic' },
        ],
      },
    },
    {
      id: 'eco-practice-2',
      section: 'PRACTICE' as const,
      blockType: 'MULTIPLE_CHOICE' as const,
      order: 2,
      content: {
        question: 'A forest fire destroys most of the trees in a forest ecosystem. Which of the following is the most likely FIRST effect?',
        options: [
          { label: 'The soil becomes richer', value: 'a', correct: false },
          { label: 'Animals that depend on trees lose their habitat and food', value: 'b', correct: true },
          { label: 'New species immediately appear', value: 'c', correct: false },
          { label: 'The temperature of the area decreases', value: 'd', correct: false },
        ],
        explanation: 'When trees are destroyed, the animals that depend on them for food and shelter are affected first. This is an example of how biotic and abiotic factors are interconnected.',
      },
    },
    {
      id: 'eco-practice-3',
      section: 'PRACTICE' as const,
      blockType: 'FILL_IN_BLANK' as const,
      order: 3,
      content: {
        prompt: 'Complete the sentences about ecosystems:',
        blanks: [
          { id: 'b1', correctAnswer: 'biotic', hint: 'Living things in an ecosystem are called _____ factors.' },
          { id: 'b2', correctAnswer: 'abiotic', hint: 'Non-living things like water and sunlight are called _____ factors.' },
          { id: 'b3', correctAnswer: 'ecosystem', hint: 'A community of living things interacting with their environment is called an _____.' },
        ],
      },
    },
  ];

  // ─── 5. REFLECT Section Blocks ───
  const reflectBlocks = [
    {
      id: 'eco-reflect-1',
      section: 'REFLECT' as const,
      blockType: 'CONSTRUCTED_RESPONSE' as const,
      order: 1,
      content: {
        prompt: 'Return to your warm-up prediction about the pond ecosystem with no sunlight.\n\n1. Was your original prediction correct? What would you change about it now?\n2. Using the abiotic-biotic interaction table from this lesson, explain the SPECIFIC chain of effects that losing sunlight would cause. Name at least 2 abiotic factors and 2 biotic factors from the table.\n3. Why is the "ripple effect" idea important for understanding how ecosystems work?\n\nUse at least 3 vocabulary terms from this lesson (ecosystem, biotic, abiotic, habitat, community).',
        minLength: 60,
        rubricHint: 'References their warm-up prediction and whether it was correct. Uses the specific abiotic-biotic interaction table from the lesson. Names specific factors. Uses vocabulary accurately. Explains ripple effect with concrete examples from the lesson.',
      },
    },
  ];

  // ─── 6. Insert all blocks ───
  const allBlocks = [...learnBlocks, ...learnMicroCheck, ...practiceBlocks, ...reflectBlocks];
  for (const block of allBlocks) {
    await prisma.lessonBlock.create({
      data: {
        id: block.id,
        lessonId: LESSON_ID,
        section: block.section,
        blockType: block.blockType,
        content: block.content,
        order: block.order,
      },
    });
  }
  console.log(`✅ Created ${allBlocks.length} lesson blocks`);

  // ─── 7. Quiz Questions for Mastery Check ───
  const questions = [
    {
      id: 'eco-q1',
      questionText: 'Which of the following is an example of a BIOTIC factor?',
      questionType: 'MULTIPLE_CHOICE' as const,
      options: [
        { label: 'Water', value: 'a' },
        { label: 'Sunlight', value: 'b' },
        { label: 'Mushroom', value: 'c', correct: true },
        { label: 'Temperature', value: 'd' },
      ],
      correctAnswer: 'c',
      explanation: 'A mushroom is a living organism (fungus), making it a biotic factor. Water, sunlight, and temperature are abiotic.',
      outcomeCode: 'SCI.7.A.1',
      difficulty: 1,
    },
    {
      id: 'eco-q2',
      questionText: 'What is the main difference between biotic and abiotic factors?',
      questionType: 'MULTIPLE_CHOICE' as const,
      options: [
        { label: 'Biotic factors are large; abiotic factors are small', value: 'a' },
        { label: 'Biotic factors are living; abiotic factors are non-living', value: 'b', correct: true },
        { label: 'Biotic factors are found in water; abiotic on land', value: 'c' },
        { label: 'There is no difference', value: 'd' },
      ],
      correctAnswer: 'b',
      explanation: 'Biotic means living (plants, animals, fungi). Abiotic means non-living (water, air, sunlight, rocks).',
      outcomeCode: 'SCI.7.A.1',
      difficulty: 1,
    },
    {
      id: 'eco-q3',
      questionText: 'A pond contains fish, algae, water, sunlight, mud, and insects. How many ABIOTIC factors are listed?',
      questionType: 'MULTIPLE_CHOICE' as const,
      options: [
        { label: '2', value: 'a' },
        { label: '3', value: 'b', correct: true },
        { label: '4', value: 'c' },
        { label: '5', value: 'd' },
      ],
      correctAnswer: 'b',
      explanation: 'The 3 abiotic (non-living) factors are: water, sunlight, and mud. Fish, algae, and insects are biotic (living).',
      outcomeCode: 'SCI.7.A.1',
      difficulty: 2,
    },
    {
      id: 'eco-q4',
      questionText: 'If all the sunlight in a forest ecosystem was blocked, what would happen FIRST?',
      questionType: 'MULTIPLE_CHOICE' as const,
      options: [
        { label: 'Animals would immediately die', value: 'a' },
        { label: 'Plants would stop photosynthesizing and begin to die', value: 'b', correct: true },
        { label: 'The soil would become richer', value: 'c' },
        { label: 'Nothing would change', value: 'd' },
      ],
      correctAnswer: 'b',
      explanation: 'Plants depend directly on sunlight for photosynthesis. Without it, plants die first, which then affects the animals that depend on them for food.',
      outcomeCode: 'SCI.7.A.1',
      difficulty: 2,
    },
    {
      id: 'eco-q5',
      questionText: 'Which statement BEST describes an ecosystem?',
      questionType: 'MULTIPLE_CHOICE' as const,
      options: [
        { label: 'A group of the same species living together', value: 'a' },
        { label: 'All the non-living things in an area', value: 'b' },
        { label: 'A community of organisms interacting with each other and their non-living environment', value: 'c', correct: true },
        { label: 'Any place where animals live', value: 'd' },
      ],
      correctAnswer: 'c',
      explanation: 'An ecosystem includes BOTH the community of living organisms AND the non-living environment they interact with.',
      outcomeCode: 'SCI.7.A.1',
      difficulty: 1,
    },
    {
      id: 'eco-q6',
      questionText: 'A student finds moss growing on rocks near a stream, with dragonflies flying above. Which of these is an ABIOTIC factor?',
      questionType: 'MULTIPLE_CHOICE' as const,
      options: [
        { label: 'Moss', value: 'a' },
        { label: 'Dragonflies', value: 'b' },
        { label: 'Rocks', value: 'c', correct: true },
        { label: 'Bacteria in the soil', value: 'd' },
      ],
      correctAnswer: 'c',
      explanation: 'Rocks are non-living (abiotic). Moss, dragonflies, and bacteria are all living organisms (biotic).',
      outcomeCode: 'SCI.7.A.1',
      difficulty: 1,
    },
    {
      id: 'eco-q7',
      questionText: 'Which statement about habitats is TRUE?',
      questionType: 'MULTIPLE_CHOICE' as const,
      options: [
        { label: 'A habitat is the same thing as an ecosystem', value: 'a' },
        { label: 'A habitat is the natural home of an organism, while an ecosystem includes all organisms AND their environment', value: 'b', correct: true },
        { label: 'A habitat only includes abiotic factors', value: 'c' },
        { label: 'Every organism lives in the same habitat', value: 'd' },
      ],
      correctAnswer: 'b',
      explanation: 'A habitat is one organism\'s home (e.g. a beaver lives in rivers). An ecosystem is bigger — it includes all organisms and their non-living environment interacting together.',
      outcomeCode: 'SCI.7.A.1',
      difficulty: 2,
    },
    {
      id: 'eco-q8',
      questionText: 'A drought removes most of the water from a pond ecosystem. Which of the following BEST describes what would happen?',
      questionType: 'MULTIPLE_CHOICE' as const,
      options: [
        { label: 'Only the fish would be affected', value: 'a' },
        { label: 'The entire ecosystem would be affected because all organisms depend on water', value: 'b', correct: true },
        { label: 'Nothing would change because water is not biotic', value: 'c' },
        { label: 'Only the plants would be affected', value: 'd' },
      ],
      correctAnswer: 'b',
      explanation: 'Water is an abiotic factor that ALL organisms need. Removing it creates a ripple effect — fish die, plants wilt, and the entire ecosystem collapses.',
      outcomeCode: 'SCI.7.A.1',
      difficulty: 2,
    },
    {
      id: 'eco-q9',
      questionText: 'What is the difference between a COMMUNITY and an ECOSYSTEM?',
      questionType: 'MULTIPLE_CHOICE' as const,
      options: [
        { label: 'A community includes abiotic factors; an ecosystem does not', value: 'a' },
        { label: 'A community is all the living species in an area; an ecosystem includes both living and non-living components', value: 'b', correct: true },
        { label: 'They are the same thing', value: 'c' },
        { label: 'A community is larger than an ecosystem', value: 'd' },
      ],
      correctAnswer: 'b',
      explanation: 'A community = all the different species living together. An ecosystem = the community PLUS the abiotic factors (water, sunlight, soil, etc.) they interact with.',
      outcomeCode: 'SCI.7.A.1',
      difficulty: 2,
    },
    {
      id: 'eco-q10',
      questionText: 'A new housing development removes all the trees from a forest. Which BIOTIC factor is DIRECTLY lost?',
      questionType: 'MULTIPLE_CHOICE' as const,
      options: [
        { label: 'Sunlight', value: 'a' },
        { label: 'Trees and the organisms that depend on them', value: 'b', correct: true },
        { label: 'Water in the soil', value: 'c' },
        { label: 'Temperature', value: 'd' },
      ],
      correctAnswer: 'b',
      explanation: 'Trees are biotic factors. Removing them directly removes a key living component and also affects the animals, insects, and fungi that depend on trees for shelter and food.',
      outcomeCode: 'SCI.7.A.1',
      difficulty: 1,
    },
  ];

  for (const q of questions) {
    await prisma.quizQuestion.create({
      data: {
        id: q.id,
        lessonId: LESSON_ID,
        questionText: q.questionText,
        questionType: q.questionType,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        outcomeCode: q.outcomeCode,
        difficulty: q.difficulty,
      },
    });
  }
  console.log(`✅ Created ${questions.length} quiz questions`);

  console.log('\n🎉 Lesson content seeded successfully!');
  console.log('   Sections: LEARN (4 blocks), PRACTICE (3 blocks), REFLECT (1 block)');
  console.log('   Quiz: 5 mastery check questions');
  console.log('   Warm-up: prediction question configured');
  console.log('\n   Navigate to the lesson via Student Dashboard → Science → Unit A → Lesson 1');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    pool.end();
  });
