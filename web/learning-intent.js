// Additional declared learning forms; memories such as 배웠다/배워준 are not requests.
export const hasLearningIntent=action=>/배워(?:보고\s*싶|보겠|볼|보자|보려고|보러|야)|배울\s*(?:수|래|까|게|생각)/.test(String(action));

// Routing only; the original GM action stays intact. Ambiguous practice is retained.
export const learningRoutingText=action=>{
 const text=String(action).replace(/(?:새\s*일(?:이나|과)\s*)?(?:수련|훈련|연습)(?:은|는|을|를)?\s*(?:맡지|하지|부탁하지)\s*않(?:는다|겠다|고)(?=$|[.!。…”"'\s])/g,'');
 // Asking whether an old practice prop is still there is not starting practice.
 // Keep the modifier when the turn also manipulates the wood or tries again.
 if(/깎|다듬|사포|손질|다시\s*(?:해|하)/.test(text))return text;
 return text.replace(/연습(?:용)?(?=\s*(?:나무|목재|조각)(?:은|는|이|가)?\s*(?:그대로\s*(?:있|남)|아직\s*(?:있|남)|어디|보관))/g,'');
};
