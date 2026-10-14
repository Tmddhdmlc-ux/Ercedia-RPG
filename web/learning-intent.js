// Additional declared learning forms; memories such as 배웠다/배워준 are not requests.
export const hasLearningIntent=action=>/배워(?:보고\s*싶|보겠|볼|보자|보려고|보러|야)|배울\s*(?:수|래|까|게|생각)/.test(String(action));
