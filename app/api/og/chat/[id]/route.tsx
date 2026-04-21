import { ImageResponse } from 'next/og';
import { getOrCreateUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

const colors = {
  background: '#0a0a0f',
  foreground: '#ffffff',
  mutedForeground: '#a1a1aa',
  accent: '#27272a',
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const chat = await prisma.chat.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        userId: true,
      },
    });

    const fonts = [
      {
        name: 'Geist',
        data: await fetch(new URL('https://cdn.jsdelivr.net/npm/geist@1.0.0/dist/fonts/geist-sans/Geist-Regular.woff')).then(r => r.arrayBuffer()),
        style: 'normal' as const,
      },
    ];

    if (!chat) {
      return new ImageResponse(
        (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              width: '100%',
              height: '100%',
              backgroundColor: colors.background,
              fontFamily: 'Geist',
            }}
          >
            <div
              style={{
                fontSize: 64,
                color: colors.foreground,
                fontWeight: 600,
                marginTop: 24,
              }}
            >
              Eryx
            </div>
            <div
              style={{
                fontSize: 24,
                color: colors.mutedForeground,
                marginTop: 12,
              }}
            >
              AI Assistant
            </div>
          </div>
        ),
        { width: 1200, height: 630 },
      );
    }

    const userMessage = await prisma.message.findFirst({
      where: { chatId: id, role: 'user' },
      orderBy: { createdAt: 'asc' },
    });

    const assistantMessage = await prisma.message.findFirst({
      where: { chatId: id, role: 'assistant' },
      orderBy: { createdAt: 'asc' },
    });

    const userText = userMessage?.content?.slice(0, 120) || '';
    const assistantText = assistantMessage?.content?.slice(0, 700) || '';

    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            height: '100%',
            backgroundColor: colors.background,
            padding: '48px 64px',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                backgroundColor: colors.accent,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
                fontWeight: 600,
                color: colors.foreground,
              }}
            >
              E
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 28, color: colors.foreground, fontWeight: 600 }}>
                Eryx
              </div>
              <div style={{ fontSize: 16, color: colors.mutedForeground }}>
                AI Assistant
              </div>
            </div>
          </div>

          {/* Messages */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              marginTop: 32,
              gap: 24,
            }}
          >
            {userText && (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div
                  style={{
                    padding: '16px 24px',
                    borderRadius: 20,
                    backgroundColor: colors.accent,
                    fontSize: 22,
                    color: colors.foreground,
                    maxWidth: '85%',
                    lineHeight: 1.4,
                  }}
                >
                  {userText}
                </div>
              </div>
            )}

            {assistantText && (
              <div
                style={{
                  fontSize: 20,
                  color: colors.foreground,
                  lineHeight: 1.6,
                  maxWidth: '100%',
                  textWrap: 'balance',
                }}
              >
                {assistantText}
              </div>
            )}
          </div>

          {/* Bottom gradient */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 200,
              background: `linear-gradient(180deg, rgba(10, 10, 15, 0) 0%, rgba(10, 10, 15, 0.8) 100%)`,
            }}
          />
        </div>
      ),
      { width: 1200, height: 630 },
    );
  } catch (error) {
    console.error('OG image error:', error);
    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
            backgroundColor: colors.background,
          }}
        >
          <div style={{ fontSize: 48, color: colors.foreground, fontWeight: 600 }}>
            Eryx
          </div>
        </div>
      ),
      { width: 1200, height: 630 },
    );
  }
}
