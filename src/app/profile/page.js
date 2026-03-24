'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGLAuth } from '@/components/ClientProviders';
import Header from '@/components/Header';
import { useNews, useAllPlayers } from '@/lib/use-data';
import { getSupabase } from '@/lib/supabase';
import { NFL_TEAMS, teamLogoUrl } from '@/lib/constants';

export default function ProfilePage() {
  const auth = useGLAuth();
  const router = useRouter();
  const news = useNews();
  const allPlayers = useAllPlayers();
