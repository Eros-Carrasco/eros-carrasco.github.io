// + ========================================================================
// + MARKING WHAT SOMEBODY WROTE
// +
// + Two different questions, kept apart on purpose, because they do not
// + have the same answer:
// +
// +    readAs()   does it LOOK like the character?  compared against all
// +               hundred, so a win here means it is distinguishable, not
// +               just close to the one we happened to ask for.
// +
// +    grade()    was it WRITTEN properly?  stroke count, stroke order and
// +               the direction each stroke travelled.
// +
// + You can pass the first and fail the second: a character drawn bottom
// + to top still reads fine and is still wrong. That gap is the whole
// + point, and it is the feedback a recognizer on its own cannot give.
// +
// + Everything here takes the same shape on both sides: a list of strokes,
// + each a list of [x,y]. What the mouse records and what hanzi.js stores
// + are already that, so nothing needs converting.
// + ========================================================================

let Score = {

   // + ----------------------------------------------------------------
   // + SPREAD A PATH OVER n EVENLY SPACED POINTS
   // +
   // + Two paths cannot be compared point by point until they have the
   // + same number of points, spaced the same way. The mouse drops points
   // + wherever the frames landed, which is denser when you draw slowly.
   // + Walking the path by distance instead of by index throws that away.

   resample : (pts, n) => {
      let out = [];
      if (n < 2) n = 2;                   // + n - 1 below would divide by zero
      if (pts.length == 0) return out;
      if (pts.length == 1) {
         for (let i = 0 ; i < n ; i++) out.push([pts[0][0], pts[0][1]]);
         return out;
      }
      let acc = [0];
      for (let i = 1 ; i < pts.length ; i++) {
         let dx = pts[i][0] - pts[i-1][0], dy = pts[i][1] - pts[i-1][1];
         acc.push(acc[i-1] + Math.sqrt(dx * dx + dy * dy));
      }
      let total = acc[acc.length - 1];
      if (total < .000001) {
         for (let i = 0 ; i < n ; i++) out.push([pts[0][0], pts[0][1]]);
         return out;
      }
      let j = 0;
      for (let i = 0 ; i < n ; i++) {
         let d = total * i / (n - 1);
         while (j < acc.length - 2 && acc[j+1] < d) j++;
         let seg = acc[j+1] - acc[j];
         let u   = seg < .000001 ? 0 : (d - acc[j]) / seg;
         out.push([ pts[j][0] + u * (pts[j+1][0] - pts[j][0]),
                    pts[j][1] + u * (pts[j+1][1] - pts[j][1]) ]);
      }
      return out;
   },

   // + ----------------------------------------------------------------
   // + MOVE IT TO THE MIDDLE AND MAKE IT ONE UNIT TALL
   // +
   // + Nobody writes in exactly the same spot at exactly the same size,
   // + and none of that is what makes a character right or wrong. Taking
   // + it out first means the comparison is about shape alone.

   normalize : strokes => {
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, any = false;
      for (let s of strokes) for (let p of s) {
         any = true;
         if (p[0] < x0) x0 = p[0];
         if (p[0] > x1) x1 = p[0];
         if (p[1] < y0) y0 = p[1];
         if (p[1] > y1) y1 = p[1];
      }
      if (! any) return strokes;
      let w = x1 - x0, h = y1 - y0;
      let s = w > h ? w : h;
      if (s < .000001) s = 1;
      let cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      return strokes.map(st => st.map(p => [ (p[0] - cx) / s, (p[1] - cy) / s ]));
   },

   join : strokes => {
      let all = [];
      for (let s of strokes) for (let p of s) all.push(p);
      return all;
   },

   // + HOW FAR APART TWO PATHS OF THE SAME LENGTH ARE, ON AVERAGE

   apart : (a, b) => {
      let sum = 0;
      for (let i = 0 ; i < a.length ; i++) {
         let dx = a[i][0] - b[i][0], dy = a[i][1] - b[i][1];
         sum += Math.sqrt(dx * dx + dy * dy);
      }
      return a.length ? sum / a.length : 9;
   },

   // + ----------------------------------------------------------------
   // + QUESTION ONE: WHICH CHARACTER DOES THIS READ AS?
   // +
   // + Reading is about the shape that ended up on the paper, and nothing
   // + else. A photo of a finished character cannot tell which stroke went
   // + first or which way the brush travelled, so neither should this. My
   // + first try compared the whole route, jumps and all, and it was wrong
   // + for exactly that reason: writing one stroke backwards left the
   // + shape untouched and still changed the answer.
   // +
   // + So the drawing becomes a CLOUD of points with no order at all, and
   // + two clouds are compared by asking, for every point, how far it is
   // + from the nearest point in the other one. Both ways round, because
   // + a few strokes sitting on top of a full character would otherwise
   // + look like a perfect match.
   // +
   // + Still the simplest recognizer there is, nearest neighbour, and
   // + still honest about what it claims: not "this is water", but "of
   // + the hundred I know, yours is closest to water".

   PER_STROKE : 12,               // + points sampled along each stroke

   clouds : null,

   cloud : strokes => {
      let out = [];
      for (let s of Score.normalize(strokes))
         for (let p of Score.resample(s, Score.PER_STROKE)) out.push(p);
      return out;
   },

   nearest : (p, set) => {
      let best = 9;
      for (let i = 0 ; i < set.length ; i++) {
         let dx = p[0] - set[i][0], dy = p[1] - set[i][1];
         let d = dx * dx + dy * dy;
         if (d < best) best = d;
      }
      return Math.sqrt(best);
   },

   chamfer : (a, b) => {
      let sum = 0;
      for (let i = 0 ; i < a.length ; i++) sum += Score.nearest(a[i], b);
      for (let i = 0 ; i < b.length ; i++) sum += Score.nearest(b[i], a);
      return sum / (a.length + b.length);
   },

   learn : data => { Score.clouds = data.map(e => Score.cloud(e.medians)); },

   // + THE BOOK IS NOT ALWAYS THE SAME HUNDRED ANY MORE: A CHARACTER
   // + TYPED IN BY HAND IS PUT ON THE END OF IT, AND IT HAS TO BE LEARNED
   // + BEFORE IT CAN BE RANKED. CACHING ON THE LENGTH ALONE WOULD HOLD ON
   // + TO THE PREVIOUS GUEST, SO THE LAST ENTRY IS NAMED IN THE KEY TOO.

   key : '',

   readAs : (strokes, data) => {
      let key = data.length + ':' + data[data.length - 1].char;
      if (Score.key != key || ! Score.clouds) { Score.learn(data); Score.key = key; }
      let mine = Score.cloud(strokes);
      let rank = [];
      for (let n = 0 ; n < Score.clouds.length ; n++)
         rank.push({ n: n, d: Score.chamfer(mine, Score.clouds[n]) });
      rank.sort((a, b) => a.d - b.d);
      return rank;
   },

   // + ----------------------------------------------------------------
   // + QUESTION TWO: WAS IT WRITTEN PROPERLY?
   // +
   // + Stroke by stroke, in the order they were drawn. Shape says whether
   // + the stroke went where it should; heading says whether it travelled
   // + the right way along itself. Heading is the one that catches a
   // + character that looks perfect and was written backwards, which is
   // + exactly the mistake a photo of the finished thing can never see.

   PASS : .10,                     // + a stroke this close counts as right

   grade : (strokes, medians) => {
      let mine = Score.normalize(strokes);
      let want = Score.normalize(medians);

      if (mine.length != want.length)
         return { ok: false, why: 'count', drew: mine.length, needs: want.length, strokes: [] };

      let report = [], ok = true;
      for (let s = 0 ; s < want.length ; s++) {
         let a = Score.resample(mine[s], 16);
         let b = Score.resample(want[s], 16);

         // + SHAPE MUST NOT KNOW ABOUT DIRECTION, OR THE TWO HALVES OF THIS
         // + ANSWER STOP BEING SEPARATE. A STROKE LAID EXACTLY RIGHT AND
         // + DRAWN BACKWARDS WAS SCORING AS A SCRAWL, WHICH IS FALSE: IT IS
         // + A PERFECT STROKE WITH A WRONG HEADING, AND HEADING IS WHAT THE
         // + NEXT LINE IS FOR. SO THE BETTER OF THE TWO ALIGNMENTS WINS.

         let shape = Math.min(Score.apart(a, b),
                              Score.apart(a.slice().reverse(), b));

         // + the way each stroke travelled, as one straight arrow from its
         // + first point to its last, compared by direction only
         // + read the last point by length, not by the literal 16 used above:
         // + changing the sample count in one place and not the other made the
         // + heading test read undefined and throw
         let za = a.length - 1, zb = b.length - 1;
         let ax = a[za][0] - a[0][0], ay = a[za][1] - a[0][1];
         let bx = b[zb][0] - b[0][0], by = b[zb][1] - b[0][1];
         let la = Math.sqrt(ax*ax + ay*ay), lb = Math.sqrt(bx*bx + by*by);
         let heading = la < .000001 || lb < .000001 ? 1
                     : (ax * bx + ay * by) / (la * lb);

         let good = shape < Score.PASS && heading > 0;
         if (! good) ok = false;
         report.push({ shape: shape, heading: heading, good: good,
                       backwards: heading < 0 });
      }
      return { ok: ok, why: ok ? 'good' : 'strokes', strokes: report };
   },

   // + ----------------------------------------------------------------
   // + HOW WELL THE STROKES LINE UP, AS ONE NUMBER
   // +
   // + grade() was built to tell somebody how they did. It turns out to
   // + be the best thing on this page for deciding WHETHER IT IS THE
   // + CHARACTER AT ALL, and far better than the point cloud it is
   // + sitting next to, because it demands that stroke one lands on
   // + stroke one and stroke two on stroke two. A cloud only knows where
   // + the ink ended up, so three strokes of 山 scattered the right way
   // + look like part of 出. Correspondence in order is a much harder
   // + thing to pass by accident.
   // +
   // + Measured over 1050 written attempts and 1200 scribbles: a correct
   // + reading averages .073 per stroke and reaches .120 at the 90th,
   // + while nothing that is not a character came in under .234. The two
   // + piles do not touch, which is the first time anything here has
   // + managed that.

   fit : g => {
      if (! g.strokes.length) return 9;
      let sum = 0;
      for (let s of g.strokes) sum += s.shape;
      return sum / g.strokes.length;
   },

   // + ----------------------------------------------------------------
   // + THE SAME MEASURE, WITH THE ORDER TAKEN OUT, AND THIS IS THE ONE
   // + THAT READS
   // +
   // + fit() above walks the strokes in the order they were written and
   // + compares the first to the first. That is the right way to MARK
   // + somebody, and the wrong way to READ them, which I found out when
   // + Eros wrote a clean 人 and the page ranked it third at 35% behind
   // + 九. He had drawn the two strokes in the other order. Nothing about
   // + the ink on the paper was wrong; the comparison was.
   // +
   // + And it is not a small effect. Swap only the first two strokes and
   // + match in order, and 99 characters drop to 53 that still read as
   // + themselves. Match by shape and it is 99 out of 99.
   // +
   // + It is also the one place this page was further from MRandarin than
   // + it knew. A camera pointed at a whiteboard sees ink. It has no idea
   // + what order any of it was written in, and it reads the character
   // + anyway. Order is something only this page can see, which is a gift
   // + for teaching and must not be allowed to decide what you wrote.
   // +
   // + So: every stroke you drew is matched to the stroke it best fits,
   // + each used once. Exactly, by trying every pairing, while the count
   // + is small enough that every pairing is cheap. A character brought
   // + in from the dataset can have a dozen strokes, and 12! is not a
   // + number anybody should evaluate, so past seven it takes the nearest
   // + free one each time instead.

   // + matchAny RETURNS THE PAIRING AS WELL AS THE NUMBER, BECAUSE THE
   // + PAIRING IS THE INTERESTING HALF: IT IS LITERALLY WHAT THE PAGE IS
   // + LOOKING AT, AND IT CAN BE DRAWN. fitAny KEEPS THE OLD SHAPE FOR
   // + EVERY CALLER THAT ONLY WANTS TO KNOW HOW WELL IT WENT.

   fitAny : (strokes, medians) => Score.matchAny(strokes, medians).fit,

   // + ONE STROKE TOO MANY, WHICH IS WHAT A PEN LIFTED HALFWAY THROUGH A
   // + STROKE LOOKS LIKE. A REAL HAND WROTE 月 IN FIVE STROKES THREE TIMES,
   // + THE READER NAMED IT EVERY TIME, AND THE COUNT ALONE TURNED IT DOWN.
   // + SO EVERY TWO STROKES ARE TRIED JOINED BACK INTO ONE, IN BOTH ORDERS,
   // + AND THE BEST FIT IS KEPT. THE NUMBER IS ON THE SAME SCALE AS fitAny,
   // + SO THE SAME BAR APPLIES TO IT.

   fitSplit : (strokes, medians) => {
      if (strokes.length == medians.length) return Score.fitAny(strokes, medians);
      if (strokes.length != medians.length + 1) return 9;
      // + ONLY TWO STROKES WHERE ONE ENDS ABOUT WHERE THE OTHER BEGINS ARE
      // + JOINED. WITHOUT THAT, A STRAY LINE DRAWN APART FROM THE CHARACTER
      // + WAS GLUED TO ONE OF ITS STROKES AND 人 WITH A LINE OVER IT PASSED.
      // + IN THE REAL SPLITS THE GAP WAS .01 AND .07 OF THE WRITING'S SIZE.

      let x0 = 9, x1 = -9, y0 = 9, y1 = -9;
      for (let st of strokes) for (let p of st) {
         if (p[0] < x0) x0 = p[0];
         if (p[0] > x1) x1 = p[0];
         if (p[1] < y0) y0 = p[1];
         if (p[1] > y1) y1 = p[1];
      }
      let near = .15 * Math.max(x1 - x0, y1 - y0);

      let best = 9;
      for (let i = 0 ; i < strokes.length ; i++)
      for (let j = 0 ; j < strokes.length ; j++) {
         if (i == j) continue;
         let a = strokes[i][strokes[i].length - 1], b = strokes[j][0];
         let dx = a[0] - b[0], dy = a[1] - b[1];
         if (Math.sqrt(dx * dx + dy * dy) > near) continue;
         let rest = strokes.filter((s, k) => k != i && k != j);
         rest.push(strokes[i].concat(strokes[j]));
         let f = Score.fitAny(rest, medians);
         if (f < best) best = f;
      }
      return best;
   },

   matchAny : (strokes, medians) => {
      if (strokes.length != medians.length) return { fit: 9, pair: [] };

      let A = Score.normalize(strokes).map(s => Score.resample(s, 16));
      let B = Score.normalize(medians).map(s => Score.resample(s, 16));
      let n = A.length;

      let cost = [];
      for (let i = 0 ; i < n ; i++) {
         let row = [];
         for (let j = 0 ; j < n ; j++)
            row.push(Math.min(Score.apart(A[i], B[j]),
                              Score.apart(A[i].slice().reverse(), B[j])));
         cost.push(row);
      }

      let used = new Array(n).fill(false);

      if (n > 7) {
         let sum = 0, pair = [];
         for (let i = 0 ; i < n ; i++) {
            let best = 9, k = 0;
            for (let j = 0 ; j < n ; j++)
               if (! used[j] && cost[i][j] < best) { best = cost[i][j]; k = j; }
            used[k] = true;
            pair.push(k);
            sum += best;
         }
         return { fit: sum / n, pair: pair };
      }

      let best = 9, bestPair = [], here = [];
      let walk = (i, sum) => {
         if (sum >= best * n) return;          // + already worse than the winner
         if (i == n) { best = sum / n; bestPair = here.slice(); return; }
         for (let j = 0 ; j < n ; j++) {
            if (used[j]) continue;
            used[j] = true; here.push(j);
            walk(i + 1, sum + cost[i][j]);
            here.pop(); used[j] = false;
         }
      }
      walk(0, 0);
      return { fit: best, pair: bestPair };
   },
};
