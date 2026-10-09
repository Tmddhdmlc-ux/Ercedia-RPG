// Move existing controls, preserving handlers, text, focus and the v1 bridge IDs.
export function mountSceneComposer(stage,composer,{media=matchMedia('(min-width:701px)'),Observer=globalThis.ResizeObserver}={}){
 const home=composer.parentElement,next=composer.nextSibling;
 const measure=()=>stage.style.setProperty('--vn-composer-height',Math.ceil(composer.offsetHeight||0)+'px');
 function place(){
  if(media.matches){stage.append(composer);composer.inert=false;stage.dataset.composer='inside';}
  else{home.insertBefore(composer,next?.parentNode===home?next:null);delete stage.dataset.composer;}
  measure();
 }
 // Clicking labels or connection tools is not a request to advance the scene.
 composer.addEventListener('click',event=>event.stopPropagation());
 media.addEventListener?.('change',place);const observer=Observer?new Observer(measure):null;observer?.observe(composer);
 place();return {measure};
}
