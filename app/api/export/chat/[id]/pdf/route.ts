import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateUser, AccountDeactivatedError } from '@/lib/auth';
import { getChatByIdWithMessages } from '@/lib/stack-server';
import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from 'pdf-lib';
import { Lexer, type Token } from 'marked';
import { logger } from '@/lib/logger';

const MAX_EXPORT_MESSAGES = 1000;

type Color = Awaited<ReturnType<typeof rgb>>;

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
    .replace(/\\sqrt\[([^\]]+)\]\{([^}]*)\}/g, '($2)^(1/$1)')
    .replace(/\\sqrt\{([^}]*)\}/g, '√($1)')
    .replace(/\\alpha\b/g, 'α').replace(/\\beta\b/g, 'β').replace(/\\gamma\b/g, 'γ')
    .replace(/\\delta\b/g, 'δ').replace(/\\epsilon\b/g, 'ε').replace(/\\varepsilon\b/g, 'ε')
    .replace(/\\zeta\b/g, 'ζ').replace(/\\eta\b/g, 'η').replace(/\\theta\b/g, 'θ')
    .replace(/\\vartheta\b/g, 'θ').replace(/\\iota\b/g, 'ι').replace(/\\kappa\b/g, 'κ')
    .replace(/\\lambda\b/g, 'λ').replace(/\\mu\b/g, 'μ').replace(/\\nu\b/g, 'ν')
    .replace(/\\xi\b/g, 'ξ').replace(/\\pi\b/g, 'π').replace(/\\rho\b/g, 'ρ')
    .replace(/\\sigma\b/g, 'σ').replace(/\\tau\b/g, 'τ').replace(/\\upsilon\b/g, 'υ')
    .replace(/\\phi\b/g, 'φ').replace(/\\varphi\b/g, 'φ').replace(/\\chi\b/g, 'χ')
    .replace(/\\psi\b/g, 'ψ').replace(/\\omega\b/g, 'ω')
    .replace(/\\Gamma\b/g, 'Γ').replace(/\\Delta\b/g, 'Δ').replace(/\\Theta\b/g, 'Θ')
    .replace(/\\Lambda\b/g, 'Λ').replace(/\\Xi\b/g, 'Ξ').replace(/\\Pi\b/g, 'Π')
    .replace(/\\Sigma\b/g, 'Σ').replace(/\\Phi\b/g, 'Φ').replace(/\\Psi\b/g, 'Ψ')
    .replace(/\\Omega\b/g, 'Ω').replace(/\\infty\b/g, '∞')
    .replace(/\\sum\b/g, 'Σ').replace(/\\prod\b/g, 'Π').replace(/\\int\b/g, '∫')
    .replace(/\\partial\b/g, '∂').replace(/\\nabla\b/g, '∇')
    .replace(/\\times\b/g, '×').replace(/\\cdot\b/g, '·').replace(/\\cdots\b/g, '···')
    .replace(/\\ldots\b/g, '...').replace(/\\dots\b/g, '...')
    .replace(/\\leq\b/g, '≤').replace(/\\ge\b/g, '≥').replace(/\\neq\b/g, '≠')
    .replace(/\\approx\b/g, '≈').replace(/\\equiv\b/g, '≡').replace(/\\pm\b/g, '±')
    .replace(/\\to\b/g, '→').replace(/\\rightarrow\b/g, '→').replace(/\\leftarrow\b/g, '←')
    .replace(/\\forall\b/g, '∀').replace(/\\exists\b/g, '∃').replace(/\\in\b/g, '∈')
    .replace(/\\cup\b/g, '∪').replace(/\\cap\b/g, '∩').replace(/\\emptyset\b/g, '∅')
    .replace(/\\neg\b/g, '¬').replace(/\\land\b/g, '∧').replace(/\\lor\b/g, '∨')
    .replace(/\\langle\b/g, '⟨').replace(/\\rangle\b/g, '⟩')
    .replace(/\\circ\b/g, '°').replace(/\\degree\b/g, '°')
    .replace(/\\\\/g, ' ').replace(/\\[a-zA-Z]+\*?/g, ' ')
    .replace(/[{}]/g, '').replace(/\s+/g, ' ').trim();
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getOrCreateUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const chat = await getChatByIdWithMessages(id, user.id);

    if (!chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    const messages = chat.messages || [];
    const pageWidth = 612;
    const pageHeight = 792;
    const margin = 72;
    const contentWidth = pageWidth - margin * 2;
    const fontSize = 12;
    const lineHeight = fontSize * 1.4;
    const smallFontSize = 10;
    const headingFontSize = 18;
    const subheadingFontSize = 14;

    const pdfDoc = await PDFDocument.create();
    const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const timesRomanBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    const courier = await pdfDoc.embedFont(StandardFonts.Courier);

    let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
    let yPosition = pageHeight - margin;

    const checkNewPage = (needed = lineHeight * 1.5) => {
      if (yPosition - needed < margin + 40) {
        currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
        yPosition = pageHeight - margin;
        return true;
      }
      return false;
    };

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
          currentPage.drawText(currentLine, { x: margin, y: yPosition, size, font, color });
          yPosition -= lineHeightPx;
          linesDrawn++;
          checkNewPage(lineHeightPx);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }

      if (currentLine) {
        currentPage.drawText(currentLine, { x: margin, y: yPosition, size, font, color });
        yPosition -= lineHeightPx;
        linesDrawn++;
      }

      return linesDrawn;
    };

    currentPage.drawText(chat.title, {
      x: margin, y: yPosition, size: headingFontSize, font: timesRomanBold, color: rgb(0.1, 0.1, 0.1),
    });
    yPosition -= headingFontSize * 1.5;

    const metaLines: string[] = [];
    metaLines.push(`Created: ${chat.createdAt.toLocaleString()}`);
    if (chat.project) metaLines.push(`Project: ${chat.project.name}`);

    for (const line of metaLines) {
      currentPage.drawText(line, { x: margin, y: yPosition, size: smallFontSize, font: timesRoman, color: rgb(0.4, 0.4, 0.4) });
      yPosition -= smallFontSize * 1.3;
    }

    yPosition -= 10;
    currentPage.drawLine({
      start: { x: margin, y: yPosition },
      end: { x: pageWidth - margin, y: yPosition },
      thickness: 0.5, color: rgb(0.8, 0.8, 0.8),
    });
    yPosition -= lineHeight;

    for (const msg of messages) {
      const role = msg.role === 'user' ? 'You' : 'Eryx';
      checkNewPage(headingFontSize * 2);

      currentPage.drawText(role, { x: margin, y: yPosition, size: subheadingFontSize, font: timesRomanBold, color: rgb(0.1, 0.1, 0.1) });
      yPosition -= lineHeight;

      let text = msg.content || '';
      text = text.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1')
        .replace(/`([^`]+)`/g, '$1').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

      drawWrappedText(text, timesRoman, fontSize, rgb(0.1, 0.1, 0.1), contentWidth, lineHeight);
      yPosition -= lineHeight;
    }

    if (messages.length > MAX_EXPORT_MESSAGES) {
      return NextResponse.json(
        { error: `Chat too large to export (${messages.length} messages, max ${MAX_EXPORT_MESSAGES})` },
        { status: 413 }
      );
    }

    const pdfBytes = await pdfDoc.save();
    const filename = `${chat.title.replace(/[^a-zA-Z0-9\-_\s]/g, '')}.pdf`;

    return new Response(new Uint8Array(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        Pragma: 'no-cache',
      },
    });
  } catch (e: unknown) {
    if (e instanceof AccountDeactivatedError) {
      return NextResponse.json({ error: 'Account deactivated' }, { status: 403 });
    }
    logger.error('[PDFChatExport] PDF export failed', e as Error);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed to export chat' }, { status: 500 });
  }
}
