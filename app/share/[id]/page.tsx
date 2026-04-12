import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import prisma from '@/lib/prisma';
import { stackServerApp } from '@/src/stack/server';
import { SharedChatViewer } from '@/components/main/share/shared-chat-viewer';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;

  // Check for demo mode
  if (id === 'demo') {
    return { title: 'Shared Chat Demo' };
  }

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

// Demo messages for preview mode
const DEMO_MESSAGES = [
  { id: 'demo-1', role: 'user', sender: 'user', content: 'Can you explain how vector databases work?', createdAt: new Date(Date.now() - 3600000) },
  { id: 'demo-2', role: 'assistant', sender: 'ai', content: 'Vector databases store data as mathematical vectors in high-dimensional space, enabling semantic search by finding closest matches based on cosine similarity or Euclidean distance. They\'re optimized for approximate nearest neighbor (ANN) searches using algorithms like HNSW, IVF, or PQ.', createdAt: new Date(Date.now() - 3500000) },
  { id: 'demo-3', role: 'user', sender: 'user', content: 'What\'s the difference between HNSW and IVF indexing?', createdAt: new Date(Date.now() - 3400000) },
  { id: 'demo-4', role: 'assistant', sender: 'ai', content: 'HNSW (Hierarchical Navigable Small World) builds a multi-layer graph for fast navigation - higher layers allow quick long-range jumps while lower layers provide precise local search. IVF (Inverted File) clusters vectors into buckets and searches within priority buckets first. HNSW is typically faster for online serving but uses more memory; IVF is more memory-efficient but slightly slower.', createdAt: new Date(Date.now() - 3300000) },
  { id: 'demo-5', role: 'user', sender: 'user', content: 'Which one should I use for a RAG application?', createdAt: new Date(Date.now() - 3200000) },
  { id: 'demo-6', role: 'assistant', sender: 'ai', content: 'For RAG (Retrieval-Augmented Generation), I\'d recommend HNSW. It provides sub-millisecond query times which is critical for real-time RAG pipelines. The memory overhead is acceptable for most production deployments, and the recall quality is excellent. If you\'re on a very tight memory budget with millions of vectors, consider hybrid approaches like PCA + IVF.', createdAt: new Date(Date.now() - 3100000) },
];

export default async function SharePage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;

  // Demo mode - show preview with dummy messages
  if (id === 'demo') {
    return (
      <SharedChatViewer
        chatId="demo"
        chatTitle="Vector Databases & RAG Explained"
        shareUrl="/share/demo"
        messages={DEMO_MESSAGES}
        isSignedIn={false}
        sharedBy="eryx_demo"
        isDemo={true}
      />
    );
  }

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
