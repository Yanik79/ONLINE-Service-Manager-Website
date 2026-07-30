(function(){
  'use strict';
  const PROD_API='https://api.online-service-manager.com';
  const local=['localhost','127.0.0.1'].includes(location.hostname);
  const API=(local?'http://127.0.0.1:8000':PROD_API).replace(/\/$/,'');
  const TOKEN_KEY='online_platform_token';
  const WORKSPACE_KEY='online_platform_workspace';

  function token(){try{return localStorage.getItem(TOKEN_KEY)||''}catch(e){return''}}
  function setToken(value){try{value?localStorage.setItem(TOKEN_KEY,value):localStorage.removeItem(TOKEN_KEY)}catch(e){}}
  function authHeaders(){return token()?{'Authorization':'Bearer '+token(),'Content-Type':'application/json'}:{'Content-Type':'application/json'}}
  async function api(path,options){
    const response=await fetch(API+path,Object.assign({headers:authHeaders(),cache:'no-store'},options||{}));
    let data=null;try{data=await response.json()}catch(e){}
    if(response.status===401){setToken('');if(!location.pathname.endsWith('login.html'))location.href='login.html?expired=1';throw new Error('Сесію завершено');}
    if(!response.ok)throw new Error((data&&data.detail)||('Cloud API HTTP '+response.status));
    return data;
  }
  function esc(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}
  function roleName(role){return ({owner:'Власник',admin:'Адміністратор',manager:'Менеджер',member:'Працівник',viewer:'Перегляд'})[String(role||'').toLowerCase()]||role||'Учасник'}
  function productUrl(code){
    const normalized=String(code||'').toUpperCase();
    if(normalized==='ONLINE_SM') return 'download.html';
    return '#';
  }
  window.ONLINE_PLATFORM={API,api,token,setToken,esc,productUrl,roleName,WORKSPACE_KEY};
})();
