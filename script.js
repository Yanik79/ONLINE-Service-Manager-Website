function openStatus(event){event.preventDefault();const code=document.getElementById('repairCode').value.trim()||'R-2026-000124';window.location.href='client.html?code='+encodeURIComponent(code);}
(function(){const p=new URLSearchParams(window.location.search);const code=p.get('code');const el=document.getElementById('orderNumber');if(code&&el){el.textContent=code;}})();
