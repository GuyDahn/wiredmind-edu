/**
 * The story's buttons are painted by the server and answer taps only once
 * React has hydrated them. A tap in between used to be lost without a
 * trace. This script, inlined in the page before the story, holds those taps
 * instead: a click on any button in the story is stopped and remembered, and
 * the button is marked `data-queued`. Once the story is live, `releaseEarlyTaps`
 * clicks them again, in order, so each one does what it would have done.
 *
 * Plain ES5 in a string: it runs before any bundle has loaded. Links are left
 * alone, since they work without JavaScript.
 */
export const EARLY_TAPS_SCRIPT = `(function(){var held=[];function hold(event){var target=event.target;var button=target&&target.closest?target.closest("[data-story] button"):null;if(!button||button.disabled)return;event.preventDefault();event.stopImmediatePropagation();held.push(button);button.setAttribute("data-queued","")}document.addEventListener("click",hold,true);window.__wiredmindEarlyTaps=function(){document.removeEventListener("click",hold,true);window.__wiredmindEarlyTaps=undefined;return held}})();`;

type EarlyTapWindow = { __wiredmindEarlyTaps?: () => HTMLElement[] };

/**
 * Stops holding taps and plays back the ones that came in before hydration.
 * Call it from an effect, when React's handlers are in place. Safe to call
 * more than once: only the first call finds anything.
 */
export function releaseEarlyTaps() {
  const take = (window as EarlyTapWindow).__wiredmindEarlyTaps;
  if (!take) return;
  for (const button of take()) {
    button.removeAttribute("data-queued");
    if (!button.isConnected || (button as HTMLButtonElement).disabled) continue;
    button.click();
  }
}
