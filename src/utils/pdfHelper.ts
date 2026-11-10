// Helper to sanitize modern CSS color functions (oklch, oklab, color-mix, light-dark)
// in live and cloned documents before html2canvas parses stylesheets, preventing PDF export crashes,
// and enforcing pure black (#000000) text and populated tables for all PDF and Print operations.

function createColorConverter() {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext('2d');
  const colorCache = new Map<string, string>();

  const convertColorToRgb = (colorStr: string): string => {
    if (colorCache.has(colorStr)) return colorCache.get(colorStr)!;
    if (!ctx) return '#000000';
    try {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = '#000000';
      ctx.fillStyle = colorStr;
      const computed = ctx.fillStyle;
      if (computed && !computed.includes('oklch') && !computed.includes('oklab')) {
        colorCache.set(colorStr, computed);
        return computed;
      }
    } catch {
      // fallback
    }
    colorCache.set(colorStr, '#000000');
    return '#000000';
  };

  const sanitizeCssText = (css: string): string => {
    let cleaned = css.replace(/(?:oklch|oklab|lch|lab)\([^)]+\)/gi, (match) => convertColorToRgb(match));
    cleaned = cleaned.replace(/color-mix\([^)]+\)/gi, '#1e293b');
    return cleaned;
  };

  return { sanitizeCssText };
}

export function sanitizeLiveStylesheets() {
  try {
    const { sanitizeCssText } = createColorConverter();
    const styleElements = document.querySelectorAll('style');
    styleElements.forEach((styleEl) => {
      if (
        styleEl.textContent &&
        (styleEl.textContent.includes('oklch') ||
          styleEl.textContent.includes('oklab') ||
          styleEl.textContent.includes('color-mix'))
      ) {
        styleEl.textContent = sanitizeCssText(styleEl.textContent);
      }
    });
  } catch (err) {
    console.warn('Live stylesheet sanitizer warning:', err);
  }
}

export function sanitizeClonedDocumentForPdf(clonedDoc: Document) {
  try {
    const { sanitizeCssText } = createColorConverter();

    // 1. Collect all rules from document.styleSheets
    const collectedCss: string[] = [];
    try {
      Array.from(document.styleSheets).forEach((sheet) => {
        try {
          const rules = sheet.cssRules || sheet.rules;
          if (!rules) return;
          for (let i = 0; i < rules.length; i++) {
            collectedCss.push(rules[i].cssText);
          }
        } catch {
          // Cross-origin stylesheet, ignore
        }
      });
    } catch {
      // ignore
    }

    // 2. Remove external <link rel="stylesheet"> from clonedDoc so html2canvas doesn't re-parse raw oklch() files
    const linkElements = clonedDoc.querySelectorAll('link[rel="stylesheet"]');
    linkElements.forEach((linkEl) => {
      linkEl.parentNode?.removeChild(linkEl);
    });

    // 3. Sanitize all existing <style> tags inside clonedDoc
    const styleElements = clonedDoc.querySelectorAll('style');
    styleElements.forEach((styleEl) => {
      if (styleEl.textContent) {
        styleEl.textContent = sanitizeCssText(styleEl.textContent);
      }
    });

    // 4. Remove .no-print class from any ancestor of .print-container so .print-container is NEVER hidden
    const printContainer = clonedDoc.querySelector('.print-container') as HTMLElement | null;
    if (printContainer) {
      let curr: HTMLElement | null = printContainer;
      while (curr) {
        curr.classList.remove('no-print');
        curr.style.display = 'block';
        curr.style.visibility = 'visible';
        curr.style.opacity = '1';
        curr.style.overflow = 'visible';
        curr.style.maxHeight = 'none';
        curr.style.height = 'auto';
        curr.style.zoom = '1';
        curr.style.transform = 'none';
        curr = curr.parentElement;
      }
    }

    // 5. Inject the sanitized stylesheet rules + strict pure black (#000000) report override into clonedDoc.head
    const masterStyle = clonedDoc.createElement('style');
    const sanitizedAllRules = sanitizeCssText(collectedCss.join('\n'));
    masterStyle.textContent = `
      ${sanitizedAllRules}

      .report-modal-overlay,
      .report-modal-dialog,
      .report-scroll-wrapper,
      .report-zoom-wrapper,
      .print-container {
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
        overflow: visible !important;
        max-height: none !important;
        height: auto !important;
        zoom: 1 !important;
        transform: none !important;
        background: #ffffff !important;
        color: #000000 !important;
      }

      /* Strict PDF Report Override: Pure Black (#000000) Typography & Crisp Table Grid */
      .print-container,
      .print-container * {
        color: #000000 !important;
        -webkit-text-fill-color: #000000 !important;
        text-shadow: none !important;
      }
      .print-container table {
        display: table !important;
        border-collapse: collapse !important;
        width: 100% !important;
        border: 2px solid #000000 !important;
        margin-top: 6px !important;
        background-color: #ffffff !important;
      }
      .print-container thead {
        display: table-header-group !important;
      }
      .print-container tbody {
        display: table-row-group !important;
      }
      .print-container tfoot {
        display: table-footer-group !important;
      }
      .print-container tr {
        display: table-row !important;
        page-break-inside: avoid !important;
      }
      .print-container thead tr,
      .print-container th {
        display: table-cell !important;
        background-color: #e2e8f0 !important;
        color: #000000 !important;
        border: 1.5px solid #000000 !important;
        font-weight: 900 !important;
        padding: 5px 3px !important;
        text-align: center !important;
        vertical-align: middle !important;
      }
      .print-container thead tr {
        display: table-row !important;
      }
      .print-container tbody tr {
        background-color: #ffffff !important;
      }
      .print-container tbody tr:nth-child(even) {
        background-color: #f8fafc !important;
      }
      .print-container td {
        display: table-cell !important;
        background-color: transparent !important;
        color: #000000 !important;
        border: 1.2px solid #000000 !important;
        font-weight: 800 !important;
        padding: 4px 3px !important;
        text-align: center !important;
        vertical-align: middle !important;
        word-break: break-word !important;
      }
      .print-container td span,
      .print-container td div {
        background-color: transparent !important;
        color: #000000 !important;
      }
      .print-container tfoot tr,
      .print-container tfoot td {
        background-color: #cbd5e1 !important;
        color: #000000 !important;
        border: 2px solid #000000 !important;
        font-weight: 900 !important;
      }
      .print-container .no-print {
        display: none !important;
      }
    `;
    clonedDoc.head.appendChild(masterStyle);

    // 6. Sanitize any inline style attributes containing oklch/oklab or CSS zoom, and force pure black text in .print-container
    const allElements = clonedDoc.querySelectorAll('*');
    allElements.forEach((el) => {
      const htmlEl = el as HTMLElement;
      const styleAttr = htmlEl.getAttribute('style');
      if (styleAttr) {
        let updatedStyle = styleAttr;
        if (updatedStyle.includes('oklch') || updatedStyle.includes('oklab') || updatedStyle.includes('color-mix')) {
          updatedStyle = sanitizeCssText(updatedStyle);
        }
        if (updatedStyle.includes('zoom')) {
          updatedStyle = updatedStyle.replace(/zoom\s*:\s*[^;]+;?/gi, 'zoom: 1;');
        }
        htmlEl.setAttribute('style', updatedStyle);
      }
    });
  } catch (err) {
    console.warn('PDF CSS sanitizer warning:', err);
  }
}

// Universal, rock-solid A4 Landscape Print Engine for any HTML element or table
export function printHtmlElementA4(
  element: HTMLElement | null,
  documentTitle: string,
  fontClass: string = 'report-font-standard'
) {
  if (!element) {
    window.print();
    return;
  }

  try {
    let iframe = document.getElementById('report-fast-print-iframe') as HTMLIFrameElement | null;
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'report-fast-print-iframe';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '1px';
      iframe.style.height = '1px';
      iframe.style.border = 'none';
      iframe.style.opacity = '0';
      iframe.style.pointerEvents = 'none';
      document.body.appendChild(iframe);
    }

    const iframeDoc = iframe.contentWindow?.document;
    if (!iframeDoc) {
      window.print();
      return;
    }

    // Clone the element and remove any internal .no-print nodes so only pure report content is printed
    const cloned = element.cloneNode(true) as HTMLElement;
    cloned.querySelectorAll('.no-print').forEach((n) => n.remove());
    // Ensure any print-only blocks (e.g. .hidden.print:block) are visible in the print iframe
    cloned.querySelectorAll('.hidden').forEach((n) => {
      const el = n as HTMLElement;
      if (el.className.includes('print:block')) {
        el.classList.remove('hidden');
        el.style.display = 'block';
      }
    });

    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <title>${documentTitle}</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 6mm;
          }
          * {
            box-sizing: border-box;
            font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif !important;
            color: #000000 !important;
            -webkit-text-fill-color: #000000 !important;
            text-shadow: none !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            background: #ffffff !important;
            color: #000000 !important;
            direction: rtl !important;
            font-weight: 800 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .print-container, div {
            max-height: none !important;
            overflow: visible !important;
            color: #000000 !important;
          }
          .print-container {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 2mm !important;
            background: #ffffff !important;
            color: #000000 !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
            table-layout: auto !important;
            page-break-inside: auto;
            border: 2px solid #000000 !important;
            margin-top: 8px !important;
            background-color: #ffffff !important;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          thead {
            display: table-header-group !important;
          }
          tbody {
            display: table-row-group !important;
          }
          tfoot {
            display: table-footer-group !important;
          }
          th, td {
            border: 1.2px solid #000000 !important;
            color: #000000 !important;
            padding: 5px 3px !important;
            word-break: break-word !important;
            line-height: 1.25 !important;
            text-align: center !important;
            vertical-align: middle !important;
          }
          .report-font-compact th, .report-font-compact td { font-size: 7pt !important; }
          .report-font-standard th, .report-font-standard td { font-size: 8pt !important; }
          .report-font-large th, .report-font-large td { font-size: 9pt !important; }
          thead tr, th {
            background-color: #e2e8f0 !important;
            color: #000000 !important;
            font-weight: 900 !important;
          }
          tbody tr, tbody td {
            background-color: #ffffff !important;
            color: #000000 !important;
            font-weight: 800 !important;
          }
          tbody tr:nth-child(even) td {
            background-color: #f1f5f9 !important;
          }
          td span, td div {
            background: transparent !important;
            color: #000000 !important;
            border-color: #000000 !important;
          }
          tfoot tr, tfoot td {
            background-color: #cbd5e1 !important;
            color: #000000 !important;
            font-weight: 900 !important;
            border: 2px solid #000000 !important;
          }
          .num-enlarged {
            font-weight: 900 !important;
            font-size: 1.08em !important;
            color: #000000 !important;
          }
          img {
            max-width: 50px !important;
            max-height: 50px !important;
            object-fit: contain !important;
          }
        </style>
      </head>
      <body class="${fontClass}">
        <div class="print-container">
          ${cloned.innerHTML}
        </div>
      </body>
      </html>
    `);
    iframeDoc.close();

    setTimeout(() => {
      try {
        iframe?.contentWindow?.focus();
        iframe?.contentWindow?.print();
      } catch {
        window.print();
      }
    }, 200);
  } catch {
    window.print();
  }
}
