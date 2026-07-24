import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listMenuItemsTool from "./tools/list-menu-items";
import listAudioTracksTool from "./tools/list-audio-tracks";
import listAnnouncementsTool from "./tools/list-announcements";
import getSlideshowSettingsTool from "./tools/get-slideshow-settings";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "menu-board-mcp",
  title: "Menu Board Digital",
  version: "0.1.0",
  instructions:
    "Read-only tools for the Menu Board Digital app: list slideshow media (images/videos), music tracks, voice announcements, and current slideshow settings. Calls act as the signed-in Menu Board user.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listMenuItemsTool,
    listAudioTracksTool,
    listAnnouncementsTool,
    getSlideshowSettingsTool,
  ],
});
