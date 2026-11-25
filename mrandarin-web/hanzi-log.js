// + ========================================================================
// + WHAT PEOPLE DID, WRITTEN DOWN
// +
// + The page already measures everything a study would want. judge() cuts
// + the hundred down to the ones written in the number of strokes you
// + used, grades the best six stroke against stroke, and keeps the winner,
// + its fit, the runner up, how clearly it won, and a per stroke report of
// + where each stroke landed and which way it travelled. All of that is
// + computed, shown on the panel for about a second, and then thrown away.
// + This file is the only new idea here: keep it.
// +
// + Two kinds of person use this page and they are not answering the same
// + question.
// +
// +    a LEARNER gives performance: how many tries a character took, what
// +    kind of mistake it was, and whether a character written right once
// +    is still written right on a later visit.
// +
// +    a MANDARIN SPEAKER gives something no amount of logging can produce
// +    on its own: whether the pinyin and the meaning on file are right.
// +    They come out of a public dataset and this page states them to a
// +    learner as fact, which is a claim nobody has checked.
// +
// + That is why the group question is on the way in, not in a field at the
// + end. Everything downstream splits on it.
// +
// + CONSTRAINTS THIS WAS WRITTEN UNDER, SINCE THEY EXPLAIN MOST OF THE ODD
// + DECISIONS BELOW:
// +
// +    NO CONSENT MEANS NOTHING IS WRITTEN. Not collected and discarded,
// +    not held in memory for later: push() returns before it does
// +    anything, and the only thing in localStorage for somebody who said
// +    no is the fact that they said no, so the page stops asking. That is
// +    the one behaviour in this file worth testing by hand.
// +
// +    the page is static files on cims.nyu.edu. No server, no database,
// +    nowhere to POST. The store is localStorage and the way data leaves
// +    is a person pressing Download and sending the file.
// +
// +    a participant is a random id and a group. No name, no email, no
// +    age, no user agent string, and no free text field anywhere that
// +    invites any of them.
// +
// +    no audio, no video, no photographs. The only thing recorded about a
// +    person is lines they drew and how long they took.
// +
// +    SEVERAL PEOPLE WILL USE ONE MACHINE, one after another, because
// +    that is what handing a laptop across a table looks like. So the
// +    store holds a list of participants and every row carries the id of
// +    whoever wrote it. Starting the next person never clears the last
// +    one's rows, and nobody has to remember to export between turns.
// +
// +    localStorage throws in a private window instead of returning null,
// +    and throws again when it is full. Every read and write here is
// +    wrapped, because a throw inside check() would mean the attempt
// +    never finishes and the sheet never clears: the page would look
// +    broken by the thing that was supposed to be watching it.
// +
// +    hanziFound and hanziMine belong to the page. Nothing here touches
// +    them. Every key this file owns starts with hanziLog.
// + ========================================================================

let Log = (function () {

   // + ====================================================================
   // + EVERY WORD A PARTICIPANT READS, IN ONE PLACE
   // +
   // + Here and not scattered through the code for two reasons. The
   // + wording is Eros's to write, not mine, so it has to be one block he
   // + can rewrite without reading any code. And it has to be checkable
   // + against what the code actually does by reading one screen: if a
   // + sentence here names something that is not collected below, or the
   // + code collects something no sentence here names, that is a bug and
   // + it is the serious kind.
   // +
   // + APPROVED IS FALSE AND HAS TO STAY FALSE UNTIL EROS HAS READ THE
   // + LINE BELOW AND DECIDED IT IS THE ONE HE WANTS. WHILE IT IS FALSE
   // + THE SCREEN SAYS SO, OUT LOUD, WHERE A PARTICIPANT CAN SEE IT. A
   // + HALF WRITTEN CONSENT LINE THAT LOOKS FINISHED IS WORSE THAN ONE
   // + THAT ADMITS IT.

   let TEXT = {

      approved: false,

      // + BUMP THIS WHEN THE WORDING CHANGES, SO EVERY ROW SAYS WHICH TEXT
      // + WAS AGREED TO, AND DATA TAKEN UNDER THE DRAFT STAYS MARKED AS
      // + TAKEN UNDER A DRAFT.
      version: 'draft-2026-11-19',

      // + THE LINE UNDER THE BUTTON. SHORT ON PURPOSE: WHAT IS KEPT, WHAT
      // + FOR, THAT IT IS VOLUNTARY, AND HOW TO GET OUT. A PARAGRAPH HERE
      // + GOES UNREAD AND AN UNREAD CONSENT FORM IS NOT CONSENT.
      line:
         'An NYU class project. It saves the characters you draw, how the page '
       + 'read them, and how long you took, under a random id: no name, no email. '
       + 'Stop or delete it whenever you like, from the word in the corner.',

      consent:  'Consent to share data',
      speaker:  'Mandarin speaker',
      learner:  'Mandarin learner',
      noThanks: 'Use it without sharing',

      askGroup: 'Pick one first',
      off:      'Nothing is being recorded.',

      verifyWhat:
         'Is this right? The pinyin and the meaning come from a public dataset '
       + '(makemeahanzi), so they are a starting point, not an authority. '
       + 'Nobody has checked them yet.',

      sampleWhat: 'Somebody wrote this by hand on this page. What do you read it as?',
   };

   // + ====================================================================
   // + THE STORE
   // +
   // + One flat list of rows, every event in it, each with a kind and an
   // + id. It was three separate arrays first and that was worse: the
   // + order events happened in is itself data (a lesson shown, then four
   // + attempts, then a wipe) and three arrays throw that away for no
   // + gain. The export is where it gets split into tables.

   let KEY = {
      folk:  'hanziLog.folk',         // + everyone who has used this browser, in order
      rows:  'hanziLog.rows',         // + the event log, all of them, tagged by id
      ink:   'hanziLog.ink',          // + a sample of the actual handwriting
      given: 'hanziLog.given',        // + samples imported from somebody else's export
   };

   // + CAPS, BECAUSE localStorage IS ABOUT 5 MB AND THE PAGE MUST NOT DIE
   // + OF SUCCESS. A SITTING IS A FEW HUNDRED ATTEMPTS, SO 4000 ROWS IS
   // + SEVERAL PEOPLE IN A ROW. PAST IT, ROWS ARE DROPPED AND THE NUMBER
   // + DROPPED IS KEPT AND SHOWN, BECAUSE A LOG THAT QUIETLY STOPPED IS
   // + WORSE THAN ONE THAT SAYS IT STOPPED.

   let ROW_CAP = 4000, INK_CAP = 60, INK_POINTS = 12;

   // + THE CONFIDENCE SCALE, COPIED FROM index.html ON PURPOSE AND NOT
   // + IMPORTED: sure() LIVES INSIDE Scene() AND IS NOT REACHABLE FROM
   // + HERE. IT IS THE NEW SCALE, THE ONE THE DECISION IS ACTUALLY MADE
   // + ON: A MEAN STROKE FIT OF .30 IS ZERO CONFIDENCE, AND THE PAGE
   // + ACCEPTS AT HALF SURE. IF SPREAD EVER MOVES THERE IT HAS TO MOVE
   // + HERE TOO, OR THE NUMBERS IN THE EXPORT STOP MEANING WHAT THE PANEL
   // + SAID.

   let SPREAD = .30;
   let sure = f => { let c = 1 - f / SPREAD; return c < 0 ? 0 : c > 1 ? 1 : c; };
   let pct  = f => Math.round(sure(f) * 100);

   let folk = [], who = null, rows = [], ink = [], given = [];
   let inkSeen = 0, dropped = 0;
   let visit = 0, session = 0, seq = 0;
   let penAt = 0, how = 'picked';
   let phase = '';                    // + how the lesson now on the sheet was asked for
   let fault = '';                    // + the first thing that threw, kept to be read
   let shell = null, mode = 'panel', corner = null;

   // + ====================================================================
   // + localStorage, BUT SAFE

   let get = (k, fallback) => {
      try {
         let s = localStorage.getItem(k);
         return s ? JSON.parse(s) : fallback;
      } catch (e) { return fallback; }
   };

   let set = (k, v) => {
      try { localStorage.setItem(k, JSON.stringify(v)); return true; }
      catch (e) { if (! fault) fault = 'store full or blocked'; return false; }
   };

   // + ====================================================================
   // + THE COLLECTOR ON EROS'S MACHINE
   // +
   // + The study is eight people, P1 to P8, sitting at Eros's computer, so
   // + the data belongs on that computer's disk and not only inside the
   // + browser where nobody ever sees it. hw9-collector.py serves this
   // + page and takes the rows at the same address, so asking for
   // + 'collector' here is a question to the very server the page came
   // + from. On cims nothing answers it, `wire` stays false, and the page
   // + keeps everything in localStorage exactly as before. Either way the
   // + rows are still written to localStorage too: the disk is the copy
   // + that matters, the browser is the one that survives a dead server.
   // +
   // + Nothing is sent anywhere but back to that same origin.

   let wire = false;                  // + a collector answered at load
   let wireSent = 0, wireLost = 0;    // + rows it took, sends that failed
   let outbox = { rows: [], ink: [], people: [] };
   let flushing = false, flushAgain = false;

   let flush = () => {
      if (! wire) return;
      if (flushing) { flushAgain = true; return; }
      let batch = outbox;
      if (! batch.rows.length && ! batch.ink.length && ! batch.people.length) return;
      outbox = { rows: [], ink: [], people: [] };
      flushing = true;

      // + keepalive LETS A ROW SENT AS THE TAB CLOSES STILL ARRIVE, BUT THE
      // + BROWSER CAPS A keepalive BODY AT 64 KB AND REFUSES ANYTHING BIGGER
      // + OUTRIGHT. THE RESEND AT LOAD CAN BE THOUSANDS OF ROWS, AND WITH
      // + keepalive ON IT WOULD FAIL, BE PUT BACK, AND FAIL AGAIN FOREVER.
      // + 16000 CHARACTERS STAYS UNDER THE CAP EVEN IF EVERY ONE IS 4 BYTES.
      let body = JSON.stringify(batch);
      fetch('collector', { method: 'POST', keepalive: body.length < 16000,
                           headers: { 'Content-Type': 'application/json' },
                           body: body })
         .then(r => r.ok ? r.json() : null)
         .then(j => {
            if (! j || ! j.ok) throw 0;
            wireSent += batch.rows.length;
         })
         .catch(() => {
            // + PUT BACK, IN FRONT OF ANYTHING NEWER, AND TRIED AGAIN ON
            // + THE NEXT ROW. THE COLLECTOR DROPS DUPLICATES, SO A SEND
            // + THAT ACTUALLY ARRIVED AND ONLY LOST ITS ANSWER COSTS NOTHING.
            wireLost++;
            for (let k in outbox) outbox[k] = batch[k].concat(outbox[k]);
         })
         .finally(() => {
            flushing = false;
            if (flushAgain) { flushAgain = false; flush(); }
         });
   };

   let wireOut = (kind, r) => {
      if (! wire) return;
      outbox[kind].push(r);
      flush();
   };

   let wireForget = id => {
      if (! wire || ! id) return;
      fetch('collector', { method: 'POST', keepalive: true,
                           headers: { 'Content-Type': 'application/json' },
                           body: JSON.stringify({ forget: id }) }).catch(() => { wireLost++; });
   };

   // + ASKED ONCE, AT LOAD. A REPLY THAT IS NOT THE COLLECTOR'S OWN JSON
   // + (A 404 PAGE, A DIRECTORY LISTING) IS NOT A COLLECTOR. ON FINDING
   // + ONE, EVERYTHING THIS BROWSER ALREADY HOLDS IS SENT, SO ROWS WRITTEN
   // + WHILE THE SERVER WAS DOWN STILL REACH THE DISK.

   let probe = () => {
      fetch('collector', { cache: 'no-store' })
         .then(r => r.ok ? r.json() : null)
         .then(j => {
            if (! j || j.collector != 1) return;
            wire = true;
            for (let p of folk) if (p.id) outbox.people.push(p);
            for (let r of rows) outbox.rows.push(r);
            for (let r of ink) outbox.ink.push(r);
            flush();
         })
         .catch(() => {});
   };

   let now = () => Date.now();
   let stamp = t => { try { return new Date(t).toISOString(); } catch (e) { return ''; } };
   let day = t => stamp(t).slice(0, 10);

   // + AN ID THAT IS NOT A PERSON. SIX HEX CHARACTERS, ENOUGH TO TELL TWO
   // + EXPORTED FILES APART AND CARRYING NOTHING ABOUT ANYBODY. WHOEVER
   // + RUNS THE SESSION CAN MAP IT TO P1 OR P2 IN THEIR OWN NOTES, WHICH
   // + IS WHERE THAT MAPPING BELONGS: ON PAPER, NOT IN THE BROWSER.

   let fresh = () => {
      let s = '';
      for (let i = 0 ; i < 6 ; i++) s += '0123456789abcdef'[Math.floor(Math.random() * 16)];
      return s;
   };

   let on = () => !! (who && who.consent == 'in');

   // + ====================================================================
   // + WHAT HAPPENED BEFORE, REBUILT FROM THE ROWS
   // +
   // + Three things an attempt row has to know about the past: how many
   // + times this person has tried this character, whether they ever had
   // + it accepted and how long ago, and how many times they were shown
   // + the animation for it. Those are the whole of "did they learn it",
   // + so they cannot be left to be worked out later by hand.
   // +
   // + Derived from the rows on load rather than kept in their own key, so
   // + there is one source of truth and no second place to go stale. ONLY
   // + THIS PERSON'S ROWS: on a shared laptop the previous participant's
   // + successes are sitting in the same array, and counting them would
   // + hand the next person credit for characters they have never seen.

   let tries = {}, okAt = {}, shown = {};

   let bump = (box, c) => { if (c) box[c] = (box[c] || 0) + 1; };

   let replay = () => {
      tries = {}; okAt = {}; shown = {};
      if (! who) return;
      for (let r of rows) {
         if (r.id != who.id) continue;
         if (r.kind == 'lesson' && r.how != 'recall') bump(shown, r.target);
         if (r.kind == 'attempt') {
            bump(tries, r.target || r.read);
            if (r.outcome == 'accepted' && r.read) okAt[r.read] = r.t;
         }
      }
   };

   // + ====================================================================
   // + WRITING A ROW
   // +
   // + The first line is the whole consent rule, and it is one line on
   // + purpose: there is no path into `rows` that does not pass through
   // + here, so there is no path into `rows` that skips the check.

   let push = r => {
      if (! on()) return;
      if (rows.length >= ROW_CAP) { dropped++; return; }
      r.id = who.id;
      r.group = who.group;
      r.visit = visit;
      r.session = session;
      r.day = day(r.t);
      r.iso = stamp(r.t);
      rows.push(r);
      set(KEY.rows, rows);
      wireOut('rows', r);
   };

   // + ====================================================================
   // + KEEPING SOME OF THE ACTUAL HANDWRITING
   // +
   // + The numbers say a stroke was .06 out of place. They cannot say
   // + whether a person would read the thing. So some of the ink is kept,
   // + thinned to the same 12 points per stroke the recogniser already
   // + samples, which is enough to redraw it and far less than the raw
   // + mouse trail.
   // +
   // + WHICH 60, THOUGH. The first 60 would all be from the first ten
   // + minutes, when everybody is still clumsy, so the sample would
   // + flatter nobody and prove nothing. This is a reservoir sample: once
   // + full, a new attempt replaces a random older one with the right
   // + probability, so the 60 kept are spread evenly over everything that
   // + was written. Same storage, honest sample.

   let thin = strokes => {
      let out = [];
      for (let s of strokes) {
         let p = Score.resample(s, INK_POINTS);
         out.push(p.map(q => [ Math.round(q[0] * 1000) / 1000,
                               Math.round(q[1] * 1000) / 1000 ]));
      }
      return out;
   };

   let keepInk = (strokes, label, outcome) => {
      if (! strokes || ! strokes.length) return;
      let rec = { id: who.id, visit: visit, seq: seq, char: label,
                  outcome: outcome, strokes: thin(strokes) };
      inkSeen++;
      // + THE DISK HAS NO 5 MB LIMIT, SO IT GETS EVERY SAMPLE, NOT THE
      // + RESERVOIR: THE CAP BELOW IS ABOUT THE BROWSER, NOT THE STUDY.
      wireOut('ink', rec);
      if (ink.length < INK_CAP) ink.push(rec);
      else {
         let j = Math.floor(Math.random() * inkSeen);
         if (j < INK_CAP) ink[j] = rec;
         else return;
      }
      set(KEY.ink, ink);
   };

   // + ====================================================================
   // + READING A VERDICT
   // +
   // + check() builds four verdict shapes and then returns, so this takes
   // + the verdict exactly as the page already has it rather than asking
   // + the page to lay it out again. Which shape it is tells you the
   // + outcome:
   // +
   // +    short   you stopped mid lesson. Not a wrong answer, an
   // +            unfinished one, and counting it as an error would
   // +            inflate every error rate in the data.
   // +    noise   refused, no reading at all. why is count, far or split.
   // +    missed  read as a real character, but not the one asked for.
   // +            This is the misreading, and the one worth counting.
   // +    neither accepted.
   // +
   // + rank IS ALREADY SORTED BY FIT, SO rank[0] IS THE WINNER AT EVERY
   // + EXIT THAT HAS A RANK AT ALL. THE 'count' REFUSAL IS THE ONE CASE
   // + WITH AN EMPTY RANK, AND IT IS EMPTY FOR A REAL REASON: NOTHING IN
   // + THE BOOK IS WRITTEN IN THE NUMBER OF STROKES THAT WERE USED, SO
   // + THERE IS NOTHING TO GRADE AGAINST AND NO STROKE DETAIL EXISTS. THAT
   // + IS NOT A GAP IN THE LOG, IT IS THE ANSWER.

   let outcomeOf = v => v.short  ? 'incomplete'
                      : v.noise  ? 'refused'
                      : v.missed ? 'misread'
                      :            'accepted';

   // + WHICH GRADE GETS STORED, AND IT IS NOT ALWAYS THE WINNER'S.
   // +
   // + verdict.wrote IS THE ONE THE PAGE CHOSE TO SHOW. ON AN ACCEPT IT IS
   // + THE WINNER'S OWN REPORT, THE SAME OBJECT THE DECISION WAS MADE ON.
   // + ON A MISS IT IS GRADED AGAINST THE CHARACTER THEY WERE ASKED FOR,
   // + WHICH IS THE MORE USEFUL OF THE TWO: "HOW WRONG WAS THIS AS AN
   // + ATTEMPT AT 水" IS A QUESTION ABOUT LEARNING, AND "HOW WELL DOES IT
   // + FIT 永" IS A QUESTION ABOUT THE RECOGNISER. gradedAgainst SAYS
   // + WHICH ONE A ROW HOLDS, BECAUSE THE TWO MUST NEVER BE AVERAGED
   // + TOGETHER.

   let gradeOf = (verdict, lesson) => {
      if (verdict.wrote && verdict.wrote.strokes && verdict.wrote.strokes.length)
         return { w: verdict.wrote, against: lesson && verdict.missed ? 'target' : 'winner' };
      let top = verdict.rank && verdict.rank[0] ? verdict.rank[0] : null;
      if (top && top.wrote && top.wrote.strokes && top.wrote.strokes.length)
         return { w: top.wrote, against: 'winner' };
      return { w: null, against: '' };
   };

   let r3 = v => Math.round(v * 1000) / 1000;

   let strokeStats = w => {
      if (! w || ! w.strokes || ! w.strokes.length)
         return { mean: '', worst: '', back: '', place: '', ok: '', each: null };
      let sum = 0, worst = 0, back = 0, place = 0, each = [];
      for (let s of w.strokes) {
         sum += s.shape;
         if (s.shape > worst) worst = s.shape;
         if (s.backwards) back++;
         else if (! s.good) place++;
         // + THE FULL REPORT, STROKE BY STROKE, KEPT ONLY IN THE JSON. IT
         // + IS THE ONLY WAY TO ASK LATER WHETHER IT IS ALWAYS THE SAME
         // + STROKE THAT GOES WRONG, WHICH THE AVERAGES CANNOT ANSWER.
         each.push({ shape: r3(s.shape), heading: r3(s.heading),
                     good: s.good ? 1 : 0, backwards: s.backwards ? 1 : 0 });
      }
      return { mean: r3(sum / w.strokes.length), worst: r3(worst),
               back: back, place: place, ok: w.ok ? 1 : 0, each: each };
   };

   // + ====================================================================
   // + THE OVERLAY
   // +
   // + Plain DOM, deliberately, on a page that is otherwise one canvas.
   // + Three reasons, in order of how much they matter: the consent line
   // + has to be selectable and resizable by whoever is reading it, a
   // + Mandarin speaker correcting a gloss needs a real text field, and
   // + all of it has to exist without touching the canvas layout, which is
   // + somebody else's work.
   // +
   // + It only exists while it is open. Closed, the one thing on screen is
   // + the small word in the corner. That matters because the page's
   // + mouseup listener is on the window: a backdrop sitting over the
   // + canvas the whole time would eat strokes.

   let css = {
      back: 'position:fixed;inset:0;background:rgba(3,4,6,.88);z-index:9;'
          + 'display:flex;align-items:center;justify-content:center;'
          + 'font:15px/1.55 system-ui,sans-serif;color:#e2e8f1',
      card: 'background:#151a21;border:1px solid #292f3f;border-radius:10px;'
          + 'padding:26px 28px;max-width:560px;max-height:86vh;overflow:auto',
      btn:  'background:#222a35;color:#e2e8f1;border:1px solid #39465c;'
          + 'border-radius:6px;padding:9px 14px;margin:4px 6px 4px 0;'
          + 'font:14px system-ui,sans-serif;cursor:pointer',
      big:  'background:#1a3550;color:#e2e8f1;border:1px solid #4a9eff;'
          + 'border-radius:6px;padding:12px 20px;margin:4px 0;'
          + 'font:600 16px system-ui,sans-serif;cursor:pointer;width:100%',
      plain:'background:none;color:#8a95a6;border:0;padding:8px 0;'
          + 'margin:2px 18px 2px 0;'   // + two of these in a row ran into one word
          + 'font:14px system-ui,sans-serif;cursor:pointer;text-decoration:underline',

      // + A CJK STACK, NAMED, BECAUSE A PLAIN serif IS NOT ONE. ON A MAC
      // + WITHOUT IT THE BROWSER FALLS BACK TO WHATEVER HAS THE GLYPH AND
      // + 一 CAME OUT AS A LINE WITH A SPUR ON IT. THE CHARACTER BEING
      // + VERIFIED HAS TO BE THE CHARACTER, DRAWN PROPERLY, OR THE
      // + JUDGEMENT IS ABOUT THE FONT.
      hanzi: 'font-family:"PingFang SC","Hiragino Sans GB","Heiti SC",'
          + '"Songti SC","Noto Sans CJK SC","Microsoft YaHei",serif',
      corner: 'position:fixed;right:12px;bottom:10px;z-index:8;background:none;'
          + 'border:0;color:#515868;font:13px system-ui,sans-serif;cursor:pointer',
      field: 'width:100%;box-sizing:border-box;background:#0b0e13;color:#e2e8f1;'
          + 'border:1px solid #39465c;border-radius:6px;padding:8px;margin:6px 0;'
          + 'font:14px system-ui,sans-serif',
      hole: 'border:1px dashed #4a9eff;border-radius:6px;padding:8px 10px;'
          + 'margin:0 0 12px;color:#b9d9fa;font-size:13px',
      quiet: 'color:#8a95a6',
   };

   let el = (tag, style, text) => {
      let d = document.createElement(tag);
      if (style) d.setAttribute('style', style);
      if (text !== undefined) d.textContent = text;
      return d;
   };

   let button = (label, act, style) => {
      let b = el('button', style || css.btn, label);
      b.onclick = act;
      return b;
   };

   let showCorner = () => {
      if (corner) return;
      corner = el('button', css.corner, 'data');
      corner.onclick = () => { mode = who ? 'panel' : 'ask'; draw(); };
      document.body.appendChild(corner);
   };

   let close = () => { if (shell) { shell.remove(); shell = null; } };

   // + ----------------------------------------------------------------
   // + THE WAY IN: ONE BUTTON AND TWO WORDS
   // +
   // + The group has to be picked before the consent button does anything,
   // + because there is no useful row where somebody agreed to be recorded
   // + and never said which side they are on. The button stays pressable
   // + and says so instead of being greyed out: a dead control tells you
   // + nothing about why it is dead.
   // +
   // + The way out is a plain underlined word, not a second big button.
   // + Two matching buttons would make declining feel like a choice
   // + between two things the page wants equally, and it is not: the page
   // + works the same either way and that is what the word says.

   let askView = card => {

      let pick = '';
      let marks = {}, row = el('div', 'display:flex;gap:8px;margin:0 0 14px');
      let paint = () => {
         for (let k in marks)
            marks[k].setAttribute('style', css.btn + ';flex:1;margin:0'
               + (pick == k ? ';border-color:#4a9eff;background:#1a3550' : ''));
      };
      for (let k of ['speaker', 'learner']) {
         marks[k] = button(TEXT[k], () => { pick = k; paint(); warn.textContent = ''; });
         row.appendChild(marks[k]);
      }
      paint();
      card.appendChild(row);

      card.appendChild(button(TEXT.consent, () => {
         if (! pick) { warn.textContent = TEXT.askGroup; return; }
         decide('in', pick);
         arrived();
      }, css.big));

      card.appendChild(el('p', 'margin:8px 0 0;font-size:13px;' + css.quiet, TEXT.line));
      let warn = el('p', 'margin:6px 0 0;color:#4a9eff;min-height:1.3em', '');
      card.appendChild(warn);
      card.appendChild(button(TEXT.noThanks, () => { decide('out', pick || 'unsaid'); arrived(); },
                              css.plain));
   };

   // + SOMEBODY NEW HAS THE PAGE. THE COLLECTION GRID IS index.html'S AND
   // + NOT THIS FILE'S, SO THIS ONLY SAYS SO AND THE PAGE EMPTIES ITS OWN
   // + GRID. WITHOUT IT, P2 SAT DOWN IN FRONT OF EVERYTHING P1 HAD FOUND
   // + AND EVERY "FIRST FIND" IN P2'S ROWS WAS REALLY P1'S.

   let arrived = () => {
      try { window.dispatchEvent(new Event('hanzi-person')); } catch (e) {}
   };

   // + ----------------------------------------------------------------
   // + THE PANEL
   // +
   // + The counts are shown because a participant is owed the ability to
   // + see exactly how much of them is sitting there, and because it is
   // + the only way to catch a wiring mistake: if the number does not go
   // + up when you write something, a call site is missing.

   // + ====================================================================
   // + THE QUESTIONS AT THE END OF THE STUDY
   // +
   // + The log can time a person and count their misses. It cannot know
   // + whether the page read them fairly, or whether a character written
   // + from memory was learnt today or known for years. So those are asked.
   // + Buttons only, no typing, because the laptop is handed from one
   // + person to the next and nobody is there to explain a form.
   // +
   // + `pick` is one answer out of a few. `chars` is the study's own
   // + characters, any number of them, or none. A new question is a new
   // + line here and a new column in the survey row.

   let SURVEY = [
      // + A FREQUENCY AND NOT YES OR NO: EVERYBODY WRITES TEN TIMES OR MORE,
      // + AND "SOMETIMES" WAS THE ONLY ANSWER LEFT BOTH FOR ONE MISREADING
      // + AND FOR NINE. THE LAST OPTION STANDS APART BECAUSE A LEARNER
      // + OFTEN CANNOT KNOW WHETHER WHAT THEY WROTE WAS RIGHT.
      { key: 'pageRead', ask: 'How often did the page read what you wrote correctly?',
        pick: [['always', 'Always'], ['most', 'Most of the time'], ['sometimes', 'Sometimes'],
               ['rarely', 'Rarely'], ['never', 'Never'], ['cannot-tell', "I can't tell"]],
        apart: 'cannot-tell' },
      // + "FROM MEMORY", BECAUSE RECOGNISING A CHARACTER IS NOT WRITING IT.
      { key: 'knew', chars: true,
        ask: 'Which of these could you already write from memory before today? Tap all that apply.' },
      // + WITH NOBODY WATCHING, THE ONLY SIGN THAT THE STEPS THEMSELVES
      // + FAILED: A MISS FROM MEMORY IS EITHER FORGETTING OR NOT KNOWING
      // + WHAT WAS BEING ASKED, AND THE LOG CANNOT TELL THOSE APART.
      { key: 'clear', ask: 'Was it clear what to do at each step?',
        pick: [['yes', 'Yes'], ['mostly', 'Mostly'], ['no', 'No, I got lost']] },
   ];
   let surveyChars = [], answers = {};

   let lit = 'background:#1a3550;border-color:#4a9eff;';
   let surveyView = card => {
      card.appendChild(el('h2', 'margin:0 0 16px;font:600 19px system-ui,sans-serif',
                          'Three quick questions'));
      let ready = true;
      for (let q of SURVEY) {
         card.appendChild(el('div', 'margin:0 0 6px', q.ask));
         let row = el('div', 'margin:0 0 18px');
         if (q.pick) {
            for (let a of q.pick)
               row.appendChild(button(a[1], () => { answers[q.key] = a[0]; draw(); },
                                      css.btn + (answers[q.key] == a[0] ? lit : '')
                                              + (q.apart == a[0] ? 'margin-left:16px;' : '')));
            if (! answers[q.key]) ready = false;
         }
         else {
            let had = answers[q.key] || (answers[q.key] = { some: {}, none: false });
            for (let c of surveyChars)
               row.appendChild(button(c, () => { had.some[c] = ! had.some[c];
                                                 had.none = false; draw(); },
                                      css.btn + css.hanzi + ';font-size:26px;padding:6px 14px;'
                                              + (had.some[c] ? lit : '')));
            row.appendChild(button('None of them', () => { had.some = {}; had.none = true; draw(); },
                                   css.btn + (had.none ? lit : '')));
            if (! had.none && ! surveyChars.some(c => had.some[c])) ready = false;
         }
         card.appendChild(row);
      }
      let done = button('Done', () => {
         let r = { kind: 'survey', t: now(), target: '', read: '' };
         for (let q of SURVEY)
            r[q.key] = q.pick ? answers[q.key]
                     : answers[q.key].none ? 'none'
                     : surveyChars.filter(c => answers[q.key].some[c]).join('');
         push(r);
         mode = 'thanks'; draw();
      }, css.big + (ready ? '' : 'opacity:.35;'));
      done.disabled = ! ready;
      card.appendChild(done);
   };

   // + AND THE LAST SCREEN. IT SAYS WHERE THE ROWS WENT, BECAUSE "SAVED" WITH
   // + NOTHING BEHIND IT IS A CLAIM, AND THE NEXT PERSON IS ONE BUTTON AWAY.

   let thanksView = card => {
      let s = state();
      card.appendChild(el('h2', 'margin:0 0 10px;font:600 19px system-ui,sans-serif',
                          'That is all. Thank you.'));
      card.appendChild(el('div', css.quiet + ';margin:0 0 18px',
           ! s.on        ? 'Nothing was recorded.'
         : s.collector   ? 'Saved on this computer.'
                         : 'Saved in this browser only. Download a copy before the next person.'));
      card.appendChild(button('Next person', () => { location.reload(); }, css.big));
      if (s.on)
         card.appendChild(button('Download a copy', () => { save('json'); }, css.plain));
   };

   let panelView = card => {
      let s = state();
      card.appendChild(el('h2', 'margin:0 0 10px;font:600 19px system-ui,sans-serif',
                          'What this browser is holding'));

      if (! s.on) card.appendChild(el('p', 'margin:0 0 10px;color:#4a9eff', TEXT.off));

      card.appendChild(el('p', 'margin:0 0 4px',
         s.group == 'speaker' ? TEXT.speaker : s.group == 'learner' ? TEXT.learner
                                                                   : 'No group chosen.'));
      card.appendChild(el('p', 'margin:0 0 12px;' + css.quiet,
         'id ' + (s.id || 'none') + ' · visit ' + s.visit + ' · ' + s.attempts
         + ' attempts · ' + s.judgements + ' judgements · ' + s.ink + ' samples kept'
         + (s.people > 1 ? ' · ' + s.people + ' people in this browser' : '')
         + (s.dropped ? ' · ' + s.dropped + ' rows dropped at the cap' : '')
         + (s.fault ? ' · note: ' + s.fault : '')
         // + PLACEHOLDER WORDING, EROS'S TO REWRITE. IT HAS TO EXIST: THE
         // + PERSON RUNNING THE SESSION NEEDS ONE GLANCE TO KNOW THE DISK IS
         // + GETTING THE ROWS BEFORE THE PARTICIPANT STARTS.
         + (s.collector ? ' · collector: ' + s.collectorSent + ' rows on disk'
                          + (s.collectorFailed ? ', ' + s.collectorFailed + ' sends failed' : '')
                        : ' · no collector, browser only')));

      let row = el('div');
      row.appendChild(button('Download raw data (JSON)', () => save('json')));
      row.appendChild(button('Download table (CSV)', () => save('csv')));
      row.appendChild(button('Download summary', () => save('summary')));
      card.appendChild(row);

      if (s.group == 'speaker') {
         let two = el('div', 'margin-top:6px');
         two.appendChild(button('Check the meanings', () => { mode = 'gloss'; draw(); }));
         two.appendChild(button('Read handwriting', () => { mode = 'samples'; draw(); }));
         card.appendChild(two);
      }

      let last = el('div', 'margin-top:10px');
      // + HANDING THE LAPTOP ON IS THE COMMON CASE AND IT GETS ITS OWN
      // + BUTTON, BECAUSE THE ALTERNATIVE IS THE NEXT PERSON'S ATTEMPTS
      // + QUIETLY LANDING UNDER THE LAST PERSON'S ID.
      last.appendChild(button('Next person', () => { mode = 'ask'; draw(); }));
      if (s.on) last.appendChild(button('Stop recording me', () => decide('out', s.group)));
      last.appendChild(button('Delete my data', () => {
         if (confirm('Delete everything written down under id ' + s.id + '?')) forget(false);
      }));
      last.appendChild(button('Delete everyone', () => {
         if (confirm('Delete everything this browser has written down, for everybody?'))
            forget(true);
      }));
      card.appendChild(last);
      card.appendChild(button('Close', close, css.plain));
   };

   // + ----------------------------------------------------------------
   // + VERIFYING A GLOSS: THE MANDARIN SPEAKER'S JOB
   // +
   // + The pinyin and the meaning on this page come out of makemeahanzi.
   // + They are good and they are unchecked, and the page states them to a
   // + learner as fact, which is the kind of claim a project should not be
   // + making on borrowed data alone. One person who reads Mandarin going
   // + through them turns a borrowed gloss into a checked one, and the
   // + disagreements are the interesting rows.
   // +
   // + The character is drawn as text here, not out of the atlas, because
   // + what is being verified is the pair (character, gloss) and a system
   // + font shows the character the way a reader expects to see it.

   let glossAt = 0, shownAt = 0;

   let glossView = card => {
      let data = typeof HANZI_DATA == 'undefined' ? [] : HANZI_DATA;
      if (! data.length) { card.appendChild(el('p', '', 'No characters loaded.')); return; }

      // + UNCHECKED ONES FIRST, SO A SECOND SITTING CARRIES ON INSTEAD OF
      // + ASKING THE SAME TWENTY AGAIN.
      let done = {};
      for (let r of rows)
         if (r.kind == 'judge' && r.jkind == 'gloss' && r.id == who.id) done[r.char] = true;
      let pool = data.filter(e => ! done[e.char]);
      let e = pool.length ? pool[glossAt % pool.length] : data[glossAt % data.length];

      card.appendChild(el('p', 'margin:0 0 6px;' + css.quiet,
         (data.length - pool.length) + ' of ' + data.length + ' checked'));
      card.appendChild(el('div', 'font-size:96px;line-height:1.1;text-align:center;'
                                 + 'margin:6px 0;' + css.hanzi, e.char));
      card.appendChild(el('div', 'text-align:center;font:600 22px system-ui,sans-serif',
                          e.pinyin));
      card.appendChild(el('div', 'text-align:center;margin:4px 0 14px', e.meaning));
      card.appendChild(el('p', 'margin:0 0 10px;' + css.quiet, TEXT.verifyWhat));

      let fix = el('input', css.field);
      fix.placeholder = 'If something is wrong, what should it say?';

      let answer = v => {
         judged({ jkind: 'gloss', char: e.char, pinyinShown: e.pinyin,
                  meaningShown: e.meaning, verdict: v,
                  fix: String(fix.value || '').slice(0, 200),
                  ms: now() - shownAt });
         glossAt++;
         draw();
      };

      let row = el('div');
      row.appendChild(button('Both right',    () => answer('both-right')));
      row.appendChild(button('Pinyin wrong',  () => answer('pinyin-wrong')));
      row.appendChild(button('Meaning wrong', () => answer('meaning-wrong')));
      row.appendChild(button('Both wrong',    () => answer('both-wrong')));
      row.appendChild(button('Not sure',      () => answer('not-sure')));
      card.appendChild(row);
      card.appendChild(fix);
      card.appendChild(button('Skip', () => { glossAt++; draw(); }, css.plain));
      card.appendChild(button('Back', () => { mode = 'panel'; draw(); }, css.plain));
   };

   // + ----------------------------------------------------------------
   // + READING SOMEBODY ELSE'S HANDWRITING, WHICH IS THE OPTIONAL HALF
   // +
   // + A second, separate screen on purpose. Checking the glosses is the
   // + job the study already plans for a Mandarin speaker. THIS one is an
   // + extra idea and it is Eros's call whether it belongs anywhere: the
   // + study grades handwriting from paper, blind, with a rubric, and this
   // + is not that. What it would give is the only ground truth there is
   // + for the recogniser, which is currently trusted on the strength of
   // + 1050 attempts simulated by the same person who wrote the scorer.
   // + Delete this screen and nothing else in the file stops working.
   // +
   // + The awkward part is real and has no clever fix: no server, so one
   // + browser only holds its own ink. A learner presses Download, sends
   // + the file, and the Mandarin speaker pastes it in here.
   // +
   // + The sample is redrawn as an SVG polyline per stroke, from the same
   // + points the recogniser saw, so what is judged is exactly what was
   // + scored and not a prettier version of it.

   let sampleAt = 0;

   let inkSvg = rec => {
      let ns = 'http://www.w3.org/2000/svg';
      let svg = document.createElementNS(ns, 'svg');
      svg.setAttribute('viewBox', '-.55 -.55 1.1 1.1');
      svg.setAttribute('width', '240');
      svg.setAttribute('height', '240');
      svg.setAttribute('style',
         'background:#ecefF3;border-radius:6px;display:block;margin:0 auto');
      for (let s of rec.strokes) {
         let p = document.createElementNS(ns, 'polyline');
         p.setAttribute('points', s.map(q => q[0] + ',' + q[1]).join(' '));
         p.setAttribute('fill', 'none');
         p.setAttribute('stroke', '#14161a');
         p.setAttribute('stroke-width', '.045');
         p.setAttribute('stroke-linecap', 'round');
         p.setAttribute('stroke-linejoin', 'round');
         svg.appendChild(p);
      }
      return svg;
   };

   let samplesView = card => {
      let pool = given.concat(ink);
      card.appendChild(el('h2', 'margin:0 0 10px;font:600 19px system-ui,sans-serif',
                          'Read somebody\'s writing'));

      if (! pool.length)
         card.appendChild(el('p', 'margin:0 0 10px',
            'There is no handwriting here yet. Paste the contents of a hanzi-log '
          + 'JSON file somebody sent you and the samples in it become judgeable.'));
      else {
         let rec = pool[sampleAt % pool.length];
         card.appendChild(el('p', 'margin:0 0 8px;' + css.quiet,
            'sample ' + ((sampleAt % pool.length) + 1) + ' of ' + pool.length
            + ' · from ' + (rec.id || 'unknown')));
         card.appendChild(inkSvg(rec));
         card.appendChild(el('p', 'margin:12px 0 6px', TEXT.sampleWhat));

         let said = el('input', css.field);
         said.placeholder = 'The character you read, or leave it empty';

         // + WHAT THE MACHINE READ IS NOT SHOWN BEFORE THE JUDGEMENT. IT
         // + WOULD ANCHOR THE READER ONTO IT, AND THE AGREEMENT NUMBER
         // + WOULD THEN BE MEASURING THE SUGGESTION INSTEAD OF THE
         // + HANDWRITING.
         let answer = v => {
            judged({ jkind: 'sample', char: String(said.value || '').slice(0, 4),
                     verdict: v, sampleFrom: rec.id || '',
                     sampleKey: (rec.visit || 0) + ':' + (rec.seq || 0),
                     machineRead: rec.char || '', ms: now() - shownAt });
            sampleAt++;
            draw();
         };

         card.appendChild(said);
         let row = el('div');
         row.appendChild(button('I can read it', () => answer('readable')));
         row.appendChild(button('Barely',        () => answer('barely')));
         row.appendChild(button('Not readable',  () => answer('unreadable')));
         card.appendChild(row);
         card.appendChild(button('Skip', () => { sampleAt++; draw(); }, css.plain));
      }

      let box = el('textarea', css.field + ';height:90px');
      box.placeholder = 'Paste a hanzi-log JSON export here';
      card.appendChild(box);
      card.appendChild(button('Load those samples', () => {
         let n = take(box.value);
         box.value = '';
         alert(n < 0 ? 'That did not read as a hanzi-log export.' : n + ' samples loaded.');
         draw();
      }));
      card.appendChild(button('Back', () => { mode = 'panel'; draw(); }, css.plain));
   };

   // + ----------------------------------------------------------------

   let draw = () => {
      try {
         if (shell) shell.remove();
         shell = el('div', css.back);
         let card = el('div', css.card);
         shell.appendChild(card);
         shownAt = now();
         if (mode == 'ask') askView(card);
         else if (mode == 'gloss') glossView(card);
         else if (mode == 'samples') samplesView(card);
         else if (mode == 'survey') surveyView(card);
         else if (mode == 'thanks') thanksView(card);
         else panelView(card);
         document.body.appendChild(shell);
      }
      catch (e) { if (! fault) fault = 'overlay: ' + e; close(); }
   };

   // + ====================================================================
   // + A DECISION, WHICH IS ALWAYS A NEW PARTICIPANT
   // +
   // + Every yes or no appends a new entry rather than editing the last
   // + one, and that one rule is what makes a shared laptop work. The
   // + person holding it now is folk[last]; everybody before them is still
   // + in the list with their rows intact, and nobody has to remember to
   // + export between turns.
   // +
   // + A NO WRITES DOWN ALMOST NOTHING: no id, no group that could be
   // + paired with anything, just the fact that somebody declined, which
   // + exists so the page stops asking on the next load. Saying no leaves
   // + no trace that is about a person.

   let decide = (consent, group) => {
      if (consent == 'in')
         who = { id: fresh(), group: group, consent: 'in',
                 consentVersion: TEXT.version, consentAt: now(),
                 days: [], sessions: 0 };
      else
         who = { consent: 'out', at: now() };

      folk.push(who);
      set(KEY.folk, folk);
      if (consent == 'in') wireOut('people', who);
      tries = {}; okAt = {}; shown = {};
      seq = 0; penAt = 0;
      if (consent == 'in') openSession();
      mode = 'panel';
      close();
      showCorner();
   };

   // + A VISIT AND A PAGE LOAD ARE NOT THE SAME THING, AND THE STUDY PLAN
   // + COUNTS VISITS. RELOADING TWICE IN AN AFTERNOON IS ONE VISIT WITH
   // + THREE SESSIONS IN IT, SO BOTH NUMBERS ARE KEPT: THE VISIT IS HOW
   // + MANY DISTINCT DAYS THIS ID HAS WRITTEN ON THIS PAGE, THE SESSION IS
   // + JUST WHICH LOAD. COUNTING RELOADS AS VISITS WOULD HAVE MADE "STILL
   // + RIGHT ON THE SECOND VISIT" MEAN NOTHING AT ALL.

   let openSession = () => {
      let t = now(), today = day(t);
      who.days = who.days || [];
      if (who.days.indexOf(today) < 0) who.days.push(today);
      visit = who.days.length;
      session = (who.sessions || 0) + 1;
      who.sessions = session;
      set(KEY.folk, folk);
      seq = 0;
      push({ kind: 'session', t: t, target: '', read: '' });
   };

   // + DELETE. MINE MEANS MINE: ON A SHARED LAPTOP, THROWING AWAY THE
   // + PERSON BEFORE YOU BECAUSE YOU CHANGED YOUR MIND WOULD BE A BUG
   // + WITH NOBODY LEFT TO REPORT IT.

   let forget = everyone => {
      // + ON THE DISK, ONLY THE PERSON HOLDING THE PAGE IS DELETED, EVEN BY
      // + "DELETE EVERYONE". THAT BUTTON IS IN FRONT OF EVERY PARTICIPANT,
      // + AND ONE PRESS MUST NOT BE ABLE TO WIPE THE SEVEN BEFORE THEM OFF
      // + EROS'S MACHINE. THE BROWSER IS STILL CLEARED AS IT ALWAYS WAS.
      if (who && who.id) wireForget(who.id);
      if (everyone) {
         for (let k in KEY) { try { localStorage.removeItem(KEY[k]); } catch (e) {} }
         folk = []; who = null; rows = []; ink = []; given = [];
         inkSeen = 0; dropped = 0; visit = 0; session = 0; seq = 0;
         mode = 'ask';
      }
      else {
         let id = who ? who.id : '';
         rows = rows.filter(r => r.id != id);
         ink = ink.filter(r => r.id != id);
         folk = folk.filter(p => p !== who);
         who = null;
         set(KEY.rows, rows); set(KEY.ink, ink); set(KEY.folk, folk);
         mode = 'ask';
      }
      replay();
      draw();
   };

   // + ====================================================================
   // + THE EXPORT, WHICH IS THE ONLY WAY DATA LEAVES THIS MACHINE
   // +
   // + Three shapes, because three different things want it. JSON keeps
   // + everything, including the per stroke reports and the handwriting,
   // + and it is what another browser loads back in to be judged. CSV is
   // + flat tables for whatever does the counting. The summary is a
   // + Markdown table meant to be pasted into a document, because the
   // + write-up is Markdown going to PDF and nobody pastes a CSV into
   // + that.
   // +
   // + The raw rows and the summary are separate files on purpose. The raw
   // + data has to stay separable from anything built on top of it, so the
   // + counts in the summary can always be checked against the rows they
   // + came from.
   // +
   // + EVERYBODY IN THIS BROWSER GOES IN ONE FILE, SEPARATED BY THE id
   // + COLUMN. Splitting per person would mean several downloads and a way
   // + to lose one.

   let ATTEMPT_COLS = ['id','group','visit','session','seq','day','iso','t','mode',
                       'target','read','outcome','why','sure1','sure2','fit1','fit2',
                       'margin','runnerUp','shortlisted','cloud1','strokesDrawn',
                       'strokesNeeded','gradedAgainst','shapeMean','shapeWorst',
                       'backwards','outOfPlace','orderOk','drawMs','gapMean','gapWorst',
                       'tryN','okBefore','sinceOkMs','shownBefore','shortlist'];

   let JUDGE_COLS   = ['id','group','visit','day','iso','t','jkind','char','pinyinShown',
                       'meaningShown','verdict','fix','machineRead','sampleFrom',
                       'sampleKey','ms'];

   let EVENT_COLS   = ['id','group','visit','session','day','iso','t','kind',
                       'target','read','how','strokesDrawn','strokesNeeded',
                       'pageRead','knew','clear'];

   let cell = v => {
      let s = v === undefined || v === null ? '' : String(v);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
   };
   let table = (cols, list) =>
      [cols.join(',')].concat(list.map(r => cols.map(c => cell(r[c])).join(','))).join('\n');

   let attempts = () => rows.filter(r => r.kind == 'attempt');
   let judges   = () => rows.filter(r => r.kind == 'judge');

   // + ----------------------------------------------------------------
   // + THE SUMMARY, THE ONLY PLACE THIS FILE DOES ARITHMETIC ON ITS OWN
   // + DATA
   // +
   // + One row per person per visit, because that is the shape the
   // + write-up asks for: readings and misreadings per visit. Every number
   // + here is a count of rows that are also in the raw export, so
   // + anything in this table can be recomputed from the raw file and
   // + checked. That is the point of shipping both.

   let summary = () => {
      let out = [];
      out.push('# hanzi-log summary');
      out.push('');
      out.push('exported ' + stamp(now()).slice(0, 16).replace('T', ' ')
               + ' · consent text ' + TEXT.version
               + (TEXT.approved ? '' : ' (DRAFT, not approved)'));
      if (dropped)
         out.push('\nWARNING: ' + dropped + ' rows were dropped at the storage cap, '
                  + 'so the counts below are short by that much.');
      out.push('');
      out.push('## Per person, per visit');
      out.push('');
      out.push('| id | group | visit | day | attempts | read correctly | misread | refused '
               + '| unfinished | characters reached | strokes drawn backwards '
               + '| strokes out of place |');
      out.push('|---|---|---|---|---|---|---|---|---|---|---|---|');

      let box = {};
      for (let r of attempts()) {
         let k = r.id + '|' + r.visit;
         let b = box[k] = box[k] || { id: r.id, group: r.group, visit: r.visit, day: r.day,
                                      n: 0, ok: 0, miss: 0, ref: 0, un: 0, chars: {},
                                      back: 0, place: 0 };
         b.n++;
         if (r.outcome == 'accepted') { b.ok++; if (r.read) b.chars[r.read] = true; }
         if (r.outcome == 'misread') b.miss++;
         if (r.outcome == 'refused') b.ref++;
         if (r.outcome == 'incomplete') b.un++;
         if (r.backwards) b.back += r.backwards;
         if (r.outOfPlace) b.place += r.outOfPlace;
      }
      for (let k of Object.keys(box)) {
         let b = box[k], c = 0;
         for (let x in b.chars) c++;
         out.push('| ' + [b.id, b.group, b.visit, b.day, b.n, b.ok, b.miss, b.ref, b.un,
                          c, b.back, b.place].join(' | ') + ' |');
      }

      // + ATTEMPTS TO FIRST SUCCESS, PER CHARACTER. THE ONE NUMBER THAT
      // + MEANS "HOW HARD WAS THIS ONE", AND IT ONLY EXISTS BECAUSE tryN
      // + WAS WRITTEN DOWN AT THE TIME.
      out.push('');
      out.push('## First success, per person and character');
      out.push('');
      out.push('| id | character | tries to first success | times shown before it '
               + '| attempts after | still right after | hours since first success |');
      out.push('|---|---|---|---|---|---|---|');
      let first = {}, after = {}, afterOk = {}, lastAt = {};
      for (let r of attempts()) {
         let c = r.read || r.target;
         if (! c) continue;
         let k = r.id + '|' + c;
         if (r.outcome == 'accepted' && ! first[k])
            first[k] = { id: r.id, char: c, tryN: r.tryN, shown: r.shownBefore, t: r.t };
         else if (first[k]) {
            after[k] = (after[k] || 0) + 1;
            if (r.outcome == 'accepted') { afterOk[k] = (afterOk[k] || 0) + 1; lastAt[k] = r.t; }
         }
      }
      for (let k of Object.keys(first)) {
         let f = first[k];
         let gap = lastAt[k] ? Math.round((lastAt[k] - f.t) / 36e5 * 10) / 10 : '';
         out.push('| ' + [f.id, f.char, f.tryN, f.shown, after[k] || 0, afterOk[k] || 0, gap]
                  .join(' | ') + ' |');
      }

      // + THE MANDARIN SPEAKER'S SIDE, IF THERE IS ONE
      let g = judges().filter(r => r.jkind == 'gloss');
      if (g.length) {
         let tally = {};
         for (let r of g) tally[r.verdict] = (tally[r.verdict] || 0) + 1;
         out.push('');
         out.push('## Glosses checked by a Mandarin speaker');
         out.push('');
         out.push('| judgement | count |');
         out.push('|---|---|');
         for (let k of Object.keys(tally)) out.push('| ' + k + ' | ' + tally[k] + ' |');
         let fixes = g.filter(r => r.fix);
         if (fixes.length) {
            out.push('');
            out.push('Corrections offered:');
            out.push('');
            for (let r of fixes) out.push('- ' + r.char + ': ' + r.fix);
         }
      }

      let s = judges().filter(r => r.jkind == 'sample');
      if (s.length) {
         let agree = 0, named = 0;
         for (let r of s)
            if (r.char && r.machineRead) { named++; if (r.char == r.machineRead) agree++; }
         out.push('');
         out.push('## Handwriting read by a Mandarin speaker');
         out.push('');
         out.push(s.length + ' samples judged. Of the ' + named + ' where the reader named '
                  + 'a character, ' + agree + ' matched what the page had read.');
      }

      out.push('');
      return out.join('\n');
   };

   let bundle = () => ({
      what: 'hanzi-log',
      version: 2,
      consentVersion: TEXT.version,
      consentApproved: TEXT.approved,
      exportedAt: stamp(now()),
      folk: folk,
      dropped: dropped,
      fault: fault,
      rows: rows,
      ink: ink,
   });

   let drop = (name, text, type) => {
      try {
         let a = document.createElement('a');
         let blob = new Blob([text], { type: type });
         a.href = URL.createObjectURL(blob);
         a.download = name;
         a.click();
         setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      }
      catch (e) { if (! fault) fault = 'download: ' + e; }
   };

   let save = kind => {
      let tag = day(now());
      if (kind == 'summary')
         drop('hanzi-summary-' + tag + '.md', summary(), 'text/markdown');
      else if (kind == 'csv') {
         drop('hanzi-attempts-' + tag + '.csv', table(ATTEMPT_COLS, attempts()), 'text/csv');
         drop('hanzi-judgements-' + tag + '.csv', table(JUDGE_COLS, judges()), 'text/csv');
         drop('hanzi-events-' + tag + '.csv',
              table(EVENT_COLS, rows.filter(r => r.kind != 'attempt' && r.kind != 'judge')),
              'text/csv');
      }
      else drop('hanzi-log-' + tag + '.json', JSON.stringify(bundle()), 'application/json');
   };

   // + SOMEBODY ELSE'S EXPORT, COMING BACK IN. ONLY THE INK IS TAKEN:
   // + THEIR ROWS ARE THEIR OWN DATA, AND MIXING TWO PEOPLE'S LOGS IN ONE
   // + BROWSER WOULD MAKE EVERY COUNT IN HERE A LIE.

   let take = text => {
      try {
         let b = JSON.parse(text);
         if (! b || b.what != 'hanzi-log' || ! b.ink) return -1;
         let n = 0;
         for (let rec of b.ink)
            if (rec && rec.strokes && rec.strokes.length) { given.push(rec); n++; }
         set(KEY.given, given);
         return n;
      }
      catch (e) { return -1; }
   };

   let judged = j => {
      j.kind = 'judge';
      j.t = now();
      push(j);
   };

   let state = () => ({
      on: on(),
      id: who && who.id ? who.id : '',
      group: who && who.group ? who.group : '',
      visit: visit,
      people: folk.filter(p => p.id).length,
      attempts: who ? attempts().filter(r => r.id == who.id).length : 0,
      judgements: who ? judges().filter(r => r.id == who.id).length : 0,
      ink: ink.length,
      given: given.length,
      dropped: dropped,
      fault: fault,
      collector: wire,
      collectorSent: wireSent,
      collectorFailed: wireLost,
      collectorWaiting: outbox.rows.length,
   });

   // + ====================================================================
   // + EVERY PUBLIC CALL IS WRAPPED
   // +
   // + Not defensive habit: these are called from inside check() and from
   // + inside the mouse handlers, and a throw in there leaves the page with
   // + ink on the sheet that will never be read and no way to find out
   // + why. So the logger is allowed to fail and the page is not. The first
   // + failure is kept in `fault` and shown in the panel and in the export,
   // + because a logger that silently stopped collecting is the worst of
   // + the possible outcomes.

   let safe = f => function () {
      try { return f.apply(null, arguments); }
      catch (e) { if (! fault) fault = String(e); }
   };

   return {

      // + CALL ONCE, FROM init(). IF THE PERSON HOLDING THIS BROWSER HAS
      // + ALREADY ANSWERED IT JUST OPENS A SESSION AND STAYS OUT OF THE
      // + WAY. THE ONLY TIME IT PUTS SOMETHING IN FRONT OF THE PAGE IS THE
      // + FIRST LOAD, WHICH IS THE ONE TIME IT HAS TO.

      start: safe(() => {
         folk  = get(KEY.folk, []) || [];
         rows  = get(KEY.rows, []) || [];
         ink   = get(KEY.ink, []) || [];
         given = get(KEY.given, []) || [];
         inkSeen = ink.length;
         who = folk.length ? folk[folk.length - 1] : null;
         replay();
         showCorner();
         if (! who) { mode = 'ask'; draw(); }
         else if (who.consent == 'in') openSession();
         probe();
      }),

      // + WHETHER ANYTHING IS BEING WRITTEN DOWN AT ALL. THE PAGE DOES NOT
      // + NEED THIS: IT IS HERE SO A CALL SITE CAN BE CHECKED WITHOUT
      // + GUESSING, AND SO THE ANSWER TO "IS IT RECORDING" IS ONE CALL.

      ready: () => on(),

      // + A LESSON WAS PUT ON THE SHEET. THE COUNT OF THESE PER CHARACTER
      // + IS HOW MANY TIMES SOMEBODY WATCHED THE ANIMATION BEFORE GETTING
      // + IT, WHICH IS A DIFFERENT KIND OF EFFORT FROM TRYING AGAIN.

      lesson: safe(entry => {
         if (! entry) return;
         // + ASKED FOR FROM MEMORY, NOTHING WAS SHOWN, SO IT DOES NOT COUNT
         // + AS HAVING WATCHED THE ANIMATION. phase IS KEPT SO THE ATTEMPTS
         // + THAT FOLLOW CAN SAY WHICH HALF OF THE STUDY THEY BELONG TO.
         phase = how;
         if (how != 'recall') bump(shown, entry.char);
         push({ kind: 'lesson', t: now(), target: entry.char, read: '', how: how,
                strokesNeeded: entry.medians ? entry.medians.length : '' });
         how = 'picked';                // + back to the default for the next one
      }),

      // + THE TYPE ONE BUTTON WAS PRESSED, SO WHATEVER LESSON COMES NEXT
      // + WAS CHOSEN BY THE PERSON RATHER THAN HANDED TO THEM. THAT
      // + DISTINCTION IS WORTH A COLUMN: PICKING A CHARACTER YOU ALREADY
      // + WANTED IS NOT THE SAME TASK AS BEING GIVEN A RANDOM ONE.

      asked: safe(h => { how = h || 'picked'; }),

      // + FIRST TOUCH OF AN ATTEMPT, FOR HOW LONG IT TOOK. TAKEN HERE
      // + RATHER THAN IN attempt() BECAUSE BY THE TIME check() RUNS, THE
      // + STILL HAND TIMER HAS ALREADY BEEN SPENT AND WAITING IS NOT PART
      // + OF WRITING ANYTHING.

      penDown: safe(() => { if (! penAt) penAt = now(); }),

      // + THE SHEET WAS WIPED BY HAND. AN ABANDONED ATTEMPT IS NOT AN
      // + ERROR AND MUST NOT BE COUNTED AS ONE, BUT GIVING UP WITH FOUR
      // + STROKES DOWN IS STILL SOMETHING THAT HAPPENED.

      wiped: safe(n => {
         if (n) push({ kind: 'wipe', t: now(), target: '', read: '', strokesDrawn: n });
         penAt = 0;
      }),

      // + ONE ATTEMPT, WHICH IS THE UNIT EVERYTHING ELSE IS COUNTED IN.
      // + THE ARGUMENTS ARE EXACTLY WHAT check() ALREADY HAS IN HAND AT
      // + EACH OF ITS FOUR EXITS, SO ALL FOUR CALL SITES ARE THE SAME LINE.
      // +
      // + ONE THING IT MUST BE CALLED BEFORE: taught(), WHICH NULLS THE
      // + LESSON. A ROW THAT HAS LOST ITS TARGET CANNOT SAY WHETHER THE
      // + PERSON WAS ASKED FOR THAT CHARACTER OR CHOSE IT, AND THAT IS THE
      // + DIFFERENCE BETWEEN THE TWO MODES THE PAGE HAS.

      attempt: safe((verdict, lesson, drawn, gaps) => {
         if (! on() || ! verdict) return;
         drawn = drawn || [];

         // + THE LIVE READING IS NOT AN ATTEMPT. look() SETS A VERDICT ON
         // + EVERY PEN LIFT SO THE PANEL IS NEVER SILENT, AND IT COMMITS
         // + NOTHING. LOGGING THOSE WOULD FILE FIVE ROWS FOR ONE CHARACTER
         // + AND CALL THE FIRST FOUR OF THEM FAILURES. THE PAGE ONLY CALLS
         // + THIS FROM check(), SO THIS LINE IS A GUARD AGAINST A FUTURE
         // + CALL SITE, NOT AGAINST TODAY'S.
         if (verdict.live) return;

         let outcome = outcomeOf(verdict);

         // + AN UNFINISHED LESSON COMES BACK EVERY TIME THE HAND RESTS
         // + LONG ENOUGH, SO STOPPING FOR TEN SECONDS WITH TWO STROKES
         // + DOWN USED TO FILE FOUR IDENTICAL ROWS. ONE IS THE EVENT: THEY
         // + PAUSED AND THE PAGE SAID SO. THE REST ARE THE SAME PAUSE.
         if (outcome == 'incomplete') {
            let back = rows[rows.length - 1];
            if (back && back.id == who.id && back.kind == 'attempt'
                     && back.outcome == 'incomplete'
                     && back.strokesDrawn == drawn.length) return;
         }
         let rank  = verdict.rank || [];
         let shelf = verdict.shelf || [];
         let top   = rank[0] || null;
         let next  = rank[1] || null;
         let read  = top && shelf[top.n] ? shelf[top.n] : null;
         let other = next && shelf[next.n] ? shelf[next.n] : null;

         let g = gradeOf(verdict, lesson);
         let st = strokeStats(g.w);

         let label = lesson ? lesson.char : (read ? read.char : '');
         let t = now();

         // + THE WHOLE SHORTLIST, NOT JUST THE WINNER. THIS IS THE
         // + RECOGNISER'S WORKING SHOWN: WHICH CHARACTERS WERE EVEN IN THE
         // + RUNNING ONCE THE STROKE COUNT HAD CLOSED THE DOOR, AND HOW
         // + CLOSE BEHIND THE SECOND ONE WAS. A REFUSAL FOR 'split' MEANS
         // + NOTHING WITHOUT IT.
         let shortlist = rank.map(r => (shelf[r.n] ? shelf[r.n].char : '?')
                                       + ':' + r3(r.fit)).join(' ');

         // + THE THREE COLUMNS THAT MAKE THIS A STUDY AND NOT A LOG: WHICH
         // + TRY THIS IS, WHETHER THEY HAD EVER GOT IT BEFORE, AND HOW
         // + LONG AGO. tryN GIVES ATTEMPTS TO FIRST SUCCESS AND sinceOkMs
         // + GIVES RETENTION, AND NEITHER CAN BE RECOVERED AFTERWARDS IF
         // + IT IS NOT WRITTEN DOWN AT THE MOMENT IT HAPPENS.
         let before = tries[label] || 0;
         let had    = okAt[label];

         push({
            kind: 'attempt', t: t, seq: ++seq,
            mode: lesson ? (phase == 'recall' ? 'recall' : 'lesson') : 'free',
            target: lesson ? lesson.char : '',
            read: read ? read.char : '',
            outcome: outcome,
            why: verdict.noise ? verdict.why : (verdict.short ? 'short' : ''),

            // + THE FIT IS THE NUMBER THE DECISION WAS MADE ON AND THE
            // + CONFIDENCE IS THE SAME NUMBER AS THE PANEL SHOWED IT. BOTH
            // + ARE KEPT: ONE IS COMPARABLE ACROSS ANY LATER CHANGE OF
            // + SCALE, THE OTHER IS WHAT THE PERSON ACTUALLY SAW.
            sure1: top ? pct(top.fit) : '',
            sure2: next ? pct(next.fit) : '',
            fit1: top ? r3(top.fit) : '',
            fit2: next ? r3(next.fit) : '',
            margin: top && next && next.fit > .000001 ? r3(top.fit / next.fit) : '',
            runnerUp: other ? other.char : '',
            shortlisted: rank.length,
            // + STAGE ONE'S OWN NUMBER, THE CLOUD DISTANCE, KEPT FOR THE
            // + WINNER ALONE. IT IS WHAT CUT THE HUNDRED DOWN TO SIX, AND
            // + WITHOUT IT THERE IS NO WAY TO TELL LATER WHETHER A MISS
            // + HAPPENED IN THE FIRST STAGE OR THE SECOND.
            cloud1: top && top.d !== undefined ? r3(top.d) : '',

            strokesDrawn: drawn.length,
            strokesNeeded: lesson && lesson.medians ? lesson.medians.length
                         : read && read.medians ? read.medians.length : '',

            gradedAgainst: g.against,
            shapeMean: st.mean, shapeWorst: st.worst,
            backwards: st.back, outOfPlace: st.place, orderOk: st.ok,
            strokes: st.each,              // + JSON only, too wide for a CSV cell
            shortlist: shortlist,

            drawMs: penAt ? t - penAt : '',

            // + THE GAPS BETWEEN THE STROKES, WHICH THE PAGE ALREADY KEEPS
            // + BECAUSE IT WAITS A MULTIPLE OF THE PERSON'S OWN RHYTHM
            // + BEFORE COMMITTING. IT IS HESITATION, MEASURED: SOMEBODY
            // + WHO KNOWS THE CHARACTER WRITES IT IN ONE RUN, AND SOMEBODY
            // + RECALLING IT STOPS BETWEEN STROKES. THE MEAN GOES IN THE
            // + TABLE AND THE LIST GOES IN THE JSON, BECAUSE WHERE IN THE
            // + CHARACTER THEY STOPPED IS THE INTERESTING PART AND AN
            // + AVERAGE HIDES IT.
            gapMean: gaps && gaps.length
                   ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : '',
            gapWorst: gaps && gaps.length ? Math.max.apply(null, gaps) : '',
            gaps: gaps && gaps.length ? gaps.slice() : null,

            tryN: before + 1,
            okBefore: had ? 1 : 0,
            sinceOkMs: had ? t - had : -1,
            shownBefore: shown[label] || 0,
         });

         bump(tries, label);
         if (outcome == 'accepted' && read) okAt[read.char] = t;
         keepInk(drawn, label, outcome);
         penAt = 0;
      }),

      // + A MANDARIN SPEAKER'S JUDGEMENT. THE OVERLAY CALLS THIS ITSELF,
      // + AND IT IS PUBLIC SO THE PAGE COULD ASK THE SAME QUESTION ITS OWN
      // + WAY ON THE CANVAS LATER WITHOUT A SECOND STORE.

      judged: safe(judged),

      // + THE PANEL, OPENED FROM OUTSIDE. NOTHING IN index.html NEEDS
      // + THIS: THE CORNER WORD ALREADY OPENS IT.

      panel: safe(() => { mode = 'panel'; draw(); }),
      close: safe(close),

      // + THE SAME AS THE NEXT PERSON BUTTON, FOR #reset: PUTS THE WAY IN
      // + BACK IN FRONT OF THE PAGE. NOTHING ALREADY WRITTEN IS TOUCHED.
      next: safe(() => { mode = 'ask'; draw(); }),

      // + THE STUDY IS OVER. chars ARE THE CHARACTERS IT USED, FOR THE
      // + QUESTION THAT ASKS ABOUT THEM. SOMEBODY WHO IS NOT BEING RECORDED
      // + IS NOT ASKED ANYTHING, SINCE THE ANSWERS WOULD GO NOWHERE.
      survey: safe(chars => {
         surveyChars = chars || []; answers = {};
         mode = on() ? 'survey' : 'thanks';
         draw();
      }),

      // + 'json', 'csv' OR 'summary'
      export: safe(save),
      summary: safe(summary),
      load: safe(take),
      state: safe(state),
   };
})();
