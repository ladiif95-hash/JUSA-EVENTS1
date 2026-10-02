// Copies each column header onto its cells (data-label) so admin tables can
// collapse into labelled cards on narrow screens (see .admin-table-wrap in ui.css).
function labelTables(root: ParentNode) {
  root.querySelectorAll<HTMLTableElement>('.admin-table-wrap table').forEach((table) => {
    const headers = [...table.querySelectorAll('thead th')].map((th) => th.textContent?.trim() || '');
    table.querySelectorAll('tbody tr').forEach((row) => {
      [...row.children].forEach((cell, index) => {
        const label = headers[index] || '';
        if ((cell as HTMLElement).dataset.label !== label) (cell as HTMLElement).dataset.label = label;
      });
    });
  });
}

export function installResponsiveTables() {
  labelTables(document);
  let queued = false;
  new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; labelTables(document); });
  }).observe(document.body, { childList: true, subtree: true });
}
