import { create } from 'zustand';
import type { UserProfile } from '@/types/container';

interface UserState {
  profile: UserProfile;
  isLogin: boolean;
  setProfile: (profile: UserProfile) => void;
  logout: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  profile: {
    id: 'U20240001',
    name: '张明远',
    customerId: 'CUST001',
    company: '上海恒辉食品进口有限公司',
    role: 'warehouse',
    roleText: '仓库主管',
    phone: '138****6688'
  },
  isLogin: true,
  setProfile: (profile) => set({ profile, isLogin: true }),
  logout: () => set({ isLogin: false })
}));
