// ============================================
// Seed Unit A Content — Interactions & Ecosystems
// ============================================
// Populates full lesson blocks, quiz questions, and
// metadata for Lessons 2, 3, and 4 in Unit A.
// Lesson 1 content is already handled by seed-lesson-content.ts.
//
// Run: npx tsx prisma/seed-unit-a-content.ts

import { config } from 'dotenv';
config({ path: '.env.local' });

import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const adapter = new PrismaPg(pool as any);
const prisma = new PrismaClient({ adapter });

// ╔═══════════════════════════════════════════════════════════╗
// ║  LESSON 2: Producers, Consumers, & Decomposers           ║
// ╚═══════════════════════════════════════════════════════════╝

async function seedLesson2() {
  const LESSON_ID = 'g7-sci-ua-l2';
  console.log('\n📗 Seeding Lesson 2: Producers, Consumers, & Decomposers...');

  // 1. Update lesson metadata
  await prisma.lesson.update({
    where: { id: LESSON_ID },
    data: {
      subjectMode: 'SCIENCE',
      estimatedMinutes: 40,
      learningGoal: 'Classify organisms as producers, consumers, or decomposers and trace the flow of energy through food chains.',
      successCriteria: 'I can sort organisms by their role and build a food chain that shows how energy moves from one organism to another.',
      materials: 'Science notebook, coloured pencils, cut-out organism cards (optional)',
      reflectionPrompt: 'Think about a meal you ate today. Can you trace the energy in that meal all the way back to the sun?',
      warmUpConfig: {
        type: 'retrieval',
        prompt: 'From last lesson: What is the difference between a biotic factor and an abiotic factor? Give one example of each.',
        options: [
          { label: 'Biotic = living (e.g. tree); Abiotic = non-living (e.g. sunlight)', value: 'a', correct: true },
          { label: 'Biotic = large; Abiotic = small', value: 'b', correct: false },
          { label: 'Biotic = found in water; Abiotic = found on land', value: 'c', correct: false },
          { label: 'They mean the same thing', value: 'd', correct: false },
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

  // 2. Clear existing blocks and questions
  await prisma.lessonBlock.deleteMany({ where: { lessonId: LESSON_ID } });
  await prisma.quizQuestion.deleteMany({ where: { lessonId: LESSON_ID } });

  // 3. LEARN blocks — chunked content segments
  const learnBlocks = [
    {
      id: 'l2-learn-1',
      section: 'LEARN' as const,
      blockType: 'TEXT' as const,
      order: 1,
      content: {
        html: `
          <h2>🌱 Where Does Energy Come From?</h2>
          <p>All life needs <strong>energy</strong> to survive. But where does that energy actually come from?</p>
          <p>The answer: <strong>the sun</strong>. Almost all energy in an ecosystem starts with sunlight. But animals can't use sunlight directly — they need organisms that can convert it into food.</p>
          <p>Scientists group organisms by <em>how they get their energy</em>. There are three main roles:</p>
          <ol>
            <li><strong>Producers</strong> — make their own food</li>
            <li><strong>Consumers</strong> — eat other organisms</li>
            <li><strong>Decomposers</strong> — break down dead material</li>
          </ol>
          <p>Let's look at each role in detail.</p>
        `,
      },
    },
    {
      id: 'l2-learn-2',
      section: 'LEARN' as const,
      blockType: 'TEXT' as const,
      order: 2,
      content: {
        html: `
          <h3>🌿 Producers</h3>
          <p><strong>Producers</strong> are organisms that make their own food using energy from the sun through a process called <strong>photosynthesis</strong>. They are the foundation of every food chain.</p>
          <p><strong>Examples:</strong> grasses, trees, algae, phytoplankton, moss</p>
          <p>Without producers, no other organisms could survive — they are the starting point for all energy in an ecosystem.</p>
        `,
      },
    },
    {
      id: 'l2-learn-2b',
      section: 'LEARN' as const,
      blockType: 'TEXT' as const,
      order: 3,
      content: {
        html: `
          <h3>🦌 Consumers</h3>
          <p><strong>Consumers</strong> cannot make their own food. They must eat other organisms to get energy.</p>
          <p>Consumers are classified by <em>what</em> they eat:</p>
          <ul>
            <li><strong>Primary consumers (herbivores)</strong> — eat producers (e.g. deer eating grass, a rabbit eating clover)</li>
            <li><strong>Secondary consumers</strong> — eat primary consumers (e.g. a fox eating a rabbit)</li>
            <li><strong>Tertiary consumers</strong> — eat secondary consumers (e.g. a hawk eating a fox)</li>
            <li><strong>Omnivores</strong> — eat both plants and animals (e.g. bears, humans)</li>
          </ul>
        `,
      },
    },
    {
      id: 'l2-learn-2c',
      section: 'LEARN' as const,
      blockType: 'TEXT' as const,
      order: 4,
      content: {
        html: `
          <h3>🍂 Decomposers</h3>
          <p><strong>Decomposers</strong> break down dead organisms and waste, returning nutrients to the soil. Without them, dead material would pile up and nutrients would never be recycled.</p>
          <p><strong>Examples:</strong> mushrooms, bacteria, earthworms, mold</p>
          <p><strong>Key idea:</strong> Decomposers complete the cycle — they connect death back to new life by making nutrients available for producers to use again.</p>
        `,
      },
    },
    {
      id: 'l2-learn-3',
      section: 'LEARN' as const,
      blockType: 'VOCABULARY' as const,
      order: 5,
      content: {
        terms: [
          { term: 'Producer', definition: 'An organism that makes its own food from sunlight (photosynthesis).', example: 'Grass, oak trees, algae in a pond.' },
          { term: 'Consumer', definition: 'An organism that gets energy by eating other organisms.', example: 'A deer (primary), a wolf (secondary).' },
          { term: 'Decomposer', definition: 'An organism that breaks down dead material, recycling nutrients.', example: 'Mushrooms growing on a fallen log.' },
          { term: 'Herbivore', definition: 'An animal that eats only plants (a primary consumer).', example: 'Rabbits, grasshoppers, caterpillars.' },
          { term: 'Food chain', definition: 'A diagram that shows how energy flows from one organism to another.', example: 'Sun → Grass → Rabbit → Fox → Hawk.' },
          { term: 'Photosynthesis', definition: 'The process plants use to convert sunlight, water, and CO₂ into food (glucose) and oxygen.', example: 'A leaf absorbing sunlight to produce sugar.' },
        ],
      },
    },
    {
      id: 'l2-learn-4',
      section: 'LEARN' as const,
      blockType: 'VIDEO' as const,
      order: 6,
      content: {
        url: 'https://www.youtube.com/embed/MuKs9o1s8h8',
        title: 'Food Chains & Food Webs — Crash Course Kids',
        transcript: 'This video explains how energy flows through food chains and food webs, using examples from grassland and ocean ecosystems. It covers producers, primary consumers, secondary consumers, and decomposers.',
      },
    },
    {
      id: 'l2-learn-5',
      section: 'LEARN' as const,
      blockType: 'TEXT' as const,
      order: 7,
      content: {
        html: `
          <h3>⛓️ Food Chains: Tracing Energy Flow</h3>
          <p>A <strong>food chain</strong> shows the path of energy from one organism to the next. Energy always flows in one direction — from producers to consumers.</p>
          <p>Here's an example from a grassland ecosystem:</p>
          <div style="background:#f0fdf4; padding:16px; border-radius:12px; text-align:center; font-size:1.1rem; margin:12px 0;">
            ☀️ Sun → 🌾 Grass → 🐇 Rabbit → 🦊 Fox → 🦅 Hawk
          </div>
          <p><strong>Important:</strong> At each step, some energy is used up (for movement, body heat, growth). That's why food chains rarely have more than 4–5 links — there isn't enough energy left to support more levels.</p>
          <p><strong>What about decomposers?</strong> Decomposers connect to EVERY level. When any organism dies — whether it's a plant, rabbit, or hawk — decomposers break it down and return nutrients to the soil for producers.</p>
        `,
      },
    },
    {
      id: 'l2-learn-mc1',
      section: 'LEARN' as const,
      blockType: 'MICRO_CHECK' as const,
      order: 8,
      content: {
        question: 'In the food chain: Sun → Grass → Rabbit → Fox, which organism is the secondary consumer?',
        options: [
          { label: 'Grass', value: 'a' },
          { label: 'Rabbit', value: 'b' },
          { label: 'Fox', value: 'c', correct: true },
          { label: 'Sun', value: 'd' },
        ],
        explanation: 'The fox eats the rabbit (a primary consumer), which makes the fox a secondary consumer. The grass is the producer and the rabbit is the primary consumer.',
      },
    },
  ];

  // 4. PRACTICE blocks — varied interaction
  const practiceBlocks = [
    {
      id: 'l2-practice-1',
      section: 'PRACTICE' as const,
      blockType: 'MATCHING' as const,
      order: 1,
      content: {
        instruction: 'Match each organism to its correct role in an ecosystem:',
        pairs: [
          { left: 'Oak tree', right: 'Producer' },
          { left: 'Grasshopper', right: 'Primary consumer' },
          { left: 'Frog', right: 'Secondary consumer' },
          { left: 'Mushroom', right: 'Decomposer' },
          { left: 'Algae', right: 'Producer' },
          { left: 'Eagle', right: 'Tertiary consumer' },
          { left: 'Earthworm', right: 'Decomposer' },
          { left: 'Deer', right: 'Primary consumer' },
        ],
      },
    },
    {
      id: 'l2-practice-2',
      section: 'PRACTICE' as const,
      blockType: 'FILL_IN_BLANK' as const,
      order: 2,
      content: {
        prompt: 'Complete the sentences using what you learned:',
        blanks: [
          { id: 'b1', correctAnswer: 'producers', hint: 'Organisms that make their own food from sunlight are called _____.' },
          { id: 'b2', correctAnswer: 'decomposers', hint: 'Organisms that break down dead material and return nutrients to the soil are called _____.' },
          { id: 'b3', correctAnswer: 'food chain', hint: 'A _____ _____ shows the path of energy from one organism to the next.' },
          { id: 'b4', correctAnswer: 'photosynthesis', hint: 'The process producers use to convert sunlight into food is called _____.' },
        ],
      },
    },
    {
      id: 'l2-practice-3',
      section: 'PRACTICE' as const,
      blockType: 'DRAWING' as const,
      order: 3,
      content: {
        instruction: 'Draw a food chain from a POND ecosystem. Include at least 4 organisms and label each one as producer, primary consumer, secondary consumer, or decomposer. Draw arrows showing the direction energy flows.',
      },
    },
    {
      id: 'l2-practice-4',
      section: 'PRACTICE' as const,
      blockType: 'MULTIPLE_CHOICE' as const,
      order: 4,
      content: {
        question: 'In the Crash Course Kids video you just watched, the narrator explained why food chains rarely have more than 5 links. Which of the following BEST explains why?',
        options: [
          { label: 'There aren\'t enough different species', value: 'a' },
          { label: 'Energy is lost at each level, so there isn\'t enough to support more levels', value: 'b', correct: true },
          { label: 'Predators at the top eat too much', value: 'c' },
          { label: 'Decomposers take all the energy', value: 'd' },
        ],
        explanation: 'At each level of a food chain, organisms use up energy for movement, body heat, and growth. Only about 10% of the energy passes to the next level, which is why chains are usually short.',
      },
    },
  ];

  // 5. REFLECT block — lesson-specific, process-aware
  const reflectBlocks = [
    {
      id: 'l2-reflect-1',
      section: 'REFLECT' as const,
      blockType: 'CONSTRUCTED_RESPONSE' as const,
      order: 1,
      content: {
        prompt: 'Look at the food chain you drew during Guided Practice. Now imagine that ALL the decomposers in that ecosystem suddenly disappeared. Using the specific organisms from YOUR food chain, explain:\n\n1. What would happen to dead organisms in that ecosystem?\n2. How would the producers eventually be affected?\n3. What would happen to the consumers?\n\nUse at least 2 vocabulary terms from this lesson in your answer.',
        minLength: 80,
        rubricHint: 'References their own food chain drawing. Uses vocabulary (producer, consumer, decomposer, nutrients, food chain). Explains the ripple effect of removing decomposers. Shows understanding of nutrient cycling.',
        teacherReviewRequired: false,
      },
    },
  ];

  // 6. Create all blocks
  const allBlocks = [...learnBlocks, ...practiceBlocks, ...reflectBlocks];
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
  console.log(`  ✅ Created ${allBlocks.length} lesson blocks`);

  // 7. Quiz questions for Mastery Check
  const questions = [
    {
      id: 'l2-q1',
      questionText: 'Which of the following organisms is a PRODUCER?',
      questionType: 'MULTIPLE_CHOICE' as const,
      options: [
        { label: 'Rabbit', value: 'a' },
        { label: 'Mushroom', value: 'b' },
        { label: 'Algae', value: 'c', correct: true },
        { label: 'Hawk', value: 'd' },
      ],
      correctAnswer: 'c',
      explanation: 'Algae is a producer because it makes its own food through photosynthesis. Rabbits and hawks are consumers, and mushrooms are decomposers.',
      outcomeCode: 'SCI.7.A.1',
      difficulty: 1,
    },
    {
      id: 'l2-q2',
      questionText: 'In this food chain: Sun → Phytoplankton → Small fish → Tuna → Shark, what role does the small fish play?',
      questionType: 'MULTIPLE_CHOICE' as const,
      options: [
        { label: 'Producer', value: 'a' },
        { label: 'Primary consumer', value: 'b', correct: true },
        { label: 'Secondary consumer', value: 'c' },
        { label: 'Decomposer', value: 'd' },
      ],
      correctAnswer: 'b',
      explanation: 'The small fish eats phytoplankton (the producer), making it the primary consumer — the first organism in the chain that eats rather than makes food.',
      outcomeCode: 'SCI.7.A.1',
      difficulty: 2,
    },
    {
      id: 'l2-q3',
      questionText: 'Why are decomposers essential for an ecosystem to survive?',
      questionType: 'MULTIPLE_CHOICE' as const,
      options: [
        { label: 'They produce oxygen for animals', value: 'a' },
        { label: 'They break down dead organisms and return nutrients to the soil for producers', value: 'b', correct: true },
        { label: 'They provide food for all consumers', value: 'c' },
        { label: 'They control the temperature of the ecosystem', value: 'd' },
      ],
      correctAnswer: 'b',
      explanation: 'Decomposers break down dead material (plants, animals, waste) and release nutrients back into the soil. Producers then use those nutrients to grow, restarting the cycle.',
      outcomeCode: 'SCI.7.A.1',
      difficulty: 2,
    },
    {
      id: 'l2-q4',
      questionText: 'Energy flows through a food chain in one direction. At each level, what happens to the energy?',
      questionType: 'MULTIPLE_CHOICE' as const,
      options: [
        { label: 'It increases at each level', value: 'a' },
        { label: 'It stays exactly the same', value: 'b' },
        { label: 'Some energy is used up, so less is available at the next level', value: 'c', correct: true },
        { label: 'It is stored and never used', value: 'd' },
      ],
      correctAnswer: 'c',
      explanation: 'At each level, organisms use energy for movement, growth, and body heat. Only about 10% of the energy passes to the next consumer, which is why food chains are usually short.',
      outcomeCode: 'SCI.7.A.1',
      difficulty: 2,
    },
    {
      id: 'l2-q5',
      questionText: 'A student observes a garden ecosystem. They see flowers, bees, a spider eating a fly, and mushrooms growing on a stump. Which organism is the DECOMPOSER?',
      questionType: 'MULTIPLE_CHOICE' as const,
      options: [
        { label: 'Flower', value: 'a' },
        { label: 'Bee', value: 'b' },
        { label: 'Spider', value: 'c' },
        { label: 'Mushroom', value: 'd', correct: true },
      ],
      correctAnswer: 'd',
      explanation: 'The mushroom is growing on dead wood (the stump), breaking it down and releasing nutrients — that\'s exactly what decomposers do.',
      outcomeCode: 'SCI.7.A.1',
      difficulty: 1,
    },
    {
      id: 'l2-q6',
      questionText: 'Algae in a lake use sunlight to produce food. What role do the algae play in this ecosystem?',
      questionType: 'MULTIPLE_CHOICE' as const,
      options: [
        { label: 'Decomposer', value: 'a' },
        { label: 'Consumer', value: 'b' },
        { label: 'Producer', value: 'c', correct: true },
        { label: 'Predator', value: 'd' },
      ],
      correctAnswer: 'c',
      explanation: 'Algae make their own food from sunlight through photosynthesis, just like land plants. That makes them producers — the base of aquatic food chains.',
      outcomeCode: 'SCI.7.A.1',
      difficulty: 1,
    },
    {
      id: 'l2-q7',
      questionText: 'In a food chain, an arrow (→) represents:',
      questionType: 'MULTIPLE_CHOICE' as const,
      options: [
        { label: 'The direction the animal moves', value: 'a' },
        { label: 'The direction energy flows from one organism to the next', value: 'b', correct: true },
        { label: 'Which organism is bigger', value: 'c' },
        { label: 'Which organism lives longer', value: 'd' },
      ],
      correctAnswer: 'b',
      explanation: 'Arrows in food chains always point in the direction energy flows: from the organism being eaten to the organism doing the eating.',
      outcomeCode: 'SCI.7.A.1',
      difficulty: 1,
    },
    {
      id: 'l2-q8',
      questionText: 'A bear eats salmon, berries, and insects. What type of consumer is a bear?',
      questionType: 'MULTIPLE_CHOICE' as const,
      options: [
        { label: 'Herbivore', value: 'a' },
        { label: 'Carnivore', value: 'b' },
        { label: 'Omnivore', value: 'c', correct: true },
        { label: 'Decomposer', value: 'd' },
      ],
      correctAnswer: 'c',
      explanation: 'Bears eat both plants (berries) and animals (salmon, insects), making them omnivores. Omnivores can feed at multiple levels of a food chain.',
      outcomeCode: 'SCI.7.A.1',
      difficulty: 1,
    },
    {
      id: 'l2-q9',
      questionText: 'If a disease killed all the producers in an ecosystem, which organisms would be affected FIRST?',
      questionType: 'MULTIPLE_CHOICE' as const,
      options: [
        { label: 'Tertiary consumers (top predators)', value: 'a' },
        { label: 'Primary consumers (herbivores) because they eat producers directly', value: 'b', correct: true },
        { label: 'Decomposers', value: 'c' },
        { label: 'No organisms would be affected', value: 'd' },
      ],
      correctAnswer: 'b',
      explanation: 'Primary consumers eat producers directly, so they lose their food source first. The effect then ripples up: secondary consumers lose food, then tertiary consumers.',
      outcomeCode: 'SCI.7.A.1',
      difficulty: 2,
    },
    {
      id: 'l2-q10',
      questionText: 'Why can\'t a food chain have 10 links (levels)?',
      questionType: 'MULTIPLE_CHOICE' as const,
      options: [
        { label: 'There are not enough species on Earth', value: 'a' },
        { label: 'Energy is lost as heat at each level, leaving too little to support more levels', value: 'b', correct: true },
        { label: 'Decomposers absorb all the energy after 5 levels', value: 'c' },
        { label: 'Top predators prevent more levels from forming', value: 'd' },
      ],
      correctAnswer: 'b',
      explanation: 'About 90% of energy is lost as heat at each trophic level. After 4-5 levels, there simply is not enough energy left to support another level of consumers.',
      outcomeCode: 'SCI.7.A.1',
      difficulty: 2,
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
  console.log(`  ✅ Created ${questions.length} quiz questions`);
}

// ╔═══════════════════════════════════════════════════════════╗
// ║  LESSON 3: Relationships in Ecosystems                   ║
// ╚═══════════════════════════════════════════════════════════╝

async function seedLesson3() {
  const LESSON_ID = 'g7-sci-ua-l3';
  console.log('\n📘 Seeding Lesson 3: Relationships in Ecosystems...');

  await prisma.lesson.update({
    where: { id: LESSON_ID },
    data: {
      subjectMode: 'SCIENCE',
      estimatedMinutes: 45,
      learningGoal: 'Identify and describe predator-prey, symbiotic, and competitive relationships and explain how they affect populations in an ecosystem.',
      successCriteria: 'I can identify the type of relationship between two organisms and explain how it benefits or harms each one.',
      materials: 'Science notebook, coloured pencils',
      reflectionPrompt: 'Think about a relationship between two organisms that you see in your daily life (pets, garden, etc.). What type of relationship is it?',
      warmUpConfig: {
        type: 'prediction',
        prompt: 'In Yellowstone National Park, wolves were removed in the 1920s. What do you think happened to the deer population after the wolves were gone?',
        options: [
          { label: 'The deer population stayed the same', value: 'a', correct: false },
          { label: 'The deer population grew rapidly, then crashed when food ran out', value: 'b', correct: true },
          { label: 'The deer population immediately decreased', value: 'c', correct: false },
          { label: 'Nothing changed because wolves and deer are not connected', value: 'd', correct: false },
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

  await prisma.lessonBlock.deleteMany({ where: { lessonId: LESSON_ID } });
  await prisma.quizQuestion.deleteMany({ where: { lessonId: LESSON_ID } });

  const learnBlocks = [
    {
      id: 'l3-learn-1',
      section: 'LEARN' as const,
      blockType: 'TEXT' as const,
      order: 1,
      content: {
        html: `
          <h2>🤝 How Do Organisms Interact?</h2>
          <p>In Lesson 2, you learned about food chains — how organisms depend on each other for energy. But organisms don't just eat each other. They interact in many different ways.</p>
          <p>Scientists group these interactions into three main types:</p>
          <ul>
            <li><strong>Predator-Prey</strong> — one organism hunts another</li>
            <li><strong>Symbiosis</strong> — two organisms live closely together</li>
            <li><strong>Competition</strong> — organisms compete for the same resources</li>
          </ul>
          <p>Each of these relationships shapes who survives, how populations grow or shrink, and how the ecosystem stays balanced.</p>
        `,
      },
    },
    {
      id: 'l3-learn-2',
      section: 'LEARN' as const,
      blockType: 'TEXT' as const,
      order: 2,
      content: {
        html: `
          <h3>🐺🦌 Predator-Prey Relationships</h3>
          <p>A <strong>predator</strong> is an organism that hunts and eats another organism. The organism being hunted is the <strong>prey</strong>.</p>
          <p><strong>Examples:</strong></p>
          <ul>
            <li>Wolf (predator) → Deer (prey)</li>
            <li>Hawk (predator) → Mouse (prey)</li>
            <li>Spider (predator) → Fly (prey)</li>
          </ul>
          <p><strong>How predator-prey affects populations:</strong></p>
          <p>Predator and prey populations are connected like a cycle:</p>
          <ol>
            <li>When prey is abundant → predator population grows (more food)</li>
            <li>More predators → prey population decreases (more hunting)</li>
            <li>Less prey → predator population decreases (less food)</li>
            <li>Fewer predators → prey population recovers → cycle repeats</li>
          </ol>
          <p>This is why <em>removing a predator</em> often causes problems — like the Yellowstone wolves example from your warm-up.</p>
        `,
      },
    },
    {
      id: 'l3-learn-mc1',
      section: 'LEARN' as const,
      blockType: 'MICRO_CHECK' as const,
      order: 3,
      content: {
        question: 'Based on what you just read: If the mouse population in an ecosystem suddenly increases, what would you expect to happen to the hawk population?',
        options: [
          { label: 'Decrease — fewer mice means less food', value: 'a' },
          { label: 'Increase — more mice means more food for hawks', value: 'b', correct: true },
          { label: 'Stay the same — hawks don\'t eat mice', value: 'c' },
          { label: 'Disappear completely', value: 'd' },
        ],
        explanation: 'More prey (mice) means more food for the predator (hawks), allowing the hawk population to grow. This is part of the predator-prey cycle.',
      },
    },
    {
      id: 'l3-learn-3',
      section: 'LEARN' as const,
      blockType: 'TEXT' as const,
      order: 4,
      content: {
        html: `
          <h3>🔗 Symbiosis: Living Together</h3>
          <p><strong>Symbiosis</strong> means two different species living closely together in a long-term relationship. There are three types, based on who benefits and who is harmed:</p>
          <table style="width:100%; border-collapse:collapse; margin:12px 0;">
            <thead>
              <tr style="background:#fef3c7;">
                <th style="padding:10px; text-align:left; border:1px solid #e5e7eb;">Type</th>
                <th style="padding:10px; text-align:left; border:1px solid #e5e7eb;">Species A</th>
                <th style="padding:10px; text-align:left; border:1px solid #e5e7eb;">Species B</th>
                <th style="padding:10px; text-align:left; border:1px solid #e5e7eb;">Example</th>
              </tr>
            </thead>
            <tbody>
              <tr><td style="padding:10px; border:1px solid #e5e7eb;"><strong>Mutualism</strong></td><td style="padding:10px; border:1px solid #e5e7eb;">✅ Benefits</td><td style="padding:10px; border:1px solid #e5e7eb;">✅ Benefits</td><td style="padding:10px; border:1px solid #e5e7eb;">Bee pollinates flower; flower gives bee nectar</td></tr>
              <tr><td style="padding:10px; border:1px solid #e5e7eb;"><strong>Commensalism</strong></td><td style="padding:10px; border:1px solid #e5e7eb;">✅ Benefits</td><td style="padding:10px; border:1px solid #e5e7eb;">➖ Not affected</td><td style="padding:10px; border:1px solid #e5e7eb;">Barnacles ride on a whale; whale is unaffected</td></tr>
              <tr><td style="padding:10px; border:1px solid #e5e7eb;"><strong>Parasitism</strong></td><td style="padding:10px; border:1px solid #e5e7eb;">✅ Benefits</td><td style="padding:10px; border:1px solid #e5e7eb;">❌ Harmed</td><td style="padding:10px; border:1px solid #e5e7eb;">Tick feeds on dog's blood; dog gets weaker</td></tr>
            </tbody>
          </table>
          <p><strong>Key idea:</strong> In mutualism, <em>both</em> species benefit. In parasitism, one benefits while the other is harmed — similar to predator-prey, but the host usually doesn't die immediately.</p>
        `,
      },
    },
    {
      id: 'l3-learn-4',
      section: 'LEARN' as const,
      blockType: 'VOCABULARY' as const,
      order: 5,
      content: {
        terms: [
          { term: 'Predator', definition: 'An organism that hunts and eats other organisms.', example: 'Wolves, hawks, spiders.' },
          { term: 'Prey', definition: 'An organism that is hunted and eaten by a predator.', example: 'Deer, mice, flies.' },
          { term: 'Symbiosis', definition: 'A close, long-term relationship between two different species.', example: 'A bee and a flower (mutualism).' },
          { term: 'Mutualism', definition: 'A symbiotic relationship where BOTH species benefit.', example: 'Clownfish and sea anemone — the clownfish gets protection, the anemone gets cleaned.' },
          { term: 'Commensalism', definition: 'A symbiotic relationship where one species benefits and the other is unaffected.', example: 'Remora fish attach to sharks to get free rides and scraps.' },
          { term: 'Parasitism', definition: 'A symbiotic relationship where one species benefits and the other is harmed.', example: 'Ticks feeding on a dog\'s blood.' },
          { term: 'Competition', definition: 'When two or more organisms compete for the same limited resource.', example: 'Two plants competing for the same patch of sunlight.' },
        ],
      },
    },
    {
      id: 'l3-learn-video',
      section: 'LEARN' as const,
      blockType: 'VIDEO' as const,
      order: 6,
      content: {
        url: 'https://www.youtube.com/embed/ysa5OBhXz-Q',
        title: 'How Wolves Changed Rivers — Yellowstone',
        transcript: 'This short documentary shows how reintroducing wolves to Yellowstone in 1995 caused a trophic cascade: wolves reduced the deer population, which allowed vegetation to recover, which stabilized riverbanks and changed the physical geography of the park. It demonstrates the power of predator-prey relationships.',
      },
    },
    {
      id: 'l3-learn-5',
      section: 'LEARN' as const,
      blockType: 'TEXT' as const,
      order: 7,
      content: {
        html: `
          <h3>⚔️ Competition</h3>
          <p><strong>Competition</strong> occurs when organisms need the same limited resource — like food, water, territory, or sunlight.</p>
          <p>Competition can happen:</p>
          <ul>
            <li><strong>Within a species</strong> (intraspecific) — two wolves competing for the same territory</li>
            <li><strong>Between species</strong> (interspecific) — a hawk and an owl both hunting mice in the same area</li>
          </ul>
          <p><strong>Result of competition:</strong> The stronger competitor gets more resources and survives better. The weaker competitor may need to move, adapt, or its population may decline.</p>
          <p>Competition is a major force that shapes which species thrive in an ecosystem.</p>
        `,
      },
    },
  ];

  const practiceBlocks = [
    {
      id: 'l3-practice-1',
      section: 'PRACTICE' as const,
      blockType: 'MATCHING' as const,
      order: 1,
      content: {
        instruction: 'Match each scenario to the correct type of ecological relationship:',
        pairs: [
          { left: 'A tick feeding on a deer\'s blood', right: 'Parasitism' },
          { left: 'A bee pollinating a flower while collecting nectar', right: 'Mutualism' },
          { left: 'Two squirrels fighting over the same acorn', right: 'Competition' },
          { left: 'A barnacle riding on a whale without affecting it', right: 'Commensalism' },
          { left: 'A wolf hunting a rabbit', right: 'Predator-Prey' },
          { left: 'A clownfish living inside a sea anemone for protection', right: 'Mutualism' },
        ],
      },
    },
    {
      id: 'l3-practice-2',
      section: 'PRACTICE' as const,
      blockType: 'DRAWING' as const,
      order: 2,
      content: {
        instruction: 'Choose ONE type of symbiotic relationship (mutualism, commensalism, or parasitism). Draw a labeled diagram showing two organisms in that relationship. For each organism, write:\n• Its name\n• Whether it benefits, is harmed, or is unaffected\n• How the relationship works\n\nLabel the type of symbiosis at the top of your drawing.',
      },
    },
    {
      id: 'l3-practice-3',
      section: 'PRACTICE' as const,
      blockType: 'MULTIPLE_CHOICE' as const,
      order: 3,
      content: {
        question: 'Refer to the symbiosis table from the Learn section. In a relationship where Species A benefits and Species B is NOT affected, which type of symbiosis is this?',
        options: [
          { label: 'Mutualism', value: 'a' },
          { label: 'Commensalism', value: 'b', correct: true },
          { label: 'Parasitism', value: 'c' },
          { label: 'Competition', value: 'd' },
        ],
        explanation: 'In commensalism, one species benefits while the other is neither helped nor harmed. The key clue is "NOT affected" — in mutualism both benefit, in parasitism one is harmed.',
      },
    },
    {
      id: 'l3-practice-4',
      section: 'PRACTICE' as const,
      blockType: 'CONSTRUCTED_RESPONSE' as const,
      order: 4,
      content: {
        prompt: 'Return to the warm-up prediction about Yellowstone wolves. Now that you\'ve learned about predator-prey relationships, explain:\n\n1. Why did the deer population first INCREASE after wolves were removed?\n2. Why did the deer population eventually CRASH?\n3. What happened when wolves were reintroduced in 1995?\n\nUse the predator-prey cycle from this lesson to support your explanation.',
        minLength: 60,
        rubricHint: 'References the predator-prey cycle. Explains population boom → overconsumption → crash. Mentions reintroduction restoring balance. Uses lesson-specific vocabulary.',
        teacherReviewRequired: false,
      },
    },
  ];

  const reflectBlocks = [
    {
      id: 'l3-reflect-1',
      section: 'REFLECT' as const,
      blockType: 'CONSTRUCTED_RESPONSE' as const,
      order: 1,
      content: {
        prompt: 'Think about the symbiotic relationship you drew during Guided Practice. Now describe a DIFFERENT symbiotic relationship you can observe in real life (in your yard, neighborhood, or a place you\'ve visited). Identify:\n\n1. The two organisms involved\n2. The type of symbiosis (mutualism, commensalism, or parasitism)\n3. How each organism is affected\n4. Why you classified it that way\n\nYour explanation must use at least 2 vocabulary terms from this lesson.',
        minLength: 60,
        rubricHint: 'References their drawing. Names specific organisms. Correctly classifies the relationship. Uses vocabulary terms (symbiosis, mutualism, commensalism, parasitism, benefit, harm).',
      },
    },
  ];

  const allBlocks = [...learnBlocks, ...practiceBlocks, ...reflectBlocks];
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
  console.log(`  ✅ Created ${allBlocks.length} lesson blocks`);

  // Quiz questions — covers SCI.7.A.2
  const questions = [
    {
      id: 'l3-q1',
      questionText: 'A bee visits flowers to collect nectar. While visiting, pollen sticks to the bee and is carried to the next flower. What type of relationship is this?',
      questionType: 'MULTIPLE_CHOICE' as const,
      options: [
        { label: 'Parasitism', value: 'a' },
        { label: 'Competition', value: 'b' },
        { label: 'Mutualism', value: 'c', correct: true },
        { label: 'Predator-prey', value: 'd' },
      ],
      correctAnswer: 'c',
      explanation: 'Both organisms benefit: the bee gets food (nectar) and the flower gets pollinated. This is mutualism.',
      outcomeCode: 'SCI.7.A.2',
      difficulty: 1,
    },
    {
      id: 'l3-q2',
      questionText: 'In a predator-prey relationship, what happens to the predator population when the prey population decreases?',
      questionType: 'MULTIPLE_CHOICE' as const,
      options: [
        { label: 'It also decreases because there is less food', value: 'a', correct: true },
        { label: 'It increases because there is less competition', value: 'b' },
        { label: 'It stays the same', value: 'c' },
        { label: 'It immediately goes to zero', value: 'd' },
      ],
      correctAnswer: 'a',
      explanation: 'Less prey means less food for predators, so their population declines too. This is part of the predator-prey population cycle.',
      outcomeCode: 'SCI.7.A.2',
      difficulty: 2,
    },
    {
      id: 'l3-q3',
      questionText: 'A tapeworm lives inside a dog\'s intestines, absorbing nutrients from the dog\'s food. The dog becomes malnourished. What type of relationship is this?',
      questionType: 'MULTIPLE_CHOICE' as const,
      options: [
        { label: 'Mutualism', value: 'a' },
        { label: 'Commensalism', value: 'b' },
        { label: 'Parasitism', value: 'c', correct: true },
        { label: 'Competition', value: 'd' },
      ],
      correctAnswer: 'c',
      explanation: 'The tapeworm benefits (gets nutrients) while the dog is harmed (becomes malnourished). One benefits, one is harmed = parasitism.',
      outcomeCode: 'SCI.7.A.2',
      difficulty: 1,
    },
    {
      id: 'l3-q4',
      questionText: 'Two plants growing next to each other both need sunlight to photosynthesize. One plant grows taller and blocks light from the other. This is an example of:',
      questionType: 'MULTIPLE_CHOICE' as const,
      options: [
        { label: 'Mutualism', value: 'a' },
        { label: 'Parasitism', value: 'b' },
        { label: 'Predator-prey', value: 'c' },
        { label: 'Competition', value: 'd', correct: true },
      ],
      correctAnswer: 'd',
      explanation: 'Both plants need the same resource (sunlight), and the taller plant outcompetes the shorter one. This is competition.',
      outcomeCode: 'SCI.7.A.2',
      difficulty: 2,
    },
    {
      id: 'l3-q5',
      questionText: 'Remora fish attach to the underside of sharks with a suction cup. The remora eats scraps of food the shark drops. The shark is not affected. What type of symbiosis is this?',
      questionType: 'MULTIPLE_CHOICE' as const,
      options: [
        { label: 'Commensalism', value: 'a', correct: true },
        { label: 'Parasitism', value: 'b' },
        { label: 'Mutualism', value: 'c' },
        { label: 'Competition', value: 'd' },
      ],
      correctAnswer: 'a',
      explanation: 'The remora benefits (free ride + food scraps) while the shark is unaffected. One benefits, the other is unaffected = commensalism.',
      outcomeCode: 'SCI.7.A.2',
      difficulty: 1,
    },
    {
      id: 'l3-q6',
      questionText: 'Barnacles attach to whale skin and filter-feed as the whale swims. The whale is not harmed or helped. This is an example of:',
      questionType: 'MULTIPLE_CHOICE' as const,
      options: [
        { label: 'Mutualism', value: 'a' },
        { label: 'Parasitism', value: 'b' },
        { label: 'Commensalism', value: 'c', correct: true },
        { label: 'Competition', value: 'd' },
      ],
      correctAnswer: 'c',
      explanation: 'The barnacles benefit (free transportation and access to food), but the whale is unaffected. One benefits, the other is neutral = commensalism.',
      outcomeCode: 'SCI.7.A.2',
      difficulty: 1,
    },
    {
      id: 'l3-q7',
      questionText: 'In the Yellowstone wolves example, what happened to the vegetation AFTER wolves were reintroduced?',
      questionType: 'MULTIPLE_CHOICE' as const,
      options: [
        { label: 'Vegetation decreased because wolves ate the plants', value: 'a' },
        { label: 'Vegetation recovered because wolves reduced the deer population that had been overgrazing', value: 'b', correct: true },
        { label: 'Nothing changed', value: 'c' },
        { label: 'All the vegetation died', value: 'd' },
      ],
      correctAnswer: 'b',
      explanation: 'Wolves hunted deer and elk, reducing their numbers. With fewer grazers, trees and shrubs could regrow along riverbanks. This is a trophic cascade.',
      outcomeCode: 'SCI.7.A.2',
      difficulty: 2,
    },
    {
      id: 'l3-q8',
      questionText: 'Clownfish live among sea anemone tentacles. The anemone protects the clownfish from predators, and the clownfish chases away animals that would eat the anemone. This is:',
      questionType: 'MULTIPLE_CHOICE' as const,
      options: [
        { label: 'Parasitism', value: 'a' },
        { label: 'Competition', value: 'b' },
        { label: 'Mutualism', value: 'c', correct: true },
        { label: 'Commensalism', value: 'd' },
      ],
      correctAnswer: 'c',
      explanation: 'Both organisms benefit: the clownfish gets protection, and the anemone gets defense from predators. Both benefit = mutualism.',
      outcomeCode: 'SCI.7.A.2',
      difficulty: 1,
    },
    {
      id: 'l3-q9',
      questionText: 'When the prey population in an ecosystem increases, what typically happens to the predator population NEXT?',
      questionType: 'MULTIPLE_CHOICE' as const,
      options: [
        { label: 'The predator population decreases because of more competition', value: 'a' },
        { label: 'The predator population increases because there is more food available', value: 'b', correct: true },
        { label: 'Nothing changes', value: 'c' },
        { label: 'The predator population stays exactly the same', value: 'd' },
      ],
      correctAnswer: 'b',
      explanation: 'More prey means more food for predators, allowing more predators to survive and reproduce. This is the predator-prey cycle.',
      outcomeCode: 'SCI.7.A.2',
      difficulty: 2,
    },
    {
      id: 'l3-q10',
      questionText: 'Head lice live on a human scalp, feeding on blood. The person gets an itchy scalp and discomfort. What type of relationship is this?',
      questionType: 'MULTIPLE_CHOICE' as const,
      options: [
        { label: 'Mutualism', value: 'a' },
        { label: 'Parasitism', value: 'b', correct: true },
        { label: 'Commensalism', value: 'c' },
        { label: 'Predator-prey', value: 'd' },
      ],
      correctAnswer: 'b',
      explanation: 'The lice benefit by feeding on blood, but the human is harmed (itching, discomfort). One benefits + one is harmed = parasitism.',
      outcomeCode: 'SCI.7.A.2',
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
  console.log(`  ✅ Created ${questions.length} quiz questions`);
}

// ╔═══════════════════════════════════════════════════════════╗
// ║  LESSON 4: Ecosystem Connections — Unit Project           ║
// ╚═══════════════════════════════════════════════════════════╝

async function seedLesson4() {
  const LESSON_ID = 'g7-sci-ua-l4';
  console.log('\n📙 Seeding Lesson 4: Ecosystem Connections — Unit Project...');

  await prisma.lesson.update({
    where: { id: LESSON_ID },
    data: {
      subjectMode: 'SCIENCE',
      estimatedMinutes: 60,
      learningGoal: 'Apply everything you\'ve learned about ecosystems to analyze a real ecosystem, identifying its components, food chains, and relationships.',
      successCriteria: 'I can choose an ecosystem and explain its biotic/abiotic factors, build at least one food chain, and identify at least 2 ecological relationships within it.',
      materials: 'Science notebook, art supplies OR device with camera OR presentation tools',
      reflectionPrompt: 'What was the most surprising thing you learned about ecosystems in this unit? What would you still like to investigate?',
      warmUpConfig: {
        type: 'retrieval',
        prompt: 'Quick review before your unit project! In the Yellowstone wolves video from Lesson 3, the reintroduction of wolves caused a "trophic cascade." What was the FIRST thing that happened when wolves returned?',
        options: [
          { label: 'Rivers changed their course immediately', value: 'a', correct: false },
          { label: 'The deer population decreased because wolves hunted them, allowing vegetation to recover', value: 'b', correct: true },
          { label: 'All the other predators left', value: 'c', correct: false },
          { label: 'The temperature of the park changed', value: 'd', correct: false },
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

  await prisma.lessonBlock.deleteMany({ where: { lessonId: LESSON_ID } });
  await prisma.quizQuestion.deleteMany({ where: { lessonId: LESSON_ID } });

  const learnBlocks = [
    {
      id: 'l4-learn-1',
      section: 'LEARN' as const,
      blockType: 'TEXT' as const,
      order: 1,
      content: {
        html: `
          <h2>🌎 Putting It All Together</h2>
          <p>Over the past three lessons, you've learned:</p>
          <ul>
            <li><strong>Lesson 1:</strong> Ecosystems have biotic (living) and abiotic (non-living) components that interact</li>
            <li><strong>Lesson 2:</strong> Energy flows through food chains — from producers to consumers to decomposers</li>
            <li><strong>Lesson 3:</strong> Organisms have relationships — predator-prey, symbiosis (mutualism, commensalism, parasitism), and competition</li>
          </ul>
          <p>Now it's time to put all of these ideas together by <strong>analyzing a real ecosystem</strong>.</p>
          <p>In this lesson, you'll choose an ecosystem and create a project that demonstrates your understanding of ALL the concepts from this unit.</p>
        `,
      },
    },
    {
      id: 'l4-learn-2',
      section: 'LEARN' as const,
      blockType: 'WORKED_EXAMPLE' as const,
      order: 2,
      content: {
        title: '📋 Example: Analyzing a Pond Ecosystem',
        steps: [
          { instruction: 'Step 1: Name the ecosystem', detail: 'A freshwater pond in a city park.' },
          { instruction: 'Step 2: List biotic factors (at least 5)', detail: 'Algae, cattails, tadpoles, dragonfly larvae, frogs, bass, snapping turtles, bacteria.' },
          { instruction: 'Step 3: List abiotic factors (at least 3)', detail: 'Water (temperature, clarity, pH), sunlight, mud/sediment, dissolved oxygen.' },
          { instruction: 'Step 4: Build a food chain (4+ organisms)', detail: 'Sun → Algae (producer) → Tadpole (primary consumer) → Dragonfly larva (secondary consumer) → Frog (tertiary consumer).' },
          { instruction: 'Step 5: Identify 2 relationships', detail: '1. Predator-prey: Frog eats dragonfly larvae. 2. Competition: Algae and cattails compete for sunlight near the surface.' },
          { instruction: 'Step 6: Explain one ripple effect', detail: 'If sunlight decreased (e.g. trees grew over the pond), algae would decline → tadpoles would have less food → frog populations would drop → the whole food chain would be affected.' },
        ],
      },
    },
    {
      id: 'l4-learn-3',
      section: 'LEARN' as const,
      blockType: 'TEXT' as const,
      order: 3,
      content: {
        html: `
          <h3>🎯 Your Unit Project: Choose Your Format</h3>
          <p>You will analyze a <strong>real ecosystem</strong> (it can be local or one you research). You can choose HOW to present your work:</p>

          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:12px; margin:16px 0;">
            <div style="background:#eff6ff; padding:14px; border-radius:12px; border-left:4px solid #3b82f6;">
              <strong>📝 Option A: Written Report</strong><br/>
              Write a 1–2 page report analyzing your ecosystem. Include labeled diagrams or sketches.
            </div>
            <div style="background:#f0fdf4; padding:14px; border-radius:12px; border-left:4px solid #22c55e;">
              <strong>🎨 Option B: Illustrated Poster</strong><br/>
              Create a visual poster or large diagram with labels, food chain(s), and relationship annotations.
            </div>
            <div style="background:#fef3c7; padding:14px; border-radius:12px; border-left:4px solid #f59e0b;">
              <strong>📸 Option C: Photo Field Study</strong><br/>
              Take photos of a local ecosystem and annotate them with labels and explanations.
            </div>
          </div>

          <h4>All options must include:</h4>
          <ol>
            <li>Name and type of ecosystem</li>
            <li>At least 5 biotic factors and 3 abiotic factors</li>
            <li>At least one food chain with 4+ organisms (labeled by role)</li>
            <li>At least 2 ecological relationships identified and explained</li>
            <li>One "ripple effect" prediction: What would happen if one factor changed?</li>
          </ol>

          <p style="background:#fef2f2; padding:12px; border-radius:8px; font-size:0.9rem; margin-top:12px;">
            <strong>⚠️ Important:</strong> This project is <strong>reviewed by your teacher</strong>. Use the vocabulary and concepts from this unit — your teacher will look for evidence that you understand and can apply the ideas, not just list them.
          </p>
        `,
      },
    },
  ];

  const practiceBlocks = [
    {
      id: 'l4-practice-1',
      section: 'PRACTICE' as const,
      blockType: 'MICRO_CHECK' as const,
      order: 1,
      content: {
        question: 'Quick review: Which of the following correctly represents a food chain?',
        options: [
          { label: 'Hawk → Mouse → Grass → Sun', value: 'a' },
          { label: 'Sun → Grass → Mouse → Hawk', value: 'b', correct: true },
          { label: 'Mouse → Grass → Hawk → Sun', value: 'c' },
          { label: 'Sun → Hawk → Mouse → Grass', value: 'd' },
        ],
        explanation: 'Energy flows from the sun to producers (grass) to primary consumers (mouse) to secondary consumers (hawk). Arrows show the direction of energy transfer.',
      },
    },
    {
      id: 'l4-practice-2',
      section: 'PRACTICE' as const,
      blockType: 'MICRO_CHECK' as const,
      order: 2,
      content: {
        question: 'In the pond ecosystem example, the frog eats dragonfly larvae. If a disease killed most of the frogs, what would MOST LIKELY happen to the dragonfly larva population?',
        options: [
          { label: 'It would decrease', value: 'a' },
          { label: 'It would increase because fewer frogs are eating them', value: 'b', correct: true },
          { label: 'It would stay the same', value: 'c' },
          { label: 'Dragonfly larvae would become producers', value: 'd' },
        ],
        explanation: 'With fewer predators (frogs), the prey population (dragonfly larvae) would increase. This is the predator-prey relationship at work.',
      },
    },
    {
      id: 'l4-practice-3',
      section: 'PRACTICE' as const,
      blockType: 'CONSTRUCTED_RESPONSE' as const,
      order: 3,
      content: {
        prompt: 'Before starting your project, plan your ecosystem analysis here. Use what you built in earlier lessons to organize your thinking:\n\n1. What ecosystem will you analyze? (Name and describe where it is)\n2. List 3 biotic factors and 2 abiotic factors in this ecosystem (use the biotic/abiotic definitions from Lesson 1)\n3. Draw from the food chain you built in Lesson 2: What food chain exists in YOUR chosen ecosystem? (At least 4 organisms, labeled by role: producer, primary consumer, etc.)\n4. Using the relationship types from Lesson 3, identify at least 1 relationship (predator-prey, mutualism, commensalism, parasitism, or competition) in your ecosystem\n5. Which project format will you choose? (Report, Poster, or Photo Study)\n\nThis is your planning draft — you will build on it for the actual project.',
        minLength: 60,
        rubricHint: 'References concepts from earlier lessons. Identifies a specific ecosystem. Lists real organisms and abiotic factors. Builds a plausible food chain using lesson vocabulary. Identifies at least one relationship type. Chooses a format.',
        teacherReviewRequired: false,
      },
    },
    {
      id: 'l4-practice-4',
      section: 'PRACTICE' as const,
      blockType: 'FILE_UPLOAD' as const,
      order: 4,
      content: {
        instruction: '📤 Upload your completed Unit Project here.\n\nRemember to include:\n✅ Ecosystem name and description\n✅ 5+ biotic factors, 3+ abiotic factors\n✅ At least one food chain (4+ organisms, labeled by role)\n✅ At least 2 ecological relationships identified and explained\n✅ One "ripple effect" prediction\n\nAccepted formats: image (photo/drawing), PDF, or document file.\n\n⚠️ This assignment will be reviewed by your teacher.',
        acceptedTypes: ['image/*', '.pdf', '.doc', '.docx', '.pptx'],
        maxSizeMb: 25,
      },
    },
  ];

  const reflectBlocks = [
    {
      id: 'l4-reflect-1',
      section: 'REFLECT' as const,
      blockType: 'CONSTRUCTED_RESPONSE' as const,
      order: 1,
      content: {
        prompt: 'Final unit reflection:\n\n1. What was the most important thing you learned about ecosystems in this unit?\n2. Think about the ecosystem you analyzed in your project. If one organism in YOUR food chain went extinct tomorrow, describe the specific effects on the other organisms in the chain. Use the "ripple effect" idea.\n3. What is one question you still have about ecosystems that you\'d like to investigate?\n\nYour answer must reference your own project and use at least 3 vocabulary terms from this unit.',
        minLength: 80,
        rubricHint: 'References their specific project ecosystem and food chain. Uses vocabulary (ecosystem, biotic, abiotic, producer, consumer, decomposer, food chain, predator, prey, symbiosis, etc.). Demonstrates synthesis of unit concepts. Shows genuine reflection, not generic statements.',
      },
    },
  ];

  const allBlocks = [...learnBlocks, ...practiceBlocks, ...reflectBlocks];
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
  console.log(`  ✅ Created ${allBlocks.length} lesson blocks`);

  // Mastery check questions — synthesis across A.1 and A.2
  const questions = [
    {
      id: 'l4-q1',
      questionText: 'A wetland ecosystem is drying up due to drought. The cattails (producers) are dying. Based on everything you learned in this unit, which of the following describes the MOST LIKELY chain of effects?',
      questionType: 'MULTIPLE_CHOICE' as const,
      options: [
        { label: 'Only the cattails are affected because they are the only producers', value: 'a' },
        { label: 'Herbivores lose food → their predators lose food → decomposers have more dead material → nutrients return to soil', value: 'b', correct: true },
        { label: 'The predators leave first, then the herbivores', value: 'c' },
        { label: 'The abiotic factors are not affected by the loss of cattails', value: 'd' },
      ],
      correctAnswer: 'b',
      explanation: 'Losing producers triggers a ripple effect through the food chain: herbivores lose their food source, which means predators also lose food. As organisms die, decomposers break them down. This connects L1 (biotic-abiotic interactions), L2 (food chains), and L3 (predator-prey).',
      outcomeCode: 'SCI.7.A.1',
      difficulty: 2,
    },
    {
      id: 'l4-q2',
      questionText: 'A student analyzes a forest ecosystem and finds that lichens grow on tree bark. The lichen gets a surface to grow on, but the tree is unaffected. Meanwhile, squirrels and blue jays both compete for the same acorns. Which TWO relationship types are described here?',
      questionType: 'MULTIPLE_CHOICE' as const,
      options: [
        { label: 'Mutualism and predator-prey', value: 'a' },
        { label: 'Parasitism and competition', value: 'b' },
        { label: 'Commensalism and competition', value: 'c', correct: true },
        { label: 'Mutualism and commensalism', value: 'd' },
      ],
      correctAnswer: 'c',
      explanation: 'Lichen benefits from growing on the tree while the tree is unaffected — that is commensalism. Squirrels and blue jays both need acorns (same resource) — that is competition. This question synthesizes relationship types from Lesson 3.',
      outcomeCode: 'SCI.7.A.2',
      difficulty: 2,
    },
    {
      id: 'l4-q3',
      questionText: 'Mycorrhizal fungi live on plant roots. The fungi help the plant absorb water and minerals, while the plant provides the fungi with sugars. What type of relationship is this?',
      questionType: 'MULTIPLE_CHOICE' as const,
      options: [
        { label: 'Competition', value: 'a' },
        { label: 'Parasitism', value: 'b' },
        { label: 'Mutualism', value: 'c', correct: true },
        { label: 'Commensalism', value: 'd' },
      ],
      correctAnswer: 'c',
      explanation: 'Both organisms benefit: the fungi get sugars from the plant, and the plant gets better water and mineral absorption. Both benefit = mutualism.',
      outcomeCode: 'SCI.7.A.2',
      difficulty: 2,
    },
    {
      id: 'l4-q4',
      questionText: 'In an ocean ecosystem, if overfishing removes most of the tuna (a predator of small fish), what would MOST LIKELY happen?',
      questionType: 'MULTIPLE_CHOICE' as const,
      options: [
        { label: 'Small fish population would decrease', value: 'a' },
        { label: 'Small fish population would increase because there are fewer predators', value: 'b', correct: true },
        { label: 'Phytoplankton would increase', value: 'c' },
        { label: 'Nothing would change', value: 'd' },
      ],
      correctAnswer: 'b',
      explanation: 'Removing a predator (tuna) means less hunting of the prey (small fish), so the small fish population would grow. This could then lead to overgrazing of phytoplankton.',
      outcomeCode: 'SCI.7.A.2',
      difficulty: 2,
    },
    {
      id: 'l4-q5',
      questionText: 'Which statement BEST explains why decomposers are important for producers?',
      questionType: 'MULTIPLE_CHOICE' as const,
      options: [
        { label: 'Decomposers produce sunlight for photosynthesis', value: 'a' },
        { label: 'Decomposers eat producers and control their population', value: 'b' },
        { label: 'Decomposers break down dead organisms and return nutrients to the soil that producers use to grow', value: 'c', correct: true },
        { label: 'Decomposers provide water for producers', value: 'd' },
      ],
      correctAnswer: 'c',
      explanation: 'Decomposers recycle nutrients from dead material back into the soil. Producers (plants) then absorb these nutrients through their roots to grow, completing the nutrient cycle.',
      outcomeCode: 'SCI.7.A.1',
      difficulty: 2,
    },
    {
      id: 'l4-q6',
      questionText: 'A student builds a food chain: Sun → Seaweed → Sea urchin → Sea otter → Orca. If a disease killed most of the sea otters, which organism would MOST LIKELY increase in population?',
      questionType: 'MULTIPLE_CHOICE' as const,
      options: [
        { label: 'Seaweed', value: 'a' },
        { label: 'Sea urchin', value: 'b', correct: true },
        { label: 'Orca', value: 'c' },
        { label: 'Sun', value: 'd' },
      ],
      correctAnswer: 'b',
      explanation: 'Sea otters eat sea urchins. Fewer otters = fewer predators for urchins = urchin population increases. This could then lead to overgrazing of seaweed.',
      outcomeCode: 'SCI.7.A.2',
      difficulty: 2,
    },
    {
      id: 'l4-q7',
      questionText: 'Which of the following is the BEST example of mutualism?',
      questionType: 'MULTIPLE_CHOICE' as const,
      options: [
        { label: 'A flea feeding on a dog\'s blood', value: 'a' },
        { label: 'Birds nesting in a tree without affecting it', value: 'b' },
        { label: 'Bees pollinating flowers while collecting nectar — both benefit', value: 'c', correct: true },
        { label: 'Two deer fighting over territory', value: 'd' },
      ],
      correctAnswer: 'c',
      explanation: 'Bees get food (nectar) and flowers get pollinated (reproduction). Both organisms benefit, which defines mutualism.',
      outcomeCode: 'SCI.7.A.2',
      difficulty: 1,
    },
    {
      id: 'l4-q8',
      questionText: 'An ecosystem has producers, herbivores, carnivores, and decomposers. If ALL decomposers were removed, what would happen over time?',
      questionType: 'MULTIPLE_CHOICE' as const,
      options: [
        { label: 'Nothing would change because decomposers are not important', value: 'a' },
        { label: 'Dead organisms would pile up and nutrients would not return to the soil, eventually starving producers', value: 'b', correct: true },
        { label: 'Producers would grow faster', value: 'c' },
        { label: 'Herbivores would become decomposers', value: 'd' },
      ],
      correctAnswer: 'b',
      explanation: 'Decomposers recycle nutrients from dead material back into the soil. Without them, the nutrient cycle breaks — soil becomes depleted and producers cannot grow.',
      outcomeCode: 'SCI.7.A.1',
      difficulty: 2,
    },
    {
      id: 'l4-q9',
      questionText: 'Two squirrel species in the same forest both eat acorns and nest in tree holes. This is an example of:',
      questionType: 'MULTIPLE_CHOICE' as const,
      options: [
        { label: 'Mutualism', value: 'a' },
        { label: 'Parasitism', value: 'b' },
        { label: 'Competition', value: 'c', correct: true },
        { label: 'Commensalism', value: 'd' },
      ],
      correctAnswer: 'c',
      explanation: 'Both species need the same limited resources (acorns and nesting sites). When species compete for the same resources, it is interspecific competition.',
      outcomeCode: 'SCI.7.A.2',
      difficulty: 1,
    },
    {
      id: 'l4-q10',
      questionText: 'A student claims: "Removing one species from an ecosystem won\'t affect anything else." Based on what you learned in this unit, is this claim correct?',
      questionType: 'MULTIPLE_CHOICE' as const,
      options: [
        { label: 'Yes — each species is independent', value: 'a' },
        { label: 'No — removing one species creates a ripple effect because organisms are connected through food chains and relationships', value: 'b', correct: true },
        { label: 'Yes — only abiotic factors affect ecosystems', value: 'c' },
        { label: 'It depends on whether the species is a producer or consumer', value: 'd' },
      ],
      correctAnswer: 'b',
      explanation: 'Ecosystems are interconnected webs. Removing any species — producer, consumer, or decomposer — causes ripple effects through food chains and ecological relationships.',
      outcomeCode: 'SCI.7.A.1',
      difficulty: 2,
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
  console.log(`  ✅ Created ${questions.length} quiz questions`);
}

// ╔═══════════════════════════════════════════════════════════╗
// ║  RUN ALL                                                  ║
// ╚═══════════════════════════════════════════════════════════╝

async function main() {
  console.log('🌱 Seeding Unit A content (Lessons 2, 3, 4)...\n');

  await seedLesson2();
  await seedLesson3();
  await seedLesson4();

  console.log('\n🎉 Unit A content seeded successfully!');
  console.log('   Lesson 2: 11 blocks + 5 quiz questions');
  console.log('   Lesson 3: 11 blocks + 5 quiz questions');
  console.log('   Lesson 4:  8 blocks + 5 quiz questions');
  console.log('   Total: 30 content blocks, 15 mastery check questions');
  console.log('   Outcomes covered: SCI.7.A.1 (L2, L4), SCI.7.A.2 (L3, L4)');
  console.log('\n   Navigate: Student Dashboard → Science → Interactions & Ecosystems');
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
