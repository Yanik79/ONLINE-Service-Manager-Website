(function(){
  'use strict';
  const CONFIG_URL='config/api.json';
  let API='';
  const local=['localhost','127.0.0.1',''].includes(location.hostname);
  let apiReady=(async()=>{
    if(local){API='http://127.0.0.1:8088';return;}
    const r=await fetch(CONFIG_URL,{cache:'no-store'});
    if(!r.ok) throw new Error('API config load failed');
    const c=await r.json();
    API=String(c.api_url||'').replace(/\/$/,'');
  })();
  const TOKEN_KEY='online_platform_token';
  const SESSION_KEY='online_platform_session';
  const REMEMBER_KEY='online_platform_remember_email';
  const REMEMBER_PASSWORD_KEY='online_platform_remember_password';

  function storage(){try{return window.localStorage}catch(e){return null}}
  function token(){const s=storage();return s?s.getItem(TOKEN_KEY)||'':''}
  function setToken(value){const s=storage();if(!s)return;value?s.setItem(TOKEN_KEY,value):s.removeItem(TOKEN_KEY)}
  function setSession(value){const s=storage();if(!s)return;value?s.setItem(SESSION_KEY,JSON.stringify(value)):s.removeItem(SESSION_KEY)}
  function session(){const s=storage();if(!s)return{};try{return JSON.parse(s.getItem(SESSION_KEY)||'{}')}catch(e){return{}}}
  function rememberEmail(value){const s=storage();if(!s)return;value?s.setItem(REMEMBER_KEY,value):s.removeItem(REMEMBER_KEY)}
  function rememberedEmail(){const s=storage();return s?s.getItem(REMEMBER_KEY)||'':''}
  function loginPreferences(){const s=storage();return{email:rememberedEmail(),rememberPassword:!!(s&&s.getItem(REMEMBER_PASSWORD_KEY)==='1')}}
  async function saveLoginPreferences(email,password,rememberEmailFlag,rememberPasswordFlag){const s=storage();if(!s)return;rememberEmail(rememberEmailFlag?email:'');rememberPasswordFlag=!!(rememberPasswordFlag&&rememberEmailFlag);rememberPasswordFlag?s.setItem(REMEMBER_PASSWORD_KEY,'1'):s.removeItem(REMEMBER_PASSWORD_KEY);if(rememberPasswordFlag&&window.PasswordCredential&&navigator.credentials&&location.protocol==='https:'){try{await navigator.credentials.store(new PasswordCredential({id:email,password,name:email}))}catch(e){}}}
  function logout(){setToken('');setSession(null);location.href='login.html'}
  function authHeaders(){return token()?{'Authorization':'Bearer '+token(),'Content-Type':'application/json'}:{'Content-Type':'application/json'}}
  async function api(path,options){
    await apiReady;
    const response=await fetch(API+path,Object.assign({headers:authHeaders(),cache:'no-store'},options||{}));
    let data={};try{data=await response.json()}catch(e){}
    if(response.status===401){setToken('');setSession(null);if(!location.pathname.endsWith('login.html'))location.href='login.html?expired=1';throw new Error('Сесію завершено')}
    if(!response.ok||data.success===false)throw new Error(data.detail||data.message||data.status||('Cloud API HTTP '+response.status));
    return data;
  }
  function esc(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}
  function accountFromLogin(data,email){return data.account||{email:data.email||email,full_name:data.owner_name||data.full_name||''}}
  async function register(fullName,email,password){return api('/api/v1/accounts/register',{method:'POST',body:JSON.stringify({full_name:fullName,email,password})})}
  async function login(email,password){
    const data=await api('/api/v1/accounts/login',{method:'POST',body:JSON.stringify({email,password})});
    const accessToken=String(data.access_token||'');
    if(!accessToken)throw new Error('Сервер не повернув токен входу');
    const account=accountFromLogin(data,email);
    setToken(accessToken);setSession({account,subscription:data.subscription||data.license||{},workspace:data.workspace||{},raw:data});
    return session();
  }
  async function createActivationCode(){return api('/api/v1/devices/activation-code',{method:'POST',body:'{}'})}
  function friendlyError(message){const value=String(message||'');return ({invalid_registration_data:'Перевірте email і пароль (не менше 8 символів).',email_already_exists:'Акаунт із таким email уже існує.',invalid_credentials:'Неправильний email або пароль.',unauthorized:'Потрібно увійти до акаунта.'})[value]||value}
  window.ONLINE_PLATFORM={API,api,token,setToken,session,setSession,register,login,logout,rememberEmail,rememberedEmail,loginPreferences,saveLoginPreferences,createActivationCode,friendlyError,esc};
})();
