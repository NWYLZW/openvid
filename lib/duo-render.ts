/** Device geometry and fold projection adapted from jadon7/iphone-duo (MIT).
 * Apple device artwork is separately prepared locally; see third-party/duo-assets.md.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { DuoConfig, DuoScreen } from './duo-config';
import { sampleDuoAngle } from './duo-config';
import { updateDuoProjectionEye } from './duo-projection';
import { getLibraryVideo } from './videos-library';
import { drawDuoSystemUI } from './duo-system-ui';
import { foldShader, screenShader } from './duo-shaders';

export class DuoRenderer {
  readonly root = new THREE.Group();
  private innerFrame = new THREE.Vector4(-7.89935,.34562-5.8974,15.7987,11.1035);
  private coverFrame = new THREE.Vector4(.23396,.27173-5.8974,7.73936,11.2513).multiplyScalar((40-.24948)/(40-.825538));
  private bend = {value:0};
  private projectionEye = {value:new THREE.Vector3(0,0,40)};
  private hinge = {value:.35};
  private blur = {value:48};
  private darkening = {value:1.4};
  private boundaryFill = {value:1};
  private systemCanvas=document.createElement('canvas');
  private systemTexture=new THREE.CanvasTexture(this.systemCanvas);
  private systemProjectionFrame={value:new THREE.Vector4(0,0,1,1)};
  private systemMap={value:this.systemTexture};
  private systemEnabled={value:false};
  private systemKey='';
  private statusRing={value:new THREE.Vector3(0,1,.0025)};
  private statusColor={value:new THREE.Color()};
  private power = {value:1.35};
  private projection = {value:true};
  private videos=new Map<string,{video:HTMLVideoElement;url?:string;failed?:boolean}>();
  private images = new Map<string, HTMLImageElement>();
  private failedImages = new Set<string>();
  private materials: Array<{material:THREE.MeshStandardMaterial; color:THREE.Color; body:boolean}> = [];
  private screens = ['inner','outer'].map((kind) => {
    const canvas=document.createElement('canvas');
    canvas.width=kind==='inner'?1600:774;canvas.height=1125;
    const texture=new THREE.CanvasTexture(canvas);
    texture.colorSpace=THREE.SRGBColorSpace;
    texture.minFilter=THREE.LinearMipmapLinearFilter;
    const material=new THREE.MeshBasicMaterial({map:texture,toneMapped:false});
    return {kind,canvas,texture,material,
      frame:{value:(kind==='inner'?this.innerFrame:this.coverFrame).clone()},
      gradient:{value:kind==='inner'?new THREE.Vector2(.5,0):new THREE.Vector2(0,1)},
      pixel:{value:new THREE.Vector2(1/canvas.width,1/canvas.height)}};
  });
  private disposed=false;
  private opacityBases = new Map<THREE.Material,{opacity:number;transparent:boolean}>();
  private lastPixels='';
  private revision=0;
  private loaded=false;
  error: string | null = null;
  constructor(private invalidate:()=>void) {this.systemCanvas.width=1600;this.systemCanvas.height=1125;this.systemTexture.colorSpace=THREE.SRGBColorSpace;}
  setProjectionCamera(camera:THREE.Camera){updateDuoProjectionEye(camera,this.root,this.projectionEye.value);}
  setAnisotropy(value:number){this.screens.forEach(s=>{s.texture.anisotropy=value;s.texture.needsUpdate=true;});}
  async load() {
    const gltf=await new GLTFLoader().loadAsync('/models/iphone-duo.glb?v=2');
    if(this.disposed){gltf.scene.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});return;}
    gltf.scene.traverse(object=>{
      if(!(object instanceof THREE.Mesh))return;
      const geometry=object.geometry;
      const {duoMoving:moving,duoFlexible:flexible,duoScreen:kind}=object.userData;
      const screen=this.screens.find(s=>s.kind===kind);
      const material=screen?.material??object.material;
      if(Array.isArray(material))throw new Error('Unsupported Duo asset material layout');
      if(screen){
        const p=geometry.attributes.position,uv=new Float32Array(p.count*2);
        for(let i=0;i<p.count;i++){
          uv[i*2]=kind==='inner'?(p.getX(i)+7.89935)/15.7987:(-.23396-p.getX(i))/7.73936;
          uv[i*2+1]=kind==='inner'?(p.getY(i)+5.8974-.34562)/11.1035:(p.getY(i)+5.8974-.27173)/11.2513;
        }
        geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));
      }else if(material instanceof THREE.MeshStandardMaterial){this.materials.push({material,color:material.color.clone(),body:['fapSTOypmavuPic','tLtsGCMtMAZfCYN'].includes(object.name)});}
      if(moving||flexible){
        material.onBeforeCompile=(shader: THREE.WebGLProgramParametersWithUniforms)=>{
          Object.assign(shader.uniforms,{foldAngle:this.bend,hingeWidth:this.hinge});
          if(screen){
            Object.assign(shader.uniforms,{
              uiFrame:screen.frame,
              uiGradient:screen.gradient,
              systemProjectionFrame:this.systemProjectionFrame,systemMap:this.systemMap,systemEnabled:this.systemEnabled,statusRing:this.statusRing,statusColor:this.statusColor,uiReferenceEye:this.projectionEye,uiPixel:screen.pixel,
              blurStrength:this.blur,darkening:this.darkening,boundaryFill:this.boundaryFill,transitionPower:this.power,projectScreen:this.projection,
            });
            shader.fragmentShader=shader.fragmentShader.replace('#include <map_pars_fragment>',`#include <map_pars_fragment>\n${kind==='inner'?'#define INNER_UI':''}\n${screenShader}`).replace('#include <map_fragment>','diffuseColor.rgb *= screenColor();');
            shader.vertexShader='varying vec3 vUIPosition;\n'+shader.vertexShader;
            shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','vUIPosition = transformed;\n#include <project_vertex>');
          }
          shader.vertexShader=`${flexible?'#define FLEXIBLE_SCREEN\n':''}${foldShader}\n${shader.vertexShader}`;
          shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',flexible?'vec4 folded = bendStrip(position); vec3 transformed = vec3(folded.x, position.y, folded.y);':'vec2 folded = rotateHinge(position.xz); vec3 transformed = vec3(folded.x, position.y, folded.y);');
          shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>',`vec3 objectNormal = vec3(normal); ${flexible?'vec4 strip = bendStrip(position); float a = atan(-strip.w, strip.z);':'float a = foldAngle;'} objectNormal.x = cos(a)*normal.x+sin(a)*normal.z; objectNormal.z=-sin(a)*normal.x+cos(a)*normal.z;`);
        };
        material.customProgramCacheKey=()=>`duo-v1-${flexible}-${kind||'body'}`;
      }
      this.opacityBases.set(material,{opacity:material.opacity,transparent:material.transparent});
      const mesh=new THREE.Mesh(geometry,material);mesh.name=object.name;mesh.frustumCulled=false;this.root.add(mesh);
    });
    if(this.root.children.length<50)throw new Error('Duo model is incomplete');
    this.loaded=true;
    this.invalidate();
  }
  private image(url:string):HTMLImageElement|null {
    let img=this.images.get(url);
    if(!img){img=new Image();img.crossOrigin='anonymous';this.images.set(url,img);img.onload=()=>{this.revision++;this.invalidate();};img.onerror=()=>{this.failedImages.add(url);this.error='Unable to load a Duo screen image. Choose the image again.';this.invalidate();};img.src=url;}
    return img.complete&&img.naturalWidth>0?img:null;
  }
  private panelVideoKey(screen:DuoScreen){return JSON.stringify([screen.videoId,screen.videoStart??0,screen.videoSpeed??1]);}
  private panelVideo(screen:DuoScreen,time:number):HTMLVideoElement|null {
    const id=screen.videoId!,key=this.panelVideoKey(screen);
    let entry=this.videos.get(key);
    if(!entry){
      const video=document.createElement('video');video.muted=true;video.playsInline=true;video.preload='auto';
      entry={video};this.videos.set(key,entry);const owned=entry;
      video.onloadeddata=video.onseeked=()=>{this.revision++;this.invalidate();};
      video.onerror=()=>{owned.failed=true;this.invalidate();};
      void getLibraryVideo(id).then(asset=>{if(this.disposed||this.videos.get(key)!==owned)return;if(!asset){owned.failed=true;this.invalidate();return;}owned.url=URL.createObjectURL(asset.blob);video.src=owned.url;}).catch(()=>{owned.failed=true;this.invalidate();});
    }
    const v=entry.video;if(entry.failed)return null;
    if(!Number.isFinite(v.duration)||v.readyState<2||v.seeking)return null;
    const target=Math.max(0,Math.min(v.duration-.001,(screen.videoStart??0)+time*(screen.videoSpeed??1)));
    if(Math.abs(v.currentTime-target)>.008){v.currentTime=target;return null;}
    return v;
  }
  update(config:DuoConfig,time:number,video?:HTMLVideoElement|null,imageUrl?:string|null):boolean {
    const ui=config.systemUI;
    this.systemEnabled.value=!!ui?.enabled;
    const uiKey=JSON.stringify(ui);
    if(uiKey!==this.systemKey){this.systemCanvas.getContext('2d')!.clearRect(0,0,1600,1125);drawDuoSystemUI(this.systemCanvas,ui);this.systemTexture.needsUpdate=true;this.systemKey=uiKey;}

    this.statusRing.value.set(ui?.enabled&&ui.status?1:0,ui?.statusScale??1,ui?.statusStroke??.0025);
    this.statusColor.value.set(ui?.iconColor??'#ffffff');
    const angle=sampleDuoAngle(config,time);
    this.bend.value=(180-angle)*Math.PI/180;this.hinge.value=config.hingeWidth;
    this.blur.value=config.blur;this.darkening.value=config.darkening;this.boundaryFill.value=config.boundaryFill??1;this.power.value=config.transitionPower;this.projection.value=config.projection;
    this.screens[0].material.color.setScalar(config.screenBrightness);
    this.screens[1].material.color.setScalar(angle>=180?0:config.screenBrightness);
    for(const {material,color,body} of this.materials){material.color.copy(color);if(config.finish==='night-sky'&&(body||material.metalness>.25))material.color.multiply(new THREE.Color('#333b4d'));}
    const continuous=config.contentMode==='continuous';
    const used=continuous?[config.content!,config.cover]:[config.left,config.right,config.cover];
    const inner=this.screens[0],outer=this.screens[1];
    if(config.coverMode==='right'){
      outer.material.map=inner.texture;outer.frame.value.copy(this.innerFrame);
      outer.gradient.value.set(.5,1);outer.pixel.value.copy(inner.pixel.value);
    }else{
      outer.material.map=outer.texture;outer.frame.value.copy(this.coverFrame);
      outer.gradient.value.set(0,1);outer.pixel.value.set(1/outer.canvas.width,1/outer.canvas.height);
    }
    // Calibrate the overlay to the closed physical cover, then let it travel
    // through the same projected source UV as the video during unfolding.
    const eye=this.projectionEye.value,frame=outer.frame.value;
    const depth=(.24948-eye.z)/(.825538-eye.z);
    const px=(x:number)=>eye.x+(x-eye.x)*depth;
    const py=(y:number)=>eye.y+(y-eye.y)*depth;
    const anchor=px(.233960);
    this.systemProjectionFrame.value.set(
      outer.gradient.value.x,
      (py(-5.625671)-frame.y)/frame.w,
      (px(7.973314)-anchor)/frame.z,
      (py(5.625616)-py(-5.625671))/frame.w
    );
    // An unused custom cover must not prevent the shared-video path becoming ready.
    if(config.coverMode==='right')used.pop();
    const activeVideos=new Set(used.filter(s=>s.source==='video'&&s.videoId).map(s=>this.panelVideoKey(s)));
    for(const [id,e] of this.videos)if(!activeVideos.has(id)){e.video.onloadeddata=e.video.onseeked=e.video.onerror=null;e.video.removeAttribute('src');e.video.load();if(e.url)URL.revokeObjectURL(e.url);this.videos.delete(id);}
    const activeImages=new Set(used.filter(s=>s.source==='image').map(s=>s.image!));
    if(imageUrl)activeImages.add(imageUrl);
    for(const [url,img] of this.images)if(!activeImages.has(url)){img.onload=null;img.onerror=null;this.images.delete(url);this.failedImages.delete(url);}
    let ready=this.loaded;
    const sources=used.map(s=>{
      const src=s.source==='video'&&s.videoId?this.panelVideo(s,time):s.source==='image'?this.image(s.image!):video&&video.readyState>=2&&video.videoWidth?video:imageUrl?this.image(imageUrl):null;
      if(!src)ready=false;return src;
    });
    this.error=used.some(s=>s.videoId&&this.videos.get(this.panelVideoKey(s))?.failed)?'Duo panel video is missing or cannot decode. Choose it again from the media library.':used.some(s=>s.image&&this.failedImages.has(s.image))?'Unable to load a Duo screen image. Choose the image again.':null;
    const key=JSON.stringify(config.systemUI)+':'+String(continuous)+':'+config.coverMode+':'+JSON.stringify(used)+':'+(video?video.currentSrc+':'+video.currentTime+':'+video.videoWidth+':'+video.readyState:imageUrl)+':'+this.revision;
    // Keep the last decoded pixels while seeking. Painting a placeholder here
    // would invalidate the pixels without invalidating the previous ready cache key.
    if(ready&&key!==this.lastPixels){
      const draw=(canvas:HTMLCanvasElement,s:DuoScreen,source:CanvasImageSource|null,x:number,width:number)=>{
        const reserve=config.systemUI?.enabled&&config.systemUI.layout==='reserve'&&x+width===canvas.width?canvas.height*(Math.max(.12,config.systemUI.width)+(config.systemUI.paddingLeft??.025)):0;
        const contentWidth=Math.max(1,width-reserve);
        const ctx=canvas.getContext('2d')!;ctx.save();ctx.beginPath();ctx.rect(x,0,width,canvas.height);ctx.clip();ctx.fillStyle=s.background;ctx.fillRect(x,0,width,canvas.height);
        if(source){
          const img=source as HTMLImageElement,vid=source as HTMLVideoElement;
          const sw=vid.videoWidth||img.naturalWidth,sh=vid.videoHeight||img.naturalHeight;
          const c=s.crop,cw=c.width*sw,ch=c.height*sh;
          const scale=(s.fit==='cover'?Math.max:Math.min)(contentWidth/cw,canvas.height/ch);
          ctx.drawImage(source,c.x*sw,c.y*sh,cw,ch,x+(contentWidth-cw*scale)/2,(canvas.height-ch*scale)/2,cw*scale,ch*scale);
        }ctx.restore();
      };
      if(continuous)draw(inner.canvas,used[0],sources[0],0,inner.canvas.width);
      else{draw(inner.canvas,used[0],sources[0],0,800);draw(inner.canvas,used[1],sources[1],800,800);}
      if(config.coverMode==='custom')draw(outer.canvas,used.at(-1)!,sources.at(-1)!,0,outer.canvas.width);

      this.screens.forEach(s=>s.texture.needsUpdate=true);this.lastPixels=key;
    }
    return ready;
  }
  setOpacity(opacity:number){for(const child of this.root.children){const m=(child as THREE.Mesh).material as THREE.Material;const base=this.opacityBases.get(m)!;m.transparent=base.transparent||opacity<1;m.opacity=base.opacity*opacity;}}
  dispose(){for(const e of this.videos.values()){e.video.onloadeddata=e.video.onseeked=e.video.onerror=null;e.video.removeAttribute('src');e.video.load();if(e.url)URL.revokeObjectURL(e.url);}this.videos.clear();this.systemTexture.dispose();this.disposed=true;const textures=new Set<THREE.Texture>();this.root.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();const m=o.material as THREE.Material;for(const v of Object.values(m))if(v instanceof THREE.Texture)textures.add(v);m.dispose();}});this.screens.forEach(s=>{s.material.dispose();textures.add(s.texture);});textures.forEach(t=>t.dispose());this.images.forEach(i=>{i.onload=null;i.onerror=null;});}
}
