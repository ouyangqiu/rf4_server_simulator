// ---- 邮件中心 ----
let MAIL_ATTACH=[];
function addAttachment(){showModal('添加邮件附件','搜索物品目录',`<input id="attachSearch" placeholder="物品 ID / 名称" oninput="debounce('attachSearch',searchAttachItems)"><div class="results" id="attachResults"></div>`);searchAttachItems()}
async function searchAttachItems(){const q=$('#attachSearch').value.trim();const list=await api('/api/catalog/items?q='+encodeURIComponent(q));$('#attachResults').innerHTML=list.map(x=>`<div class="result" data-id="${esc(x.item_id)}" data-name="${esc(x.name)}" onclick="pickAttachment(this.dataset.id,this.dataset.name)"><div><b>${esc(x.name||x.item_id)}</b><div class="muted mono">${esc(x.item_id)}</div></div><span class="tag">cat ${x.category}</span></div>`).join('')||'<div class="empty">无结果</div>'}
function pickAttachment(id,name){if(!MAIL_ATTACH.some(x=>x.item_id===id))MAIL_ATTACH.push({item_id:id,name,qty:1});closeModal();renderAttachments();toast('已添加 '+name)}
function renderAttachments(){
  $('#attachments').innerHTML=MAIL_ATTACH.map((x,i)=>`<div class="attach-row"><div class="toolbar"><input value="${esc(x.name||x.item_id)}" disabled><div class="muted mono">${esc(x.item_id)}</div></div><input type="number" min="1" value="${x.qty}" onchange="MAIL_ATTACH[${i}].qty=+this.value"><button class="btn bad sm" onclick="MAIL_ATTACH.splice(${i},1);renderAttachments()">×</button></div>`).join('')||'<div class="muted">无附件</div>';
}
async function sendMail(){
  const uid=+$('#mailUid').value,text=$('#mailText').value.trim();if(!uid)return toast('请填写收件人 UID','bad');if(!text&&!MAIL_ATTACH.length)return toast('正文和附件不能都为空','bad');
  await api('/api/mail/send',{method:'POST',body:JSON.stringify({uid,text,items:MAIL_ATTACH.map(x=>({item_id:x.item_id,qty:+x.qty||1}))})});toast('邮件已进入投递队列');MAIL_ATTACH=[];renderAttachments();
}
function previewMail(){const uid=$('#mailUid').value||'未填写';$('#mailPreview').className='';$('#mailPreview').innerHTML=`<div style="padding:14px;border:1px solid var(--line);border-radius:12px;background:#0b1623"><div class="muted">收件人 UID ${esc(uid)}</div><div style="margin:10px 0;white-space:pre-wrap">${esc($('#mailText').value||'(无正文)')}</div><hr style="border:0;border-top:1px solid var(--line)"><div class="muted">附件 ${MAIL_ATTACH.length} 件</div>${MAIL_ATTACH.map(x=>`<div class="pill" style="margin:5px 5px 0 0">${esc(x.name||x.item_id)} × ${x.qty}</div>`).join('')}</div>`}
function mailTemplate(name){const map={'补偿':'管理员补偿\n\n因近期服务器问题给您带来的不便，特此补偿以下物品，请查收。','活动奖励':'活动奖励\n\n感谢参与本次服务器活动！奖励已随邮件附上。','测试':'测试邮件\n\n这是一封来自管理后台的测试邮件。'};$('#mailText').value=map[name]||map['测试'];previewMail()}
async function findMailPlayer(){const q=$('#mailPlayerSearch').value.trim();if(!q)return;const list=await api('/api/players?q='+encodeURIComponent(q));if(!list.length)return toast('没有找到玩家','bad');$('#mailUid').value=list[0].uid;toast('已匹配 '+list[0].name+' #'+list[0].uid)}
function prefillMail(uid){go('mail');$('#mailUid').value=uid;$('#mailText').focus()}
