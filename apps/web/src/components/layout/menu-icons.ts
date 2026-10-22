import {
  Briefcase,
  ChartColumn,
  Circle,
  Database,
  FileStack,
  FlaskConical,
  type LucideIcon,
  Settings,
  Shield,
} from "lucide-react";

/** Ikon Lucide grup menu seed menurut `iconName` dari sesi (design-system 5); submenu memakai indikator titik. */
const GROUP_ICONS = new Map<string, LucideIcon>([
  ["settings", Settings],
  ["shield", Shield],
  ["database", Database],
  ["briefcase", Briefcase],
  ["file-stack", FileStack],
  ["chart-column", ChartColumn],
  ["flask-conical", FlaskConical],
]);

/** Ikon untuk `iconName` grup menu; nama di luar daftar memakai lingkaran netral. */
export function menuGroupIcon(iconName: string | null): LucideIcon {
  return (iconName && GROUP_ICONS.get(iconName)) || Circle;
}
