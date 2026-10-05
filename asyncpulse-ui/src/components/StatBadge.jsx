import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

/**
 * StatBadge — small metric card for dashboards.
 *
 * Usage:
 *   <StatBadge label="Recipients" value="1,240" icon={Mail} trend="up" trendValue="+12%" />
 */
export default function StatBadge({
  label,
  value,
  icon: Icon,
  trend,
  trendValue,
  accent = 'primary',
  compact = false,
}) {
  const accentColors = {
    primary: 'text-primary-hover',
    success: 'text-success',
    error: 'text-error',
    warning: 'text-warning',
    info: 'text-info',
  };

  const accentBg = {
    primary: 'bg-primary/10 border-primary/20',
    success: 'bg-success/10 border-success/20',
    error: 'bg-error/10 border-error/20',
    warning: 'bg-warning/10 border-warning/20',
    info: 'bg-info/10 border-info/20',
  };

  const TrendIcon =
    trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  const trendColor =
    trend === 'up'
      ? 'text-success'
      : trend === 'down'
      ? 'text-error'
      : 'text-white/40';

  return (
    <div
      className={`
        card-elevated p-4 transition-all duration-200
        hover:border-white/10 hover:bg-bg-elevated/80
        ${compact ? '' : 'min-w-[160px]'}
      `}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <span className="text-xs font-medium text-white/50 uppercase tracking-wider">
          {label}
        </span>
        {Icon && (
          <div
            className={`w-7 h-7 rounded-lg border flex items-center justify-center ${accentBg[accent]}`}
          >
            <Icon
              className={`w-3.5 h-3.5 ${accentColors[accent]}`}
              strokeWidth={2.25}
            />
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-white tabular-nums tracking-tight">
          {value}
        </span>
        {trend && (
          <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${trendColor}`}>
            <TrendIcon className="w-3 h-3" strokeWidth={2.5} />
            {trendValue}
          </span>
        )}
      </div>
    </div>
  );
}