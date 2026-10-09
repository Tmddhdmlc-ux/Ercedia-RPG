// Keep navigation and its menu in the same flow; preserve existing event handlers.
export function mountNavigationLayout(game,tabs,utility){
  const row=document.createElement('div');row.className='game-navigation';
  tabs.before(row);row.append(tabs,utility);
  // The title initially locked tabs as a direct child. The new row now owns that lock.
  tabs.inert=false;utility.inert=false;
  const actions=utility.querySelector('.utility-actions');
  for(const control of [...tabs.querySelectorAll('.music-controls')])actions.append(control);
  return row;
}
