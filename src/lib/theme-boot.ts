// Runs in <head> before first paint so a saved theme never flashes the other one.
// Kept out of the client module so the server layout gets the string itself.
export const THEME_KEY = "potdrive.theme";
export const THEME_BOOT = `try{var t=localStorage.getItem("${THEME_KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;
