const canvas = document.getElementById('matrix');
const ctx = canvas.getContext('2d');

const textInput = document.getElementById('text');
const translateBtn = document.getElementById('translate');
const clearBtn = document.getElementById('clear');
const liveChk = document.getElementById('live');
const testSel = document.getElementById('test');
const rowsInput = document.getElementById('rows');
const colsInput = document.getElementById('cols');
const dotInput  = document.getElementById('dot');
const gapInput  = document.getElementById('gap');
const glowChk   = document.getElementById('glow');

let COLS = parseInt(colsInput.value,10);
let ROWS = parseInt(rowsInput.value,10);
let DOT  = parseInt(dotInput.value,10);
let GAP  = parseInt(gapInput.value,10);

function resizeCanvas(){
  canvas.width  = COLS*(DOT+GAP)+GAP;
  canvas.height = ROWS*(DOT+GAP)+GAP;
}
[rowsInput, colsInput, dotInput, gapInput].forEach(el=> el.addEventListener('change', ()=>{
  COLS = +colsInput.value || 60;
  ROWS = +rowsInput.value || 20;
  DOT  = +dotInput.value  || 16;
  GAP  = +gapInput.value  || 4;
  resizeCanvas(); render();
}));
resizeCanvas();

function clearMatrix(){
  ctx.fillStyle = '#000'; ctx.fillRect(0,0,canvas.width,canvas.height);
}
function drawDot(c,r,on){
  const cx = GAP + c*(DOT+GAP) + DOT/2;
  const cy = GAP + (ROWS-1-r)*(DOT+GAP) + DOT/2;
  const rad = DOT/2;
  // base off dot
  ctx.beginPath(); ctx.arc(cx,cy,rad,0,Math.PI*2);
  ctx.fillStyle = '#222'; ctx.fill();
  if(on){
    // bright inner
    ctx.beginPath(); ctx.arc(cx,cy,rad*0.9,0,Math.PI*2);
    ctx.fillStyle = '#fff'; ctx.fill();
    // mild glow
    if (glowChk.checked){
      ctx.shadowColor = '#fff'; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(cx,cy,1,0,Math.PI*2); ctx.fillStyle='#fff'; ctx.fill();
      ctx.shadowBlur = 0;
    }
  }
}

// --- 16x16 sprites for better curves ---
function sprite16(lines){ return { size: 16, px: lines.map(l => l.split('').map(ch => ch === '#')) }; }

const SPRITES = {
  face_happy: sprite16([
    "....########....",
    "..############..",
    ".##############.",
    "################",
    "######....######",
    "#####......#####",
    "#####......#####",
    "#####......#####",
    "#####.#..#.#####",
    "######.##.######",
    "#######..#######",
    "################",
    ".##############.",
    "..############..",
    "....########....",
    "................"
  ]),
  face_sad: sprite16([
    "....########....",
    "..############..",
    ".##############.",
    "################",
    "######....######",
    "#####......#####",
    "#####......#####",
    "######.##.######",
    "#####.#..#.#####",
    "#####......#####",
    "#####......#####",
    "################",
    ".##############.",
    "..############..",
    "....########....",
    "................"
  ]),
  face_neutral: sprite16([
    "....########....",
    "..############..",
    ".##############.",
    "################",
    "######....######",
    "#####......#####",
    "################",
    "################",
    "################",
    "################",
    "################",
    "################",
    ".##############.",
    "..############..",
    "....########....",
    "................"
  ]),
  heart: sprite16([
    "...####..####...",
    "..############..",
    ".##############.",
    "################",
    "################",
    ".##############.",
    "..############..",
    "...##########...",
    "....########....",
    ".....######.....",
    "......####......",
    ".......##.......",
    "................",
    "................",
    "................",
    "................"
  ]),
  star: sprite16([
    ".......##.......",
    ".......##.......",
    "....########....",
    "##.##########.##",
    ".##############.",
    "...##########...",
    "....########....",
    ".....######.....",
    "....########....",
    "...##########...",
    ".##############.",
    "##.##########.##",
    "....########....",
    ".......##.......",
    ".......##.......",
    "................"
  ]),
  pizza: sprite16([
    "......####......",
    ".....######.....",
    "....########....",
    "...##########...",
    "..############..",
    ".##############.",
    "################",
    ".##############.",
    "..############..",
    "...##########...",
    "....########....",
    ".....######.....",
    "......####......",
    "................",
    "................",
    "................"
  ])
};

const DICT = new Map([
  ["happy","face_happy"],["happy face","face_happy"],["smile","face_happy"],
  ["sad","face_sad"],["sad face","face_sad"],
  ["neutral","face_neutral"],["ok","face_neutral"],
  ["heart","heart"],["love","heart"],["star","star"],["pizza","pizza"]
]);

function textToSprites(text){
  const tokens = (text||"").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const sprites = [];
  for (let i=0;i<tokens.length;i++){
    const two = i+1<tokens.length ? tokens[i]+" "+tokens[i+1] : null;
    let key = null;
    if (two && DICT.has(two)){ key = DICT.get(two); i++; }
    else if (DICT.has(tokens[i])){ key = DICT.get(tokens[i]); }
    if (key) sprites.push(SPRITES[key]);
  }
  return sprites;
}

function render(){
  clearMatrix();
  const sprites = testSel.value ? [SPRITES[testSel.value]] : textToSprites(textInput.value);
  const buf = new Uint8Array(COLS*ROWS);
  const S = 16; // base sprite size
  const scale = 1; // keep crisp; change to 2 for bigger
  const step = S*scale + 4;
  // Center horizontally
  let startX = Math.max(2, Math.floor((COLS - sprites.length*step)/2));
  const y = Math.max(0, Math.floor((ROWS - S*scale)/2));
  sprites.forEach((sp, idx)=>{
    paint(buf, startX + idx*step, y, sp, scale);
  });
  // draw buffer
  for (let y0=0;y0<ROWS;y0++){
    for (let x0=0;x0<COLS;x0++){
      drawDot(x0,y0, buf[y0*COLS+x0]===1);
    }
  }
}

function paint(buf, ox, oy, sp, scale){
  for (let r=0;r<sp.size;r++){
    for (let c=0;c<sp.size;c++){
      if (!sp.px[r][c]) continue;
      for (let ry=0; ry<scale; ry++){
        for (let rx=0; rx<scale; rx++){
          const x = ox + c*scale + rx;
          const y = oy + (sp.size-1-r)*scale + ry;
          if (x>=0 && x<COLS && y>=0 && y<ROWS) buf[y*COLS + x] = 1;
        }
      }
    }
  }
}

translateBtn.addEventListener('click', render);
clearBtn.addEventListener('click', ()=>{ textInput.value=''; testSel.value=''; render(); });
textInput.addEventListener('input', ()=>{ if (liveChk.checked){ testSel.value=''; render(); } });
testSel.addEventListener('change', ()=> render());

render();
