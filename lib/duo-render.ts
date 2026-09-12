/** Device geometry and fold projection adapted from jadon7/iphone-duo (MIT).
 * Apple device artwork is separately prepared locally; see third-party/duo-assets.md.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { DuoConfig, DuoScreen } from './duo-config';
import { sampleDuoAngle } from './duo-config';
import { updateDuoProjectionEye } from './duo-projection';
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
  private power = {value:1.35};
  private projection = {value:true};
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
  constructor(private invalidate:()=>void) {}
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
              uiReferenceEye:this.projectionEye,uiPixel:screen.pixel,
              blurStrength:this.blur,darkening:this.darkening,transitionPower:this.power,projectScreen:this.projection,
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
  update(config:DuoConfig,time:number,video?:HTMLVideoElement|null,imageUrl?:string|null):boolean {
    const angle=sampleDuoAngle(config,time);
    this.bend.value=(180-angle)*Math.PI/180;this.hinge.value=config.hingeWidth;
    this.blur.value=config.blur;this.darkening.value=config.darkening;this.power.value=config.transitionPower;this.projection.value=config.projection;
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
    // An unused custom cover must not prevent the shared-video path becoming ready.
    if(config.coverMode==='right')used.pop();
    const activeImages=new Set(used.filter(s=>s.source==='image').map(s=>s.image!));
    if(imageUrl)activeImages.add(imageUrl);
    for(const [url,img] of this.images)if(!activeImages.has(url)){img.onload=null;img.onerror=null;this.images.delete(url);this.failedImages.delete(url);}
    let ready=this.loaded;
    const sources=used.map(s=>{
      const src=s.source==='image'?this.image(s.image!):video&&video.readyState>=2&&video.videoWidth?video:imageUrl?this.image(imageUrl):null;
      if(!src)ready=false;return src;
    });
    this.error=used.some(s=>s.image&&this.failedImages.has(s.image))?'Unable to load a Duo screen image. Choose the image again.':null;
    const key=String(continuous)+':'+config.coverMode+':'+JSON.stringify(used)+':'+(video?video.currentSrc+':'+video.currentTime+':'+video.videoWidth+':'+video.readyState:imageUrl)+':'+this.revision;
    // Keep the last decoded pixels while seeking. Painting a placeholder here
    // would invalidate the pixels without invalidating the previous ready cache key.
    if(ready&&key!==this.lastPixels){
      const draw=(canvas:HTMLCanvasElement,s:DuoScreen,source:CanvasImageSource|null,x:number,width:number)=>{
        const ctx=canvas.getContext('2d')!;ctx.save();ctx.beginPath();ctx.rect(x,0,width,canvas.height);ctx.clip();ctx.fillStyle=s.background;ctx.fillRect(x,0,width,canvas.height);
        if(source){
          const img=source as HTMLImageElement,vid=source as HTMLVideoElement;
          const sw=vid.videoWidth||img.naturalWidth,sh=vid.videoHeight||img.naturalHeight;
          const c=s.crop,cw=c.width*sw,ch=c.height*sh;
          const scale=(s.fit==='cover'?Math.max:Math.min)(width/cw,canvas.height/ch);
          ctx.drawImage(source,c.x*sw,c.y*sh,cw,ch,x+(width-cw*scale)/2,(canvas.height-ch*scale)/2,cw*scale,ch*scale);
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
  dispose(){this.disposed=true;const textures=new Set<THREE.Texture>();this.root.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();const m=o.material as THREE.Material;for(const v of Object.values(m))if(v instanceof THREE.Texture)textures.add(v);m.dispose();}});this.screens.forEach(s=>{s.material.dispose();textures.add(s.texture);});textures.forEach(t=>t.dispose());this.images.forEach(i=>{i.onload=null;i.onerror=null;});}
}
