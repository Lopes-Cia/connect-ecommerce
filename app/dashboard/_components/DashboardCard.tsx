import { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

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
  const isPositive = changeType === "positive";

  return (
    <div className="rounded-xl border border-custom-light-300 bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-montserrat font-semibold uppercase tracking-wider text-custom-light-600">
            {title}
          </p>
          <p className="mt-1 text-2xl leading-none font-league-spartan font-bold text-custom-dark-1000 sm:text-[1.75rem]">
            {value}
          </p>
        </div>
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${bgColor} ${accentColor}`}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <span
          className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-montserrat font-semibold ${
            isPositive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          }`}
        >
          {isPositive ? (
            <ArrowUpRight className="h-3.5 w-3.5" />
          ) : (
            <ArrowDownRight className="h-3.5 w-3.5" />
          )}
          {change}
        </span>
      </div>
    </div>
  );
}
