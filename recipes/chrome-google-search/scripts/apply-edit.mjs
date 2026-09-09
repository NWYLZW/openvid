import { readFile } from 'node:fs/promises';

/** Use the current editor tab's documented CDP capability inside computer-use REPL. */
export async function applyEdit(cdp, configPath) {
  const edit = JSON.parse(await readFile(configPath, 'utf8'));
  const result = await cdp.send('Runtime.evaluate', {
    expression: `window.openvid.apply(${JSON.stringify(edit)})`,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
  if (!result.result?.value?.ready) throw new Error('Editor not ready after applying recipe');
  return result.result.value;
}
