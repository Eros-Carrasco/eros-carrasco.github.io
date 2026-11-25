
// TRACK THE USER'S CURSOR

let _r = canvas.getBoundingClientRect(), cursor = [0,0,0];
let setCursor = (e, z) => cursor = [ (e.clientX - _r.left) / canvas.width * 2 - 1,
                                     1 - (e.clientY - _r.top) / canvas.height * 2,
                                     z ?? cursor[2] ];
canvas.onmousedown = e => setCursor(e, 1);
canvas.onmousemove = e => setCursor(e,  );
canvas.onmouseup   = e => setCursor(e, 0);

// DEFINE A MATRIX OBJECT CLASS

let Matrix = function() {
   let xyz = (x,y,z) => x === undefined ? [1,1,1] : Array.isArray(x) ? x : [x, y ?? x, z ?? x];
   let mxm = (a, b) => a.map((A,n) => a[n&3]*b[n&12] + a[n&3|4]*b[n&12|1] + a[n&3|8]*b[n&12|2] + a[n&3|12]*b[n&12|3]);
   let C = t => Math.cos(t), S = t => Math.sin(t);

   // THE CURRENT MATRIX VALUE IS THE TOP ELEMENT OF A STACK

   let m = [ [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1] ], top = 0;

   // SET OR GET THE TOP VALUE OF THE STACK

   this.get  = () => m[top].slice();
   this.set  = _m => { am[top] = _m.slice(); return this; }

   // PUSH OR POP A MATRIX TO/FROM THE STACK

   this.push = () => { m[top+1] = m[top].slice(); top++; return this; }
   this.pop  = () => { --top; return this; }

   this.identity = ()    => { m[top] = [ 1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1 ]; return this; }
   this.inverse = () => {
      let co = (c, r) => {
         let s = (i, j) => m[top][c+i & 3 | (r+j & 3) << 2];
         return (c+r & 1 ? -1 : 1) * ( (s(1,1) * (s(2,2) * s(3,3) - s(3,2) * s(2,3)))
                                     - (s(2,1) * (s(1,2) * s(3,3) - s(3,2) * s(1,3)))
                                     + (s(3,1) * (s(1,2) * s(2,3) - s(2,2) * s(1,3))) );
      }
      let d = [], e = 0;
      for (let n = 0 ; n < 16 ; n++) d.push(co(n >> 2, n & 3));
      for (let n = 0 ; n <  4 ; n++) e += m[top][n] * d[n << 2];
      for (let n = 0 ; n < 16 ; n++) m[top][n] = d[n] / e;
      return this;
   }
   this.move  = (x,y,z)  => { [x,y,z] = xyz(x,y,z); m[top] = mxm(m[top], [1,0,0,0, 0,1,0,0, 0,0,1,0, x,y,z,1]); return this; }
   this.perspective = fl => { m[top] = mxm(m[top], [1,0,0,0, 0,1,0,0, 0,0,1,-1/fl, 0,0,0,1]); return this; }
   this.scale = (x,y,z)  => { [x,y,z] = xyz(x,y,z); m[top] = mxm(m[top], [x,0,0,0, 0,y,0,0, 0,0,z,0, 0,0,0,1]); return this; }
   this.turnX = t        => { m[top] = mxm(m[top], [1,0,0,0, 0,C(t),S(t),0, 0,-S(t),C(t),0, 0,0,0,1]); return this; }
   this.turnY = t        => { m[top] = mxm(m[top], [C(t),0,-S(t),0, 0,1,0,0, S(t),0,C(t),0, 0,0,0,1]); return this; }
   this.turnZ = t        => { m[top] = mxm(m[top], [C(t),S(t),0,0, -S(t),C(t),0,0, 0,0,1,0, 0,0,0,1]); return this; }

   this.draw = (shape, material, textureID) => { draw(shape, material, this, textureID); return this; }
}

// USEFUL MATH FUNCTIONS

let dot = (a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];

let ik = (a,b,C,D) => {
   let cc = dot(C,C), x = (1 + (a*a - b*b)/cc) / 2, y = dot(C,D)/cc;
   for (let i = 0 ; i < 3 ; i++) D[i] -= y * C[i];
   y = Math.sqrt(Math.max(0,a*a - cc*x*x) / dot(D,D));
   for (let i = 0 ; i < 3 ; i++) D[i] = x * C[i] + y * D[i];
   return D;
}

let normalize = v => { let s = Math.sqrt(dot(v,v)); return v.map(a => a/s); }

let noise = (x,y,z) => {
   let c = Math.cos,floor = Math.floor;
   let r = (x,y,z) => c(5 * (x + 5 * c(5 * (y + 5 * c(5 * (z + 5 * c(5 * x)))))));
   let s = (x,y,z) => normalize([ r(x,y,z), r(y,z,x), r(z,x,y) ]);
   let i = floor(x), j = floor(y), k = floor(z), u = x-i, v = y-j, w = z-k;
   let t = (x,y,z) => dot( s(i+x, j+y, k+z), [u-x, v-y, w-z] );
   let e = (f,a,b) => a + (b - a) * (f < .5 ? 2*f*f : 2*f*(2-f)-1);
   return e(w, e(v, e(u, t(0,0,0), t(1,0,0)), e(u, t(0,1,0), t(1,1,0))),
               e(v, e(u, t(0,0,1), t(1,0,1)), e(u, t(0,1,1), t(1,1,1))));
}

