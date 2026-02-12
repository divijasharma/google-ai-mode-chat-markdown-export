// ==UserScript==
// @name         Google AI Mode Chat → Markdown Export
// @namespace    https://tampermonkey.net/
// @version      1.0
// @description  Export Google AI Mode chats to Markdown with one click
// @match        https://www.google.com/search*
// @grant        none
// ==/UserScript==

(() => {
  'use strict';

  const querySelector = 'span.VndcI.veK2kb';
  const responseSelector = 'div.mZJni';
  const timestampSelector = 'p.kwdzO';
  const codeBlockSelector = 'div.r1PmQe';

  const findTimestampBefore = (node, timestamps) => {
    let ts = '';
    for (const t of timestamps) {
      if (node.compareDocumentPosition(t) & Node.DOCUMENT_POSITION_PRECEDING) {
        ts = t.innerText.trim();
      }
    }
    return ts;
  };

  const extractResponseText = (responseEl) => {
    const parts = [];
    responseEl.childNodes.forEach(child => {
      if (child.nodeType === 1 && (child.matches(codeBlockSelector) || child.querySelector?.(codeBlockSelector))) {
        parts.push(`\n\`\`\`\n${child.innerText.trim()}\n\`\`\`\n`);
      } else if (child.innerText) {
        const t = child.innerText.trim();
        if (t) parts.push(t);
      }
    });
    return parts.length ? parts.join('\n') : responseEl.innerText.trim();
  };

  const exportMarkdown = () => {
    const queries = [...document.querySelectorAll(querySelector)]
      .map(el => ({ el, text: el.innerText.trim() }))
      .filter(q => q.text.length > 0);

    const responses = [...document.querySelectorAll(responseSelector)];
    const timestamps = [...document.querySelectorAll(timestampSelector)];

    if (!queries.length || !responses.length) {
      alert("No chats found. Scroll to load all content first.");
      return;
    }

    const chats = [];

    for (let i = 0; i < queries.length; i++) {
      const qEl = queries[i].el;
      const qText = queries[i].text;
      const nextQEl = queries[i + 1]?.el || null;

      const matchedResponses = responses.filter(r => {
        const afterCurrent = qEl.compareDocumentPosition(r) & Node.DOCUMENT_POSITION_FOLLOWING;
        const beforeNext = nextQEl
          ? r.compareDocumentPosition(nextQEl) & Node.DOCUMENT_POSITION_FOLLOWING
          : true;
        return afterCurrent && beforeNext;
      });

      let prefixResponses = [];
      if (i === 0) {
        prefixResponses = responses.filter(r =>
          r.compareDocumentPosition(qEl) & Node.DOCUMENT_POSITION_FOLLOWING
        );
      }

      const allResponses = [...prefixResponses, ...matchedResponses];

      const responseText = allResponses
        .map(extractResponseText)
        .filter(Boolean)
        .join('\n\n---\n\n');

      chats.push({
        id: i + 1,
        query: qText,
        response: responseText,
        timestamp: findTimestampBefore(qEl, timestamps),
      });
    }

    const md = chats.map(c => {
      const ts = c.timestamp ? `\n\n> **Timestamp:** ${c.timestamp}` : '';
      return `# Chat ${c.id}\n\n## Question\n${c.query}\n\n## Answer\n${c.response}${ts}\n`;
    }).join('\n---\n\n');

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'google_ai_chats.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  const addButton = () => {
    if (document.getElementById('ai-export-md-btn')) return;

    const btn = document.createElement('button');
    btn.id = 'ai-export-md-btn';
    btn.textContent = '⬇ Export AI Chat (MD)';
    btn.style.position = 'fixed';
    btn.style.bottom = '20px';
    btn.style.right = '20px';
    btn.style.zIndex = '999999';
    btn.style.padding = '10px 14px';
    btn.style.background = '#1a73e8';
    btn.style.color = '#fff';
    btn.style.border = 'none';
    btn.style.borderRadius = '8px';
    btn.style.fontSize = '14px';
    btn.style.cursor = 'pointer';
    btn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
    btn.onclick = exportMarkdown;

    document.body.appendChild(btn);
  };

  // Add button after page load
  window.addEventListener('load', addButton);
})();
