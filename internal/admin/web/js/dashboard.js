// ---- 总览 / 运行参数 / 审计日志 ----
async function loadDashboard(refreshForm=true){
  const d=await api('/api/dashboard');
  const stats=[['在线会话',d.sessions,'主服实时'],['玩家档案',d.players,'已创建'],['物品实例',d.items,'背包+装备'],['邮件',d.mails,'全部记录'],['运行参数',d.tunables,'热更新'],['审计事件',d.audits,'累计']];
  $('#stats').innerHTML=stats.map(([k,v,s])=>`<div class="card stat"><div class="k">${k}</div><div class="v">${fmt(v)}</div><div class="s">${s}</div></div>`).join('');
  if(refreshForm)await loadTunables();
}
const TUNABLE_DEFS=[
  ['bite_probability','上鱼概率（1=每竿必出）',1],
  ['bite_delay_fixed','固定咬钩秒（>0 覆盖分布）',0],
  ['bite_delay_scale','咬钩延迟倍率',1],
  ['bite_delay_max','咬钩上限秒',20],
  ['bite_delay_lure_max','路亚上限秒',6],
  ['bait_pref_scale','饵效强度（0=关闭）',1],
  ['bait_pref_weight_shift','饵效偏大体型',1],
  ['xp_gain','经验倍率',1],
  ['release_xp_ratio','放生经验比例',0.5],
  ['fight_power_scale','搏斗拉力倍率（越低越不易断线）',1],
  ['fish_weight_scale','鱼体重倍率（2=两倍重）',1],
  ['settle_scale_debug','结算刻度调试（0=关）',0],
];
async function loadTunables(){
  let t={};
  try{ t=await api('/api/tunables'); }catch(e){}
  if(!t||typeof t!=='object')t={};
  const groups=[['咬钩与鱼饵',['bite_probability','bite_delay_fixed','bite_delay_scale','bite_delay_max','bite_delay_lure_max','bait_pref_scale','bait_pref_weight_shift']],['鱼体与搏斗',['fish_weight_scale','fight_power_scale']],['经验与结算',['xp_gain','release_xp_ratio','settle_scale_debug']]];
  $('#tunablesBody').innerHTML=groups.map(([title,keys])=>'<section class="tunable-group"><h3>'+title+'</h3><div class="tunable-fields">'+keys.map(key=>{
    const found=TUNABLE_DEFS.find(x=>x[0]===key)||[key,key,0];const [,label,def]=found;
    const val=t[key]!==undefined?t[key]:'';
    return '<div class="tunable-field"><label for="tun_'+key+'">'+esc(label)+'</label><div><input type="number" step="any" id="tun_'+key+'" value="'+esc(String(val))+'" placeholder="默认 '+def+'"><button class="btn alt sm" onclick="saveTunable(\''+key+'\')">保存</button></div></div>';
  }).join('')+'</div></section>').join('');
}
async function saveTunable(key){
  const v=$('#tun_'+key).value.trim();
  if(v===''){toast('请输入数值','bad');return}
  await api('/api/tunables',{method:'POST',body:JSON.stringify({key,value:v})});
  toast('已保存，最多 30 秒生效');
  await loadTunables();
}
async function loadAudit(){
  const list=await api('/api/audit?limit=200');
  $('#auditTable').innerHTML=`<table><thead><tr><th>时间</th><th>管理员</th><th>动作</th><th>对象</th><th>详情</th></tr></thead><tbody>${list.map(e=>`<tr><td>${timeText(e.TS??e.ts)}</td><td>${esc(e.Admin??e.admin)}</td><td><span class="tag blue">${esc(e.Action??e.action)}</span></td><td class="mono">${esc(e.Target??e.target)}</td><td style="white-space:normal;max-width:430px">${esc(e.Detail??e.detail)}</td></tr>`).join('')||'<tr><td colspan="5" class="empty">暂无记录</td></tr>'}</tbody></table>`;
}
