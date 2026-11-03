// ---- 商店库存 ----
// item_def.category 是客户端原始整型码，这里翻成中文；未收录的码回退成「类别 N」。
// 只列从现场 item_def 里核对过的码；没把握的码回退成「类别 N」，不瞎猜。
const ITEM_CAT_NAMES={
  3:'船竿',6:'枪柄路亚竿',11:'编织主线',12:'鱼钩',13:'前导线',14:'转环与别针',
  15:'编织线卷',17:'彩珠',18:'磨碎饵料',19:'混合饵料',20:'香精油',
  22:'帽子',23:'上衣',25:'鞋靴',26:'饮品与食物',27:'天然饵',
  28:'浮漂',29:'铅坠',31:'喂食器',33:'水晶珠',35:'露营与辅助装备',
  38:'投饵火箭',39:'船票',40:'地图',41:'工具与制作设备',42:'制作材料',
  43:'银币券',44:'Sbirolino 浮标',45:'PVA 制品',47:'亮片',
  55:'礼盒与套装',57:'Leadcore 前导',58:'诱饵添加液',59:'投饵棒',60:'弹弓',79:'竿架'
};
// 杆子、轮子、竿柄这类本身就是型号，用户明确说不用翻，保持原样。
const MODEL_ONLY_CATS=new Set([3,4,5,6,7,8,9,79]);
// 名字里一个中文字都没有时，前面补上中文类型，形如「彩珠 · Color beads С-YEL」。
// 原型号一个字符都不动，只加前缀，避免把型号翻错。
function itemDisplayName(x){
  const raw=x.name||x.item_id||'';
  if(/[\u4e00-\u9fff]/.test(raw))return raw;
  const cat=Number(x.category);
  const cn=ITEM_CAT_NAMES[cat];
  if(!cn||MODEL_ONLY_CATS.has(cat))return raw;
  return cn+' · '+raw;
}
function itemCatName(code){
  const n=Number(code);
  if(!Number.isFinite(n)||n<=0)return '未分类';
  return ITEM_CAT_NAMES[n]||('类别 '+n);
}
async function loadStores(){
  const stores=await api('/api/stores');
  const sel=$('#storeSelect');const old=sel.value;
  sel.innerHTML=stores.map(s=>`<option value="${esc(s.store_id)}">${esc(s.store_id)} · ${s.item_count} 件 · 覆盖 ${s.override_count}</option>`).join('');
  if(old&&stores.some(s=>s.store_id===old))sel.value=old;
  if(sel.value)await loadStoreItems();
}
async function loadStoreItems(){
  const id=$('#storeSelect').value;if(!id)return;
  const q=$('#storeSearch').value.trim();STORE_ITEMS=await api('/api/stores/items?store_id='+encodeURIComponent(id)+'&q='+encodeURIComponent(q)+'&limit=1000');
  const over=STORE_ITEMS.filter(x=>x.has_override).length,stock=STORE_ITEMS.reduce((n,x)=>n+Number(x.stock||0),0);
  $('#storeSummary').textContent=`${id} · 当前返回 ${STORE_ITEMS.length} 件 · 总库存 ${fmt(stock)} · 已覆盖 ${over} 件`;
  renderStoreTable();
}
function renderStoreTable(){
  $('#storeTable').innerHTML=`<table><thead><tr><th>商品</th><th>类别</th><th>原始银价 / 原始金币 / 原始库存</th><th>有效银价</th><th>有效金币</th><th>有效库存</th><th></th></tr></thead><tbody>${STORE_ITEMS.map((x,i)=>`<tr><td><b>${esc(itemDisplayName(x))}</b><div class="muted mono">${esc(x.item_id)}</div></td><td>${esc(itemCatName(x.category))}</td><td class="muted">${fmt(x.base_silver)} / ${fmt(x.base_gold)} / ${fmt(x.base_stock)}</td><td><input class="mini-input" id="ss_${i}" type="number" min="0" value="${x.silver}"></td><td><input class="mini-input" id="sg_${i}" type="number" min="0" value="${x.gold}"></td><td><input class="mini-input" id="st_${i}" type="number" min="0" value="${x.stock}"></td><td class="right"><button class="btn sm ${x.has_override?'good':''}" onclick="saveStoreRow(${i})">${x.has_override?'更新覆盖':'保存'}</button>${x.has_override?` <button class="btn alt sm" onclick="resetStoreRow(${i})">恢复静态</button>`:''}</td></tr>`).join('')||'<tr><td colspan="7" class="empty">该商店没有货架商品</td></tr>'}</tbody></table>`;
}
async function saveStoreRow(i){
  const x=STORE_ITEMS[i];const body={store_id:x.store_id,item_id:x.item_id,silver:+$('#ss_'+i).value,gold:+$('#sg_'+i).value,stock:+$('#st_'+i).value};
  await api('/api/stores/items/update',{method:'POST',body:JSON.stringify(body)});toast('货架覆盖已保存：'+x.item_id);await loadStoreItems();
}
async function resetStoreRow(i){
  const x=STORE_ITEMS[i];if(!await confirmDialog('恢复该商品的静态价格与库存？',{title:'恢复静态货架',okText:'恢复',danger:false}))return;
  await api('/api/stores/items/reset',{method:'POST',body:JSON.stringify({store_id:x.store_id,item_id:x.item_id})});toast('已恢复静态货架：'+x.item_id);await loadStoreItems();
}
