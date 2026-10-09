// Uses only ChatGPT's public file input and visible attachment confirmation.
export async function attachCampaignSettings(file,{roots,isCurrent,wait}){
  if(!/^ercedia-settings-[a-f0-9]{40}\.txt$/.test(file?.name||'')||typeof file.content!=='string'||file.content.length>8000000)throw Error('설정 첨부 파일 형식 오류');
  const findInputs=()=>roots().flatMap(root=>[...root.querySelectorAll('input[type="file"]')]);
  const suitable=node=>!node.disabled&&(!node.accept||node.accept.split(',').some(t=>/^(?:\.txt|text\/.*|application\/.*|\*|\*\/\*)$/i.test(t.trim())));
  let inputs=findInputs(),input=inputs.find(suitable);
  if(!input){
    const controls=roots().flatMap(root=>[...root.querySelectorAll('button')]);
    const menu=controls.find(node=>!node.disabled&&(node.getAttribute('data-testid')==='composer-plus-btn'||/^(?:Add photos and files|Attach files|파일 및 사진 추가|사진 및 파일 추가|파일 첨부)$/i.test(node.getAttribute('aria-label')||'')));
    if(menu&&isCurrent()){
      menu.click();
      for(let attempt=0;attempt<20&&!input;attempt++){await wait(300);if(!isCurrent())throw Error('채팅이 바뀌어 설정 첨부를 취소했습니다.');inputs=findInputs();input=inputs.find(suitable);}
    }
  }
  if(!input)throw Error('GPT 파일 입력창을 찾지 못했습니다. 연결 도움의 설정 파일을 직접 첨부한 뒤 요청을 보내세요.');
  if(inputs.some(node=>[...(node.files||[])].some(f=>f.name!==file.name)))throw Error('원본 GPT 입력창에 다른 첨부 파일이 있습니다. 먼저 기존 첨부를 확인하고 비운 뒤 다시 보내세요.');
  if(!isCurrent())throw Error('채팅이 바뀌어 설정 첨부를 취소했습니다.');
  const data=new DataTransfer();data.items.add(new File([file.content],file.name,{type:'text/plain'}));input.files=data.files;
  input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));
  for(let attempt=0;attempt<100;attempt++){
    if(!isCurrent())throw Error('채팅이 바뀌어 설정 첨부를 취소했습니다.');
    if(roots().some(root=>[...root.querySelectorAll('[data-testid*="attachment"],button,[title],span,p')].some(node=>node.textContent?.includes(file.name)||node.getAttribute('title')===file.name)))return;
    await wait(300);
  }
  throw Error('설정 파일의 첨부 확인 시간이 지났습니다. 원본 GPT의 첨부 상태를 확인하세요. 자동 재전송하지 않습니다.');
}
