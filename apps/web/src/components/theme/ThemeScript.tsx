export const THEME_SCRIPT_CONTENT =
  "(function(){try{var s=localStorage.getItem('javaverse-theme');var t='light';if(s==='dark'){t='dark'}else if(s==='system'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}else{t='light'}document.documentElement.setAttribute('data-theme',t)}catch(e){document.documentElement.setAttribute('data-theme','light')}})();";

export const THEME_SCRIPT_SHA256 = "'sha256-GV/BZf3I5eY8+JPJIO3tQvn8LgHuYvyWCaEAXQ1cFgg='";

export function ThemeScript({ nonce }: { nonce?: string | undefined }) {
  return <script nonce={nonce} dangerouslySetInnerHTML={{ __html: THEME_SCRIPT_CONTENT }} />;
}
