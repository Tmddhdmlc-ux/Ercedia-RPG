// Additional declared learning forms; memories such as 배웠다/배워준 are not requests.
export const hasLearningIntent=action=>/배워(?:보고\s*싶|보겠|볼|보자|보려고|보러|야)|배울\s*(?:수|래|까|게|생각)/.test(String(action));

// Only remove explicit declined practice clauses from routing; retain the original GM action.
export const learningRoutingText=action=>String(action).replace(/(?:새\s*일(?:이나|과)\s*)?(?:수련|훈련|연습)(?:은|는|을|를)?\s*(?:맡지|하지|부탁하지)\s*않(?:는다|겠다|고)(?=$|[.!。…”"'\s])/g,'');