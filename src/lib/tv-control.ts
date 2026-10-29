import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

// Comandos efêmeros do painel para as TVs abertas. Usa Broadcast do Realtime:
// não grava nada no banco e não gera eventos de postgres_changes.
export const TV_CONTROL_CHANNEL = "tv-control";
export const PLAY_ANNOUNCEMENT_EVENT = "play-announcement";

export interface PlayAnnouncementPayload {
  /** Locução específica; sem id, a TV toca a próxima da fila. */
  announcementId?: string;
}

let channelPromise: Promise<RealtimeChannel> | null = null;

const getChannel = () => {
  if (!channelPromise) {
    channelPromise = new Promise((resolve, reject) => {
      const channel = supabase.channel(TV_CONTROL_CHANNEL);
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") resolve(channel);
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          supabase.removeChannel(channel);
          channelPromise = null;
          reject(new Error(`Realtime ${status}`));
        }
      });
    });
  }
  return channelPromise;
};

export const requestAnnouncementOnTv = async (payload: PlayAnnouncementPayload = {}) => {
  const channel = await getChannel();
  const result = await channel.send({ type: "broadcast", event: PLAY_ANNOUNCEMENT_EVENT, payload });
  if (result !== "ok") throw new Error(`Broadcast ${result}`);
};
