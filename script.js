function openStatus(event){
  event.preventDefault();
  const input = document.getElementById('repairCode');
  const value = input ? input.value.trim() : '';
  if(!value){
    alert('Введіть номер ремонту або QR-токен');
    return;
  }
  const isRepairNumber = value.toUpperCase().startsWith('R-');
  const param = isRepairNumber ? 'code' : 'token';
  window.location.href = 'client.html?' + param + '=' + encodeURIComponent(value);
}

(function(){
  const p = new URLSearchParams(window.location.search);
  const code = p.get('code');
  const token = p.get('token');
  const workshop = p.get('w');

  const orderEl = document.getElementById('orderNumber');
  const tokenEl = document.getElementById('tokenNumber');
  const workshopEl = document.getElementById('workshopId');
  const statusEl = document.getElementById('repairStatus');
  const noteEl = document.getElementById('clientNote');

  if(token){
    if(orderEl) orderEl.textContent = 'Захищений QR-токен';
    if(tokenEl) tokenEl.textContent = token;
    if(workshopEl) workshopEl.textContent = workshop || 'ONLINE Cloud';
    if(statusEl) statusEl.textContent = 'Очікує синхронізацію з ONLINE Cloud';
    if(noteEl) noteEl.textContent = 'QR-токен отримано. Після підключення ONLINE Cloud тут буде реальний статус ремонту.';
    return;
  }

  if(code){
    if(orderEl) orderEl.textContent = code;
    if(statusEl) statusEl.textContent = 'Демо-режим';
  }
})();
