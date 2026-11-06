// Small unsaved explainer adapted from schulteCore.ts (shuffleNumbers and direct order)
// and SchulteBoard.tsx. The full game and its persistent history remain separate.
const text=JSON.parse(document.querySelector('#demo-text').textContent);
const grid=document.querySelector('#grid'),status=document.querySelector('#status');
let next=1;
function reset(){
  next=1;const values=Array.from({length:9},(_,i)=>i+1);
  for(let i=values.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[values[i],values[j]]=[values[j],values[i]];}
  grid.replaceChildren(...values.map(value=>{const b=document.createElement('button');b.type='button';b.textContent=value;b.addEventListener('click',()=>{
    if(value!==next){status.textContent=text.wrong;b.classList.add('error');setTimeout(()=>b.classList.remove('error'),300);return;}
    b.disabled=true;b.classList.add('found');next++;status.textContent=next===10?text.done:text.correct+' '+next;
  });return b;}));status.textContent=text.next+' 1';
}
document.querySelector('#reset').addEventListener('click',reset);reset();
