import {
  Bot,
  Boxes,
  BriefcaseBusiness,
  CloudCog,
  Palette,
  Video,
} from "lucide-react";

const icons = {
  "productivity-ai": Bot,
  "creative-tools": Palette,
  "growth-infrastructure": CloudCog,
  productivity: BriefcaseBusiness,
  video: Video,
  default: Boxes,
};

export function ServiceIcon({ category, className }: { category: string; className?: string }) {
  const Icon = icons[category as keyof typeof icons] ?? icons.default;
  return <Icon className={className} aria-hidden="true" />;
}
