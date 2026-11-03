// ---- 动效：选中态滑动指示器 / 列表错峰 / 内容淡入 ----
// 规则来源：ui-interaction-polish 13-nav-indicator（指示器独立一层、只改 transform、固定时长、缓出）
const IND_EASE='cubic-bezier(0.2,0,0,1)';
const IND_ADJ=220;   // 相邻项切换
const IND_FAR=280;   // 跨多项
const IND_MID=180;   // 动画中途改目标
const REDUCE_MOTION=window.matchMedia('(prefers-reduced-motion: reduce)');

/* 指示器是宿主的直接子层，绝对定位；没有就建一个（不销毁重建，才有可过渡对象） */
function indEnsure(host,cls){
  let el=host.querySelector(':scope > .'+cls);
  if(!el){el=document.createElement('div');el.className=cls;el.setAttribute('aria-hidden','true');host.insertBefore(el,host.firstChild)}
  return el;
}

/* 把指示器移到目标项。opts.dur===0 表示直接落位（首次挂载 / 窗口缩放） */
function moveInd(host,cls,target,opts={}){
  if(!host||!target||!target.offsetWidth&&!target.offsetHeight)return null;
  const ind=indEnsure(host,cls);
  // opts.h：指示器高度固定（下划线只占 2px）；opts.anchorBottom：贴目标底边
  const h=opts.h!==undefined?opts.h:target.offsetHeight;
  const box={x:target.offsetLeft,y:target.offsetTop,w:target.offsetWidth,h};
  if(opts.anchorBottom)box.y=target.offsetTop+target.offsetHeight-h;
  const prev=ind.__box||null;
  const apply=()=>{
    ind.style.width=box.w+'px';
    ind.style.height=box.h+'px';
    ind.style.transform='translate('+box.x+'px,'+box.y+'px)';
  };
  if(!prev||opts.dur===0||REDUCE_MOTION.matches){
    // 首帧：先定位到位，再启用过渡，避免从容器顶部滑下来
    ind.style.transition='none';
    apply();
    void ind.offsetWidth;
    ind.style.transition='';
    ind.__box=box;
    ind.classList.add('ready');
    return ind;
  }
  let dur=opts.dur;
  if(!dur){
    const dx=Math.abs(box.x-prev.x),dy=Math.abs(box.y-prev.y);
    const adjacent=dy>=dx?dy<=box.h+12:dx<=box.w+12;
    // 动画还没走完就改目标：从当前位置起算，缩到 180ms
    const mid=ind.__until&&performance.now()<ind.__until;
    dur=mid?IND_MID:(adjacent?IND_ADJ:IND_FAR);
  }
  ind.style.transition='transform '+dur+'ms '+IND_EASE+',width '+dur+'ms '+IND_EASE+',height '+dur+'ms '+IND_EASE;
  ind.__until=performance.now()+dur;
  ind.__box=box;
  ind.classList.add('ready');
  apply();
  return ind;
}

/* 侧栏导航 */
function syncNavInd(instant){
  const nav=$('#nav');if(!nav)return;
  const cur=nav.querySelector('button.on');if(!cur)return;
  moveInd(nav,'nav-ind',cur,instant?{dur:0}:{});
  if(!instant){
    // 文字颜色交叉切换：比指示器晚 40ms 开始、同时结束
    nav.classList.add('switching');
    clearTimeout(syncNavInd._t);
    syncNavInd._t=setTimeout(()=>nav.classList.remove('switching'),300);
  }
}

/* 玩家详情标签 */
function syncTabsInd(instant){
  const tabs=document.querySelector('#playerDetail .tabs');if(!tabs)return;
  const cur=tabs.querySelector('button.on');if(!cur)return;
  const o=Object.assign({h:2,anchorBottom:true},instant?{dur:0}:{});
  moveInd(tabs,'tabs-ind',cur,o);
}

/* 玩家列表选中框 */
function syncPlayerInd(instant){
  const host=document.querySelector('.player-list');if(!host)return;
  const cur=host.querySelector('.player-row.on');
  const ind=host.querySelector(':scope > .player-ind');
  if(!cur){if(ind)ind.classList.remove('ready');return}
  moveInd(host,'player-ind',cur,instant?{dur:0}:{});
}

/* 给列表项排错峰延迟：40–60ms 一组，超过 12 项之后不再累加 */
function staggerDelay(i){return Math.min(i,12)*45+'ms'}

/* 内容面板淡入：先移除类、强制回流，再重新加上，保证每次都能重播 */
function animatePane(el){
  if(!el||REDUCE_MOTION.matches)return;
  el.classList.remove('pane-in');
  void el.offsetWidth;
  el.classList.add('pane-in');
}

/* 窗口尺寸变化：直接落位，不播动画 */
let IND_RESIZE_T=null;
window.addEventListener('resize',()=>{
  clearTimeout(IND_RESIZE_T);
  IND_RESIZE_T=setTimeout(()=>{syncNavInd(true);syncTabsInd(true);syncPlayerInd(true)},120);
});
