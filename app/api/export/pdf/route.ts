import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from 'pdf-lib';
import { Lexer, type Token } from 'marked';

type Color = Awaited<ReturnType<typeof rgb>>;

interface ExportMeta {
  modelLabel?: string;
  createdAt?: string | number | Date;
}

interface ExportBody {
  title?: string | null;
  content: string;
  meta?: ExportMeta;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function parseExportBody(value: unknown): ExportBody | null {
  if (!isRecord(value) || !isString(value.content) || !value.content.trim()) return null;

  const title = isString(value.title) ? value.title : value.title === null ? null : undefined;
  const meta = isRecord(value.meta) ? value.meta : undefined;

  return {
    title,
    content: value.content,
    meta: {
      modelLabel: isString(meta?.modelLabel) ? meta?.modelLabel : undefined,
      createdAt:
        typeof meta?.createdAt === 'string' || typeof meta?.createdAt === 'number' || meta?.createdAt instanceof Date
          ? meta?.createdAt
          : undefined,
    },
  };
}

// Simplify LaTeX to readable text
function simplifyLatex(lx: string): string {
  return (lx || '')
    .replace(/\\,|\\;|\\:|\\quad|\\qquad/g, ' ')
    .replace(/\\displaystyle|\\textstyle|\\scriptstyle|\\left|\\right/g, '')
    .replace(/\\text\{([^}]*)\}/g, '$1')
    .replace(/\\textbf\{([^}]*)\}/g, '$1')
    .replace(/\\textit\{([^}]*)\}/g, '$1')
    .replace(/\\mathrm\{([^}]*)\}/g, '$1')
    .replace(/\\mathbf\{([^}]*)\}/g, '$1')
    .replace(/\\mathit\{([^}]*)\}/g, '$1')
    .replace(/\\mathcal\{([^}]*)\}/g, '$1')
    .replace(/\\mathbb\{([^}]*)\}/g, '$1')
    .replace(/\\operatorname\{([^}]*)\}/g, '$1')
    .replace(/\\operatorname\*\{([^}]*)\}/g, '$1')
    .replace(/\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, '($1)/($2)')
    .replace(/\\dfrac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, '($1)/($2)')
    .replace(/\\tfrac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, '($1)/($2)')
    .replace(/\\sqrt\[([^\]]+)\]\{([^}]*)\}/g, '($2)^(1/$1)')
    .replace(/\\sqrt\{([^}]*)\}/g, '√($1)')
    .replace(/\\alpha\b/g, 'α')
    .replace(/\\beta\b/g, 'β')
    .replace(/\\gamma\b/g, 'γ')
    .replace(/\\delta\b/g, 'δ')
    .replace(/\\epsilon\b/g, 'ε')
    .replace(/\\varepsilon\b/g, 'ε')
    .replace(/\\zeta\b/g, 'ζ')
    .replace(/\\eta\b/g, 'η')
    .replace(/\\theta\b/g, 'θ')
    .replace(/\\vartheta\b/g, 'θ')
    .replace(/\\iota\b/g, 'ι')
    .replace(/\\kappa\b/g, 'κ')
    .replace(/\\lambda\b/g, 'λ')
    .replace(/\\mu\b/g, 'μ')
    .replace(/\\nu\b/g, 'ν')
    .replace(/\\xi\b/g, 'ξ')
    .replace(/\\pi\b/g, 'π')
    .replace(/\\rho\b/g, 'ρ')
    .replace(/\\sigma\b/g, 'σ')
    .replace(/\\tau\b/g, 'τ')
    .replace(/\\upsilon\b/g, 'υ')
    .replace(/\\phi\b/g, 'φ')
    .replace(/\\varphi\b/g, 'φ')
    .replace(/\\chi\b/g, 'χ')
    .replace(/\\psi\b/g, 'ψ')
    .replace(/\\omega\b/g, 'ω')
    .replace(/\\Gamma\b/g, 'Γ')
    .replace(/\\Delta\b/g, 'Δ')
    .replace(/\\Theta\b/g, 'Θ')
    .replace(/\\Lambda\b/g, 'Λ')
    .replace(/\\Xi\b/g, 'Ξ')
    .replace(/\\Pi\b/g, 'Π')
    .replace(/\\Sigma\b/g, 'Σ')
    .replace(/\\Phi\b/g, 'Φ')
    .replace(/\\Psi\b/g, 'Ψ')
    .replace(/\\Omega\b/g, 'Ω')
    .replace(/\\infty\b/g, '∞')
    .replace(/\\sum\b/g, 'Σ')
    .replace(/\\prod\b/g, 'Π')
    .replace(/\\int\b/g, '∫')
    .replace(/\\partial\b/g, '∂')
    .replace(/\\nabla\b/g, '∇')
    .replace(/\\times\b/g, '×')
    .replace(/\\cdot\b/g, '·')
    .replace(/\\cdots\b/g, '···')
    .replace(/\\ldots\b/g, '...')
    .replace(/\\dots\b/g, '...')
    .replace(/\\leq\b/g, '≤')
    .replace(/\\le\b/g, '≤')
    .replace(/\\geq\b/g, '≥')
    .replace(/\\ge\b/g, '≥')
    .replace(/\\neq\b/g, '≠')
    .replace(/\\ne\b/g, '≠')
    .replace(/\\approx\b/g, '≈')
    .replace(/\\sim\b/g, '~')
    .replace(/\\equiv\b/g, '≡')
    .replace(/\\pm\b/g, '±')
    .replace(/\\mp\b/g, '∓')
    .replace(/\\div\b/g, '÷')
    .replace(/\\to\b/g, '→')
    .replace(/\\rightarrow\b/g, '→')
    .replace(/\\leftarrow\b/g, '←')
    .replace(/\\Rightarrow\b/g, '⇒')
    .replace(/\\Leftarrow\b/g, '⇐')
    .replace(/\\iff\b/g, '⟺')
    .replace(/\\forall\b/g, '∀')
    .replace(/\\exists\b/g, '∃')
    .replace(/\\in\b/g, '∈')
    .replace(/\\notin\b/g, '∉')
    .replace(/\\subset\b/g, '⊂')
    .replace(/\\subseteq\b/g, '⊆')
    .replace(/\\supset\b/g, '⊃')
    .replace(/\\supseteq\b/g, '⊇')
    .replace(/\\cup\b/g, '∪')
    .replace(/\\cap\b/g, '∩')
    .replace(/\\emptyset\b/g, '∅')
    .replace(/\\varnothing\b/g, '∅')
    .replace(/\\neg\b/g, '¬')
    .replace(/\\land\b/g, '∧')
    .replace(/\\lor\b/g, '∨')
    .replace(/\\oplus\b/g, '⊕')
    .replace(/\\otimes\b/g, '⊗')
    .replace(/\\perp\b/g, '⊥')
    .replace(/\\parallel\b/g, '∥')
    .replace(/\\angle\b/g, '∠')
    .replace(/\\circ\b/g, '°')
    .replace(/\\degree\b/g, '°')
    .replace(/\\prime\b/g, '′')
    .replace(/\\langle\b/g, '⟨')
    .replace(/\\rangle\b/g, '⟩')
    .replace(/\\lfloor\b/g, '⌊')
    .replace(/\\rfloor\b/g, '⌋')
    .replace(/\\lceil\b/g, '⌈')
    .replace(/\\rceil\b/g, '⌉')
    .replace(/\\vert\b/g, '|')
    .replace(/\\mid\b/g, '|')
    .replace(/\\\\\|/g, '‖')
    .replace(/\^(\{[^}]+\}|\w)/g, (_m, exp) => {
      const e = exp.startsWith('{') ? exp.slice(1, -1) : exp;
      const superscriptMap: Record<string, string> = {
        '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
        '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
        'n': 'ⁿ', 'i': 'ⁱ', '+': '⁺', '-': '⁻', 'T': 'ᵀ',
        'a': 'ᵃ', 'b': 'ᵇ', 'c': 'ᶜ', 'd': 'ᵈ', 'e': 'ᵉ',
        'f': 'ᶠ', 'g': 'ᵍ', 'h': 'ʰ', 'j': 'ʲ', 'k': 'ᵏ',
        'l': 'ˡ', 'm': 'ᵐ', 'o': 'ᵒ', 'p': 'ᵖ', 'r': 'ʳ',
        's': 'ˢ', 't': 'ᵗ', 'u': 'ᵘ', 'v': 'ᵛ', 'w': 'ʷ',
        'x': 'ˣ', 'y': 'ʸ', 'z': 'ᶻ',
      };
      return e.split('').map((c: string) => superscriptMap[c] || `^${c}`).join('');
    })
    .replace(/_(\{[^}]+\}|\w)/g, (_m, sub) => {
      const s = sub.startsWith('{') ? sub.slice(1, -1) : sub;
      const subscriptMap: Record<string, string> = {
        '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
        '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
        'i': 'ᵢ', 'j': 'ⱼ', 'n': 'ₙ', '+': '₊', '-': '₋',
        'a': 'ₐ', 'e': 'ₑ', 'o': 'ₒ', 'x': 'ₓ', 'h': 'ₕ',
        'k': 'ₖ', 'l': 'ₗ', 'm': 'ₘ', 'p': 'ₚ', 's': 'ₛ',
        't': 'ₜ', 'r': 'ᵣ', 'u': 'ᵤ', 'v': 'ᵥ',
      };
      return s.split('').map((c: string) => subscriptMap[c] || `_${c}`).join('');
    })
    .replace(/\\\\/g, ' ')
    .replace(/\\[a-zA-Z]+\*?/g, ' ')
    .replace(/[{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Process markdown links and formatting
function processMarkdownText(text: string): { text: string; links: { text: string; url: string }[] } {
  // First simplify LaTeX
  let processed = text
    .replace(/\\\[([\s\S]*?)\\\]/g, (_m, latex) => simplifyLatex(latex))
    .replace(/\$\$([\s\S]*?)\$\$/g, (_m, latex) => simplifyLatex(latex))
    .replace(/\$([^$]+)\$/g, (_m, latex) => simplifyLatex(latex))
    .replace(/\\\(([^\)]+)\\\)/g, (_m, latex) => simplifyLatex(latex));

  // Extract links
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;

  // We need to track positions before we strip links
  const linkMatches: { text: string; url: string }[] = [];
  let match;
  while ((match = linkRegex.exec(processed)) !== null) {
    linkMatches.push({ text: match[1], url: match[2] });
  }

  // Now remove link syntax but keep track
  processed = processed.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1');

  return { text: processed, links: linkMatches };
}

export async function POST(req: NextRequest) {
  try {
    const body = parseExportBody(await req.json());
    if (!body) {
      return NextResponse.json({ error: 'Invalid content' }, { status: 400 });
    }

    const title = body.title ?? 'Eryx AI';
    const rawContent = body.content;
    const meta = body.meta ?? {};

    // Create PDF document
    const pdfDoc = await PDFDocument.create();

    // Embed fonts
    const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const timesRomanBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    const courier = await pdfDoc.embedFont(StandardFonts.Courier);
    const courierBold = await pdfDoc.embedFont(StandardFonts.CourierBold);

    // PDF settings
    const pageWidth = 612; // Letter size
    const pageHeight = 792;
    const margin = 72; // 1 inch margin
    const contentWidth = pageWidth - margin * 2;
    const fontSize = 12;
    const lineHeight = fontSize * 1.4;
    const smallFontSize = 10;
    const headingFontSize = 18;
    const subheadingFontSize = 14;

    let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
    let yPosition = pageHeight - margin;

    // Helper to check if we need a new page
    const checkNewPage = (needed = lineHeight * 1.5) => {
      if (yPosition - needed < margin + 40) {
        currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
        yPosition = pageHeight - margin;
        return true;
      }
      return false;
    };

    // Helper to draw wrapped text
    const drawWrappedText = (
      text: string,
      font: PDFFont,
      size: number,
      color: Color,
      maxWidth: number,
      lineHeightPx: number
    ): number => {
      const words = text.split(/\s+/);
      let currentLine = '';
      let linesDrawn = 0;

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const testWidth = font.widthOfTextAtSize(testLine, size);

        if (testWidth > maxWidth && currentLine) {
          currentPage.drawText(currentLine, {
            x: margin,
            y: yPosition,
            size,
            font,
            color,
          });
          yPosition -= lineHeightPx;
          linesDrawn++;
          checkNewPage(lineHeightPx);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }

      if (currentLine) {
        currentPage.drawText(currentLine, {
          x: margin,
          y: yPosition,
          size,
          font,
          color,
        });
        yPosition -= lineHeightPx;
        linesDrawn++;
      }

      return linesDrawn;
    };

    // Draw title
    currentPage.drawText(title, {
      x: margin,
      y: yPosition,
      size: headingFontSize,
      font: timesRomanBold,
      color: rgb(0.1, 0.1, 0.1),
    });
    yPosition -= headingFontSize * 1.5;

    // Draw metadata
    const metaLines: string[] = [];
    if (meta.modelLabel) metaLines.push(`Model: ${meta.modelLabel}`);
    if (meta.createdAt) metaLines.push(`Date: ${new Date(meta.createdAt).toLocaleString()}`);

    for (const line of metaLines) {
      currentPage.drawText(line, {
        x: margin,
        y: yPosition,
        size: smallFontSize,
        font: timesRoman,
        color: rgb(0.4, 0.4, 0.4),
      });
      yPosition -= smallFontSize * 1.3;
    }

    // Draw separator line
    yPosition -= 10;
    currentPage.drawLine({
      start: { x: margin, y: yPosition },
      end: { x: pageWidth - margin, y: yPosition },
      thickness: 0.5,
      color: rgb(0.8, 0.8, 0.8),
    });
    yPosition -= lineHeight;

    // Parse markdown
    const tokens: Token[] = Lexer.lex(rawContent);

    // Track citations for references
    const citationIndex = new Map<string, number>();
    const citationText = new Map<string, string>();
    let citationCounter = 0;

    // Process tokens
    for (const tk of tokens) {
      switch (tk.type) {
        case 'heading': {
          const headingToken = tk as { depth?: number; text?: string; tokens?: Token[] };
          const depth = headingToken.depth ?? 1;
          const size = depth === 1 ? headingFontSize : depth === 2 ? subheadingFontSize : fontSize;
          const font = depth <= 2 ? timesRomanBold : timesRoman;

          checkNewPage(size * 2);

          const text = headingToken.text || '';
          drawWrappedText(text, font, size, rgb(0.1, 0.1, 0.1), contentWidth, lineHeight);
          yPosition -= lineHeight * 0.5;
          break;
        }

        case 'paragraph': {
          checkNewPage();

          let text = tk.text || '';

          // Process links for citations
          if (tk.tokens) {
            for (const t of tk.tokens) {
              if (t.type === 'link' && t.href) {
                let num = citationIndex.get(t.href);
                if (num == null) {
                  citationCounter++;
                  num = citationCounter;
                  citationIndex.set(t.href, num);
                }
                if (t.text) citationText.set(t.href, t.text);
              }
            }
          }

          // Clean text
          text = text
            .replace(/\*\*([^*]+)\*\*/g, '$1') // Bold
            .replace(/\*([^*]+)\*/g, '$1') // Italic
            .replace(/`([^`]+)`/g, '$1') // Inline code
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'); // Links

          drawWrappedText(text, timesRoman, fontSize, rgb(0.1, 0.1, 0.1), contentWidth, lineHeight);
          yPosition -= lineHeight * 0.5;
          break;
        }

        case 'blockquote': {
          checkNewPage();

          const text = tk.text || '';
          const lines = text.split('\n');

          for (const line of lines) {
            // Draw quote mark
            currentPage.drawText('"', {
              x: margin,
              y: yPosition,
              size: fontSize,
              font: timesRomanBold,
              color: rgb(0.5, 0.5, 0.5),
            });

            // Draw indented text
            currentPage.drawText(line.trim(), {
              x: margin + 15,
              y: yPosition,
              size: fontSize,
              font: timesRoman,
              color: rgb(0.4, 0.4, 0.4),
            });
            yPosition -= lineHeight;
          }
          yPosition -= lineHeight * 0.3;
          break;
        }

        case 'code': {
          checkNewPage(lineHeight * 2);

          const codeText = String(tk.text || '');
          const codeLines = codeText.split('\n');

          // Draw code block background
          const codeBlockHeight = codeLines.length * (smallFontSize * 1.3) + 16;
          checkNewPage(codeBlockHeight);

          // Draw background
          currentPage.drawRectangle({
            x: margin,
            y: yPosition - codeBlockHeight + 8,
            width: contentWidth,
            height: codeBlockHeight,
            color: rgb(0.97, 0.97, 0.97),
            borderColor: rgb(0.9, 0.9, 0.9),
            borderWidth: 0.5,
          });

          yPosition -= 8;

          for (const line of codeLines) {
            currentPage.drawText(line || ' ', {
              x: margin + 8,
              y: yPosition,
              size: smallFontSize,
              font: courier,
              color: rgb(0.1, 0.1, 0.1),
            });
            yPosition -= smallFontSize * 1.3;
          }

          yPosition -= lineHeight * 0.5;
          break;
        }

        case 'list': {
          const isOrdered = tk.ordered;
          let counter = tk.start || 1;

          for (const item of tk.items || []) {
            checkNewPage();

            const bulletText = isOrdered ? `${counter}.` : '•';
            let itemText = item.text || '';

            // Clean markdown
            itemText = itemText
              .replace(/\*\*([^*]+)\*\*/g, '$1')
              .replace(/\*([^*]+)\*/g, '$1')
              .replace(/`([^`]+)`/g, '$1')
              .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

            currentPage.drawText(bulletText + ' ', {
              x: margin,
              y: yPosition,
              size: fontSize,
              font: timesRomanBold,
              color: rgb(0.1, 0.1, 0.1),
            });

            const textWidth = timesRomanBold.widthOfTextAtSize(bulletText + ' ', fontSize);
            drawWrappedText(itemText, timesRoman, fontSize, rgb(0.1, 0.1, 0.1), contentWidth - textWidth, lineHeight);

            if (isOrdered) counter++;
          }

          yPosition -= lineHeight * 0.3;
          break;
        }

        case 'table': {
          const headers = Array.isArray(tk.header) ? tk.header : [];
          const rows = Array.isArray(tk.rows) ? tk.rows : [];

          if (headers.length === 0) break;

          const nCols = Math.max(headers.length, rows[0]?.length || 0);
          const colWidth = contentWidth / nCols;
          const cellPadding = 6;
          const cellHeight = lineHeight * 1.5;

          checkNewPage(cellHeight * (rows.length + 2));

          // Draw header row
          for (let i = 0; i < headers.length; i++) {
            const cellText = typeof headers[i] === 'string' ? headers[i] : String(headers[i]?.text ?? '');

            // Header background
            currentPage.drawRectangle({
              x: margin + i * colWidth,
              y: yPosition - cellHeight + 4,
              width: colWidth,
              height: cellHeight,
              color: rgb(0.9, 0.9, 0.95),
              borderColor: rgb(0.8, 0.8, 0.85),
              borderWidth: 0.5,
            });

            currentPage.drawText(cellText, {
              x: margin + i * colWidth + cellPadding,
              y: yPosition - cellHeight + cellPadding + 4,
              size: fontSize,
              font: timesRomanBold,
              color: rgb(0.1, 0.1, 0.1),
            });
          }
          yPosition -= cellHeight;

          // Draw data rows
          for (const row of rows) {
            checkNewPage(cellHeight);

            for (let i = 0; i < nCols; i++) {
              const cell = row[i];
              const cellText = typeof cell === 'string' ? cell : String(cell?.text ?? '');

              // Cell border
              currentPage.drawRectangle({
                x: margin + i * colWidth,
                y: yPosition - cellHeight + 4,
                width: colWidth,
                height: cellHeight,
                borderColor: rgb(0.8, 0.8, 0.8),
                borderWidth: 0.5,
              });

              currentPage.drawText(cellText, {
                x: margin + i * colWidth + cellPadding,
                y: yPosition - cellHeight + cellPadding + 4,
                size: fontSize,
                font: timesRoman,
                color: rgb(0.1, 0.1, 0.1),
              });
            }
            yPosition -= cellHeight;
          }

          yPosition -= lineHeight * 0.5;
          break;
        }

        case 'hr': {
          yPosition -= lineHeight * 0.5;
          currentPage.drawLine({
            start: { x: margin, y: yPosition },
            end: { x: pageWidth - margin, y: yPosition },
            thickness: 0.5,
            color: rgb(0.6, 0.6, 0.6),
          });
          yPosition -= lineHeight * 0.5;
          break;
        }

        default: {
          if (tk.type === 'text' && tk.text) {
            checkNewPage();

            const text = tk.text
              .replace(/\*\*([^*]+)\*\*/g, '$1')
              .replace(/\*([^*]+)\*/g, '$1')
              .replace(/`([^`]+)`/g, '$1')
              .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

            drawWrappedText(text, timesRoman, fontSize, rgb(0.1, 0.1, 0.1), contentWidth, lineHeight);
            yPosition -= lineHeight * 0.3;
          }
          break;
        }
      }
    }

    // Add References section
    const citations = Array.from(citationText.entries());
    if (citations.length > 0) {
      checkNewPage(lineHeight * 3);

      yPosition -= lineHeight;
      currentPage.drawText('References', {
        x: margin,
        y: yPosition,
        size: subheadingFontSize,
        font: timesRomanBold,
        color: rgb(0.1, 0.1, 0.1),
      });
      yPosition -= lineHeight;

      const refs = citations
        .map(([href, label]) => ({ href, label, num: citationIndex.get(href) || Infinity }))
        .filter((r) => r.num !== Infinity)
        .sort((a, b) => a.num - b.num);

      for (const { href, label, num } of refs) {
        checkNewPage(lineHeight * 2);

        let hostname = '';
        try {
          hostname = new URL(String(href)).hostname;
        } catch {
          hostname = String(href).replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
        }

        const refText = `[${num}] ${label} (${hostname})`;
        drawWrappedText(refText, timesRoman, smallFontSize, rgb(0.1, 0.1, 0.1), contentWidth, lineHeight);
      }
    }

    // Generate PDF bytes
    const pdfBytes = await pdfDoc.save();

    // Return response
    return new Response(new Uint8Array(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="eryx-export.pdf"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        Pragma: 'no-cache',
      },
    });
  } catch (e: unknown) {
    console.error('PDF export error:', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed to generate PDF' }, { status: 500 });
  }
}
