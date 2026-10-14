import { Activity, Boxes, Send } from "lucide-react";

export const navigation = [
  { id: "jobs", href: "/jobs", label: "Operations", icon: Activity },
  { id: "events", href: "/events", label: "Event lab", icon: Send },
  {
    id: "architecture",
    href: "/architecture",
    label: "Architecture",
    icon: Boxes,
  },
] as const;

export type AppView = (typeof navigation)[number]["id"];
