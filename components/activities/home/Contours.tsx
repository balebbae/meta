'use client';

import {useEffect, useRef} from 'react';
import {useActTheme} from './useActTheme';

const VERT = `#version 300 es
in vec2 p;
void main() { gl_Position = vec4(p, 0., 1.); }`;

// Contour lines of a slowly warped height field: thin, faint ink lines.
// Output is premultiplied; everything between the lines stays transparent, so the surface underneath shows through.
const FRAG = `#version 300 es
precision highp float;
uniform vec2 r;
uniform float t;
uniform vec3 ink;
out vec4 o;
float field(vec2 p, float s) {
  p += .34 * vec2(sin(p.y * 1.7 + s * 1.3), cos(p.x * 1.3 - s));
  p += .17 * vec2(sin(p.y * 3.1 - s * .7 + 1.2), cos(p.x * 2.7 + s * .9));
  return sin(p.x * 1.1 + s * .4) + sin(p.y * 1.3 - s * .3) + .5 * sin((p.x + p.y) * .9 + s * .6);
}
void main() {
  vec2 uv = gl_FragCoord.xy / r.y;
  float h = field(uv * 2.6 + 3., t * .11) * 2.4;
  float px = abs(fract(h - .5) - .5) / fwidth(h);
  float a = (1. - smoothstep(.35, 1.35, px)) * .1;
  o = vec4(ink * a, a);
}`;

/** Slow topographic contour lines in WebGL, drawn in the --fb-act-ink at 10% (re-read when the theme flips).
 *  Decorative and contained: only inside the progress hero and the quest card, never under the page. Pauses
 *  off-screen and in hidden tabs, one still frame under reduced motion, and leaves the flat surface alone when
 *  WebGL2 is missing. */
export function Contours({className}: {className?: string}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const theme = useActTheme();
  const kick = useRef<() => void>(undefined);

  useEffect(() => {
    const c = ref.current;
    const gl = c?.getContext('webgl2', {antialias: false, powerPreference: 'low-power'});
    if (!c || !gl) return;
    const shader = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const prog = gl.createProgram();
    gl.attachShader(prog, shader(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);
    // one triangle that covers the viewport
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const u = (name: string) => gl.getUniformLocation(prog, name);

    // tokens -> rgb through a 2D context, so any CSS colour format works; custom properties flip at once, unlike `color` mid-fade
    const probe = document.createElement('canvas').getContext('2d');
    const rgb = (token: string) => {
      if (!probe) return [0.5, 0.5, 0.5];
      probe.fillStyle = getComputedStyle(c).getPropertyValue(token).trim();
      const hex = String(probe.fillStyle);
      return [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
    };
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    let seen = true;
    let last = 0;
    let painted = '';
    const draw = (now: number) => {
      raf = 0;
      const d = Math.min(devicePixelRatio, 2);
      const w = Math.round(c.clientWidth * d);
      const h = Math.round(c.clientHeight * d);
      const key = `${w}x${h}${document.documentElement.dataset.theme}`;
      // ~30 fps is plenty for a field this slow; a resize or theme flip repaints at once
      if (w && h && (now - last > 32 || key !== painted)) {
        if (key !== painted) {
          c.width = w;
          c.height = h;
          gl.viewport(0, 0, w, h);
          gl.uniform2f(u('r'), w, h);
          gl.uniform3fv(u('ink'), rgb('--fb-act-ink'));
          painted = key;
        }
        last = now;
        gl.uniform1f(u('t'), still ? 40 : now / 1000);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
      if (!still && seen && !document.hidden) raf = requestAnimationFrame(draw);
    };
    const wake = () => {
      if (!raf) raf = requestAnimationFrame(draw);
    };
    kick.current = wake;
    const io = new IntersectionObserver(([e]) => {
      seen = e.isIntersecting;
      if (seen) wake();
    });
    io.observe(c);
    const ro = new ResizeObserver(wake);
    ro.observe(c);
    document.addEventListener('visibilitychange', wake);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener('visibilitychange', wake);
      kick.current = undefined;
    };
  }, []);

  // repaint with the new palette when light/dark flips (the loop may be idle: reduced motion, off-screen)
  useEffect(() => kick.current?.(), [theme]);

  return <canvas ref={ref} className={className} aria-hidden />;
}
