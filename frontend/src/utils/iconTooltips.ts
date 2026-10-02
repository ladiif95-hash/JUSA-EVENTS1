// Gives every icon-only button/link (no visible text, but an aria-label) a styled tooltip,
// so the meaning of an icon is always one hover or focus away.
function annotate(root: ParentNode) {
  root.querySelectorAll<HTMLElement>('button[aria-label], a[aria-label]').forEach((element) => {
    if (element.dataset.tooltip || element.textContent?.trim()) return;
    element.dataset.tooltip = element.getAttribute('aria-label') || '';
    element.removeAttribute('title');
  });
}

export function installIconTooltips() {
  annotate(document);
  new MutationObserver((mutations) => {
    for (const mutation of mutations) mutation.addedNodes.forEach((node) => { if (node instanceof HTMLElement) annotate(node.parentElement || node); });
  }).observe(document.body, { childList: true, subtree: true });
}
