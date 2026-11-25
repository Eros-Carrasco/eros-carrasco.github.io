let Shape = {

   sphere : (m,n) => {
      let p = (u,v) => {
	 let theta = 2 * Math.PI * u;
	 let phi = Math.PI * v - Math.PI/2;
	 let x = Math.cos(theta) * Math.cos(phi), y = Math.sin(theta) * Math.cos(phi), z = Math.sin(phi);
	 return [ x,y,z, x,y,z, u,v ];
      }
      let vertices = [];
      for (let i = 0 ; i < m ; i++)
      for (let j = 0 ; j < n ; j++) {
         let u0 = i / m, u1 = (i+1) / m;
         let v0 = j / n, v1 = (j+1) / n;

	 vertices.push(p(u0,v0));
	 vertices.push(p(u1,v0));
	 vertices.push(p(u0,v1));

	 vertices.push(p(u0,v1));
	 vertices.push(p(u1,v0));
	 vertices.push(p(u1,v1));
      }
      return new Float32Array(vertices.flat());
   },

   cylinder : n => {
      let vertices = [];
      for (let i = 0 ; i < n ; i++) {
         let u0 = i / n;
         let u1 = (i+1) / n;
	 let x0 = Math.cos(2 * Math.PI * u0);
	 let y0 = Math.sin(2 * Math.PI * u0);
	 let x1 = Math.cos(2 * Math.PI * u1);
	 let y1 = Math.sin(2 * Math.PI * u1);
	 vertices.push(
	    x0,y0,1,  0,0,1,   u0,1,   x1,y1,1, 0,0,1,   u1,1,  0,0,1,    0,0,1,   u0,0,

	    x0,y0,-1, x0,y0,0, u0,0,  x0,y0, 1, x0,y0,0, u0,1,  x1,y1, 1, x1,y1,0, u1,1,
	    x1,y1,-1, x1,y1,0, u1,0,  x0,y0,-1, x0,y0,0, u0,0,  x1,y1, 1, x1,y1,0, u1,1,

	    x0,y0,-1, 0,0,-1,  u1,0,  x1,y1,-1, 0,0,-1, u1,0,   0,0,-1,   0,0,-1,  u1,1,
         );
      }
      return new Float32Array(vertices);
   },

   cube : () => new Float32Array([
       1,-1, 1,  1,0,0, 0,1,   1, 1,-1,  1,0,0, 1,0,   1,-1,-1,  1,0,0, 0,0,
       1,-1, 1,  1,0,0, 0,1,   1, 1,-1,  1,0,0, 1,0,   1, 1, 1,  1,0,0, 1,1,
      -1,-1, 1, -1,0,0, 0,1,  -1, 1,-1, -1,0,0, 1,0,  -1,-1,-1, -1,0,0, 0,0,
      -1,-1, 1, -1,0,0, 0,1,  -1, 1,-1, -1,0,0, 1,0,  -1, 1, 1, -1,0,0, 1,1,

      -1, 1, 1, 0, 1,0, 0,1,   1, 1,-1, 0, 1,0, 1,0,  -1, 1,-1, 0, 1,0, 0,0,
      -1, 1, 1, 0, 1,0, 0,1,   1, 1,-1, 0, 1,0, 1,0,   1, 1, 1, 0, 1,0, 1,1,
      -1,-1, 1, 0,-1,0, 0,1,   1,-1,-1, 0,-1,0, 1,0,  -1,-1,-1, 0,-1,0, 0,0,
      -1,-1, 1, 0,-1,0, 0,1,   1,-1,-1, 0,-1,0, 1,0,   1,-1, 1, 0,-1,0, 1,1,

      -1, 1, 1, 0,0, 1, 0,1,   1,-1, 1, 0,0, 1, 1,0,  -1,-1, 1, 0,0, 1, 0,0,
      -1, 1, 1, 0,0, 1, 0,1,   1,-1, 1, 0,0, 1, 1,0,   1, 1, 1, 0,0, 1, 1,1,
      -1, 1,-1, 0,0,-1, 0,1,   1,-1,-1, 0,0,-1, 1,0,  -1,-1,-1, 0,0,-1, 0,0,
      -1, 1,-1, 0,0,-1, 0,1,   1,-1,-1, 0,0,-1, 1,0,   1, 1,-1, 0,0,-1, 1,1,
   ]),

   text : str => {
      let char = (c, i) => {
         let u0 = ((c-32) % 12     ) / 12 + .007, u1 = u0 + 1 / 12 * .81;
         let v0 = ((c-32) / 12 >> 0) /  8       , v1 = v0 + 1 /  8;
         return [ i,1,0, 0,0,1, u0,v0,  i+1,-1,0, 0,0,1, u1,v1,  i  ,-1,0, 0,0,1, u0,v1,
                  i,1,0, 0,0,1, u0,v0,  i+1,-1,0, 0,0,1, u1,v1,  i+1, 1,0, 0,0,1, u1,v0 ];
      }
      let mesh = [];
      for (let i = 0 ; i < str.length ; i++)
         mesh.push(char(str.charCodeAt(i), i));
      return new Float32Array(mesh.flat());
   },
}

