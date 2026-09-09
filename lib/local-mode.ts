/** Public build-time switch shared by the browser, routes, and proxy. */
export const isLocalOnly = process.env.NEXT_PUBLIC_LOCAL_ONLY === "true";
