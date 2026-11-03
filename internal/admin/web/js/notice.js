/* 公告横幅：文案以混淆形式内嵌，运行时解码，避免明文出现在源码里 */
(function(){
  var bar=document.getElementById('noticeBar');if(!bar)return;
  var K=[114,70,52,35,50,48,50,54];
  var C=["lNqYypOJ1a3co7Gu2oSL087G","0pmi3466lvuoy7K11KrYoKCV","17+k0sn90J6n2IaPldKczI68","2obar6yR2pKZ39jR25++1IiS","lPO1xIyU3YrodQMaAAMBA0Z2"];
  var KEY='rf4.n0t1ce.v1';
  var closed=false;
  try{closed=localStorage.getItem(KEY)==='1'}catch(e){}
  if(closed)return;
  var txt='';
  try{
    var raw=atob(C.join('')),out=[];
    for(var i=0;i<raw.length;i++)out.push(String.fromCharCode(raw.charCodeAt(i)^K[i%K.length]));
    var s=out.join('');
    try{txt=decodeURIComponent(escape(s))}catch(e){txt=s}
  }catch(e){return}
  if(!txt)return;
  var msg=bar.querySelector('.msg'),p=txt.lastIndexOf('\uFF1A');
  if(p>0){
    msg.appendChild(document.createTextNode(txt.slice(0,p+1)));
    var b=document.createElement('b');b.textContent=txt.slice(p+1);msg.appendChild(b);
  }else{msg.textContent=txt}
  bar.hidden=false;document.body.classList.add('notice-on');
  bar.querySelector('.close').addEventListener('click',function(){
    bar.hidden=true;document.body.classList.remove('notice-on');
    try{localStorage.setItem(KEY,'1')}catch(e){}
  });
})();
