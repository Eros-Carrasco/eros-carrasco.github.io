// + ========================================================================
// + MY OWN TEXT PRIMITIVES. KEN'S shape.js IS UNTOUCHED.
// +
// + Shape.text() in shape.js assumes one fixed atlas: 12 by 8 cells, a
// + letter twice as tall as it is wide, and every letter the same width.
// + None of that is true here. A hanzi is square, my pinyin atlas is 16 by
// + 8 because it carries the tone vowels ASCII has no room for, and an 'i'
// + is not as wide as an 'm'. So these are Ken's idea with the grid and
// + the widths handed in instead of baked into the arithmetic.
// +
// + Everything returns a Float32Array in Ken's vertex format:
// +    x,y,z   nx,ny,nz   u,v        eight floats, same as shape.js
// + ========================================================================

let Hanzi = {

   // + ----------------------------------------------------------------
   // + WHERE A CELL LIVES IN AN ATLAS
   // +
   // + The inset stops a cell sampling its neighbour's edge once the
   // + mipmaps kick in. Ken does the same thing with his .007.

   cell : (n, cols, rows) => {
      let col = n % cols, row = (n / cols) >> 0, inset = .0015;
      return [ col / cols + inset, row / rows + inset,
              (col + 1) / cols - inset, (row + 1) / rows - inset ];
   },

   quad : (uv, x, y, z, w, h) => {
      let [u0,v0,u1,v1] = uv;
      let l = x - w/2, r = x + w/2, b = y - h/2, t = y + h/2;
      return [ l,t,z, 0,0,1, u0,v0,   r,b,z, 0,0,1, u1,v1,   l,b,z, 0,0,1, u0,v1,
               l,t,z, 0,0,1, u0,v0,   r,b,z, 0,0,1, u1,v1,   r,t,z, 0,0,1, u1,v0 ];
   },

   // + ONE CHARACTER ON ITS OWN, CUT OUT OF THE ATLAS. SQUARE, BECAUSE A
   // + HANZI FILLS A SQUARE BOX, UNLIKE KEN'S 1 BY 2 LETTER.

   tile : (n, cols, rows) => new Float32Array(
      Hanzi.quad(Hanzi.cell(n, cols, rows), 0, 0, 0, 1, 1)),

   // + ----------------------------------------------------------------
   // + EVERY CHARACTER IN THE ATLAS, AS ONE SINGLE MESH
   // +
   // + This is the whole reason an atlas is worth building. All hundred
   // + characters share one image, so they also share one mesh and one
   // + call to draw. A hundred characters cost what one costs.

   sheet : (count, cols, rows, step, keep) => {
      let mesh = [];
      for (let n = 0 ; n < count ; n++) {
         if (keep && ! keep(n)) continue;
         let x = (n % cols - (cols - 1) / 2) * step;
         let y = ((rows - 1) / 2 - ((n / cols) >> 0)) * step;
         mesh.push(Hanzi.quad(Hanzi.cell(n, cols, rows), x, y, 0, step * .92, step * .92));
      }
      return new Float32Array(mesh.flat());
   },

   // + ----------------------------------------------------------------
   // + PINYIN, WITH THE TONE MARKS
   // +
   // + Cells 0 to 95 are ASCII 32 to 127 in Ken's order. The tone vowels
   // + could not go in ASCII, because they live above code 127, so they
   // + are parked in the cells after it. That is the only reason this
   // + needs a lookup instead of Ken's plain subtraction.

   where : ch => {
      let code = ch.charCodeAt(0);
      if (code >= 32 && code < 127) return code - 32;
      let tone = PINYIN.tones.indexOf(ch);
      return tone < 0 ? 0 : 96 + tone;                  // + unknown reads as a space
   },

   // + THE QUAD STAYS A WHOLE CELL WIDE SO THE LETTER IS NEVER CLIPPED,
   // + BUT THE PEN ONLY MOVES BY THAT LETTER'S OWN WIDTH. SO THE QUADS
   // + OVERLAP, WHICH COSTS NOTHING, BECAUSE THE WHITE AROUND A LETTER IS
   // + THROWN AWAY BY uSheer ANYWAY.

   text : str => {
      let mesh = [], x = 0;
      for (let i = 0 ; i < str.length ; i++) {
         let n = Hanzi.where(str[i]), a = PINYIN.advance[n];
         mesh.push(Hanzi.quad(Hanzi.cell(n, PINYIN.cols, PINYIN.rows), x + a/2, 0, 0, 1, 2));
         x += a;
      }
      return { mesh: new Float32Array(mesh.flat()), width: x };
   },

   measure : str => {
      let x = 0;
      for (let i = 0 ; i < str.length ; i++) x += PINYIN.advance[Hanzi.where(str[i])];
      return x;
   },

   // + ----------------------------------------------------------------
   // + MORE THAN ONE LINE
   // +
   // + Ken's stretch goal, and I needed it rather than wanted it: a
   // + definition like "clear / to finish / particle of completed action"
   // + is far wider than the character it belongs to. Breaking happens on
   // + spaces, never mid word, and a word longer than the limit overhangs
   // + rather than being chopped. Each line is centred on its own, and
   // + lines step down by 2.6, which is the 2 a letter stands plus the
   // + leading.

   wrap : (str, limit) => {
      let lines = [], line = '';
      for (let word of str.split(' ')) {
         if (line === '') line = word;
         else if (Hanzi.measure(line + ' ' + word) <= limit) line += ' ' + word;
         else { lines.push(line); line = word; }
      }
      if (line !== '') lines.push(line);
      return lines;
   },

   // + LINES START AT THE ORIGIN AND RUN RIGHT, THE SAME WAY A SINGLE
   // + STRING DOES. CENTRING EACH LINE ON ITS OWN, WHICH IS WHAT THIS USED
   // + TO DO, LEAVES A RAGGED LEFT EDGE WHEN THE BLOCK IS SET AGAINST A
   // + MARGIN, AND PUSHES THE WIDEST LINE HALF OFF THE PAGE.

   // + THE LEADING IS A PARAMETER NOW. 2.6 IS RIGHT FOR A DEFINITION SET
   // + UNDER A BIG PINYIN, WHERE THE BLOCK IS MEANT TO BREATHE, AND FAR
   // + TOO LOOSE FOR A SENTENCE THAT HAPPENS TO RUN TO TWO LINES: THAT
   // + ONE READ AS TWO UNRELATED LINES INSTEAD OF ONE WRAPPED SENTENCE.

   block : (str, limit, lead) => {
      if (lead === undefined) lead = 2.6;
      let lines = Hanzi.wrap(str, limit), mesh = [], widest = 0;
      for (let n = 0 ; n < lines.length ; n++) {
         let line = lines[n], x = 0;
         widest = Math.max(widest, Hanzi.measure(line));
         for (let i = 0 ; i < line.length ; i++) {
            let c = Hanzi.where(line[i]), a = PINYIN.advance[c];
            mesh.push(Hanzi.quad(Hanzi.cell(c, PINYIN.cols, PINYIN.rows),
                                 x + a/2, -lead * n, 0, 1, 2));
            x += a;
         }
      }
      return { mesh: new Float32Array(mesh.flat()), lines: lines.length, width: widest };
   },

   // + ----------------------------------------------------------------
   // + THE CHARACTER BEING WRITTEN
   // +
   // + This is the procedural part. Nothing is animated by hand and
   // + nothing is stored per character. There is one number, progress,
   // + from 0 to 1, and the strokes are walked in writing order until
   // + that much of the total length has been laid down. Give it a clock
   // + and it writes itself. Give it how far someone has got with their
   // + own finger and it follows them instead. Any character works,
   // + including ones that are not in the atlas at all.

   lengths : medians => {
      let each = [], total = 0;
      for (let s = 0 ; s < medians.length ; s++) {
         let m = medians[s], d = 0;
         for (let i = 1 ; i < m.length ; i++) {
            let dx = m[i][0] - m[i-1][0], dy = m[i][1] - m[i-1][1];
            d += Math.sqrt(dx * dx + dy * dy);
         }
         each.push(d);
         total += d;
      }
      return { each: each, total: total };
   },

   // + THE BRUSH, AS ONE UNBROKEN RIBBON.
   // +
   // + My first try laid a separate rectangle along every segment and
   // + patched the gaps with little squares. It left bumps everywhere,
   // + because a square sitting on a sloping stroke does not line up with
   // + it. The fix is to give each POINT one normal, averaged from the
   // + segments either side of it, and let neighbouring quads share it.
   // + Then the edges meet exactly and the stroke reads as one sweep.

   ribbon : (pts, w, z, mesh) => {
      let n = pts.length;
      if (n < 2) return;
      let half = i => (w.length === undefined ? w : w[i]) / 2;
      let nor = [];
      for (let i = 0 ; i < n ; i++) {
         let a = pts[i == 0 ? 0 : i - 1], b = pts[i == n - 1 ? n - 1 : i + 1];
         let dx = b[0] - a[0], dy = b[1] - a[1];
         let d  = Math.sqrt(dx * dx + dy * dy);
         nor.push(d < .00001 ? [0,0] : [-dy / d * half(i), dx / d * half(i)]);
      }
      for (let i = 1 ; i < n ; i++) {
         let p = pts[i-1], q = pts[i], a = nor[i-1], b = nor[i];
         mesh.push([ p[0]+a[0], p[1]+a[1], z, 0,0,1, 0,0,
                     q[0]-b[0], q[1]-b[1], z, 0,0,1, 0,0,
                     p[0]-a[0], p[1]-a[1], z, 0,0,1, 0,0,
                     p[0]+a[0], p[1]+a[1], z, 0,0,1, 0,0,
                     q[0]-b[0], q[1]-b[1], z, 0,0,1, 0,0,
                     q[0]+b[0], q[1]+b[1], z, 0,0,1, 0,0 ]);
      }
   },

   // + ----------------------------------------------------------------
   // + HOW WIDE THE BRUSH IS ALONG ONE STROKE
   // +
   // + One number for the whole stroke draws a felt marker, and that was
   // + the real problem with the ink: at any width thick enough to see,
   // + a nine stroke character closed up into a blot. A brush is narrow
   // + where it lands, pressed through the middle, and lifted into a
   // + tail, and it is that change in width that keeps two strokes apart
   // + where they cross, so the line can be thin and still read.
   // +
   // + It is measured off the path by arc length, so nothing has to be
   // + recorded while the stroke is being drawn, and the same code gives
   // + the right answer for a stroke replayed from the dictionary.
   // +
   // + A stroke shorter than FLAT is a dot, and a dot keeps its full
   // + width: tapering something that small just erases it.
   // +
   // + PRESSURE, OUT OF A MOUSE THAT HAS NONE
   // +
   // + A tablet reports how hard the nib is being pushed and the line
   // + swells with it. A mouse reports nothing of the kind, so every tool
   // + that has to work without one reads SPEED instead: lean into a
   // + stroke and the hand slows down, flick it and it does not. A point
   // + is only recorded once the pointer has moved far enough, so how far
   // + apart two of them are already says how fast the hand was going and
   // + no clock is needed.
   // +
   // + The width then CHASES that rather than jumping to it, and the
   // + chase is the part that feels like a brush: press and the line
   // + thickens over the next stretch of the stroke, not instantly.

   FLAT   : .03,
   SLOW   : .013,                 // + points this close are a hand leaning in
   FAST   : .055,                 // + this far apart is a flick
   LIGHT  : .40,                  // + what a flick is left with
   LAND   : .62,                  // + the width the brush touches down at
   SPREAD : .14,                  // + how fast it answers a change

   // + A HAND SHAKES AND A MOUSE REPORTS IN JUMPS, SO A RECORDED PATH IS
   // + FAINTLY RAGGED AND A RIBBON LAID ALONG IT SHOWS EVERY WOBBLE AS A
   // + FACET. ONE PASS OF A THREE POINT AVERAGE OVER THE INSIDE POINTS
   // + TAKES THAT OUT AND MOVES NOTHING ELSE. THE TWO ENDS ARE LEFT WHERE
   // + THEY ARE, SO THE STROKE STILL STARTS AND STOPS WHERE THE HAND DID,
   // + AND THE SCORING NEVER SEES THIS AT ALL: IT READS THE POINTS AS
   // + THEY WERE RECORDED. THIS IS THE DRAWING, NOT THE MEASUREMENT.

   smooth : pts => {
      let n = pts.length;
      if (n < 3) return pts;
      let out = [ pts[0] ];
      for (let i = 1 ; i < n - 1 ; i++)
         out.push([ (pts[i-1][0] + 2 * pts[i][0] + pts[i+1][0]) / 4,
                    (pts[i-1][1] + 2 * pts[i][1] + pts[i+1][1]) / 4 ]);
      out.push(pts[n-1]);
      return out;
   },

   quill : (pts, w, press) => {
      let n = pts.length;
      if (n < 2) return w;
      let acc = [0];
      for (let i = 1 ; i < n ; i++) {
         let dx = pts[i][0] - pts[i-1][0], dy = pts[i][1] - pts[i-1][1];
         acc.push(acc[i-1] + Math.sqrt(dx * dx + dy * dy));
      }
      let len = acc[n-1];
      if (len < Hanzi.FLAT) return w;

      // + THE TWO RAMPS ARE CAPPED IN REAL LENGTH, NOT TAKEN AS A SHARE
      // + OF THE STROKE. AS A SHARE, A STROKE RIGHT ACROSS THE SHEET IS
      // + ALL RAMP AND COMES OUT A LENS: TWO POINTS AND NO LINE BETWEEN
      // + THEM. CAPPED, A LONG STROKE GETS A SOLID BODY AND A SHORT ONE
      // + STILL TAPERS OVER THE WHOLE OF ITSELF.

      let inAt  = .14 * len < .07 ? .14 * len : .07;
      let outAt = .26 * len < .13 ? .26 * len : .13;

      // + ONE GAP ON ITS OWN IS NOISE: THE BROWSER DELIVERS MOUSE MOVES
      // + IN BURSTS, SO TWO NEIGHBOURING POINTS CAN BE FAR APART AND THE
      // + NEXT TWO ALMOST TOUCHING WHILE THE HAND MOVED AT ONE SPEED. THE
      // + SPEED IS READ OVER FIVE POINTS INSTEAD, OR THE LINE RIPPLES.

      let gap = [], easy = [];
      for (let i = 0 ; i < n ; i++) gap.push(i == 0 ? acc[1] : acc[i] - acc[i-1]);
      for (let i = 0 ; i < n ; i++) {
         let sum = 0, c = 0;
         for (let k = i - 2 ; k <= i + 2 ; k++)
            if (k >= 0 && k < n) { sum += gap[k]; c++; }
         easy.push(sum / c);
      }

      let out = [], f = press ? Hanzi.LAND : 1;
      for (let i = 0 ; i < n ; i++) {
         if (press) {
            let lean = (Hanzi.FAST - easy[i]) / (Hanzi.FAST - Hanzi.SLOW);
            lean = lean < 0 ? 0 : lean > 1 ? 1 : lean;
            f += (Hanzi.LIGHT + (1 - Hanzi.LIGHT) * lean - f) * Hanzi.SPREAD;
         }
         let head = acc[i] / inAt, tail = (len - acc[i]) / outAt;
         out.push(w * f * Math.min(head < 1 ? .45 + .55 * head : 1,
                                   tail < 1 ? .15 + .85 * tail : 1));
      }
      return out;
   },

   strokes : (medians, progress, w, lift, taper, press) => {
      let L = Hanzi.lengths(medians);
      let allowed = progress * L.total;                 // + how much ink so far
      let mesh = [];

      for (let s = 0 ; s < medians.length ; s++) {
         if (allowed <= 0) break;
         let m = taper ? Hanzi.smooth(Hanzi.smooth(medians[s])) : medians[s];
         let left = allowed < L.each[s] ? allowed : L.each[s];
         allowed -= L.each[s];

         let pts = [ m[0] ], used = 0;        // + m is smoothed below for ink
         for (let i = 1 ; i < m.length ; i++) {
            let dx = m[i][0] - m[i-1][0], dy = m[i][1] - m[i-1][1];
            let d  = Math.sqrt(dx * dx + dy * dy);
            if (used + d >= left) {                     // + stop part way along
               let u = d < .00001 ? 0 : (left - used) / d;
               pts.push([ m[i-1][0] + u * dx, m[i-1][1] + u * dy ]);
               break;
            }
            pts.push(m[i]);
            used += d;
         }
         Hanzi.ribbon(pts, taper ? Hanzi.quill(pts, w, press) : w,
                      s * lift, mesh);                 // + later strokes sit forward
      }
      return new Float32Array(mesh.flat());
   },

   // + HOW MANY STROKES ARE FINISHED, FOR THE READOUT

   done : (medians, progress) => {
      let L = Hanzi.lengths(medians), allowed = progress * L.total, n = 0;
      for (let s = 0 ; s < medians.length ; s++) {
         if (allowed < L.each[s]) break;
         allowed -= L.each[s];
         n++;
      }
      return n;
   },
};
