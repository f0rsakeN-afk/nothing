import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateUser, AccountDeactivatedError } from '@/lib/auth';
import { getChatByIdWithMessages } from '@/lib/stack-server';
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, BorderStyle, WidthType, ShadingType, ExternalHyperlink,
  convertInchesToTwip, IStylesOptions,
} from 'docx';
import { logger } from '@/lib/logger';

const MAX_EXPORT_MESSAGES = 1000;

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

    if (messages.length > MAX_EXPORT_MESSAGES) {
      return NextResponse.json(
        { error: `Chat too large to export (${messages.length} messages, max ${MAX_EXPORT_MESSAGES})` },
        { status: 413 }
      );
    }

    const children: Paragraph[] = [];

    children.push(
      new Paragraph({
        children: [new TextRun({ text: chat.title, bold: true, size: 32 })],
        heading: HeadingLevel.TITLE,
        spacing: { after: 200 },
      }),
    );

    const metaLines: string[] = [];
    metaLines.push(`Created: ${chat.createdAt.toLocaleString()}`);
    if (chat.project) metaLines.push(`Project: ${chat.project.name}`);

    if (metaLines.length) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: metaLines.join(' • '), color: '666666', size: 20 })],
          spacing: { after: 400 },
        }),
      );
    }

    children.push(
      new Paragraph({
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CCCCCC' } },
        spacing: { after: 400 },
      }),
    );

    for (const msg of messages) {
      const role = msg.role === 'user' ? 'You' : 'Eryx';
      const content = msg.content || '';

      children.push(
        new Paragraph({
          children: [new TextRun({ text: role, bold: true, size: 24 })],
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 240, after: 80 },
        }),
      );

      const lines = content.split('\n');
      for (const line of lines) {
        if (line.trim()) {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: line, size: 22 })],
              spacing: { after: 80 },
            }),
          );
        }
      }

      children.push(new Paragraph({ spacing: { after: 200 } }));
    }

    const styles: IStylesOptions = {
      default: {
        document: { run: { font: 'Arial', size: 22 } },
      },
      characterStyles: [{
        id: 'Hyperlink', name: 'Hyperlink', basedOn: 'DefaultParagraphFont',
        run: { color: '2563EB', underline: { type: 'single' } },
      }],
    };

    const doc = new Document({
      styles,
      sections: [{
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        children,
      }],
    });

    const buffer = await Packer.toBuffer(doc);
    const arrayBuffer = new ArrayBuffer(buffer.byteLength);
    const view = new Uint8Array(arrayBuffer);
    view.set(new Uint8Array(buffer));

    const filename = `${chat.title.replace(/[^a-zA-Z0-9\-_\s]/g, '')}.docx`;

    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        Pragma: 'no-cache',
      },
    });
  } catch (e: unknown) {
    if (e instanceof AccountDeactivatedError) {
      return NextResponse.json({ error: 'Account deactivated' }, { status: 403 });
    }
    logger.error('[DOCXChatExport] DOCX export failed', e as Error);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed to export chat' }, { status: 500 });
  }
}
