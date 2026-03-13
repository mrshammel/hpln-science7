/* ============================================================
   TEACHER DASHBOARD — MOCK DATA
   ============================================================ */

const UNITS = [
  { id:'A', name:'Ecosystems', icon:'🌿', lessons:8, outcomes:['STS-K.1','STS-K.2','A.K.1','A.K.2','A.K.3'] },
  { id:'B', name:'Plants for Food & Fibre', icon:'🌱', lessons:7, outcomes:['B.K.1','B.K.2','B.K.3'] },
  { id:'C', name:'Heat & Temperature', icon:'🔥', lessons:7, outcomes:['C.K.1','C.K.2','C.K.3'] },
  { id:'D', name:'Structures & Forces', icon:'🏗️', lessons:7, outcomes:['D.K.1','D.K.2','D.K.3'] },
  { id:'E', name:'Planet Earth', icon:'🌍', lessons:7, outcomes:['E.K.1','E.K.2','E.K.3'] }
];

const LESSON_ANALYTICS = [
  { unit:'A', lesson:1, title:'Intro to Ecosystems', opened:15, completed:14, avgScore:82, retryRate:20, avgTime:'18 min', missedQ:'Biotic vs Abiotic classification' },
  { unit:'A', lesson:2, title:'Interdependence', opened:14, completed:12, avgScore:76, retryRate:33, avgTime:'22 min', missedQ:'Symbiosis types' },
  { unit:'A', lesson:3, title:'Food Webs & Energy', opened:12, completed:10, avgScore:71, retryRate:40, avgTime:'25 min', missedQ:'10% energy rule' },
  { unit:'B', lesson:1, title:'Plant Structure', opened:10, completed:9, avgScore:85, retryRate:11, avgTime:'16 min', missedQ:'Monocot vs dicot' },
  { unit:'B', lesson:2, title:'Growth Conditions', opened:9, completed:7, avgScore:78, retryRate:28, avgTime:'20 min', missedQ:'Variable identification' },
  { unit:'C', lesson:1, title:'Particle Model', opened:8, completed:7, avgScore:74, retryRate:42, avgTime:'24 min', missedQ:'Conduction vs convection' },
  { unit:'C', lesson:2, title:'Heat Transfer', opened:7, completed:5, avgScore:68, retryRate:57, avgTime:'28 min', missedQ:'Radiation examples' },
  { unit:'D', lesson:1, title:'Types of Structures', opened:6, completed:5, avgScore:80, retryRate:20, avgTime:'15 min', missedQ:'Natural vs human-made' },
  { unit:'E', lesson:1, title:'Earth Layers', opened:5, completed:4, avgScore:83, retryRate:25, avgTime:'17 min', missedQ:'Layer order' }
];

function daysAgo(d){ const dt=new Date(); dt.setDate(dt.getDate()-d); return dt.toISOString().split('T')[0]; }

const MOCK_STUDENTS = [
  { id:1, name:'Aiden Blackwood', email:'aiden.b@school.ca', avatar:'', unit:'A', lesson:4, progress:38, avgScore:84, lastActive:daysAgo(0), quizAttempts:6, quizPasses:5, activitiesDone:12, activitiesTotal:16, timeSpent:'4h 20m',
    unitProgress:{A:60,B:0,C:0,D:0,E:0}, outcomes:{mastered:['STS-K.1','STS-K.2','A.K.1'],developing:['A.K.2'],notStarted:['A.K.3','B.K.1','B.K.2','B.K.3','C.K.1','C.K.2','C.K.3','D.K.1','D.K.2','D.K.3','E.K.1','E.K.2','E.K.3']},
    alerts:[], submissions:[{type:'Written',title:'Ecosystem Reflection',status:'Pending',date:daysAgo(1)}] },

  { id:2, name:'Brooklyn Chen', email:'brooklyn.c@school.ca', avatar:'', unit:'B', lesson:2, progress:52, avgScore:91, lastActive:daysAgo(0), quizAttempts:8, quizPasses:8, activitiesDone:18, activitiesTotal:20, timeSpent:'6h 10m',
    unitProgress:{A:100,B:30,C:0,D:0,E:0}, outcomes:{mastered:['STS-K.1','STS-K.2','A.K.1','A.K.2','A.K.3','B.K.1'],developing:['B.K.2'],notStarted:['B.K.3','C.K.1','C.K.2','C.K.3','D.K.1','D.K.2','D.K.3','E.K.1','E.K.2','E.K.3']},
    alerts:[], submissions:[] },

  { id:3, name:'Carter Dubois', email:'carter.d@school.ca', avatar:'', unit:'A', lesson:2, progress:15, avgScore:62, lastActive:daysAgo(9), quizAttempts:4, quizPasses:1, activitiesDone:4, activitiesTotal:16, timeSpent:'1h 45m',
    unitProgress:{A:20,B:0,C:0,D:0,E:0}, outcomes:{mastered:['STS-K.1'],developing:['STS-K.2'],notStarted:['A.K.1','A.K.2','A.K.3','B.K.1','B.K.2','B.K.3','C.K.1','C.K.2','C.K.3','D.K.1','D.K.2','D.K.3','E.K.1','E.K.2','E.K.3']},
    alerts:['Inactive 9 days','Failed L1 Quiz twice'], submissions:[] },

  { id:4, name:'Danika Firth', email:'danika.f@school.ca', avatar:'', unit:'C', lesson:1, progress:65, avgScore:88, lastActive:daysAgo(1), quizAttempts:10, quizPasses:9, activitiesDone:22, activitiesTotal:24, timeSpent:'7h 30m',
    unitProgress:{A:100,B:100,C:15,D:0,E:0}, outcomes:{mastered:['STS-K.1','STS-K.2','A.K.1','A.K.2','A.K.3','B.K.1','B.K.2','B.K.3'],developing:['C.K.1'],notStarted:['C.K.2','C.K.3','D.K.1','D.K.2','D.K.3','E.K.1','E.K.2','E.K.3']},
    alerts:[], submissions:[{type:'Drawing',title:'Food Web Drawing',status:'Approved',date:daysAgo(5)}] },

  { id:5, name:'Ethan Grewal', email:'ethan.g@school.ca', avatar:'', unit:'A', lesson:3, progress:25, avgScore:58, lastActive:daysAgo(3), quizAttempts:7, quizPasses:3, activitiesDone:8, activitiesTotal:16, timeSpent:'3h 15m',
    unitProgress:{A:40,B:0,C:0,D:0,E:0}, outcomes:{mastered:['STS-K.1'],developing:['STS-K.2','A.K.1'],notStarted:['A.K.2','A.K.3','B.K.1','B.K.2','B.K.3','C.K.1','C.K.2','C.K.3','D.K.1','D.K.2','D.K.3','E.K.1','E.K.2','E.K.3']},
    alerts:['Low quiz scores','Stuck on L2 Quiz'], submissions:[] },

  { id:6, name:'Fatima Hassan', email:'fatima.h@school.ca', avatar:'', unit:'D', lesson:1, progress:78, avgScore:92, lastActive:daysAgo(0), quizAttempts:12, quizPasses:12, activitiesDone:28, activitiesTotal:30, timeSpent:'9h 45m',
    unitProgress:{A:100,B:100,C:100,D:12,E:0}, outcomes:{mastered:['STS-K.1','STS-K.2','A.K.1','A.K.2','A.K.3','B.K.1','B.K.2','B.K.3','C.K.1','C.K.2','C.K.3'],developing:['D.K.1'],notStarted:['D.K.2','D.K.3','E.K.1','E.K.2','E.K.3']},
    alerts:[], submissions:[{type:'Photo',title:'Heat Experiment Photos',status:'Approved',date:daysAgo(3)}] },

  { id:7, name:'Gabriel Ironchild', email:'gabriel.i@school.ca', avatar:'', unit:'A', lesson:1, progress:8, avgScore:45, lastActive:daysAgo(14), quizAttempts:2, quizPasses:0, activitiesDone:2, activitiesTotal:16, timeSpent:'0h 40m',
    unitProgress:{A:8,B:0,C:0,D:0,E:0}, outcomes:{mastered:[],developing:['STS-K.1'],notStarted:['STS-K.2','A.K.1','A.K.2','A.K.3','B.K.1','B.K.2','B.K.3','C.K.1','C.K.2','C.K.3','D.K.1','D.K.2','D.K.3','E.K.1','E.K.2','E.K.3']},
    alerts:['Inactive 14 days','No quizzes passed','Very low engagement'], submissions:[] },

  { id:8, name:'Hannah Johal', email:'hannah.j@school.ca', avatar:'', unit:'B', lesson:1, progress:45, avgScore:79, lastActive:daysAgo(2), quizAttempts:6, quizPasses:5, activitiesDone:14, activitiesTotal:18, timeSpent:'5h 00m',
    unitProgress:{A:100,B:10,C:0,D:0,E:0}, outcomes:{mastered:['STS-K.1','STS-K.2','A.K.1','A.K.2','A.K.3'],developing:['B.K.1'],notStarted:['B.K.2','B.K.3','C.K.1','C.K.2','C.K.3','D.K.1','D.K.2','D.K.3','E.K.1','E.K.2','E.K.3']},
    alerts:[], submissions:[{type:'Written',title:'Symbiosis Response',status:'Needs Revision',date:daysAgo(4)}] },

  { id:9, name:'Isaac Kim', email:'isaac.k@school.ca', avatar:'', unit:'A', lesson:5, progress:42, avgScore:75, lastActive:daysAgo(1), quizAttempts:7, quizPasses:5, activitiesDone:14, activitiesTotal:16, timeSpent:'4h 50m',
    unitProgress:{A:70,B:0,C:0,D:0,E:0}, outcomes:{mastered:['STS-K.1','STS-K.2','A.K.1','A.K.2'],developing:['A.K.3'],notStarted:['B.K.1','B.K.2','B.K.3','C.K.1','C.K.2','C.K.3','D.K.1','D.K.2','D.K.3','E.K.1','E.K.2','E.K.3']},
    alerts:[], submissions:[] },

  { id:10, name:'Jade Lefebvre', email:'jade.l@school.ca', avatar:'', unit:'E', lesson:2, progress:92, avgScore:95, lastActive:daysAgo(0), quizAttempts:14, quizPasses:14, activitiesDone:34, activitiesTotal:36, timeSpent:'12h 20m',
    unitProgress:{A:100,B:100,C:100,D:100,E:30}, outcomes:{mastered:['STS-K.1','STS-K.2','A.K.1','A.K.2','A.K.3','B.K.1','B.K.2','B.K.3','C.K.1','C.K.2','C.K.3','D.K.1','D.K.2','D.K.3','E.K.1'],developing:['E.K.2'],notStarted:['E.K.3']},
    alerts:[], submissions:[{type:'Written',title:'Conservation Plan Draft',status:'Pending',date:daysAgo(0)}] },

  { id:11, name:'Kai Morrison', email:'kai.m@school.ca', avatar:'', unit:'A', lesson:3, progress:22, avgScore:68, lastActive:daysAgo(5), quizAttempts:5, quizPasses:3, activitiesDone:7, activitiesTotal:16, timeSpent:'2h 30m',
    unitProgress:{A:35,B:0,C:0,D:0,E:0}, outcomes:{mastered:['STS-K.1','STS-K.2'],developing:['A.K.1'],notStarted:['A.K.2','A.K.3','B.K.1','B.K.2','B.K.3','C.K.1','C.K.2','C.K.3','D.K.1','D.K.2','D.K.3','E.K.1','E.K.2','E.K.3']},
    alerts:['Dropping engagement'], submissions:[] },

  { id:12, name:'Lily Nguyen', email:'lily.n@school.ca', avatar:'', unit:'C', lesson:2, progress:68, avgScore:86, lastActive:daysAgo(0), quizAttempts:11, quizPasses:10, activitiesDone:24, activitiesTotal:26, timeSpent:'8h 10m',
    unitProgress:{A:100,B:100,C:25,D:0,E:0}, outcomes:{mastered:['STS-K.1','STS-K.2','A.K.1','A.K.2','A.K.3','B.K.1','B.K.2','B.K.3','C.K.1'],developing:['C.K.2'],notStarted:['C.K.3','D.K.1','D.K.2','D.K.3','E.K.1','E.K.2','E.K.3']},
    alerts:[], submissions:[] },

  { id:13, name:'Mason Olson', email:'mason.o@school.ca', avatar:'', unit:'A', lesson:2, progress:12, avgScore:55, lastActive:daysAgo(11), quizAttempts:3, quizPasses:1, activitiesDone:3, activitiesTotal:16, timeSpent:'1h 10m',
    unitProgress:{A:15,B:0,C:0,D:0,E:0}, outcomes:{mastered:[],developing:['STS-K.1'],notStarted:['STS-K.2','A.K.1','A.K.2','A.K.3','B.K.1','B.K.2','B.K.3','C.K.1','C.K.2','C.K.3','D.K.1','D.K.2','D.K.3','E.K.1','E.K.2','E.K.3']},
    alerts:['Inactive 11 days','Low quiz scores','Very low engagement'], submissions:[] },

  { id:14, name:'Noor Patel', email:'noor.p@school.ca', avatar:'', unit:'B', lesson:3, progress:55, avgScore:83, lastActive:daysAgo(1), quizAttempts:9, quizPasses:8, activitiesDone:20, activitiesTotal:22, timeSpent:'6h 40m',
    unitProgress:{A:100,B:45,C:0,D:0,E:0}, outcomes:{mastered:['STS-K.1','STS-K.2','A.K.1','A.K.2','A.K.3','B.K.1','B.K.2'],developing:['B.K.3'],notStarted:['C.K.1','C.K.2','C.K.3','D.K.1','D.K.2','D.K.3','E.K.1','E.K.2','E.K.3']},
    alerts:[], submissions:[{type:'Photo',title:'Plant Growth Photos',status:'Pending',date:daysAgo(2)}] },

  { id:15, name:'Olivia Redcrow', email:'olivia.r@school.ca', avatar:'', unit:'A', lesson:6, progress:48, avgScore:77, lastActive:daysAgo(2), quizAttempts:8, quizPasses:6, activitiesDone:16, activitiesTotal:18, timeSpent:'5h 30m',
    unitProgress:{A:80,B:0,C:0,D:0,E:0}, outcomes:{mastered:['STS-K.1','STS-K.2','A.K.1','A.K.2','A.K.3'],developing:[],notStarted:['B.K.1','B.K.2','B.K.3','C.K.1','C.K.2','C.K.3','D.K.1','D.K.2','D.K.3','E.K.1','E.K.2','E.K.3']},
    alerts:[], submissions:[] }
];

// Derive status
MOCK_STUDENTS.forEach(s => {
  const daysSince = Math.floor((Date.now() - new Date(s.lastActive).getTime()) / 86400000);
  if (s.progress >= 90) s.status = 'Complete';
  else if (daysSince >= 7 || s.avgScore < 55) s.status = 'Stuck';
  else if (daysSince >= 4 || s.avgScore < 70 || s.progress < 20) s.status = 'Behind';
  else s.status = 'On Track';
});
