// ---- 鱼口控制 ----
let FISH_AREAS=[];
const FISH_RULE_SWITCHES={
  distribution:{key:'fish_distribution_enabled',prefix:'fishDistribution',enabled:null,on:'按地图鱼种、所在区域和游戏昼夜变化鱼口，每四个游戏小时重新分布。',off:'沿用现有分布，各处水域可出鱼，不增加点位限制。'},
  bait:{key:'fish_bait_rules_enabled',prefix:'fishRules',enabled:null,on:'根据钩上饵料筛选鱼种。',off:'沿用现有吃饵逻辑，不增加吃饵限制。'}
};
async function loadFishRules(){
  for(const x of Object.values(FISH_RULE_SWITCHES))$('#'+x.prefix+'Toggle').disabled=true;
  try{
    const values=await api('/api/tunables');
    for(const x of Object.values(FISH_RULE_SWITCHES)){
      x.enabled=values[x.key]==='1';
      $('#'+x.prefix+'Badge').textContent=x.enabled?'已开启':'已关闭';
      const button=$('#'+x.prefix+'Toggle');button.textContent=x.enabled?'关闭':'开启';button.setAttribute('aria-pressed',String(x.enabled));button.disabled=false;
      $('#'+x.prefix+'Message').textContent=x.enabled?x.on:x.off;
    }
  }catch(e){for(const x of Object.values(FISH_RULE_SWITCHES)){x.enabled=null;$('#'+x.prefix+'Badge').textContent='读取失败';$('#'+x.prefix+'Message').textContent=e.message;$('#'+x.prefix+'Toggle').textContent='暂不可用';}}
}
async function toggleFishRules(kind){
  const x=FISH_RULE_SWITCHES[kind];if(!x||x.enabled===null)return;
  for(const item of Object.values(FISH_RULE_SWITCHES))$('#'+item.prefix+'Toggle').disabled=true;
  try{
    await api('/api/tunables',{method:'POST',body:JSON.stringify({key:x.key,value:x.enabled?'0':'1'})});
    await loadFishRules();toast('已保存，最多 30 秒影响后续判鱼');
  }catch(e){toast(e.message,'bad');for(const item of Object.values(FISH_RULE_SWITCHES))$('#'+item.prefix+'Toggle').disabled=item.enabled===null;}
}
async function loadFishAreas(){
  await loadFishRules();
  FISH_AREAS=await api('/api/fish/areas');renderFishAreas();
  if(!FISH_AREA&&FISH_AREAS.length){await selectFishArea(FISH_AREAS[0].loc)}
}
// 水域展示顺序：与游戏客户端地图选择顺序一致，未列出的水域排在最后（保持原有相对顺序）。
const FISH_AREA_ORDER=['克马羚诺也湖','埃尔克湖','惟有诺克河','旧奥斯特罗格湖','白河','廓里湖','梅德韦杰湖','沃尔霍夫河','北顿涅茨河','苏拉河','拉多加湖','琥珀湖','拉多加湖群岛','阿赫图巴河','铜湖','下通古斯卡河','亚马河','挪威海'];
function renderFishAreas(){
  const q=($('#fishSearch')?.value||'').toLowerCase();
  const orderOf=x=>{const i=FISH_AREA_ORDER.indexOf(x.loc);return i<0?FISH_AREA_ORDER.length:i;};
  const rows=FISH_AREAS.filter(x=>x.loc.toLowerCase().includes(q)).map((x,i)=>({x,i})).sort((a,b)=>orderOf(a.x)-orderOf(b.x)||a.i-b.i).map(e=>e.x);
  $('#fishAreas').innerHTML=rows.map(x=>`<div class="player-row ${FISH_AREA===x.loc?'on':''}" data-loc="${esc(x.loc)}" onclick="selectFishArea(this.dataset.loc)"><div><div class="n mono">${esc(x.loc)}</div><div class="id">${x.fish_count} 个鱼种</div></div></div>`).join('')||'<div class="empty">没有匹配水域</div>';
}
async function selectFishArea(loc){FISH_AREA=loc;renderFishAreas();FISH_CFG=await api('/api/fish/config?loc='+encodeURIComponent(loc));renderFishEditor()}
function renderFishEditor(){
  if(!FISH_CFG)return;const c=FISH_CFG,s=c.setting;
  $('#fishEditor').innerHTML=`<div class="section-head"><div><h2 class="mono">${esc(c.area)}</h2><small>${c.fish.length} 个鱼种 · 权重是相对值，数字越大越容易咬钩；填 0 或关掉开关 = 这个水域不出这条鱼</small></div><div class="head-actions"><button class="btn good sm" onclick="saveFishConfig()">保存鱼口配置</button><button class="btn alt sm" onclick="selectFishArea(FISH_AREA)">撤销修改</button><button class="btn bad sm" onclick="resetFishConfig()">恢复静态鱼口</button><button class="btn" onclick="showAddFish()">+ 添加鱼种</button></div></div>
    <div class="form-grid">
      <div class="field"><label>每竿出鱼率 <span class="unit">0 ~ 1</span></label><input id="fishProb" type="number" min="0" max="1" step="0.01" value="${s.bite_probability}" data-tip="每次抛竿真有鱼的概率。1 = 竿竿有鱼，0.5 = 一半空竿，0 = 永不咬钩"><div class="hint">越高越容易咬钩</div></div>
      <div class="field"><label>固定咬钩秒数 <span class="unit">0 = 不用</span></label><input id="fishFixed" type="number" min="0" step="0.1" value="${s.bite_delay_fixed}" data-tip="填大于 0 就固定等这么多秒必中鱼，下面三项全部失效。测功能、刷鱼用这个最快"><div class="hint">填了就锁死等待时间</div></div>
      <div class="field"><label>咬钩等待倍率</label><input id="fishScale" type="number" min="0" step="0.05" value="${s.bite_delay_scale}" data-tip="在自然等待时间上再乘一次。1 = 原样，0.5 = 等待砍半咬得更勤，2 = 等待翻倍"><div class="hint">1 = 原样，0.5 = 砍半</div></div>
      <div class="field"><label>普通竿最长等待 <span class="unit">秒</span></label><input id="fishMax" type="number" min="1" step="0.5" value="${s.bite_delay_max}" data-tip="除路亚以外的竿子最长等多久。最低按 6 秒算，填比 6 小的数不生效"><div class="hint">除路亚外，最低按 6 秒算</div></div>
      <div class="field"><label>路亚最长等待 <span class="unit">秒</span></label><input id="fishLureMax" type="number" min="0.5" step="0.5" value="${s.bite_delay_lure_max}" data-tip="只对路亚竿生效。路亚本来就在 1.5~6 秒之间随机，调小咬得更快，调太大会错过收线窗口"><div class="hint">只对路亚竿生效</div></div>
    </div>
    <div class="toolbar" style="margin:16px 0 10px"><input class="grow" id="fishFilter" placeholder="筛选当前水域鱼种" oninput="renderFishRows()"><button class="btn alt sm" onclick="fishSetAll(true)">全部启用</button><button class="btn alt sm" onclick="fishSetAll(false)">全部关闭</button></div><div id="fishRows"></div>`;
  attachFieldTips('#fishEditor');
  renderFishRows();
}
function syncFishRows(){
  if(!FISH_CFG)return;
  FISH_CFG.fish.forEach((f,i)=>{const w=$('#fw_'+i),e=$('#fe_'+i);if(w)f.weight=+w.value;if(e)f.enabled=e.checked});
}
function renderFishRows(){
  if(!FISH_CFG)return;const q=($('#fishFilter')?.value||'').toLowerCase();
  const rows=FISH_CFG.fish.map((f,i)=>({f,i})).filter(x=>!q||`${x.f.fish_key} ${x.f.name_zh}`.toLowerCase().includes(q));
  $('#fishRows').innerHTML=`<div class="table-wrap"><table class="fish-table"><thead><tr><th>出现</th><th>鱼种</th><th data-tip="静态统计库里的原始权重，只读不改">原版权重</th><th data-tip="填了就盖掉原版权重。留空或 0 = 这个水域不出这条鱼">自定义权重</th><th data-tip="自定义 = 当前用的是你填的值；原版 = 用的是统计库原值">当前生效</th></tr></thead><tbody>${rows.map(({f,i})=>`<tr><td><input class="switch" type="checkbox" id="fe_${i}" ${f.enabled?'checked':''} onchange="syncFishRows()" data-tip="${f.enabled?'关掉 = 这个水域不出这条鱼':'打开 = 这条鱼重新进入咬钩池'}" aria-label="启用 ${esc(f.name_zh||f.fish_key)}"></td><td><b>${esc(f.name_zh||f.fish_key)}</b><div class="muted mono">${esc(f.fish_key)}</div></td><td class="num">${Number(f.base_weight).toFixed(2)}</td><td><input class="mini-input" id="fw_${i}" type="number" min="0" step="0.1" value="${f.weight}" onchange="syncFishRows()" data-tip="相对权重，同一水域里越大越容易咬钩；留空或 0 = 不出这条鱼"></td><td>${f.has_override?'<span class="tag gold" data-tip="这条鱼用的是你填的自定义权重">自定义</span>':'<span class="tag" data-tip="这条鱼用的是统计库原版权重">原版</span>'}</td></tr>`).join('')||'<tr><td colspan="5" class="empty">没有匹配鱼种</td></tr>'}</tbody></table></div>`;
}
function fishSetAll(on){syncFishRows();FISH_CFG.fish.forEach(f=>f.enabled=on);renderFishRows()}
async function saveFishConfig(){
  syncFishRows();const s=FISH_CFG.setting;FISH_CFG.setting={...s,bite_probability:+$('#fishProb').value,bite_delay_fixed:+$('#fishFixed').value,bite_delay_scale:+$('#fishScale').value,bite_delay_max:+$('#fishMax').value,bite_delay_lure_max:+$('#fishLureMax').value};
  await api('/api/fish/config',{method:'POST',body:JSON.stringify({area:FISH_CFG.area,setting:FISH_CFG.setting,fish:FISH_CFG.fish})});toast('鱼口配置已保存并热生效');await selectFishArea(FISH_AREA);
}
async function resetFishConfig(){if(!await confirmDialog('清除该水域的全部鱼口覆盖并恢复静态配置？',{title:'恢复静态鱼口',okText:'恢复'}))return;await api('/api/fish/config/reset',{method:'POST',body:JSON.stringify({area:FISH_AREA})});toast('已恢复静态鱼口');await selectFishArea(FISH_AREA)}
async function showAddFish(){showModal('添加鱼种到水域','搜索鱼库后添加到当前覆盖列表',`<input id="fishAddSearch" placeholder="中文名或 fish_key" oninput="debounce('fishAdd',searchFishPool)"><div class="results" id="fishAddResults"></div>`);searchFishPool()}
async function searchFishPool(){const q=$('#fishAddSearch').value.trim();const list=await api('/api/fish/pool?q='+encodeURIComponent(q)+'&limit=80');$('#fishAddResults').innerHTML=list.map(x=>`<div class="result" data-key="${esc(x.fish_key)}" data-name="${esc(x.name_zh)}" onclick="addFishFromPool(this.dataset.key,this.dataset.name)"><div><b>${esc(x.name_zh)}</b><div class="muted mono">${esc(x.fish_key)}</div></div><span class="tag">${fmt(x.min_g)}-${fmt(x.max_g)}g</span></div>`).join('')||'<div class="empty">无结果</div>'}
function addFishFromPool(key,name){syncFishRows();if(FISH_CFG.fish.some(f=>f.fish_key===key)){closeModal();return toast('该鱼种已在列表','bad')}FISH_CFG.fish.push({fish_key:key,name_zh:name,base_weight:0,weight:1,enabled:true,has_override:true});closeModal();renderFishRows();toast('已加入，记得保存')}
