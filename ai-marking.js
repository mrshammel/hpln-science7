/* ============================================================
   AI MARKING SERVICE — HPLN Grade 7 Science
   ============================================================
   Client-side rubric-based scoring for constructed responses.
   Uses keyword matching, response length, and science vocabulary
   to generate instant feedback + a score.
   
   Teacher can always override AI scores via the dashboard.
   
   Depends on: shared.js, firestore-service.js (optional)
   ============================================================ */

// ===== RUBRIC CRITERIA =====
const AI_RUBRIC = {
  // Each criterion has a max score and what's checked
  relevance:    { max: 2, label: 'Relevance to Prompt' },
  vocabulary:   { max: 2, label: 'Science Vocabulary Used' },
  explanation:  { max: 2, label: 'Explanation Depth' },
  evidence:     { max: 2, label: 'Evidence & Examples' },
  clarity:      { max: 2, label: 'Clarity & Organization' }
};

const AI_MAX_SCORE = 10; // Sum of all criteria max values

// ===== SCIENCE VOCABULARY BY UNIT =====
const SCIENCE_VOCAB = {
  a: ['ecosystem','habitat','food chain','food web','producer','consumer','decomposer','predator','prey','photosynthesis','energy flow','trophic level','biodiversity','population','community','biotic','abiotic','symbiosis','mutualism','parasitism','commensalism','niche','adaptation','species','endangered','extinct','bioaccumulation','biomagnification','sustainability','conservation','monitoring','pollution','invasive species','keystone species','carrying capacity'],
  b: ['plant','cell','chloroplast','photosynthesis','transpiration','germination','pollination','seed','root','stem','leaf','flower','fruit','xylem','phloem','stomata','carbon dioxide','oxygen','glucose','nutrient','soil','fertilizer','growth','reproduction','vegetative','asexual','sexual','pistil','stamen','petal','sepal','angiosperm','gymnosperm','monocot','dicot'],
  c: ['heat','temperature','thermal energy','conduction','convection','radiation','insulation','conductor','particle','kinetic energy','thermometer','celsius','fahrenheit','kelvin','expansion','contraction','specific heat','heat transfer','equilibrium','state of matter','solid','liquid','gas','melting','boiling','freezing','evaporation','condensation'],
  d: ['structure','force','load','tension','compression','torsion','shear','beam','arch','truss','column','foundation','stability','strength','material','stress','strain','failure','design','prototype','engineer','bridge','cantilever','suspension','reinforcement','symmetry','center of gravity','balance'],
  e: ['earth','crust','mantle','core','plate tectonics','earthquake','volcano','erosion','weathering','deposition','sedimentary','igneous','metamorphic','rock cycle','mineral','fossil','geological','fault','fold','mountain','continental drift','pangaea','seismic','magma','lava','landform','glacier','soil formation']
};

// ===== EXPLANATION INDICATORS =====
const EXPLANATION_WORDS = ['because','therefore','this means','as a result','for example','such as','this shows','this demonstrates','which causes','which leads to','in other words','consequently','due to','the reason','explains why','evidence shows','according to','this is important','this affects','impact','effect','cause','relationship','connection','linked to'];

const EVIDENCE_WORDS = ['for example','such as','for instance','specifically','evidence','data','shows that','demonstrates','according to','research','study','observation','experiment','proof','indicates','suggests','based on'];

// ===== MAIN SCORING FUNCTION =====
/**
 * Score a student's constructed response using rubric-based AI.
 * @param {string} response - Student's written text
 * @param {string} prompt - The question/prompt text
 * @param {string} unitKey - Unit identifier (a-e)
 * @param {string[]} requiredTerms - Optional specific terms to look for
 * @returns {Object} { score, maxScore, percentage, rubric, feedback, strengths, nextSteps }
 */
function aiScoreResponse(response, prompt, unitKey, requiredTerms) {
  if (!response || response.trim().length === 0) {
    return {
      score: 0, maxScore: AI_MAX_SCORE, percentage: 0,
      rubric: Object.fromEntries(Object.entries(AI_RUBRIC).map(([k,v]) => [k, {score:0, max:v.max, label:v.label}])),
      feedback: 'No response provided yet.',
      strengths: '', nextSteps: 'Write your response to earn marks.',
      reviewType: 'ai'
    };
  }

  const text = response.toLowerCase().trim();
  const words = text.split(/\s+/);
  const wordCount = words.length;
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const promptLower = (prompt || '').toLowerCase();
  const vocab = SCIENCE_VOCAB[unitKey] || [];

  // 1. RELEVANCE — does response relate to the prompt?
  let relevanceScore = 0;
  const promptKeywords = promptLower.split(/\s+/).filter(w => w.length > 4);
  const promptHits = promptKeywords.filter(pk => text.includes(pk)).length;
  const promptRatio = promptKeywords.length > 0 ? promptHits / promptKeywords.length : 0;
  if (promptRatio > 0.3) relevanceScore = 1;
  if (promptRatio > 0.5 || wordCount > 30) relevanceScore = 2;

  // 2. VOCABULARY — science terms used
  let vocabScore = 0;
  const usedVocab = vocab.filter(v => text.includes(v));
  const usedRequired = requiredTerms ? requiredTerms.filter(t => text.includes(t.toLowerCase())) : [];
  if (usedVocab.length >= 1 || usedRequired.length >= 1) vocabScore = 1;
  if (usedVocab.length >= 3 || usedRequired.length >= 2) vocabScore = 2;

  // 3. EXPLANATION — depth of reasoning
  let explanationScore = 0;
  const explainHits = EXPLANATION_WORDS.filter(ew => text.includes(ew)).length;
  if (explainHits >= 1 && wordCount >= 20) explanationScore = 1;
  if (explainHits >= 3 && wordCount >= 40) explanationScore = 2;

  // 4. EVIDENCE — examples and evidence
  let evidenceScore = 0;
  const evidenceHits = EVIDENCE_WORDS.filter(ew => text.includes(ew)).length;
  if (evidenceHits >= 1) evidenceScore = 1;
  if (evidenceHits >= 2 && wordCount >= 30) evidenceScore = 2;

  // 5. CLARITY — organization and length
  let clarityScore = 0;
  if (wordCount >= 15 && sentences.length >= 1) clarityScore = 1;
  if (wordCount >= 40 && sentences.length >= 2) clarityScore = 2;

  const totalScore = relevanceScore + vocabScore + explanationScore + evidenceScore + clarityScore;
  const percentage = Math.round((totalScore / AI_MAX_SCORE) * 100);

  // Generate feedback
  const rubricDetail = {
    relevance: { score: relevanceScore, max: 2, label: 'Relevance to Prompt' },
    vocabulary: { score: vocabScore, max: 2, label: 'Science Vocabulary' },
    explanation: { score: explanationScore, max: 2, label: 'Explanation Depth' },
    evidence: { score: evidenceScore, max: 2, label: 'Evidence & Examples' },
    clarity: { score: clarityScore, max: 2, label: 'Clarity & Organization' }
  };

  // Strengths
  const strengths = [];
  if (relevanceScore === 2) strengths.push('Your response directly addresses the question');
  if (vocabScore >= 1) strengths.push('Good use of science vocabulary (' + usedVocab.slice(0, 3).join(', ') + ')');
  if (explanationScore === 2) strengths.push('Strong explanations with reasoning');
  if (evidenceScore >= 1) strengths.push('Includes supporting examples');
  if (clarityScore === 2) strengths.push('Well-organized and clear writing');

  // Next steps
  const nextSteps = [];
  if (relevanceScore < 2) nextSteps.push('Make sure your answer directly addresses all parts of the question');
  if (vocabScore < 2) nextSteps.push('Include more science vocabulary from this lesson');
  if (explanationScore < 2) nextSteps.push('Add more "because" and "this means" explanations');
  if (evidenceScore < 2) nextSteps.push('Give specific examples to support your ideas');
  if (clarityScore < 2) nextSteps.push('Write at least 2-3 complete sentences');

  // Overall feedback message
  let feedback = '';
  if (percentage >= 80) feedback = '🌟 Excellent response! You demonstrated strong understanding.';
  else if (percentage >= 60) feedback = '👍 Good effort! A few areas to strengthen.';
  else if (percentage >= 40) feedback = '📝 You\'re on the right track. Review the feedback below for tips.';
  else feedback = '💡 Your response needs more detail. Try adding science vocabulary and explaining your reasoning.';

  return {
    score: totalScore,
    maxScore: AI_MAX_SCORE,
    percentage,
    rubric: rubricDetail,
    feedback,
    strengths: strengths.join('. ') + (strengths.length ? '.' : ''),
    nextSteps: nextSteps.join('. ') + (nextSteps.length ? '.' : ''),
    reviewType: 'ai',
    usedVocab,
    wordCount
  };
}

// ===== RENDER AI FEEDBACK UI =====
/**
 * Show AI feedback below a textarea.
 * @param {string} textareaId - ID of the textarea element
 * @param {string} prompt - The question prompt
 * @param {string} unitKey - Unit key (a-e)
 * @param {string[]} requiredTerms - Optional required terms
 */
function showAIFeedback(textareaId, prompt, unitKey, requiredTerms) {
  const textarea = document.getElementById(textareaId);
  if (!textarea) return;

  const response = textarea.value;
  const result = aiScoreResponse(response, prompt, unitKey, requiredTerms);

  // Create or find feedback container
  let feedbackEl = document.getElementById(textareaId + '-ai-feedback');
  if (!feedbackEl) {
    feedbackEl = document.createElement('div');
    feedbackEl.id = textareaId + '-ai-feedback';
    feedbackEl.className = 'ai-feedback-panel';
    textarea.parentNode.insertBefore(feedbackEl, textarea.nextSibling);
  }

  if (result.score === 0 && result.wordCount === undefined) {
    feedbackEl.innerHTML = '<p style="color:var(--text3);font-size:.82rem;font-style:italic">Write your response above, then click "Check My Work" for instant feedback.</p>';
    return;
  }

  // Rubric bars
  let rubricHTML = '';
  for (const [key, crit] of Object.entries(result.rubric)) {
    const pct = Math.round((crit.score / crit.max) * 100);
    const color = pct >= 75 ? 'var(--green,#22c55e)' : pct >= 50 ? 'var(--yellow,#fbbf24)' : 'var(--red,#ef4444)';
    rubricHTML += '<div style="margin-bottom:6px"><div style="display:flex;justify-content:space-between;font-size:.76rem;margin-bottom:2px"><span style="color:var(--text2)">' + crit.label + '</span><span style="font-weight:600;color:' + color + '">' + crit.score + '/' + crit.max + '</span></div><div style="height:4px;background:var(--card2);border-radius:2px;overflow:hidden"><div style="width:' + pct + '%;height:100%;background:' + color + ';border-radius:2px;transition:width .3s"></div></div></div>';
  }

  feedbackEl.innerHTML = `
    <div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:16px;margin-top:10px">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
        <div style="width:48px;height:48px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.2rem;font-weight:700;color:white;background:${result.percentage >= 70 ? 'linear-gradient(135deg,#22c55e,#16a34a)' : result.percentage >= 50 ? 'linear-gradient(135deg,#fbbf24,#f59e0b)' : 'linear-gradient(135deg,#ef4444,#dc2626)'}">${result.percentage}%</div>
        <div>
          <div style="font-weight:600;font-size:.92rem;color:var(--text)">${result.feedback}</div>
          <div style="font-size:.72rem;color:var(--text3)">AI Assessment · ${result.wordCount || 0} words · Score: ${result.score}/${result.maxScore}</div>
        </div>
      </div>
      <div style="margin-bottom:12px">${rubricHTML}</div>
      ${result.strengths ? '<div style="background:rgba(34,197,94,.08);border-radius:8px;padding:10px 12px;margin-bottom:8px;font-size:.82rem"><strong style="color:var(--green,#22c55e)">✅ Strengths:</strong> <span style="color:var(--text2)">' + result.strengths + '</span></div>' : ''}
      ${result.nextSteps ? '<div style="background:rgba(251,191,36,.08);border-radius:8px;padding:10px 12px;font-size:.82rem"><strong style="color:var(--yellow,#fbbf24)">💡 Next Steps:</strong> <span style="color:var(--text2)">' + result.nextSteps + '</span></div>' : ''}
      <div style="text-align:right;margin-top:8px;font-size:.68rem;color:var(--text3)">🤖 AI feedback — your teacher may also review and adjust this score</div>
    </div>`;

  // Save AI result to localStorage for teacher dashboard
  const unitKeyFinal = unitKey || (document.body.dataset.unitKey || 'a');
  const aiResult = { ...result, textareaId, prompt, timestamp: new Date().toISOString() };
  let aiResults = JSON.parse(localStorage.getItem('g7-ai-results') || '[]');
  const existIdx = aiResults.findIndex(r => r.textareaId === textareaId);
  if (existIdx >= 0) aiResults[existIdx] = aiResult;
  else aiResults.push(aiResult);
  localStorage.setItem('g7-ai-results', JSON.stringify(aiResults));

  // Submit as graded work
  try {
    submitStudentWork({
      type: 'written',
      title: 'Constructed Response: ' + textareaId,
      assignmentId: unitKeyFinal + '-' + textareaId,
      content: response,
      aiScore: result.score,
      aiMaxScore: result.maxScore,
      aiPercentage: result.percentage,
      aiFeedback: result.feedback,
      strengths: result.strengths,
      nextSteps: result.nextSteps
    });
  } catch(e) {}
}

// ===== ADD "CHECK MY WORK" BUTTONS =====
/**
 * Auto-add AI feedback buttons to all constructed response textareas.
 * Call on page load.
 */
function initAIMarking() {
  const unitKey = document.body.dataset.unitKey || 'a';
  document.querySelectorAll('.constructed-response').forEach(cr => {
    const textarea = cr.querySelector('textarea');
    if (!textarea || textarea.dataset.aiInit) return;
    textarea.dataset.aiInit = 'true';

    // Extract the prompt text
    const promptEl = cr.querySelector('p');
    const prompt = promptEl ? promptEl.textContent : '';

    // Extract required terms from prompt (text in bold or after "Use the terms")
    let requiredTerms = [];
    const termMatch = prompt.match(/[Uu]se the terms?\s+(.+?)(?:\s+in your|\.|$)/);
    if (termMatch) {
      requiredTerms = termMatch[1].split(/,\s*and\s*|,\s*|\s+and\s+/).map(t => t.trim().toLowerCase());
    }

    // Add button
    const btnWrap = document.createElement('div');
    btnWrap.style.cssText = 'margin-top:8px;display:flex;gap:8px;align-items:center';
    btnWrap.innerHTML = '<button class="activity-btn" style="font-size:.78rem;padding:6px 14px" onclick="showAIFeedback(\'' + textarea.id + '\',\'' + prompt.replace(/'/g, "\\'").substring(0, 200) + '\',\'' + unitKey + '\',' + JSON.stringify(requiredTerms) + ')">🤖 Check My Work</button><span style="font-size:.72rem;color:var(--text3)">Get instant AI feedback</span>';
    textarea.parentNode.insertBefore(btnWrap, textarea.nextSibling);
  });
}
