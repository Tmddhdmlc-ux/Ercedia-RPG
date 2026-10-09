import {formatCopper} from './wallet.js';
import {questPreviewText} from './quest-ui.js';
export const choiceKinds={dialogue:'대화',travel:'이동',quest:'의뢰',investigate:'조사',trade:'거래',training:'수련',action:'행동'};
export function choicePresentation(choice,state){
  const quests=[...new Map([...(state.scene?.quest_updates||[]),...(state.quest_log||[])].map(q=>[q.id,q])).values()];
  const matches=quests.filter(q=>choice.quest_id?q.id===choice.quest_id:choice.text.replaceAll(' ','').includes(q.title.replaceAll(' ','')));
  const quest=matches.length===1?matches[0]:null;
  const kind=quest?'quest':choice.kind||(/묻|질문|대화|소식/.test(choice.text)?'dialogue':/찾아가|이동|떠난|돌아간/.test(choice.text)?'travel':/조사|관찰|살펴/.test(choice.text)?'investigate':/구매|판매|거래/.test(choice.text)?'trade':/수련|훈련|배운/.test(choice.text)?'training':'action');
  const reward=quest?`EXP ${quest.reward.xp} · ${formatCopper(quest.reward.currency)}${quest.reward.item_ids.length+quest.reward.materials.length?' · 물품 보상 있음':''}`:'';
  return {kind,label:choiceKinds[kind]||'행동',title:quest?.title||choice.title||choice.text,reward,quest,
    preview:quest?questPreviewText(quest).replace('클릭하면 전체 내용과 수락 조건을 확인합니다.',`선택 행동: ${choice.text}\n선택만으로 수락·완료·보상이 확정되지 않습니다.`):choice.description||choice.text};
}
