// QA only: preserve audio events and preferences without speaker output.
if(window.AudioNode&&window.AudioDestinationNode){
 const connect=AudioNode.prototype.connect;
 AudioNode.prototype.connect=function(destination,...args){
  if(destination instanceof AudioDestinationNode)return destination;
  return connect.call(this,destination,...args);
 };
 document.documentElement.dataset.qaAudioMuted='true';
}
