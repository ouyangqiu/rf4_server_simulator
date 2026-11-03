// RF4 Control Deck —— 核心：全局状态、请求、格式化、提示
let TOKEN=localStorage.getItem('rf4_admin_token')||'';
let VIEW='dashboard',PLAYER=null,PLAYER_TAB='profile',FISH_AREA='',FISH_CFG=null,STORE_ITEMS=[];
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Number(n||0).toLocaleString('zh-CN');
const timeText=ts=>ts?new Date(Number(ts)*1000).toLocaleString('zh-CN'):'-';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const API_ROOT=location.pathname.replace(/\/+$/,'').endsWith('/admin')?'/admin/api':'/api';
function apiURL(path){return (path==='/api'||path.startsWith('/api/'))?API_ROOT+path.slice(4):path}
async function api(path,opt={}){
  const r=await fetch(apiURL(path),{...opt,headers:{'Content-Type':'application/json','Authorization':'Bearer '+TOKEN,...(opt.headers||{})}});
  const text=await r.text();let data={};try{data=text?JSON.parse(text):{}}catch{data={raw:text}}
  if(!r.ok){if(r.status===401){logout()}throw new Error(data.error||('HTTP '+r.status))}return data;
}
function toast(msg,type='ok'){
  const d=document.createElement('div');d.className=type;d.textContent=msg;
  d.style.transition='opacity 140ms cubic-bezier(0.4,0,1,1),transform 140ms cubic-bezier(0.4,0,1,1)';
  $('#toast').appendChild(d);
  setTimeout(()=>{
    d.style.opacity='0';d.style.transform='translateX(14px)';
    setTimeout(()=>d.remove(),150);
  },2600);
}
const debounceTimers={};
function debounce(key,fn,ms=240){clearTimeout(debounceTimers[key]);debounceTimers[key]=setTimeout(fn,ms)}
