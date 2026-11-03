// ---- 模态框 / 居中确认框 ----
let CONFIRM_PENDING=null;
let MODAL_CLEAR_T=null;
let MODAL_SEQ=0;
const MODAL_OUT_MS=120;

/* 关闭后等退场动画播完再清空内容，避免弹窗内容先消失、背景还挂着 */
function scheduleModalClear(){
  clearTimeout(MODAL_CLEAR_T);
  MODAL_CLEAR_T=setTimeout(()=>{$('#modal').innerHTML='';MODAL_CLEAR_T=null},MODAL_OUT_MS);
}
function cancelModalClear(){clearTimeout(MODAL_CLEAR_T);MODAL_CLEAR_T=null}

function modalOpen(){
  MODAL_SEQ++;
  const bg=$('#modalBg');
  bg.classList.remove('closing');
  bg.classList.add('on');
}
/* dropConfirm=true：这是二次确认框，等退场动画播完再摘掉 is-confirm。
   现在就摘的话宽度会从 400px 瞬间弹回 760px，而退场动画还在淡出，看起来就是"闪一下"。 */
function modalClose(dropConfirm=false){
  const bg=$('#modalBg');
  const seq=MODAL_SEQ;
  bg.classList.add('closing');
  setTimeout(()=>{
    bg.classList.remove('on','closing');
    // 期间又开了新弹窗就别动它的宽度类
    if(dropConfirm&&MODAL_SEQ===seq)$('#modal').classList.remove('is-confirm');
    scheduleModalClear();
  },MODAL_OUT_MS);
}

function showModal(title,sub,body){
  cancelModalClear();
  $('#modal').classList.remove('is-confirm');
  $('#modal').innerHTML=`<div class="section-head"><div><h3>${esc(title)}</h3><div class="sub">${esc(sub||'')}</div></div><button class="btn alt sm" onclick="closeModal()">关闭</button></div>${body}`;
  modalOpen();
}
function closeModal(){
  // 走确认框自己的收尾函数，统一处理宽度类和 Promise
  if(CONFIRM_PENDING){CONFIRM_PENDING(false);return}
  modalClose();
}
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()});

/* 页面内居中确认框，替代原生 window.confirm。返回 Promise<boolean> */
function confirmDialog(message,opt={}){
  const title=opt.title||'请确认',okText=opt.okText||'确定',danger=opt.danger!==false;
  return new Promise(resolve=>{
    cancelModalClear();
    $('#modal').classList.add('is-confirm');
    $('#modal').innerHTML=`<div class="section-head"><div><h3>${esc(title)}</h3><div class="sub">${esc(opt.sub||'')}</div></div></div><div class="confirm-body">${esc(message)}</div><div class="confirm-actions"><button class="btn alt" id="cfCancel">取消</button><button class="btn ${danger?'bad':'good'}" id="cfOk">${esc(okText)}</button></div>`;
    modalOpen();
    const finish=v=>{CONFIRM_PENDING=null;modalClose(true);resolve(v)};
    CONFIRM_PENDING=finish;
    $('#cfOk').onclick=()=>finish(true);
    $('#cfCancel').onclick=()=>finish(false);
    $('#cfOk').focus();
  });
}

// ---- 悬浮小字 Tooltip ----
// 用法：给任意元素加 data-tip="一句话说明"，鼠标悬停 400ms 或键盘 Tab 聚焦时出现。
const TIP_SHOW_DELAY=400;   // 首次悬停延迟
const TIP_CHAIN_DELAY=100;  // 同一组元素连续划过时的顺延延迟
const TIP_LAST_WINDOW=600;  // 多久之内算"连续悬停"
let tipEl=null,tipTimer=null,tipTarget=null,tipLastShown=0;

/* 让字段标题也能触发同一句说明：把 input 上的 data-tip 同步到它的 label */
function attachFieldTips(root){
  (root?$(root):document).querySelectorAll('.field input[data-tip]').forEach(inp=>{
    const label=inp.parentElement.querySelector('label');
    if(label&&!label.hasAttribute('data-tip'))label.setAttribute('data-tip',inp.getAttribute('data-tip'));
  });
}

function tipBox(){
  if(!tipEl){
    tipEl=document.createElement('div');
    tipEl.className='tip';
    tipEl.setAttribute('role','tooltip');
    document.body.appendChild(tipEl);
  }
  return tipEl;
}

function tipPlace(el,box){
  const r=el.getBoundingClientRect(),gap=8,margin=8;
  const w=box.offsetWidth,h=box.offsetHeight;
  let side='top';
  if(r.top-h-gap<margin&&r.bottom+h+gap<window.innerHeight-margin)side='bottom';
  const top=side==='top'?r.top-h-gap:r.bottom+gap;
  let left=r.left+r.width/2-w/2;
  left=Math.max(margin,Math.min(left,window.innerWidth-margin-w));
  const ax=Math.max(12,Math.min(w-12,r.left+r.width/2-left));
  box.style.left=Math.round(left)+'px';
  box.style.top=Math.round(top)+'px';
  box.style.setProperty('--ax',Math.round(ax)+'px');
  box.classList.toggle('below',side==='bottom');
}

function tipShow(el){
  const text=el.getAttribute('data-tip');
  if(!text)return;
  const box=tipBox();
  box.textContent=text;
  box.classList.add('on');
  tipPlace(el,box);
  tipTarget=el;
  tipLastShown=Date.now();
}

function tipHide(){
  clearTimeout(tipTimer);tipTimer=null;tipTarget=null;
  if(tipEl)tipEl.classList.remove('on');
}

function tipSchedule(el,delay){
  clearTimeout(tipTimer);
  const d=(Date.now()-tipLastShown<TIP_LAST_WINDOW)?TIP_CHAIN_DELAY:delay;
  tipTimer=setTimeout(()=>{tipTimer=null;tipShow(el)},d);
}

document.addEventListener('mouseover',e=>{
  const el=e.target.closest&&e.target.closest('[data-tip]');
  if(!el||el===tipTarget)return;
  tipSchedule(el,TIP_SHOW_DELAY);
});
document.addEventListener('mouseout',e=>{
  const el=e.target.closest&&e.target.closest('[data-tip]');
  if(!el)return;
  const to=e.relatedTarget;
  if(to&&(el.contains(to)||(to.closest&&to.closest('[data-tip]'))))return;
  tipHide();
});
document.addEventListener('focusin',e=>{
  const el=e.target.closest&&e.target.closest('[data-tip]');
  if(el)tipSchedule(el,TIP_SHOW_DELAY);
});
document.addEventListener('focusout',e=>{
  if(e.target.closest&&e.target.closest('[data-tip]'))tipHide();
});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&tipEl&&tipEl.classList.contains('on'))tipHide();
});
document.addEventListener('pointerdown',()=>tipHide(),true);
window.addEventListener('scroll',()=>tipHide(),true);
window.addEventListener('resize',()=>tipHide());
