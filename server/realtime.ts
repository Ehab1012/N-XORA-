import { Response } from 'express';
import { RealtimeEventPayload, RealtimeEventType } from '../shared/types.js';

interface ProjectClient {
  id: string;
  projectId: string;
  res: Response;
  keepAliveTimer: NodeJS.Timeout;
}

class RealtimeHub {
  private clients: Map<string, ProjectClient[]> = new Map();
  private recentEvents: Map<string, RealtimeEventPayload[]> = new Map();

  /**
   * Subscribe an HTTP client to Server-Sent Events for a specific project
   */
  public subscribe(projectId: string, res: Response, clientId = Math.random().toString(36).substring(2, 9)): void {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    // Initial greeting
    const connectPayload = {
      type: 'connected',
      projectId,
      clientId,
      timestamp: new Date().toISOString(),
      message: 'Real-time synchronization connected',
    };
    res.write(`event: open\ndata: ${JSON.stringify(connectPayload)}\n\n`);

    // Keepalive ping every 25 seconds
    const keepAliveTimer = setInterval(() => {
      try {
        res.write(': keepalive\n\n');
      } catch (err) {
        this.unsubscribe(projectId, clientId);
      }
    }, 25000);

    const client: ProjectClient = {
      id: clientId,
      projectId,
      res,
      keepAliveTimer,
    };

    const existing = this.clients.get(projectId) || [];
    this.clients.set(projectId, [...existing, client]);

    // Cleanup on disconnect
    res.on('close', () => {
      this.unsubscribe(projectId, clientId);
    });
  }

  /**
   * Unsubscribe a client
   */
  public unsubscribe(projectId: string, clientId: string): void {
    const list = this.clients.get(projectId);
    if (!list) return;

    const target = list.find((c) => c.id === clientId);
    if (target) {
      clearInterval(target.keepAliveTimer);
    }

    const filtered = list.filter((c) => c.id !== clientId);
    if (filtered.length > 0) {
      this.clients.set(projectId, filtered);
    } else {
      this.clients.delete(projectId);
    }
  }

  /**
   * Broadcast an event to all clients watching a project
   */
  public broadcast(projectId: string, event: RealtimeEventPayload): void {
    // Record in history
    const history = this.recentEvents.get(projectId) || [];
    history.unshift(event);
    if (history.length > 25) history.pop();
    this.recentEvents.set(projectId, history);

    // Send to subscribers
    const projectClients = this.clients.get(projectId);
    if (!projectClients || projectClients.length === 0) return;

    const data = `event: notification\ndata: ${JSON.stringify(event)}\n\n`;
    for (const client of projectClients) {
      try {
        client.res.write(data);
      } catch (err) {
        // Failed write will be cleaned up by close listener
      }
    }
  }

  /**
   * Get recent events for a project
   */
  public getRecentEvents(projectId: string): RealtimeEventPayload[] {
    return this.recentEvents.get(projectId) || [];
  }

  /**
   * Number of active watchers for a project
   */
  public getActiveCount(projectId: string): number {
    return (this.clients.get(projectId) || []).length;
  }
}

export const realtimeHub = new RealtimeHub();
