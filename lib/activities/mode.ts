/** Routes that put the whole chrome into Activities mode (`html[data-mode='activities']`): /activities/* and the dev
 *  preview page (its /feed sibling stays outside, to show the way out). A plain module so the pre-paint script in
 *  app/layout.tsx and the client hook share one pattern. */
export const ACTIVITIES_PATH = /^\/activities(\/|$)|^\/activities-preview$/;
export const inActivities = (pathname: string) => ACTIVITIES_PATH.test(pathname);
