import { useState, useEffect, useCallback, useRef } from 'react';
import { RealtimeEventPayload } from '../../shared/types.js';
import { ToastItem } from '../components/common/Toast.js';
import { api } from '../lib/api.js';

// Subtle audio chime using browser Web Audio API
function playChime(isStatusChange: boolean) {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';

    // Frequencies: higher chime for assignment, lower double beep for status
    if (isStatusChange) {
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5
    } else {
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.15); // G5
    }

    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.36);
  } catch {
    // Ignore audio context errors if blocked by browser policy
  }
}

interface UseProjectRealtimeOptions {
  projectId: string;
  onEventReceived?: (event: RealtimeEventPayload) => void;
  enableSound?: boolean;
}

export function useProjectRealtime({
  projectId,
  onEventReceived,
  enableSound = true,
}: UseProjectRealtimeOptions) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const eventSourceRef = useRef<EventSource | null>(null);
  const onEventReceivedRef = useRef(onEventReceived);

  useEffect(() => {
    onEventReceivedRef.current = onEventReceived;
  }, [onEventReceived]);

  const addToast = useCallback((toast: ToastItem) => {
    setToasts((prev) => [toast, ...prev.slice(0, 5)]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const handleIncomingPayload = useCallback((payload: RealtimeEventPayload) => {
    const isStatus =
      payload.type === 'project:status_changed' ||
      payload.type === 'task:status_changed' ||
      payload.type === 'milestone:status_changed';

    if (enableSound) {
      playChime(isStatus);
    }

    const newToast: ToastItem = {
      ...payload,
      id: payload.id || `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      durationMs: 6500,
    };

    addToast(newToast);

    if (onEventReceivedRef.current) {
      onEventReceivedRef.current(payload);
    }
  }, [addToast, enableSound]);

  // Connect via native EventSource to the server-sent events endpoint
  useEffect(() => {
    if (!projectId) return;

    setConnectionStatus('connecting');

    // Attach auth token via query parameter or header; EventSource in browsers connects natively
    // Since session is stored in cookie / localStorage, EventSource to /api/projects/:id/events connects
    // We pass token as query param so server can authenticate EventSource request if needed
    const token = localStorage.getItem('nexora_token');
    const streamUrl = `/api/projects/${projectId}/events${token ? `?token=${encodeURIComponent(token)}` : ''}`;

    let es: EventSource;
    try {
      es = new EventSource(streamUrl);
      eventSourceRef.current = es;

      es.addEventListener('open', () => {
        setConnectionStatus('connected');
      });

      es.addEventListener('notification', (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data) as RealtimeEventPayload;
          handleIncomingPayload(payload);
        } catch (err) {
          console.error('Failed to parse realtime event payload', err);
        }
      });

      es.onmessage = (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload.type && payload.type !== 'connected') {
            handleIncomingPayload(payload as RealtimeEventPayload);
          }
        } catch {
          // heartbeat or unformatted ping
        }
      };

      es.onerror = () => {
        // SSE reconnects automatically, but mark status as error/reconnecting
        setConnectionStatus('error');
      };
    } catch (err) {
      setConnectionStatus('error');
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [projectId, handleIncomingPayload]);

  // Trigger simulated real-time event
  const simulateEvent = useCallback(
    async (type: 'status_change' | 'member_assignment') => {
      try {
        await api.simulateRealtimeEvent(projectId, { type });
      } catch (err) {
        console.error('Failed to trigger simulated event', err);
      }
    },
    [projectId]
  );

  return {
    toasts,
    addToast,
    dismissToast,
    clearAllToasts,
    connectionStatus,
    simulateEvent,
  };
}
