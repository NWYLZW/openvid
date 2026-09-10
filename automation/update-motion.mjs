/** Uses the active editor's documented CDP capability. Read live state; patch just one motion. */
export async function updateMotion(cdp, id, changes, expected) {
  if (!expected) throw new Error('Pass the fragment read from the current editor, not an archived recipe.');
  const result=await cdp.send('Runtime.evaluate', {
    expression:`window.openvid.updateMotion(${JSON.stringify(id)},${JSON.stringify(changes)},${JSON.stringify(expected)})`,
    awaitPromise:true,returnByValue:true,
  });
  if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description??result.exceptionDetails.text);
  return result.result.value;
}
