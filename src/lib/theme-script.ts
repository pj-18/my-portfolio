/**
 * The one script that must run before first paint: it marks the page as script-enabled and
 * applies a saved "Lights" choice, so the page never flashes the wrong theme.
 *
 * It is kept as a string because two places need the exact same text: the layout prints it
 * inline in <head>, and astro.config.ts hashes it for the Content Security Policy. If the two
 * ever differed, the browser would refuse to run it.
 */
export const themeScript =
  '(function(){var r=document.documentElement;r.classList.add("js");' +
  'try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")r.dataset.theme=t}catch(e){}})();';
