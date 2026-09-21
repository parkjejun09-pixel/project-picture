import type { Point } from './stroke.js';

const clampByte = (value: number): number => Math.max(0, Math.min(255, Math.round(value)));

export function blurPixels(data: Uint8ClampedArray, width: number, height: number, cx: number, cy: number, radius: number, strength: number): Uint8ClampedArray {
  const source = new Uint8ClampedArray(data);
  const out = new Uint8ClampedArray(data);
  const r = Math.max(1, Math.round(radius));
  const mix = Math.max(0, Math.min(1, strength));
  const minX = Math.max(0, Math.floor(cx - r)); const maxX = Math.min(width - 1, Math.ceil(cx + r));
  const minY = Math.max(0, Math.floor(cy - r)); const maxY = Math.min(height - 1, Math.ceil(cy + r));
  for (let y = minY; y <= maxY; y += 1) for (let x = minX; x <= maxX; x += 1) {
    if (Math.hypot(x - cx, y - cy) > r) continue;
    const sums = [0,0,0,0]; let count = 0;
    for (let yy = Math.max(0,y-1); yy <= Math.min(height-1,y+1); yy += 1) for (let xx = Math.max(0,x-1); xx <= Math.min(width-1,x+1); xx += 1) {
      const i=(yy*width+xx)*4; for(let c=0;c<4;c+=1) sums[c]=(sums[c] ?? 0)+source[i+c]!; count+=1;
    }
    const i=(y*width+x)*4;
    for(let c=0;c<4;c+=1) out[i+c]=clampByte(source[i+c]!*(1-mix)+((sums[c] ?? 0)/count)*mix);
  }
  return out;
}

export function smudgePixels(data: Uint8ClampedArray, width: number, height: number, from: Point, to: Point, radius: number, strength: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(data);
  const r=Math.max(1,Math.round(radius)); const mix=Math.max(0,Math.min(1,strength));
  const dx=Math.round(to.x-from.x), dy=Math.round(to.y-from.y);
  for(let y=-r;y<=r;y+=1) for(let x=-r;x<=r;x+=1){
    if(x*x+y*y>r*r) continue;
    const sx=Math.round(from.x)+x, sy=Math.round(from.y)+y, tx=sx+dx, ty=sy+dy;
    if(sx<0||sy<0||tx<0||ty<0||sx>=width||tx>=width||sy>=height||ty>=height) continue;
    const si=(sy*width+sx)*4, ti=(ty*width+tx)*4;
    for(let c=0;c<4;c+=1) out[ti+c]=clampByte(out[ti+c]!*(1-mix)+data[si+c]!*mix);
  }
  return out;
}

export function mixHexColors(a: string, b: string, amount: number): string {
  const parse=(hex:string):number[]=>{ const v=Number.parseInt(hex.replace('#',''),16); return [(v>>16)&255,(v>>8)&255,v&255]; };
  const aa=parse(a), bb=parse(b), t=Math.max(0,Math.min(1,amount));
  return `#${aa.map((v,i)=>clampByte(v*(1-t)+bb[i]!*t).toString(16).padStart(2,'0')).join('').toUpperCase()}`;
}
