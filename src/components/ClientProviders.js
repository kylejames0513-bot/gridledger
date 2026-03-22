'use client';
import ChatBubble from '@/components/ChatBubble';

export default function ClientProviders({ children }) {
  return (
    <>
      {children}
      <ChatBubble />
    </>
  );
}
