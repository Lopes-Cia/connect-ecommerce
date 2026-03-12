import { LucideIcon } from "lucide-react";

interface DashboardCardProps {
  icon: LucideIcon;
  title: string;
  value: string;
  change: string;
  changeType: "positive" | "negative";
  bgColor?: string;
  accentColor?: string;
}

export default function DashboardCard({
  icon: Icon,
  title,
  value,
  change,
  changeType,
  bgColor = "bg-blue-50",
  accentColor = "text-tints-french-blue",
}: DashboardCardProps) {
  return (
    <div className={`rounded-xl border border-custom-light-300 p-6 shadow-sm ${bgColor}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`h-10 w-10 flex items-center justify-center rounded-lg bg-white ${accentColor}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="text-custom-dark-700 text-sm font-montserrat font-medium mb-2">
        {title}
      </p>
      <p className="text-custom-dark-1000 text-3xl font-league-spartan font-bold mb-3">
        {value}
      </p>
      <p
        className={`text-xs font-montserrat font-semibold ${
          changeType === "positive" ? "text-green-600" : "text-red-600"
        }`}
      >
        {change}
      </p>
    </div>
  );
}
