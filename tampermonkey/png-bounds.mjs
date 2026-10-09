import {inflateSync} from 'node:zlib';
// Build-time inspection only: never modify the registered PNGs.
export function pngBounds(png){
  if(!png.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw Error('Not a PNG');
  let width,height,parts=[];
  for(let pos=8;pos<png.length;){
    const size=png.readUInt32BE(pos),type=png.toString('ascii',pos+4,pos+8),data=png.subarray(pos+8,pos+8+size);
    if(type==='IHDR'){width=data.readUInt32BE(0);height=data.readUInt32BE(4);if(data[8]!==8||data[9]!==6||data[12]!==0)throw Error('Expected non-interlaced RGBA8');}
    if(type==='IDAT')parts.push(data);pos+=size+12;
  }
  const raw=inflateSync(Buffer.concat(parts)),stride=width*4;
  if(raw.length!==(stride+1)*height)throw Error('Invalid PNG scanlines');
  let previous=Buffer.alloc(stride),row=Buffer.alloc(stride),left=width,top=height,right=0,bottom=0;
  const paeth=(a,b,c)=>{const p=a+b-c,da=Math.abs(p-a),db=Math.abs(p-b),dc=Math.abs(p-c);return da<=db&&da<=dc?a:db<=dc?b:c;};
  for(let y=0;y<height;y++){
    const offset=y*(stride+1),filter=raw[offset];if(filter>4)throw Error('Unknown PNG filter');
    for(let x=0;x<stride;x++){
      const a=x>=4?row[x-4]:0,b=previous[x],c=x>=4?previous[x-4]:0;
      row[x]=(raw[offset+1+x]+(filter===0?0:filter===1?a:filter===2?b:filter===3?Math.floor((a+b)/2):paeth(a,b,c)))&255;
    }
    for(let x=0;x<width;x++)if(row[x*4+3]>0){left=Math.min(left,x);right=Math.max(right,x+1);top=Math.min(top,y);bottom=y+1;}
    [previous,row]=[row,previous];
  }
  if(right<=left||bottom<=top)throw Error('Empty character PNG');
  return {width,height,bounds:[left,top,right,bottom]};
}
