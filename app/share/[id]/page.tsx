import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { stackServerApp } from '@/src/stack/server';
import { SharedChatViewer } from '@/components/main/share/shared-chat-viewer';
import { PasswordGate } from '@/components/main/share/password-gate';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;

  // Check for demo mode
  if (id === 'demo') {
    return {
      title: 'Shared Chat Demo | Eryx',
      description: 'A shared chat on Eryx',
    };
  }

  const chat = await prisma.chat.findFirst({
    where: { shareToken: id, visibility: 'public' },
    select: { title: true, shareExpiry: true, sharePassword: true },
  });

  // Return not found metadata if chat doesn't exist or is expired
  if (!chat || (chat.shareExpiry && chat.shareExpiry < new Date())) {
    return {
      title: 'Shared Chat | Eryx',
      description: 'A shared chat on Eryx',
    };
  }

  return {
    title: `${chat.title} | Eryx`,
    description: 'A shared chat on Eryx',
    openGraph: {
      title: chat.title,
      description: 'A shared chat on Eryx',
      url: `/share/${id}`,
      siteName: 'Eryx',
      type: 'article',
      images: [
        {
          url: `/api/og/chat/${id}`,
          width: 1200,
          height: 630,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: chat.title,
      description: 'A shared chat on Eryx',
      creator: '@eryxai',
      images: [`/api/og/chat/${id}`],
    },
    alternates: {
      canonical: `/share/${id}`,
    },
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

  // Get user from stack server app - works in server components
  const user = await stackServerApp.getUser();

  // Handle demo mode separately
  if (id === 'demo') {
    return (
      <SharedChatViewer
        chatId="demo"
        chatTitle="Vector Databases & RAG Explained"
        shareUrl="/share/demo"
        messages={DEMO_MESSAGES}
        isSignedIn={Boolean(user)}
        sharedBy="eryx_demo"
        isDemo={true}
      />
    );
  }

  const chat = await prisma.chat.findFirst({
    where: { shareToken: id, visibility: 'public' },
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

  // Check if share link has expired
  if (chat.shareExpiry && chat.shareExpiry < new Date()) {
    return notFound();
  }

  // If password protected and no verified cookie, show password gate
  if (chat.sharePassword) {
    const cookieStore = await cookies();
    const verifiedCookie = cookieStore.get(`share_verified_${id}`);
    if (!verifiedCookie || verifiedCookie.value !== "1") {
      return (
        <PasswordGate
          shareToken={id}
          chatTitle={chat.title}
          sharedBy={chat.user?.email?.split('@')[0] || 'Anonymous'}
        />
      );
    }
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
