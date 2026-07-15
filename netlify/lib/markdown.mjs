// Compact, safe Markdown -> HTML for blog posts.
// User input is escaped first, then markdown syntax becomes real tags —
// so any raw HTML the author types is neutralized (no injection).

export function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

function inline(text) {
  let s = escapeHtml(text);
  // images  ![alt](url)
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img src="$2" alt="$1" loading="lazy">');
  // links   [text](url)
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" rel="noopener">$1</a>');
  // bold, italic, code
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  return s;
}

export function mdToHtml(md) {
  const lines = String(md || '').replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  let para = [], listType = null, listItems = [], quote = [], inCode = false, code = [];

  const flushPara = () => { if (para.length) { out.push('<p>' + para.map(inline).join(' ') + '</p>'); para = []; } };
  const flushList = () => { if (listItems.length) { out.push(`<${listType}>` + listItems.map((li) => '<li>' + inline(li) + '</li>').join('') + `</${listType}>`); listItems = []; listType = null; } };
  const flushQuote = () => { if (quote.length) { out.push('<blockquote>' + quote.map((q) => '<p>' + inline(q) + '</p>').join('') + '</blockquote>'); quote = []; } };
  const flushAll = () => { flushPara(); flushList(); flushQuote(); };

  for (const raw of lines) {
    const line = raw;
    if (/^```/.test(line.trim())) {
      if (inCode) { out.push('<pre><code>' + code.map(escapeHtml).join('\n') + '</code></pre>'); code = []; inCode = false; }
      else { flushAll(); inCode = true; }
      continue;
    }
    if (inCode) { code.push(line); continue; }

    if (line.trim() === '') { flushAll(); continue; }

    let m;
    if ((m = line.match(/^(#{1,6})\s+(.*)$/))) { flushAll(); out.push(`<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`); continue; }
    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) { flushAll(); out.push('<hr>'); continue; }
    if ((m = line.match(/^>\s?(.*)$/))) { flushPara(); flushList(); quote.push(m[1]); continue; }
    if ((m = line.match(/^[-*+]\s+(.*)$/))) { flushPara(); flushQuote(); if (listType && listType !== 'ul') flushList(); listType = 'ul'; listItems.push(m[1]); continue; }
    if ((m = line.match(/^\d+\.\s+(.*)$/))) { flushPara(); flushQuote(); if (listType && listType !== 'ol') flushList(); listType = 'ol'; listItems.push(m[1]); continue; }

    flushList(); flushQuote();
    para.push(line.trim());
  }
  if (inCode && code.length) out.push('<pre><code>' + code.map(escapeHtml).join('\n') + '</code></pre>');
  flushAll();
  return out.join('\n');
}

// Plain-text excerpt (for meta descriptions / RSS) from markdown or a manual excerpt.
export function toPlain(md, max = 160) {
  let s = String(md || '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (s.length > max) s = s.slice(0, max - 1).replace(/\s\S*$/, '') + '…';
  return s;
}
