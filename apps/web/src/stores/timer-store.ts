import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ActiveTimer {
  taskId: string;
  projectId: string;
  taskTitle: string;
  startTime: string;
}

interface TimerState {
  activeTimer: ActiveTimer | null;
  startTimer: (taskId: string, projectId: string, taskTitle: string) => void;
  stopTimer: () => ActiveTimer | null;
}

export const useTimerStore = create<TimerState>()(
  persist(
    (set, get) => ({
      activeTimer: null,

      startTimer: (taskId, projectId, taskTitle) => {
        set({
          activeTimer: { taskId, projectId, taskTitle, startTime: new Date().toISOString() },
        });
      },

      stopTimer: () => {
        const timer = get().activeTimer;
        set({ activeTimer: null });
        return timer;
      },
    }),
    {
      name: 'travelo-timer',
      partialize: (state) => ({
        activeTimer: state.activeTimer,
      }),
    },
  ),
);
