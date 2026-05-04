'use strict';

/**
 * domSnapshot.js
 * Extracts a compact, structured snapshot of the current page state.
 * We send this to Claude instead of raw HTML — it's ~10x smaller and
 * contains only what's relevant to a QA agent.
 */

async function captureSnapshot(page) {
  const url = page.url();
  const title = await page.title();

  const snapshot = await page.evaluate(() => {
    const result = {
      url: window.location.href,
      title: document.title,
      forms: [],
      buttons: [],
      links: [],
      tables: [],
      alerts: [],
      headings: [],
      inputs: [],
      dropdowns: [],
      modals: [],
    };

    // --- Headings (page sections) ---
    document.querySelectorAll('h1, h2, h3').forEach(el => {
      const text = el.innerText.trim();
      if (text) result.headings.push({ tag: el.tagName.toLowerCase(), text });
    });

    // --- Alert / toast messages ---
    document.querySelectorAll('[role="alert"], .alert, .toast, .notification, [class*="alert"], [class*="toast"]').forEach(el => {
      const text = el.innerText.trim();
      if (text) result.alerts.push(text.slice(0, 200));
    });

    // --- Modals ---
    document.querySelectorAll('[role="dialog"], .modal, [class*="modal"], [class*="dialog"]').forEach(el => {
      if (el.offsetParent !== null) { // visible only
        const heading = el.querySelector('h1,h2,h3,h4,[class*="title"]');
        result.modals.push({
          title: heading ? heading.innerText.trim() : '(no title)',
          visible: true,
        });
      }
    });

    // --- Forms ---
    document.querySelectorAll('form').forEach((form, i) => {
      const fields = [];
      form.querySelectorAll('input, textarea, select').forEach(input => {
        if (input.type === 'hidden') return;
        fields.push({
          type: input.type || input.tagName.toLowerCase(),
          name: input.name || input.id || input.placeholder || '(unnamed)',
          placeholder: input.placeholder || null,
          required: input.required,
          value: input.value ? '[has value]' : null,
        });
      });

      const submitBtn = form.querySelector('[type="submit"], button:last-of-type');
      result.forms.push({
        id: form.id || `form-${i}`,
        action: form.action || null,
        fields,
        submitLabel: submitBtn ? submitBtn.innerText.trim() : null,
      });
    });

    // --- Standalone inputs (outside forms, e.g. search bars) ---
    document.querySelectorAll('input:not(form input), textarea:not(form textarea)').forEach(input => {
      if (input.type === 'hidden') return;
      result.inputs.push({
        type: input.type || 'text',
        name: input.name || input.id || input.placeholder || '(unnamed)',
        placeholder: input.placeholder || null,
      });
    });

    // --- Dropdowns / selects ---
    document.querySelectorAll('select, [role="combobox"], [role="listbox"]').forEach(el => {
      const label = el.getAttribute('aria-label') ||
        document.querySelector(`label[for="${el.id}"]`)?.innerText ||
        el.name || el.id || '(unnamed)';
      result.dropdowns.push({ label });
    });

    // --- Buttons (excluding form submits already captured) ---
    document.querySelectorAll('button, [role="button"], a[class*="btn"]').forEach(el => {
      const text = el.innerText.trim();
      const ariaLabel = el.getAttribute('aria-label');
      const label = text || ariaLabel;
      if (!label || label.length > 60) return;
      // Skip generic/icon-only buttons
      if (['', '×', '✕', '‹', '›'].includes(label)) return;
      result.buttons.push({
        label,
        type: el.getAttribute('type') || el.tagName.toLowerCase(),
        disabled: el.disabled || el.getAttribute('aria-disabled') === 'true',
      });
    });

    // --- Navigation links ---
    document.querySelectorAll('nav a, [role="navigation"] a, aside a, .sidebar a').forEach(el => {
      const text = el.innerText.trim();
      if (text && el.href) {
        result.links.push({ text, href: el.href });
      }
    });

    // --- Data tables ---
    document.querySelectorAll('table').forEach((table, i) => {
      const headers = [...table.querySelectorAll('th')].map(th => th.innerText.trim());
      const rowCount = table.querySelectorAll('tbody tr').length;
      result.tables.push({ index: i, headers, rowCount });
    });

    return result;
  });

  return snapshot;
}

module.exports = { captureSnapshot };
