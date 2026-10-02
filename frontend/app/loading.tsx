import { LoadingAnimationSvg } from "@/components/ui/loading-animation-svg";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex min-h-screen w-full flex-col items-center justify-center bg-[#F8FAF9] dark:bg-[#0B1110]">
      <LoadingAnimationSvg size="lg" text="Illuminating Lumen Workspace" />
    </div>
  );
}
