import BeegoTrackPage from "@/components/beego/BeegoTrackPage";
import { BEEGO_TRACKS } from "@/lib/beego/brand";

export function generateStaticParams() {
  return BEEGO_TRACKS.map((t) => ({ trackId: t.slug }));
}

export async function generateMetadata({ params }) {
  const track = BEEGO_TRACKS.find((t) => t.slug === params.trackId);
  if (!track) return { title: "Beego" };
  return {
    title: `${track.name} | Beego · beego.vn`,
    description: track.tagline,
  };
}

export default function TrackRoutePage({ params }) {
  return <BeegoTrackPage trackId={params.trackId} />;
}
