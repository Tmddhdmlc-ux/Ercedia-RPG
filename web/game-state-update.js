// Events are a bounded history, not a replaceable list of current conditions.
// Other game-state fields retain their existing snapshot semantics.
export function mergeGameState(previous={},update={}){
 const next={...previous,...update};
 if(Array.isArray(update.events))next.events=[...new Set([...(previous.events||[]),...update.events])].slice(-30);
 return next;
}
