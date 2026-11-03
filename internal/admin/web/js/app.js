// ---- 登录 / 路由 / 启动 ----
async function doLogin(e){
  e.preventDefault();
  try{
    const d=await api('/api/login',{method:'POST',body:JSON.stringify({username:$('#lu').value,password:$('#lp').value})});
    TOKEN=d.token;localStorage.setItem('rf4_admin_token',TOKEN);await boot();
  }catch(e){toast(e.message,'bad')}
}
function logout(){TOKEN='';localStorage.removeItem('rf4_admin_token');$('#app').style.display='none';$('#login').style.display='grid'}
async function boot(){
  try{
    const me=await api('/api/me');$('#who').textContent=me.username;$('#login').style.display='none';$('#app').style.display='grid';
    const initial=location.hash.slice(1);go(titles[initial]?initial:'dashboard',true);setInterval(()=>{if(VIEW==='dashboard'&&TOKEN)loadDashboard(false).catch(()=>{})},8000);
  }catch(e){logout()}
}
const titles={dashboard:['总览','服务器运行状态与快捷操作'],players:['玩家工作台','档案、背包、护网、技能一站式管理'],stores:['商店库存','覆盖静态货架价格与库存'],fish:['鱼口控制','水域鱼种权重、上鱼概率与发鱼延迟'],mail:['邮件中心','发送文本与多附件邮件'],audit:['审计日志','追踪后台管理操作']};
let NAV_FIRST=true;
function go(name,fromHash=false){
  if(!titles[name])name='dashboard';
  VIEW=name;document.querySelectorAll('.nav button').forEach(b=>b.classList.toggle('on',b.dataset.view===name));
  // 侧栏高亮是独立一层指示器，滑过去；首次挂载直接落位
  syncNavInd(NAV_FIRST);NAV_FIRST=false;
  document.querySelectorAll('.view').forEach(v=>v.classList.toggle('on',v.id==='view-'+name));
  $('#pageTitle').textContent=titles[name][0];$('#pageSub').textContent=titles[name][1];
  if(!fromHash&&location.hash!=='#'+name)history.replaceState(null,'','#'+name);
  refreshCurrent();
}
window.addEventListener('hashchange',()=>go(location.hash.slice(1),true));
function refreshCurrent(){
  const jobs={dashboard:loadDashboard,players:()=>loadPlayers(false),stores:loadStores,fish:loadFishAreas,mail:()=>{},audit:loadAudit};
  (jobs[VIEW]||(()=>{}))().catch(e=>toast(e.message,'bad'));
}
if(TOKEN)boot();else logout();
