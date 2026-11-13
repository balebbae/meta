'use client';
import dynamic from 'next/dynamic';

// Agentation: click any element on the page, leave a note, copy structured feedback for the coding agent. Dev builds only.
const Agentation = dynamic(() => import('agentation').then(m => m.Agentation), {ssr: false});

export function AgentationBar() {
  if (process.env.NODE_ENV !== 'development') return null;
  return <Agentation appName="Kaiju" />;
}
