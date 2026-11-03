// ---- 玩家工作台 ----
let playerCache=[],ITEM_FILTER='';
const TAB_INDEX={profile:0,items:1,keepnet:2,skills:3,mail:4};
async function loadPlayers(keep=false){
  const q=$('#playerSearch')?.value?.trim()||'';
  playerCache=await api('/api/players?q='+encodeURIComponent(q));
  const host=$('#playerList');
  // 指示器是常驻子层：重建列表时先摘出来，避免 innerHTML 把它一起冲掉（冲掉就丢了上次位置，滑不动了）
  const ind=host.querySelector(':scope > .player-ind');
  host.innerHTML=playerCache.map((p,i)=>`<div class="player-row ${PLAYER?.uid===p.uid?'on':''}" data-uid="${p.uid}" ${keep?'':'style="--d:'+staggerDelay(i)+'"'} onclick="selectPlayer(${p.uid})"><div><div class="n">${esc(p.name)}</div><div class="id">UID ${p.uid} · Lv.${p.level}</div></div><div>${p.banned?'<span class="pill bad">封禁</span>':'<span class="pill ok">正常</span>'}</div></div>`).join('')||'<div class="empty">没有匹配玩家</div>';
  if(ind)host.insertBefore(ind,host.firstChild);
  // 换列表/换搜索词才播错峰；点选玩家只是切选中态，不该整列重播
  host.classList.toggle('stagger',!keep);
  syncPlayerInd(PLAYER_IND_FIRST);PLAYER_IND_FIRST=false;
  if(!keep && playerCache.length && !PLAYER)selectPlayer(playerCache[0].uid);
}
async function selectPlayer(uid){
  try{PLAYER=await api('/api/players/detail?uid='+uid);PLAYER_TAB='profile';ITEM_FILTER='';renderPlayerDetail();await loadPlayers(true)}catch(e){toast(e.message,'bad')}
}
let PLAYER_IND_FIRST=true;
function renderPlayerDetail(){
  if(!PLAYER)return;
  const p=PLAYER;
  $('#playerDetail').innerHTML=`
    <div class="player-hero"><div><h2>${esc(p.name)} <span class="muted">#${p.uid}</span></h2><div class="sub">Lv.${p.level} · XP ${fmt(p.xp)} · 背包/装备 ${p.item_count} · 护网 ${p.keepnet_count} · 邮件 ${p.mail_count}</div></div><div class="actions"><button class="btn alt sm" onclick="kickPlayer()">踢下线</button><button class="${p.banned?'btn good':'btn bad'} sm" onclick="toggleBan()">${p.banned?'解除封禁':'封禁玩家'}</button></div></div>
    <div class="tabs"><button class="${PLAYER_TAB==='profile'?'on':''}" onclick="setPlayerTab('profile')">档案与资产</button><button class="${PLAYER_TAB==='items'?'on':''}" onclick="setPlayerTab('items')">背包 / 装备</button><button class="${PLAYER_TAB==='keepnet'?'on':''}" onclick="setPlayerTab('keepnet')">护网</button><button class="${PLAYER_TAB==='skills'?'on':''}" onclick="setPlayerTab('skills')">技能熟练度</button><button class="${PLAYER_TAB==='mail'?'on':''}" onclick="setPlayerTab('mail')">邮箱</button></div>
    <div id="playerTabBody"></div>`;
  // 标签下划线指示器：换玩家重建后直接落位，同一玩家切页时滑动
  syncTabsInd(true);
  renderPlayerTab();
}
function setPlayerTab(tab){
  PLAYER_TAB=tab;
  // 同一玩家内切页：不重建 hero/tabs，只切选中文字状态，让指示器平滑滑过去
  const tabs=document.querySelector('#playerDetail .tabs');
  if(tabs&&PLAYER){tabs.querySelectorAll('button').forEach((b,i)=>b.classList.toggle('on',i===TAB_INDEX[tab]));}
  syncTabsInd();
  renderPlayerTab();
}
function renderPlayerTab(){
  const p=PLAYER;
  if(!p)return;
  if(PLAYER_TAB==='profile'){
    $('#playerTabBody').innerHTML=`<div class="form-grid">
      <div class="field span2"><label>昵称</label><input id="pf_name" value="${esc(p.name)}"></div>
      <div class="field"><label>等级</label><input id="pf_level" type="number" min="1" max="58" value="${p.level}"></div>
      <div class="field"><label>累计经验</label><input id="pf_xp" type="number" min="0" value="${p.xp}"></div>
      <div class="field"><label>银币（分）</label><input id="pf_silver" type="number" value="${p.silver}"></div>
      <div class="field"><label>金币（分）</label><input id="pf_gold" type="number" value="${p.gold}"></div>
      <div class="field"><label>银行（分）</label><input id="pf_bank" type="number" value="${p.bank}"></div>
      <div class="field"><label>会员</label><input value="${p.membership}" disabled></div>
    </div><div class="actions"><button class="btn good" onclick="saveProfile()">保存档案与货币</button><button class="btn alt" onclick="selectPlayer(${p.uid})">撤销修改</button></div>`;
  }
  if(PLAYER_TAB==='items')renderItems();
  if(PLAYER_TAB==='keepnet')renderKeepnet();
  if(PLAYER_TAB==='skills')renderSkills();
  if(PLAYER_TAB==='mail')renderPlayerMail();
  // 内容换页时整体淡入下移归位（180ms），纵向不叠加
  animatePane($('#playerTabBody'));
}
async function saveProfile(){
  const body={uid:PLAYER.uid,name:$('#pf_name').value,level:+$('#pf_level').value,xp:+$('#pf_xp').value,silver:+$('#pf_silver').value,gold:+$('#pf_gold').value,bank:+$('#pf_bank').value};
  await api('/api/players/update',{method:'POST',body:JSON.stringify(body)});toast('档案已保存，在线玩家将收到 2/1 刷新');await sleep(400);await selectPlayer(PLAYER.uid);
}
function renderItems(){
  $('#playerTabBody').innerHTML=`<div class="toolbar"><input class="grow" id="itemFilter" placeholder="筛选 item_id / 名称 / GUID" value="${esc(ITEM_FILTER)}" oninput="ITEM_FILTER=this.value;renderItemRows()"><button class="btn" onclick="showGrantItem()">+ 发放物品</button></div><div class="table-wrap" style="margin-top:12px"><table><thead><tr><th>物品</th><th>类型</th><th>容器</th><th>数量</th><th>耐久</th><th>GUID</th><th></th></tr></thead><tbody id="itemRows"></tbody></table></div>`;
  renderItemRows();
}
function renderItemRows(){
  const q=ITEM_FILTER.toLowerCase();const rows=(PLAYER.items||[]).filter(x=>!q||`${x.item_id} ${x.name} ${x.guid}`.toLowerCase().includes(q));
  $('#itemRows').innerHTML=rows.map((x,i)=>`<tr style="--d:${staggerDelay(i)}"><td><b>${esc(x.name||x.item_id)}</b><div class="muted mono">${esc(x.item_id)}</div></td><td>${x.category}</td><td>${esc(x.container)}</td><td>${x.qty}</td><td>${Number(x.durability).toFixed(4)}</td><td class="mono muted">${esc(x.guid.slice(0,12))}…</td><td class="right"><button class="btn bad sm" data-guid="${esc(x.guid)}" onclick="deletePlayerItem(this.dataset.guid)">删除</button></td></tr>`).join('')||'<tr><td colspan="7" class="empty">没有物品</td></tr>';
  // 筛选输入时每敲一个字符都重绘，就不要逐行淡入了，否则手感发黏
  $('#itemRows').classList.toggle('stagger',!q);
}
async function deletePlayerItem(guid){
  if(!await confirmDialog('确定删除这件物品？操作会写入审计日志。',{title:'删除物品',okText:'删除'}))return;
  await api('/api/players/items/delete',{method:'POST',body:JSON.stringify({uid:PLAYER.uid,guids:[guid]})});toast('删除指令已发送');await sleep(2300);await selectPlayer(PLAYER.uid);setPlayerTab('items');
}
async function showGrantItem(){
  showModal('发放物品','搜索物品目录，选择后输入数量',`<input id="grantSearch" placeholder="物品 ID 或中文名" oninput="debounce('grantSearch',searchGrantItems)"><div class="results" id="grantResults"></div><div class="form-grid" style="grid-template-columns:1fr 110px;margin-top:12px"><div class="field"><label>已选物品</label><input id="grantItemId" placeholder="item_id"></div><div class="field"><label>数量</label><input id="grantQty" type="number" min="1" value="1"></div></div><div class="actions"><button class="btn good" onclick="grantItem()">确认发放</button></div>`);searchGrantItems();
}
async function searchGrantItems(){const q=$('#grantSearch').value.trim();const list=await api('/api/catalog/items?q='+encodeURIComponent(q));$('#grantResults').innerHTML=list.map(x=>`<div class="result" data-id="${esc(x.item_id)}" onclick="$('#grantItemId').value=this.dataset.id"><div><b>${esc(x.name||x.item_id)}</b><div class="muted mono">${esc(x.item_id)} · ${x.numeric_id}</div></div><span class="tag">cat ${x.category}</span></div>`).join('')||'<div class="empty">无结果</div>'}
async function grantItem(){const item_id=$('#grantItemId').value.trim(),qty=+$('#grantQty').value||1;if(!item_id)return toast('请选择物品','bad');await api('/api/players/grant',{method:'POST',body:JSON.stringify({uid:PLAYER.uid,item_id,qty})});closeModal();toast('发放指令已发送');await sleep(2300);await selectPlayer(PLAYER.uid);setPlayerTab('items')}
function renderKeepnet(){
  const rows=PLAYER.keepnet||[];
  $('#playerTabBody').innerHTML=`<div class="toolbar"><div class="grow muted">共 ${rows.length} 条鱼，删除后统计/鱼市会同步更新</div><button class="btn" onclick="showAddKeepnet()">+ 添加鱼</button></div><div class="table-wrap" style="margin-top:12px"><table><thead><tr><th>鱼种</th><th>重量</th><th>档位</th><th>地点</th><th>饵</th><th>时间</th><th></th></tr></thead><tbody class="stagger">${rows.map((x,i)=>`<tr style="--d:${staggerDelay(i)}"><td><b>${esc(x.name_zh||x.species)}</b><div class="muted mono">${esc(x.species)}</div></td><td>${fmt(x.weight_g)} g</td><td><span class="tag">G${x.cat}</span></td><td>${esc(x.keep_level||x.keep_loc)}</td><td>${esc(x.keep_bait)}</td><td>${timeText(x.ts)}</td><td class="right"><button class="btn bad sm" data-guid="${esc(x.echo_guid)}" onclick="deleteKeepnet(this.dataset.guid)">删除</button></td></tr>`).join('')||'<tr><td colspan="7" class="empty">护网为空</td></tr>'}</tbody></table></div>`;
}
async function deleteKeepnet(guid){if(!await confirmDialog('从护网删除这条鱼？',{title:'删除护网记录',okText:'删除'}))return;await api('/api/players/keepnet/delete',{method:'POST',body:JSON.stringify({uid:PLAYER.uid,guids:[guid]})});toast('删除指令已发送');await sleep(2300);await selectPlayer(PLAYER.uid);setPlayerTab('keepnet')}
function showAddKeepnet(){showModal('添加护网鱼','可直接输入鱼种 key，或搜索鱼库填充',`<div class="form-grid"><div class="field span2"><label>鱼种 key</label><div class="toolbar"><input class="grow" id="knSpecies" placeholder="例如 c.roach"><button class="btn alt sm" onclick="searchFishForKeepnet()">搜索</button></div></div><div class="field"><label>重量（g）</label><input id="knWeight" type="number" min="1" value="500"></div><div class="field"><label>档位</label><select id="knCat"><option value="1">1 普通</option><option value="2">2 达标</option><option value="3">3 奖杯</option><option value="4">4 蓝冠</option></select></div><div class="field span2"><label>地点 level key</label><input id="knLevel" placeholder="level_001_lake"></div><div class="field"><label>场景 loc</label><input id="knLoc" placeholder="loc1_02"></div><div class="field"><label>钓点</label><input id="knSpot" type="number" value="0"></div><div class="field span2"><label>饵 item_id</label><input id="knBait" placeholder="worm_01"></div></div><div class="results" id="knFishResults"></div><div class="actions"><button class="btn good" onclick="addKeepnet()">加入护网</button></div>`)}
async function searchFishForKeepnet(){const q=$('#knSpecies').value.trim();const list=await api('/api/fish/pool?q='+encodeURIComponent(q)+'&limit=40');$('#knFishResults').innerHTML=list.map(x=>`<div class="result" data-key="${esc(x.fish_key)}" onclick="$('#knSpecies').value=this.dataset.key"><div><b>${esc(x.name_zh)}</b><div class="muted mono">${esc(x.fish_key)}</div></div><span class="tag">${fmt(x.min_g)}-${fmt(x.max_g)}g</span></div>`).join('')||'<div class="empty">无结果</div>'}
async function addKeepnet(){const body={uid:PLAYER.uid,species:$('#knSpecies').value.trim(),weight_g:+$('#knWeight').value,cat:+$('#knCat').value,keep_level:$('#knLevel').value.trim(),keep_loc:$('#knLoc').value.trim(),keep_spot:+$('#knSpot').value||0,keep_bait:$('#knBait').value.trim()};if(!body.species||body.weight_g<=0)return toast('请填写鱼种和重量','bad');await api('/api/players/keepnet/add',{method:'POST',body:JSON.stringify(body)});closeModal();toast('添加指令已发送');await sleep(2300);await selectPlayer(PLAYER.uid);setPlayerTab('keepnet')}
function renderSkills(){
  const skills=PLAYER.skills||[];const avail=Number(PLAYER.available_points??0);
  $('#playerTabBody').innerHTML=`<div class="toolbar" style="margin-bottom:12px"><div class="grow"><b>未分配技能点：${avail}</b><div class="muted">等级累计 ${PLAYER.skill_total??0} · 已投入 ${PLAYER.skill_spent??0} · 偏移 ${PLAYER.skill_bonus??0}</div></div><input class="mini-input" id="skillAvail" type="number" min="0" step="1" value="${avail}" style="width:110px"><button class="btn sm" onclick="saveSkillAvail()">保存点数</button></div><div class="skills">${skills.map(s=>`<div class="skill"><div class="top"><div><b>${esc(s.name)}</b><div class="muted">大类 ${s.skill_id} · ${s.node_count} 个节点</div></div><span class="pill">${Number(s.points).toFixed(2)}%</span></div><div class="bar"><i style="width:${Math.min(100,Number(s.points)/110*100)}%"></i></div><div class="edit"><input type="number" min="0" max="110" step="0.1" value="${s.points}" id="sk_${s.skill_id}"><button class="btn sm" onclick="saveSkill(${s.skill_id})">保存</button></div></div>`).join('')}</div><div class="actions"><button class="btn alt" onclick="resetSkills()">全部设为 0%</button></div>`;
}
async function saveSkillAvail(){const points=Math.max(0,Math.floor(+$('#skillAvail').value||0));await api('/api/players/skills/points',{method:'POST',body:JSON.stringify({uid:PLAYER.uid,points})});toast('未分配技能点已更新');await sleep(500);await selectPlayer(PLAYER.uid);setPlayerTab('skills')}
async function saveSkill(id){const points=+$('#sk_'+id).value;await api('/api/players/skills/update',{method:'POST',body:JSON.stringify({uid:PLAYER.uid,skill_id:id,points})});toast('熟练度已更新');await sleep(500);await selectPlayer(PLAYER.uid);setPlayerTab('skills')}
async function resetSkills(){if(!await confirmDialog('把所有技能大类熟练度设为 0%？',{title:'技能清零',okText:'清零'}))return;for(const s of PLAYER.skills||[])await api('/api/players/skills/update',{method:'POST',body:JSON.stringify({uid:PLAYER.uid,skill_id:s.skill_id,points:0})});toast('全部熟练度已清零');await selectPlayer(PLAYER.uid);setPlayerTab('skills')}
function renderPlayerMail(){const rows=PLAYER.mails||[];$('#playerTabBody').innerHTML=`<div class="table-wrap"><table><thead><tr><th>ID</th><th>正文</th><th>类型</th><th>状态</th><th>时间</th></tr></thead><tbody>${rows.map(m=>`<tr><td>${m.id}</td><td style="white-space:normal">${esc(m.text||'(附件邮件)')}</td><td>${m.kind?'附件':'文本'}</td><td>${m.read?'<span class="pill">已读</span>':'<span class="pill ok">未读</span>'}</td><td>${timeText(m.created_ts)}</td></tr>`).join('')||'<tr><td colspan="5" class="empty">邮箱为空</td></tr>'}</tbody></table></div><div class="actions"><button class="btn" onclick="prefillMail(${PLAYER.uid})">给该玩家发邮件</button></div>`}
async function kickPlayer(){if(!await confirmDialog('踢下线？',{title:'踢下线',okText:'踢下线',danger:false}))return;await api('/api/players/kick',{method:'POST',body:JSON.stringify({uid:PLAYER.uid})});toast('已发送踢下线指令')}
async function toggleBan(){const banned=!PLAYER.banned;if(!await confirmDialog(banned?'封禁该玩家？':'解除封禁？',{title:banned?'封禁玩家':'解除封禁',okText:'确定',danger:banned}))return;await api('/api/players/ban',{method:'POST',body:JSON.stringify({uid:PLAYER.uid,banned})});toast(banned?'已封禁':'已解封');await selectPlayer(PLAYER.uid)}
