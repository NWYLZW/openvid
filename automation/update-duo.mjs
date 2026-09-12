/** Use the existing connected editor tab's CDP capability; never opens another project. */
export async function updateDuo(cdp, changes, expected) {
  const response = await cdp.send('Runtime.evaluate', {
    expression: `window.openvid.updateDuo(${JSON.stringify(changes)},${JSON.stringify(expected)})`,
    awaitPromise: true, returnByValue: true,
  });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description ?? 'Duo update failed');
  return response.result.value;
}
