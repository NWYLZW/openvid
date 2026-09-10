import {writeFile} from 'node:fs/promises';
/** Actual sequential keyboard input through the approved browser locator, never paste/value assignment. */
export async function typeHumanly(locator, text, startedAtMs, logPath) {
  if(!Number.isFinite(startedAtMs)||startedAtMs<=0)throw new Error('Actual recording clock required');
  const cadence=[82,116,93,128,77,103,89,112];
  const now=()=> (Date.now()-startedAtMs)/1000;
  const result={method:'browser sequential keyboard input',text,started:now(),completed:null,status:'running',events:[]};
  await writeFile(logPath,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
  try {
    for(const [index,character] of [...text].entries()) {
      const before=now();
      await locator.pressSequentially(character);
      result.events.push({character,before,after:now()});
      await writeFile(logPath,JSON.stringify(result,null,2)+'\n');
      await new Promise(resolve=>setTimeout(resolve,character===' '?190:cadence[index%cadence.length]));
    }
    result.completed=now();result.status='complete';
    await writeFile(logPath,JSON.stringify(result,null,2)+'\n');
    return result;
  } catch(error) {
    result.status='failed';result.error=String(error);
    await writeFile(logPath,JSON.stringify(result,null,2)+'\n');throw error;
  }
}
