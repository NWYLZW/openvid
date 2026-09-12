/** Wait for drawable data for the current seek, never accept an expired timer as a frame. */
export function waitForDecodedVideoFrame(video:HTMLVideoElement,timeoutMs=10000):Promise<void>{
  return new Promise((resolve,reject)=>{
    let finished=false;
    const events=['seeked','loadeddata','canplay','error'] as const;
    const cleanup=()=>{clearTimeout(timer);events.forEach(event=>video.removeEventListener(event,check));};
    const check=()=>{
      if(finished)return;
      if(video.error){finished=true;cleanup();reject(new Error(`Video decode failed: ${video.error.message||video.error.code}`));return;}
      if(!video.seeking&&video.readyState>=2){finished=true;cleanup();resolve();}
    };
    events.forEach(event=>video.addEventListener(event,check));
    const timer=setTimeout(()=>{if(finished)return;finished=true;cleanup();reject(new Error('Video frame did not decode before the export timeout'));},timeoutMs);
    check();
  });
}
