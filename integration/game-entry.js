import '../web/app.js';
// Bundled entry: check all preloaded assets before a staged UI can replace the active UI.
if(window.__ERCEDIA_CONFIG__){
  const config=window.__ERCEDIA_CONFIG__;
  Promise.all([...document.images].map(img=>new Promise(resolve=>{
    if(img.dataset.status==='ready')return resolve(true);
    if(img.dataset.status==='error')return resolve(false);
    img.addEventListener('load',()=>resolve(true),{once:true});
    img.addEventListener('error',()=>resolve(false),{once:true});
    setTimeout(()=>resolve(false),25000);
  }))).then(results=>parent.postMessage({channel:'ercedia',token:config.token,conversation:config.conversation,type:'health',payload:{ok:results.every(Boolean),bridgeVersion:1,stateVersion:1,failedAssets:[...document.images].filter(img=>!img.naturalWidth).map(img=>img.src)}},'*'));
}
