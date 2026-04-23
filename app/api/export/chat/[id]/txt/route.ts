import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateUser, AccountDeactivatedError } from '@/lib/auth';
import { getChatByIdWithMessages } from '@/lib/stack-server';
import { logger } from '@/lib/logger';

const MAX_EXPORT_MESSAGES = 1000;

function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, (match) => match.replace(/```\w*\n?/g, '').trim())
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^#+\s+/gm, '')
    .replace(/^>\s+/gm, '')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .trim();
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

    if (messages.length > MAX_EXPORT_MESSAGES) {
      return NextResponse.json(
        { error: `Chat too large to export (${messages.length} messages, max ${MAX_EXPORT_MESSAGES})` },
        { status: 413 }
      );
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const send = (chunk: string) => {
          controller.enqueue(encoder.encode(chunk));
        };

        send(chat.title.toUpperCase() + '\n');
        send('═'.repeat(60) + '\n\n');
        send(`Created: ${chat.createdAt.toLocaleString()}`);
        if (chat.project) {
          send(` • Project: ${chat.project.name}`);
        }
        send('\n\n');
        send('─'.repeat(60) + '\n\n');

        for (const msg of messages) {
          const role = msg.role === 'user' ? 'YOU' : 'ERYX';
          send(`${role}\n`);
          send('─'.repeat(40) + '\n');
          send(`${stripMarkdown(msg.content || '')}\n\n`);
        }

        controller.close();
      },
    });

    const filename = `${chat.title.replace(/[^a-zA-Z0-9\-_\s]/g, '')}.txt`;

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Transfer-Encoding': 'chunked',
        Pragma: 'no-cache',
      },
    });
  } catch (e: unknown) {
    if (e instanceof AccountDeactivatedError) {
      return NextResponse.json({ error: 'Account deactivated' }, { status: 403 });
    }
    logger.error('[TXTExport] Text export failed', e as Error);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to export chat' },
      { status: 500 }
    );
  }
}
