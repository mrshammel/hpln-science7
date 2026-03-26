// Seed ELA Unit 1 - Lessons 1-2
// Run: npx tsx prisma/seed-ela-u1-l1-l2.ts

import { config } from 'dotenv';
config({ path: '.env.local' });

import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool as any);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding ELA Unit 1 - Lessons 1-2...');

  // LESSON 1: Who Am I?
  const L1 = 'g6-ela-u1-l1';

  await prisma.lesson.update({
    where: { id: L1 },
    data: {
      subjectMode: 'ELA',
      externalUrl: null,
      estimatedMinutes: 40,
      learningGoal: 'Use comprehension strategies (connecting, questioning, inferring) to explore identity-themed texts and make personal connections.',
      successCriteria: 'I can use comprehension strategies to understand a text.\nI can identify explicit and implicit information in a text about identity.\nI can make personal connections (text-to-self) while reading.',
      materials: 'Notebook, pencil',
      reflectionPrompt: 'What is one thing about your identity that you would want others to understand? Why?',
      warmUpConfig: {
        type: 'constructed_response',
        prompt: '"Your name carries the story of who you are and where you come from." - Adapted proverb\n\nThink about YOUR name for a moment. What does your name mean to you? Is there a story behind it?',
      },
      masteryConfig: { passPercent: 80, maxRetries: 5, reteachEnabled: true, immediateCorrectiveFeedback: false },
    },
  });
  console.log('L1 metadata updated');

  await prisma.lessonBlock.deleteMany({ where: { lessonId: L1 } });
  await prisma.quizQuestion.deleteMany({ where: { lessonId: L1 } });

  const l1Blocks = [
    { id: 'ela-l1-learn-1', section: 'LEARN', blockType: 'VIDEO', order: 1, content: { url: 'https://www.youtube.com/embed/D9Ihs241zeg', title: 'What Is Identity? (4 min)', transcript: 'An introduction to identity and how experiences, relationships, culture, and beliefs shape who we are.', aiSummary: 'Identity is made up of many parts: your name, family, culture, beliefs, experiences, and relationships. Everyone\'s identity is unique and always growing. Understanding your own identity helps you connect with others and understand their stories too.' } },
    { id: 'ela-l1-learn-2', section: 'LEARN', blockType: 'TEXT', order: 2, content: { html: '<h3>Key Comprehension Strategies for This Unit</h3><ul><li><strong>Connecting:</strong> What does this remind me of in my own life?</li><li><strong>Questioning:</strong> What am I wondering about as I read?</li><li><strong>Inferring:</strong> What is the author suggesting without saying directly?</li></ul>' } },
    { id: 'ela-l1-learn-3', section: 'LEARN', blockType: 'TEXT', order: 3, content: { html: '<h3>Anchor Text: "The Name Jar" Excerpt</h3><blockquote style="border-left:3px solid #e85d9a;padding:12px 16px;margin:12px 0;font-style:italic;color:#475569">"Unhei stared at the name tag on her desk -- the one her teacher had carefully written in English letters. It looked strange and unfamiliar. On the bus that morning, the other kids had stumbled over her name, repeating it wrong, laughing at the sounds. She wanted to disappear. But her grandmother\'s voice echoed in her memory: <em>\'Your name means grace. It was chosen with love.\'</em>"<br><br>-- Adapted from <em>The Name Jar</em> by Yangsook Choi</blockquote>' } },
    { id: 'ela-l1-learn-4', section: 'LEARN', blockType: 'VOCABULARY', order: 4, content: { terms: [{ term: 'Identity', definition: 'Who you are -- shaped by your experiences, relationships, culture, and beliefs.', example: 'Your name, language, and traditions are all part of your identity.' }, { term: 'Text-to-Self', definition: 'When something in a text reminds you of your own life or feelings.', example: '"This character reminds me of when I moved schools."' }, { term: 'Inference', definition: 'A conclusion based on evidence and reasoning -- reading "between the lines."', example: 'The author says she "wanted to disappear" -- we can infer she felt embarrassed.' }, { term: 'Explicit', definition: 'Information stated directly and clearly in the text.', example: '"Her name means grace" -- this is stated directly.' }, { term: 'Implicit', definition: 'Information suggested or hinted at, not stated directly.', example: 'The text doesn\'t say she was embarrassed, but we can figure it out from the clues.' }] } },
    { id: 'ela-l1-learn-5', section: 'LEARN', blockType: 'MICRO_CHECK', order: 5, content: { question: 'In the anchor text, Unhei "wanted to disappear." This is an example of what kind of information?', options: [{ label: 'Explicit -- it is clearly stated', value: 'a' }, { label: 'Implicit -- we have to infer her feelings from the clue', value: 'b', correct: true }, { label: 'Neither -- it is just a description', value: 'c' }], explanation: '"Wanted to disappear" is a clue that tells us she felt embarrassed or ashamed, but the text does not directly say those words. We have to infer it -- that is implicit information.' } },
    { id: 'ela-l1-prac-1', section: 'PRACTICE', blockType: 'MATCHING', order: 1, content: { instruction: 'Read each statement about the anchor text and sort it by comprehension strategy:', pairs: [{ left: '"This reminds me of when I moved to a new school"', right: 'Connecting' }, { left: '"Why did the kids laugh? Were they being mean or just unsure?"', right: 'Questioning' }, { left: '"She seems proud of her name even though others struggle with it"', right: 'Inferring' }, { left: '"My grandmother also tells me stories about our family name"', right: 'Connecting' }, { left: '"What would happen if she chose a different name?"', right: 'Questioning' }, { left: '"The word echoed suggests her grandmother\'s advice stayed with her"', right: 'Inferring' }] } },
    { id: 'ela-l1-prac-2', section: 'PRACTICE', blockType: 'CONSTRUCTED_RESPONSE', order: 2, content: { prompt: 'Read this short passage, then analyze it using comprehension strategies:\n\n"Kwame sat in the back of the classroom, his new school ID still warm from the printer. He traced his finger over the letters of his name. In Ghana, everyone said it easily -- KWAH-meh. Here, the teacher had called him \'Kuh-wame.\' He did not correct her."\n\nWhat can you INFER about how Kwame feels? What TEXT CLUES support your inference? What CONNECTIONS can you make to your own life?', minLength: 40, rubricHint: 'Names at least 2 text clues. Makes a valid inference. Makes a personal connection.' } },
    { id: 'ela-l1-refl-1', section: 'REFLECT', blockType: 'CONSTRUCTED_RESPONSE', order: 1, content: { prompt: 'Return to your warm-up response about your name.\n\n1. How has your thinking about names and identity changed after reading about Unhei and Kwame?\n2. What is one thing about YOUR identity that you would want others to understand? Why?', minLength: 30, rubricHint: 'References the anchor texts. Shows personal reflection on identity. Explains why the chosen aspect of identity matters.' } },
  ];

  for (const b of l1Blocks) {
    await prisma.lessonBlock.create({ data: { id: b.id, lessonId: L1, section: b.section, blockType: b.blockType, content: b.content, order: b.order } });
  }
  console.log('L1: ' + l1Blocks.length + ' blocks created');

  const l1Questions = [
    { id: 'ela-l1-q1', questionText: 'Which sentence uses an INFERENCE correctly?', questionType: 'MULTIPLE_CHOICE', options: [{ label: 'The text says her name means grace.', value: 'a' }, { label: 'Based on the clue "wanted to disappear," I think she felt embarrassed.', value: 'b', correct: true }, { label: 'The story is about a girl named Unhei.', value: 'c' }, { label: 'Her grandmother spoke to her.', value: 'd' }], correctAnswer: 'b', explanation: 'An inference uses clues from the text plus your own reasoning to draw a conclusion. Option B uses the clue "wanted to disappear" to infer a feeling.', outcomeCode: 'ELA.6.1', difficulty: 1 },
    { id: 'ela-l1-q2', questionText: 'What is the difference between EXPLICIT and IMPLICIT information?', questionType: 'MULTIPLE_CHOICE', options: [{ label: 'Explicit is fiction; implicit is nonfiction', value: 'a' }, { label: 'Explicit is stated directly; implicit is hinted at', value: 'b', correct: true }, { label: 'Explicit is long; implicit is short', value: 'c' }, { label: 'There is no difference', value: 'd' }], correctAnswer: 'b', explanation: 'Explicit information is clearly stated in the text. Implicit information requires you to read between the lines and make inferences.', outcomeCode: 'ELA.6.1', difficulty: 1 },
    { id: 'ela-l1-q3', questionText: '"Her grandmother\'s voice ECHOED in her memory." The word "echoed" is used figuratively to mean:', questionType: 'MULTIPLE_CHOICE', options: [{ label: 'Her grandmother was shouting', value: 'a' }, { label: 'The words stayed with her and repeated in her mind', value: 'b', correct: true }, { label: 'There was an echo in the room', value: 'c' }, { label: 'She could not hear well', value: 'd' }], correctAnswer: 'b', explanation: '"Echoed" is used figuratively -- not a literal sound bouncing off walls, but the idea that her grandmother\'s words kept replaying in her thoughts.', outcomeCode: 'ELA.6.1', difficulty: 2 },
    { id: 'ela-l1-q4', questionText: 'Which of these is a TEXT-TO-SELF connection?', questionType: 'MULTIPLE_CHOICE', options: [{ label: '"This story reminds me of another book I read"', value: 'a' }, { label: '"This reminds me of when I started at a new school"', value: 'b', correct: true }, { label: '"This story is set in a school"', value: 'c' }, { label: '"The author used descriptive language"', value: 'd' }], correctAnswer: 'b', explanation: 'A text-to-self connection links something in the text to your OWN personal experience. Option A is text-to-text, C is a fact, D is an observation.', outcomeCode: 'ELA.6.1', difficulty: 1 },
    { id: 'ela-l1-q5', questionText: 'Read: "He traced his finger over the letters of his name." What does this ACTION suggest about Kwame?', questionType: 'MULTIPLE_CHOICE', options: [{ label: 'He is bored in class', value: 'a' }, { label: 'He is thinking deeply about his name and identity', value: 'b', correct: true }, { label: 'He does not know how to spell his name', value: 'c' }, { label: 'He wants to change his name', value: 'd' }], correctAnswer: 'b', explanation: 'Tracing the letters shows he is thoughtfully considering his name -- it is a reflective, meaningful action, not boredom or confusion.', outcomeCode: 'ELA.6.1', difficulty: 2 },
    { id: 'ela-l1-q6', questionText: 'Which sentence contains a SIMILE?', questionType: 'MULTIPLE_CHOICE', options: [{ label: '"She wanted to disappear"', value: 'a' }, { label: '"Her name felt like a bridge between two worlds"', value: 'b', correct: true }, { label: '"The teacher called his name wrong"', value: 'c' }, { label: '"Your name means grace"', value: 'd' }], correctAnswer: 'b', explanation: 'A simile compares two things using "like" or "as." "Her name felt LIKE a bridge" compares the name to a bridge using the word "like."', outcomeCode: 'ELA.6.1', difficulty: 1 },
    { id: 'ela-l1-q7', questionText: '"She wanted to disappear." This is an example of:', questionType: 'MULTIPLE_CHOICE', options: [{ label: 'A simile', value: 'a' }, { label: 'Hyperbole -- an exaggeration to show strong feeling', value: 'b', correct: true }, { label: 'Alliteration', value: 'c' }, { label: 'A fact', value: 'd' }], correctAnswer: 'b', explanation: 'She did not literally want to vanish -- this is hyperbole, an extreme exaggeration used to express how embarrassed she felt.', outcomeCode: 'ELA.6.1', difficulty: 2 },
    { id: 'ela-l1-q8', questionText: 'In the sentence "He did not correct her," the PRONOUN "her" refers to:', questionType: 'MULTIPLE_CHOICE', options: [{ label: 'Kwame\'s grandmother', value: 'a' }, { label: 'The teacher', value: 'b', correct: true }, { label: 'Unhei', value: 'c' }, { label: 'A classmate', value: 'd' }], correctAnswer: 'b', explanation: 'The previous sentence says "the teacher had called him Kuh-wame." The pronoun "her" refers back to the teacher -- this is called a pronoun-antecedent relationship.', outcomeCode: 'ELA.6.1', difficulty: 1 },
  ];

  for (const q of l1Questions) {
    await prisma.quizQuestion.create({ data: { id: q.id, lessonId: L1, questionText: q.questionText, questionType: q.questionType, options: q.options, correctAnswer: q.correctAnswer, explanation: q.explanation, outcomeCode: q.outcomeCode, difficulty: q.difficulty } });
  }
  console.log('L1: ' + l1Questions.length + ' quiz questions created');

  // LESSON 2: Words That Shape Us
  const L2 = 'g6-ela-u1-l2';

  await prisma.lesson.update({
    where: { id: L2 },
    data: {
      subjectMode: 'ELA',
      externalUrl: null,
      estimatedMinutes: 40,
      learningGoal: 'Determine the meaning of words using context clues. Explain how specific words carry cultural or emotional meaning. Use new vocabulary accurately in writing.',
      successCriteria: 'I can determine the meaning of words using context clues.\nI can explain how specific words carry cultural or emotional meaning.\nI can use new vocabulary accurately in my own writing.',
      materials: 'Notebook, pencil',
      reflectionPrompt: 'Which vocabulary word from this lesson resonated most with you? Why?',
      warmUpConfig: { type: 'multiple_choice', prompt: 'Which Word Does Not Belong?\n\nLook at these four words. Which one does NOT fit with the others?\n\nHeritage, Tradition, Textbook, Ancestry', options: [{ label: 'Heritage', value: 'a', correct: false }, { label: 'Tradition', value: 'b', correct: false }, { label: 'Textbook', value: 'c', correct: true }, { label: 'Ancestry', value: 'd', correct: false }] },
      masteryConfig: { passPercent: 80, maxRetries: 5, reteachEnabled: true, immediateCorrectiveFeedback: false },
    },
  });
  console.log('L2 metadata updated');

  await prisma.lessonBlock.deleteMany({ where: { lessonId: L2 } });
  await prisma.quizQuestion.deleteMany({ where: { lessonId: L2 } });

  const l2Blocks = [
    { id: 'ela-l2-learn-1', section: 'LEARN', blockType: 'TEXT', order: 1, content: { html: '<h3>Words Carry More Than Definitions</h3><p>Words carry <strong>culture</strong>, <strong>emotion</strong>, <strong>history</strong>, and <strong>identity</strong>. Understanding the deeper meaning of words helps us connect with texts -- and with each other.</p><h4>Key Vocabulary Strategies</h4><ul><li><strong>Context Clues:</strong> Use surrounding words and sentences to figure out meaning.</li><li><strong>Word Roots:</strong> Break words into parts (prefixes, roots, suffixes) to unlock meaning.</li><li><strong>Connotation:</strong> The feeling or association a word carries beyond its dictionary definition.</li></ul>' } },
    { id: 'ela-l2-learn-2', section: 'LEARN', blockType: 'TEXT', order: 2, content: { html: '<h3>Identity Words in Context</h3><p>Read these sentences from identity texts. Notice how each bolded word carries deep meaning:</p><ul><li>"Her <strong>heritage</strong> was woven into every dish her grandmother prepared." -- <em>Heritage means the traditions, values, and culture passed down through generations.</em></li><li>"He felt a deep sense of <strong>belonging</strong> when he heard his family\'s language spoken." -- <em>Belonging means feeling accepted, connected, and at home.</em></li><li>"She wanted to <strong>reclaim</strong> her name after years of hearing it mispronounced." -- <em>Reclaim means to take back something that was lost or taken away.</em></li><li>"His <strong>resilience</strong> showed in the way he kept going despite the challenges." -- <em>Resilience means the ability to recover and stay strong through difficulty.</em></li><li>"The painting was a <strong>mosaic</strong> of her many identities -- daughter, student, artist, friend." -- <em>Mosaic (figurative) means a combination of many different pieces forming one beautiful whole.</em></li></ul>' } },
    { id: 'ela-l2-learn-3', section: 'LEARN', blockType: 'VOCABULARY', order: 3, content: { terms: [{ term: 'Heritage', definition: 'Traditions, values, and culture passed down through generations.', example: 'Her heritage was woven into every dish her grandmother prepared.' }, { term: 'Belonging', definition: 'Feeling accepted, connected, and at home in a group or place.', example: 'He felt belonging when he heard his family\'s language.' }, { term: 'Reclaim', definition: 'To take back something that was lost, dismissed, or taken away.', example: 'She wanted to reclaim her name.' }, { term: 'Resilience', definition: 'The ability to recover and stay strong through difficulty.', example: 'His resilience showed in the way he kept going.' }, { term: 'Mosaic', definition: 'A combination of many different pieces forming one beautiful whole (figurative).', example: 'Her identity was a mosaic of many parts.' }, { term: 'Connotation', definition: 'The emotional feeling or association a word carries beyond its definition.', example: '"Home" has a warm connotation; "house" is more neutral.' }] } },
    { id: 'ela-l2-learn-4', section: 'LEARN', blockType: 'MICRO_CHECK', order: 4, content: { question: '"Her heritage was WOVEN into every dish." The word "woven" is used figuratively to mean:', options: [{ label: 'She knitted while cooking', value: 'a' }, { label: 'Her culture was deeply embedded in the food she made', value: 'b', correct: true }, { label: 'The food was made with thread', value: 'c' }], explanation: '"Woven" is used as a metaphor -- her cultural traditions were so deeply part of the cooking that they were inseparable, like threads woven into fabric.' } },
    { id: 'ela-l2-prac-1', section: 'PRACTICE', blockType: 'MATCHING', order: 1, content: { instruction: 'Match each vocabulary word to its correct definition:', pairs: [{ left: 'Heritage', right: 'Traditions passed down through generations' }, { left: 'Belonging', right: 'Feeling accepted and at home' }, { left: 'Reclaim', right: 'To take back something lost' }, { left: 'Resilience', right: 'Ability to recover through difficulty' }, { left: 'Mosaic', right: 'Many pieces forming one whole' }, { left: 'Connotation', right: 'Emotional feeling a word carries' }] } },
    { id: 'ela-l2-prac-2', section: 'PRACTICE', blockType: 'CONSTRUCTED_RESPONSE', order: 2, content: { prompt: 'Choose 3 vocabulary words from this lesson (heritage, belonging, reclaim, resilience, mosaic, connotation) and write an original sentence for each one that connects to YOUR life or identity.', minLength: 30, rubricHint: 'Uses 3 vocabulary words correctly. Sentences connect to personal experience. Shows understanding of word meaning.' } },
    { id: 'ela-l2-refl-1', section: 'REFLECT', blockType: 'CONSTRUCTED_RESPONSE', order: 1, content: { prompt: 'Think of a word, phrase, or saying that is important in your family or culture. It could be a greeting, a nickname, a proverb, or a term of endearment.\n\n1. What is the word/phrase?\n2. What does it mean?\n3. Why does it matter to your identity?\n\nUse at least 2 vocabulary words from this lesson.', minLength: 40, rubricHint: 'Names a specific word/phrase. Explains meaning and personal significance. Uses at least 2 lesson vocabulary words correctly.' } },
  ];

  for (const b of l2Blocks) {
    await prisma.lessonBlock.create({ data: { id: b.id, lessonId: L2, section: b.section, blockType: b.blockType, content: b.content, order: b.order } });
  }
  console.log('L2: ' + l2Blocks.length + ' blocks created');

  const l2Questions = [
    { id: 'ela-l2-q1', questionText: 'What is a CONTEXT CLUE?', questionType: 'MULTIPLE_CHOICE', options: [{ label: 'A clue hidden in a mystery story', value: 'a' }, { label: 'Surrounding words that help you figure out an unknown word\'s meaning', value: 'b', correct: true }, { label: 'The dictionary definition of a word', value: 'c' }, { label: 'A word\'s spelling pattern', value: 'd' }], correctAnswer: 'b', explanation: 'Context clues are the words and sentences around an unfamiliar word that help you determine its meaning without a dictionary.', outcomeCode: 'ELA.6.2', difficulty: 1 },
    { id: 'ela-l2-q2', questionText: 'What is the CONNOTATION of a word?', questionType: 'MULTIPLE_CHOICE', options: [{ label: 'Its dictionary definition', value: 'a' }, { label: 'The emotional feeling or association it carries', value: 'b', correct: true }, { label: 'How many syllables it has', value: 'c' }, { label: 'Its part of speech', value: 'd' }], correctAnswer: 'b', explanation: 'Connotation is the emotional or cultural feeling a word carries beyond its literal definition.', outcomeCode: 'ELA.6.2', difficulty: 1 },
    { id: 'ela-l2-q3', questionText: '"The painting was a mosaic of her many identities." This sentence uses which figurative language?', questionType: 'MULTIPLE_CHOICE', options: [{ label: 'Simile', value: 'a' }, { label: 'Metaphor', value: 'b', correct: true }, { label: 'Onomatopoeia', value: 'c' }, { label: 'Alliteration', value: 'd' }], correctAnswer: 'b', explanation: 'A metaphor directly compares two things WITHOUT using "like" or "as." The sentence says the painting WAS a mosaic -- not "was LIKE a mosaic."', outcomeCode: 'ELA.6.2', difficulty: 2 },
    { id: 'ela-l2-q4', questionText: '"She felt a deep sense of belonging when she heard her family\'s language." The word "deep" modifies which word?', questionType: 'MULTIPLE_CHOICE', options: [{ label: 'Felt', value: 'a' }, { label: 'Sense', value: 'b', correct: true }, { label: 'Belonging', value: 'c' }, { label: 'Language', value: 'd' }], correctAnswer: 'b', explanation: '"Deep" is an adjective modifying the noun "sense" -- it describes HOW strong the sense of belonging was.', outcomeCode: 'ELA.6.2', difficulty: 2 },
    { id: 'ela-l2-q5', questionText: 'The PREFIX "re-" in "reclaim" means:', questionType: 'MULTIPLE_CHOICE', options: [{ label: 'Before', value: 'a' }, { label: 'Again or back', value: 'b', correct: true }, { label: 'Not', value: 'c' }, { label: 'Under', value: 'd' }], correctAnswer: 'b', explanation: 'The prefix "re-" means "again" or "back." Reclaim = claim again/back. Other examples: rebuild, return, reconnect.', outcomeCode: 'ELA.6.2', difficulty: 1 },
    { id: 'ela-l2-q6', questionText: 'Which pair of words has the MOST SIMILAR connotation?', questionType: 'MULTIPLE_CHOICE', options: [{ label: 'Home / Prison', value: 'a' }, { label: 'Heritage / Legacy', value: 'b', correct: true }, { label: 'Resilience / Weakness', value: 'c' }, { label: 'Belonging / Rejection', value: 'd' }], correctAnswer: 'b', explanation: 'Heritage and legacy both carry positive connotations of things passed down through generations.', outcomeCode: 'ELA.6.2', difficulty: 2 },
    { id: 'ela-l2-q7', questionText: '"Her heritage was woven into every dish." The word "woven" is used as:', questionType: 'MULTIPLE_CHOICE', options: [{ label: 'A literal description of weaving', value: 'a' }, { label: 'A metaphor for something deeply embedded', value: 'b', correct: true }, { label: 'An example of alliteration', value: 'c' }, { label: 'A synonym for "cooked"', value: 'd' }], correctAnswer: 'b', explanation: '"Woven" is not literal -- nobody is weaving fabric into food. It is a metaphor showing that her culture was deeply part of the cooking.', outcomeCode: 'ELA.6.2', difficulty: 2 },
    { id: 'ela-l2-q8', questionText: 'Which sentence correctly uses a SEMICOLON?', questionType: 'MULTIPLE_CHOICE', options: [{ label: 'Heritage means; traditions passed down.', value: 'a' }, { label: 'Words carry meaning; they also carry emotion.', value: 'b', correct: true }, { label: 'She felt belonging; and happiness.', value: 'c' }, { label: 'Context clues are; helpful.', value: 'd' }], correctAnswer: 'b', explanation: 'A semicolon connects two complete, related sentences. "Words carry meaning" and "they also carry emotion" are both complete thoughts.', outcomeCode: 'ELA.6.2', difficulty: 2 },
  ];

  for (const q of l2Questions) {
    await prisma.quizQuestion.create({ data: { id: q.id, lessonId: L2, questionText: q.questionText, questionType: q.questionType, options: q.options, correctAnswer: q.correctAnswer, explanation: q.explanation, outcomeCode: q.outcomeCode, difficulty: q.difficulty } });
  }
  console.log('L2: ' + l2Questions.length + ' quiz questions created');

  console.log('\nELA Unit 1 Lessons 1-2 seeded!');
}

main()
  .catch((e) => { console.error('Seed failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); pool.end(); });
