import { ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getYouTubeEmbedUrl } from "@/lib/youtube";

interface VideoModalProps {
  /** The resource currently selected, or null when the modal is closed.
   * Passing null is what actually unmounts the iframe — Radix Dialog
   * doesn't render DialogContent at all while `open` is false. */
  resource: { title: string; videoId: string; url: string } | null;
  onOpenChange: (open: boolean) => void;
}

/**
 * Reuses the site's existing Radix-based Dialog (client/src/components/ui/dialog.tsx)
 * rather than introducing a second modal implementation. Radix already
 * provides the accessible name (via DialogTitle), a focus trap, Escape-to-close,
 * a keyboard-reachable close control, and — since DialogContent isn't
 * force-mounted — full unmount of the iframe (stopping playback) when closed.
 */
export default function VideoModal({ resource, onOpenChange }: VideoModalProps) {
  return (
    <Dialog open={!!resource} onOpenChange={onOpenChange}>
      {resource && (
        <DialogContent className="sm:max-w-3xl p-0 gap-0 overflow-hidden">
          <DialogHeader className="p-5 pb-4 pr-12 text-left">
            <DialogTitle className="text-lg text-wsa-navy leading-snug">{resource.title}</DialogTitle>
          </DialogHeader>
          <div className="aspect-video w-full bg-black">
            <iframe
              key={resource.videoId}
              src={getYouTubeEmbedUrl(resource.videoId)}
              title={resource.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          </div>
          <div className="p-4 flex justify-end">
            <a
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-wsa-red transition-colors"
            >
              Open on YouTube <ExternalLink size={12} aria-hidden="true" />
            </a>
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}
