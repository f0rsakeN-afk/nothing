import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import prisma from '@/lib/prisma';
import { stackServerApp } from '@/src/stack/server';
import { SharedChatViewer } from '@/components/main/share/shared-chat-viewer';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const chat = await prisma.chat.findFirst({
    where: { id, visibility: 'public' },
    select: { title: true },
  });

  if (!chat) {
    return { title: 'Shared Chat' };
  }

  return {
    title: chat.title,
    description: 'A shared chat on Eryx',
  };
}

export default async function SharePage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;

  // Get user from stack server app - works in server components
  const user = await stackServerApp.getUser();

  const chat = await prisma.chat.findFirst({
    where: { id, visibility: 'public' },
    include: {
      user: {
        select: {
          email: true,
        },
      },
      messages: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'asc' },
        take: 100,
      },
    },
  });

  if (!chat) {
    return notFound();
  }

  const shareUrl = `/share/${id}`;
  const sharedBy = chat.user?.email?.split('@')[0] || 'Anonymous';

  return (
    <SharedChatViewer
      chatId={id}
      chatTitle={chat.title}
      shareUrl={shareUrl}
      messages={chat.messages.map((m) => ({
        id: m.id,
        role: m.role,
        sender: m.sender,
        content: m.content,
        createdAt: m.createdAt,
      }))}
      isSignedIn={Boolean(user)}
      sharedBy={sharedBy}
    />
  );
}
