// Presentation only: the adjudicated damage and resource snapshots remain unchanged.
export function battleCommentary(text){
  const clauses=text.match(/[^\n.!?。！？]+[.!?。！？]*/g)||[];
  return clauses.filter(part=>!/(?:\d[\d,]*\s*(?:의\s*)?(?:피해|데미지)|(?:HP|MP|체력|마나|피해|데미지|damage)\s*[:：]?\s*\d)/i.test(part)).map(part=>part.trim()).join(' ')||'공방이 이어진다.';
}
export function dialogueVoice(speaker){return /^(나레이션|내레이션|시스템|해설|전투 중계)$/.test(speaker)?'narration':'character';}
