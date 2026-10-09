// Served from the game's own HTTPS origin; no ChatGPT-page inline scripts are needed.
(()=>{
  const params=new URLSearchParams(location.hash.slice(1)),token=params.get('token'),conversation=params.get('conversation');
  if(!token||parent===window)return;
  // Boot includes the verified UI plus the existing save and manual slots.
  const MAX_BOOT_CHARS=8000000;
  let booted=false;
  window.addEventListener('message',event=>{
    const data=event.data;
    const allowed=['https://chatgpt.com','https://chat.openai.com','http://localhost:4173','http://127.0.0.1:4173'];
    if(booted||event.source!==parent||!allowed.includes(event.origin)||data?.channel!=='ercedia'||data.token!==token||data.type!=='boot'||typeof data.payload!=='string'||data.payload.length>MAX_BOOT_CHARS)return;
    booted=true;
    // The launcher verifies the fixed-repository commit and HTML digest before sending this document.
    document.open();document.write(data.payload);document.close();
  });
  parent.postMessage({channel:'ercedia',token,conversation,type:'shell-ready'},'*');
})();
