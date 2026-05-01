import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateUser, AccountDeactivatedError } from '@/lib/auth';
import { getChatByIdWithMessages } from '@/lib/stack-server';
import { logger } from '@/lib/logger';
import { checkRateLimitWithAuth, rateLimitError } from '@/lib/rate-limit';

const MAX_EXPORT_MESSAGES = 1000;

function escapeMarkdown(text: string): string {
  const escapeChars = /([\\`*_\[\]{}()#+\-.!|~])/g;
  return text.replace(escapeChars, '\\$1');
}

function formatCodeBlock(content: string): string {
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
  return content.replace(codeBlockRegex, (_, lang, code) => {
    return `\`\`\`${lang}\n${code.trim()}\n\`\`\``;
  });
}

function formatInlineCode(content: string): string {
  return content.replace(/`([^`]+)`/g, '`$1`');
}

function formatLinks(content: string): string {
  return content.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '[$1]($2)');
}

function formatContent(content: string): string {
  let formatted = formatCodeBlock(content);
  formatted = formatInlineCode(formatted);
  formatted = formatLinks(formatted);
  return formatted;
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

    const rateLimit = await checkRateLimitWithAuth(request, "export");
    if (!rateLimit.success) {
      return rateLimitError(rateLimit);
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
    let isFirst = true;

    const stream = new ReadableStream({
      async start(controller) {
        const send = (chunk: string) => {
          controller.enqueue(encoder.encode(chunk));
        };

        send(`# ${formatContent(chat.title)}\n\n`);
        send(`Created: ${chat.createdAt.toLocaleString()}`);
        if (chat.project) {
          send(` • Project: ${escapeMarkdown(chat.project.name)}`);
        }
        send('\n\n---\n\n');

        for (const msg of messages) {
          const role = msg.role === 'user' ? '**You**' : '**Eryx**';
          send(`## ${role}\n\n`);
          send(`${formatContent(msg.content || '')}\n\n`);
        }

        controller.close();
      },
    });

    const filename = `${chat.title.replace(/[^a-zA-Z0-9\-_\s]/g, '')}.md`;

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
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
    logger.error('[MDExport] Markdown export failed', e as Error);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to export chat' },
      { status: 500 }
    );
  }
}
