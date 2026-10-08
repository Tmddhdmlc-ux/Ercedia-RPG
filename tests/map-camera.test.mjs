import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mapData} from '../web/map-data.js';
import {mapViews,regionFrame,cameraTransform,viewForSelection} from '../web/map-camera.js';
import {defaults,normalize} from '../web/state.js';
test('regional camera shows every registered child point and stays inside the map',()=>{
  for(const view of mapViews){
    const f=regionFrame(view.id);
    assert.ok(f.x>=0&&f.y>=0&&f.x+f.width<=1&&f.y+f.height<=1);
    assert.ok(f.width<1&&f.height<1);
    for(const p of mapData.locations.filter(p=>p.region===view.id))assert.ok(p.x>=f.x&&p.x<=f.x+f.width&&p.y>=f.y&&p.y<=f.y+f.height,`${view.id}: ${p.id}`);
  }
});
test('camera keeps region visible and clamps the original image in portrait, wide and fullscreen viewports',()=>{
  for(const [width,height] of [[320,455],[814,455],[1920,900]])for(const view of ['world',...mapViews.map(r=>r.id)]){
    const frame=regionFrame(view),camera=cameraTransform(frame,width,height);
    const left=frame.x*1536*camera.scale+camera.x,top=frame.y*1024*camera.scale+camera.y;
    const right=(frame.x+frame.width)*1536*camera.scale+camera.x,bottom=(frame.y+frame.height)*1024*camera.scale+camera.y;
    assert.ok(left>=-1e-6&&top>=-1e-6&&right<=width+1e-6&&bottom<=height+1e-6);
    const imageWidth=1536*camera.scale,imageHeight=1024*camera.scale;
    if(imageWidth>=width)assert.ok(camera.x<=1e-6&&camera.x+imageWidth>=width-1e-6);
    else assert.ok(Math.abs(camera.x-(width-imageWidth)/2)<1e-6);
    if(imageHeight>=height)assert.ok(camera.y<=1e-6&&camera.y+imageHeight>=height-1e-6);
    else assert.ok(Math.abs(camera.y-(height-imageHeight)/2)<1e-6);
  }
});
test('point clicks select their parent view and saved zoom restores with selected point',()=>{
  for(const p of mapData.locations){
    assert.equal(viewForSelection(p.id),p.region);
    const s=defaults();s.region=p.id;s.mapView=p.region;
    assert.equal(normalize(s).region,p.id);assert.equal(normalize(s).mapView,p.region);
  }
  const s=defaults();s.region='archipelago';s.mapView='archipelago';assert.equal(normalize(s).region,'archipelago');
  s.mapView='unknown';assert.equal(normalize(s).mapView,'world');
  assert.deepEqual(regionFrame('missing'),regionFrame('world'));
});
