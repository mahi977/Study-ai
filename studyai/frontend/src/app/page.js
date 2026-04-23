'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
export default function Home() {
  const router = useRouter();
  useEffect(() => { const t = localStorage.getItem('accessToken'); router.push(t ? '/dashboard' : '/login'); }, []);
  return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="text-indigo-500 text-3xl animate-pulse">✦</div></div>;
}
