import { config } from 'dotenv';
config({ path: '.env.local' });

import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

// Use the pg adapter to match the app's db.ts configuration
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const adapter = new PrismaPg(pool as any);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding database...\n');

  // ╔═══════════════════════════════════════════╗
  // ║ 1. TEACHER                                ║
  // ╚═══════════════════════════════════════════╝

  const teacher = await prisma.user.upsert({
    where: { id: 'teacher-1' },
    update: {},
    create: {
      id: 'teacher-1',
      name: 'Mrs. Shammel',
      email: 'shammel@hpln.ca',
      role: 'TEACHER',
      gradeLevel: 7,
    },
  });
  console.log(`✅ Teacher: ${teacher.name}`);

  // ╔═══════════════════════════════════════════╗
  // ║ 2. STUDENTS (assigned to teacher)          ║
  // ╚═══════════════════════════════════════════╝

  const studentData = [
    { id: 'student-1', name: 'Ava Chen', email: 'ava.chen@student.hpln.ca', enrolledAt: new Date('2025-09-03') },
    { id: 'student-2', name: 'Liam Patel', email: 'liam.patel@student.hpln.ca', enrolledAt: new Date('2025-09-03') },
    { id: 'student-3', name: 'Emma Rodriguez', email: 'emma.rodriguez@student.hpln.ca', enrolledAt: new Date('2025-09-05') },
    { id: 'student-4', name: 'Noah Thompson', email: 'noah.thompson@student.hpln.ca', enrolledAt: new Date('2025-09-03') },
    { id: 'student-5', name: 'Sophia Kim', email: 'sophia.kim@student.hpln.ca', enrolledAt: new Date('2025-09-08') },
    { id: 'student-6', name: 'Jackson Lee', email: 'jackson.lee@student.hpln.ca', enrolledAt: new Date('2025-09-03') },
    { id: 'student-7', name: 'Olivia Nguyen', email: 'olivia.nguyen@student.hpln.ca', enrolledAt: new Date('2025-09-10') },
    { id: 'student-8', name: 'Ethan Williams', email: 'ethan.williams@student.hpln.ca', enrolledAt: new Date('2025-09-03') },
  ];

  for (const s of studentData) {
    await prisma.user.upsert({
      where: { id: s.id },
      update: {},
      create: {
        id: s.id,
        name: s.name,
        email: s.email,
        role: 'STUDENT',
        gradeLevel: 7,
        enrolledAt: s.enrolledAt,
        assignedTeacherId: teacher.id,
      },
    });
    console.log(`✅ Student: ${s.name}`);
  }

  // ╔═══════════════════════════════════════════╗
  // ║ 3. CURRICULUM — Subjects, Units, Lessons   ║
  // ╚═══════════════════════════════════════════╝

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
  console.log(`\n✅ Subject: ${science.name} (Grade ${science.gradeLevel})`);

  // --- Unit A: Ecosystems ---
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

  const lesson2a = await prisma.lesson.upsert({
    where: { id: 'g7-sci-ua-l3' },
    update: {},
    create: {
      id: 'g7-sci-ua-l3',
      unitId: unitA.id,
      title: 'Relationships in Ecosystems',
      subtitle: 'Explore predator-prey, symbiotic, and competitive relationships.',
      order: 3,
    },
  });

  const lesson2b = await prisma.lesson.upsert({
    where: { id: 'g7-sci-ua-l4' },
    update: {},
    create: {
      id: 'g7-sci-ua-l4',
      unitId: unitA.id,
      title: 'Ecosystem Connections — Unit Project',
      subtitle: 'Apply what you learned to analyze a real ecosystem.',
      order: 4,
    },
  });

  // --- Unit B: Plants ---
  const unitB = await prisma.unit.upsert({
    where: { id: 'g7-sci-unit-b' },
    update: {},
    create: {
      id: 'g7-sci-unit-b',
      subjectId: science.id,
      title: 'Plants for Food & Fibre',
      description: 'Investigate how plants grow and how humans use them.',
      icon: '🌱',
      order: 2,
    },
  });

  const lesson3 = await prisma.lesson.upsert({
    where: { id: 'g7-sci-ub-l1' },
    update: {},
    create: {
      id: 'g7-sci-ub-l1',
      unitId: unitB.id,
      title: 'Factors Affecting Plant Growth',
      subtitle: 'Explore light, water, soil, and temperature.',
      order: 1,
    },
  });

  // --- Unit C: Heat ---
  const unitC = await prisma.unit.upsert({
    where: { id: 'g7-sci-unit-c' },
    update: {},
    create: {
      id: 'g7-sci-unit-c',
      subjectId: science.id,
      title: 'Heat & Temperature',
      description: 'Understand heat transfer, conductors, and insulators.',
      icon: '🔥',
      order: 3,
    },
  });

  const lesson4 = await prisma.lesson.upsert({
    where: { id: 'g7-sci-uc-l1' },
    update: {},
    create: {
      id: 'g7-sci-uc-l1',
      unitId: unitC.id,
      title: 'Conductors and Insulators',
      subtitle: 'Compare how different materials transfer heat.',
      order: 1,
    },
  });

  console.log(`✅ Units: ${unitA.title}, ${unitB.title}, ${unitC.title}`);
  console.log(`✅ Lessons: 6 total`);

  // ╔═══════════════════════════════════════════╗
  // ║ 4. ACTIVITIES                               ║
  // ╚═══════════════════════════════════════════╝

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
          { question: 'What are the two main components of an ecosystem?', options: ['Living and non-living things', 'Water and air', 'Plants and animals', 'Sun and soil'], answer: 0 },
          { question: 'Which of these is an abiotic factor?', options: ['Tree', 'Sunlight', 'Deer', 'Bacteria'], answer: 1 },
        ],
      },
    },
  });

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
        prompt: 'Draw a food web that includes at least 5 organisms.',
        rubric: [
          { criterion: 'Includes 5+ organisms', maxPoints: 5 },
          { criterion: 'Correctly labeled roles', maxPoints: 5 },
          { criterion: 'Arrows show energy flow', maxPoints: 5 },
          { criterion: 'Neat and clear', maxPoints: 5 },
        ],
      },
    },
  });

  const reflection1 = await prisma.activity.upsert({
    where: { id: 'g7-sci-ub-l1-reflect' },
    update: {},
    create: {
      id: 'g7-sci-ub-l1-reflect',
      lessonId: lesson3.id,
      type: 'REFLECTION',
      title: 'Plant Growth Reflection',
      points: 10,
      order: 1,
      content: { prompt: 'Reflect on what you learned about factors affecting plant growth.' },
    },
  });

  const labReport = await prisma.activity.upsert({
    where: { id: 'g7-sci-uc-l1-lab' },
    update: {},
    create: {
      id: 'g7-sci-uc-l1-lab',
      lessonId: lesson4.id,
      type: 'ASSIGNMENT',
      title: 'Heat Transfer Lab',
      points: 20,
      order: 1,
      content: { prompt: 'Test 5 materials and record how they conduct heat.' },
    },
  });

  console.log(`✅ Activities: 4 total (quiz, assignment, reflection, lab)`);

  // ╔═══════════════════════════════════════════╗
  // ║ 5. LEARNING OUTCOMES                       ║
  // ╚═══════════════════════════════════════════╝

  const outcomes = [
    { id: 'o-sci7-a1', code: 'SCI.7.A.1', description: 'Investigate and describe relationships between organisms in an ecosystem', subjectArea: 'Science', gradeLevel: 7, unitContext: 'Unit A — Ecosystems' },
    { id: 'o-sci7-a2', code: 'SCI.7.A.2', description: 'Identify examples of predator-prey and symbiotic relationships', subjectArea: 'Science', gradeLevel: 7, unitContext: 'Unit A — Ecosystems' },
    { id: 'o-sci7-b1', code: 'SCI.7.B.1', description: 'Describe the conditions and processes needed for plant growth', subjectArea: 'Science', gradeLevel: 7, unitContext: 'Unit B — Plants' },
    { id: 'o-sci7-b2', code: 'SCI.7.B.2', description: 'Examine plant adaptations to different environments', subjectArea: 'Science', gradeLevel: 7, unitContext: 'Unit B — Plants' },
    { id: 'o-sci7-c1', code: 'SCI.7.C.1', description: 'Describe heat as a form of energy and identify methods of heat transfer', subjectArea: 'Science', gradeLevel: 7, unitContext: 'Unit C — Heat' },
  ];

  for (const o of outcomes) {
    await prisma.learningOutcome.upsert({
      where: { id: o.id },
      update: {},
      create: o,
    });
  }
  console.log(`✅ Learning Outcomes: ${outcomes.length}`);

  // ╔═══════════════════════════════════════════╗
  // ║ 6. PACING TARGETS                          ║
  // ╚═══════════════════════════════════════════╝

  for (const [unitId, week] of [['g7-sci-unit-a', 4], ['g7-sci-unit-b', 12], ['g7-sci-unit-c', 20]] as const) {
    await prisma.pacingTarget.upsert({
      where: { unitId },
      update: {},
      create: {
        unitId,
        expectedWeek: week,
      },
    });
  }
  console.log(`✅ Pacing Targets: 3`);

  // ╔═══════════════════════════════════════════╗
  // ║ 7. STUDENT PROGRESS                        ║
  // ╚═══════════════════════════════════════════╝

  const progressData = [
    // Ava — strong, ahead
    { studentId: 'student-1', lessonId: lesson1.id, status: 'COMPLETE' as const, completedAt: new Date('2025-09-20') },
    { studentId: 'student-1', lessonId: lesson2.id, status: 'COMPLETE' as const, completedAt: new Date('2025-09-28') },
    { studentId: 'student-1', lessonId: lesson3.id, status: 'IN_PROGRESS' as const },
    // Liam — on pace
    { studentId: 'student-2', lessonId: lesson1.id, status: 'COMPLETE' as const, completedAt: new Date('2025-09-22') },
    { studentId: 'student-2', lessonId: lesson2.id, status: 'IN_PROGRESS' as const },
    // Emma — slightly behind
    { studentId: 'student-3', lessonId: lesson1.id, status: 'COMPLETE' as const, completedAt: new Date('2025-10-01') },
    // Noah — significantly behind
    { studentId: 'student-4', lessonId: lesson1.id, status: 'IN_PROGRESS' as const },
    // Sophia — ahead
    { studentId: 'student-5', lessonId: lesson1.id, status: 'COMPLETE' as const, completedAt: new Date('2025-09-18') },
    { studentId: 'student-5', lessonId: lesson2.id, status: 'COMPLETE' as const, completedAt: new Date('2025-09-25') },
    { studentId: 'student-5', lessonId: lesson3.id, status: 'COMPLETE' as const, completedAt: new Date('2025-10-05') },
    { studentId: 'student-5', lessonId: lesson4.id, status: 'IN_PROGRESS' as const },
    // Jackson — on pace
    { studentId: 'student-6', lessonId: lesson1.id, status: 'COMPLETE' as const, completedAt: new Date('2025-09-21') },
    { studentId: 'student-6', lessonId: lesson2.id, status: 'COMPLETE' as const, completedAt: new Date('2025-10-01') },
    { studentId: 'student-6', lessonId: lesson3.id, status: 'IN_PROGRESS' as const },
  ];

  for (const p of progressData) {
    const key = { studentId: p.studentId, lessonId: p.lessonId };
    await prisma.studentProgress.upsert({
      where: { studentId_lessonId: key },
      update: {},
      create: { ...p },
    });
  }
  console.log(`✅ Student Progress: ${progressData.length} records`);

  // ╔═══════════════════════════════════════════╗
  // ║ 8. SUBMISSIONS (the key review data)       ║
  // ╚═══════════════════════════════════════════╝

  const submissionData = [
    // Ava — ecosystem quiz (reviewed)
    {
      id: 'sub-1',
      studentId: 'student-1',
      activityId: quiz1.id,
      submissionType: 'QUIZ_RESPONSE' as const,
      score: 9,
      maxScore: 10,
      reviewed: true,
      reviewedAt: new Date('2026-03-14T14:00:00'),
      reviewedBy: teacher.id,
      teacherFeedback: 'Excellent understanding of ecosystem relationships. One point missed on decomposer classification.',
      submittedAt: new Date('2026-03-14T10:30:00'),
    },
    // Sophia — heat transfer lab (NEEDS REVIEW — paragraph response)
    {
      id: 'sub-2',
      studentId: 'student-5',
      activityId: labReport.id,
      submissionType: 'PARAGRAPH_RESPONSE' as const,
      writtenResponse: 'In our experiment, we tested five materials to see which ones conducted heat the fastest. We placed each material on a hot plate set to 60°C and measured the temperature at the opposite end every 30 seconds for 5 minutes.\n\nResults:\n- Aluminum: reached 52°C fastest (by 2 minutes)\n- Steel: reached 48°C by 3 minutes\n- Glass: reached 38°C by 5 minutes\n- Wood: only reached 28°C\n- Styrofoam: stayed at 22°C\n\nThis shows that metals are good conductors because the particles are close together and transfer kinetic energy quickly through collisions. Non-metals like wood and styrofoam are insulators because their particles are more spread out and don\'t transfer energy as efficiently.\n\nOne thing I found interesting is that aluminum conducted heat faster than steel, even though they are both metals. I think this is because aluminum has lower density and its electrons move more freely.',
      score: null,
      maxScore: 20,
      reviewed: false,
      submittedAt: new Date('2026-03-14T09:15:00'),
    },
    // Jackson — plant growth reflection (NEEDS REVIEW)
    {
      id: 'sub-3',
      studentId: 'student-6',
      activityId: reflection1.id,
      submissionType: 'REFLECTION' as const,
      writtenResponse: 'Before this unit, I thought plants only needed water and sunlight to grow. Now I understand that they also need carbon dioxide, minerals from the soil, and the right temperature.\n\nThe experiment we did where we grew plants in different light conditions was really cool. The plant in complete darkness turned yellow and grew really tall and thin (etiolated), while the one in full light was shorter but had much greener and thicker leaves. This taught me that light doesn\'t just give energy — it actually changes how the plant develops.\n\nI want to learn more about how plants in the arctic survive with so little light for part of the year.',
      score: null,
      maxScore: 10,
      reviewed: false,
      submittedAt: new Date('2026-03-13T14:00:00'),
    },
    // Liam — food web drawing (reviewed)
    {
      id: 'sub-4',
      studentId: 'student-2',
      activityId: assignment1.id,
      submissionType: 'IMAGE_ARTIFACT' as const,
      fileUrl: '#',
      fileName: 'food_web_diagram.png',
      score: 17,
      maxScore: 20,
      reviewed: true,
      reviewedAt: new Date('2026-03-12T15:00:00'),
      reviewedBy: teacher.id,
      teacherFeedback: 'Great diagram showing multiple interconnected chains. Consider adding decomposers to complete the cycle.',
      submittedAt: new Date('2026-03-12T11:45:00'),
    },
    // Emma — producers & consumers quiz (reviewed)
    {
      id: 'sub-5',
      studentId: 'student-3',
      activityId: quiz1.id,
      submissionType: 'QUIZ_RESPONSE' as const,
      score: 8,
      maxScore: 10,
      reviewed: true,
      reviewedAt: new Date('2026-03-11T16:00:00'),
      reviewedBy: teacher.id,
      teacherFeedback: 'Solid understanding. Missed the tertiary consumer question — review the food chain levels.',
      submittedAt: new Date('2026-03-11T13:20:00'),
    },
    // Ava — food web drawing (NEEDS REVIEW — artifact)
    {
      id: 'sub-6',
      studentId: 'student-1',
      activityId: assignment1.id,
      submissionType: 'IMAGE_ARTIFACT' as const,
      fileUrl: '#',
      fileName: 'ava_food_web_v2.png',
      score: null,
      maxScore: 20,
      reviewed: false,
      submittedAt: new Date('2026-03-15T08:30:00'),
    },
    // Ethan — ecosystem quiz (NEEDS REVIEW)
    {
      id: 'sub-7',
      studentId: 'student-8',
      activityId: quiz1.id,
      submissionType: 'QUIZ_RESPONSE' as const,
      score: 6,
      maxScore: 10,
      reviewed: false,
      submittedAt: new Date('2026-03-15T10:00:00'),
    },
  ];

  for (const s of submissionData) {
    await prisma.submission.upsert({
      where: { id: s.id },
      update: {},
      create: {
        id: s.id,
        studentId: s.studentId,
        activityId: s.activityId,
        submissionType: s.submissionType,
        writtenResponse: (s as Record<string, unknown>).writtenResponse as string || null,
        fileUrl: (s as Record<string, unknown>).fileUrl as string || null,
        fileName: (s as Record<string, unknown>).fileName as string || null,
        score: s.score,
        maxScore: s.maxScore,
        reviewed: s.reviewed,
        reviewedAt: (s as Record<string, unknown>).reviewedAt as Date || null,
        reviewedBy: (s as Record<string, unknown>).reviewedBy as string || null,
        teacherFeedback: (s as Record<string, unknown>).teacherFeedback as string || null,
        submittedAt: s.submittedAt,
      },
    });
  }
  console.log(`✅ Submissions: ${submissionData.length} (4 need review, 3 reviewed)`);

  // ╔═══════════════════════════════════════════╗
  // ║ 9. MASTERY JUDGMENTS (existing ones only)  ║
  // ╚═══════════════════════════════════════════╝

  const masteryData = [
    { id: 'mj-1', studentId: 'student-1', outcomeId: 'o-sci7-a1', teacherId: teacher.id, masteryLevel: 'MEETING' as const, teacherNote: 'Strong understanding shown in quiz and class discussion.' },
    { id: 'mj-2', studentId: 'student-2', outcomeId: 'o-sci7-a1', teacherId: teacher.id, masteryLevel: 'APPROACHING' as const, teacherNote: 'Getting there — food web shows some confusion on secondary consumers.' },
    { id: 'mj-3', studentId: 'student-3', outcomeId: 'o-sci7-a1', teacherId: teacher.id, masteryLevel: 'MEETING' as const },
  ];

  for (const m of masteryData) {
    await prisma.masteryJudgment.upsert({
      where: { id: m.id },
      update: {},
      create: m,
    });
  }
  console.log(`✅ Mastery Judgments: ${masteryData.length}`);

  // ╔═══════════════════════════════════════════╗
  // ║ 10. TEACHER NOTES (a few existing)         ║
  // ╚═══════════════════════════════════════════╝

  const noteData = [
    { id: 'note-1', studentId: 'student-4', teacherId: teacher.id, tag: 'Support Concern', content: 'Noah has been absent frequently. Need to check in with home about engagement.' },
    { id: 'note-2', studentId: 'student-1', teacherId: teacher.id, tag: 'Observation', content: 'Ava is consistently helping peers during group work. Consider peer tutor role.' },
  ];

  for (const n of noteData) {
    await prisma.teacherNote.upsert({
      where: { id: n.id },
      update: {},
      create: n,
    });
  }
  console.log(`✅ Teacher Notes: ${noteData.length}`);

  console.log('\n🎉 Seed complete!');
  console.log('   1 teacher, 8 students, 1 subject, 3 units, 4 lessons');
  console.log('   4 activities, 5 outcomes, 7 submissions (4 need review)');
  console.log('   3 mastery judgments, 2 teacher notes');
  console.log('\n   Set NEXT_PUBLIC_DEMO_MODE=false in .env.local to use real data.');
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
