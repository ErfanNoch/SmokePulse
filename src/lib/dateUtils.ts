import { CigaretteLog, DailySummary, PackPurchase, UserProfile } from '../types';
import { getCostPerStick } from './storage';

export function getLocalDateKey(timestamp: number): string {
  const d = new Date(timestamp);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatTimeOnly(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function formatFullDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatMonthYear(year: number, monthIndex: number): string {
  const d = new Date(year, monthIndex, 1);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function formatElapsedTime(sinceMs: number): string {
  const diffMs = Math.max(0, Date.now() - sinceMs);
  const diffMins = Math.floor(diffMs / (60 * 1000));
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  const days = Math.floor(hours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (hours < 24) return `${hours}h ${mins}m ago`;
  return `${days}d ${hours % 24}h ago`;
}

export function groupLogsByDay(
  logs: CigaretteLog[],
  packs: PackPurchase[],
  profile: UserProfile
): Map<string, DailySummary> {
  const map = new Map<string, DailySummary>();
  const defaultCostPerStick = getCostPerStick(profile, packs);

  for (const log of logs) {
    const key = getLocalDateKey(log.timestamp);
    if (!map.has(key)) {
      map.set(key, {
        dateStr: key,
        totalSticks: 0,
        estimatedCost: 0,
        logs: [],
        packsPurchased: [],
        totalPackSpend: 0,
        exceededLimit: false,
        limitRatio: 0,
      });
    }
    const item = map.get(key)!;
    item.totalSticks += log.count;
    const logCost = log.costEstimate > 0 ? log.costEstimate * log.count : defaultCostPerStick * log.count;
    item.estimatedCost += logCost;
    item.logs.push(log);
  }

  for (const pack of packs) {
    const key = getLocalDateKey(pack.timestamp);
    if (!map.has(key)) {
      map.set(key, {
        dateStr: key,
        totalSticks: 0,
        estimatedCost: 0,
        logs: [],
        packsPurchased: [],
        totalPackSpend: 0,
        exceededLimit: false,
        limitRatio: 0,
      });
    }
    const item = map.get(key)!;
    item.packsPurchased.push(pack);
    item.totalPackSpend += pack.cost * (pack.quantity || 1);
  }

  const limit = profile.dailyStickLimit || 8;
  map.forEach((item) => {
    item.limitRatio = limit > 0 ? item.totalSticks / limit : 0;
    item.exceededLimit = item.totalSticks > limit;
  });

  return map;
}

export interface CalendarDayCell {
  date: Date;
  dateStr: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  totalSticks: number;
  estimatedCost: number;
  packsCount: number;
  packCost: number;
  hasPacks: boolean;
  exceededLimit: boolean;
  ratio: number;
}

export function generateMonthGrid(
  year: number,
  month: number,
  dailyData: Map<string, DailySummary>,
  dailyLimit: number
): CalendarDayCell[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const totalDays = lastDay.getDate();

  const startDayOfWeek = firstDay.getDay(); // 0 is Sunday
  const todayKey = getLocalDateKey(Date.now());

  const cells: CalendarDayCell[] = [];

  // Previous month padding
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, prevMonthLastDay - i);
    const dateStr = getLocalDateKey(d.getTime());
    const dayData = dailyData.get(dateStr);
    cells.push({
      date: d,
      dateStr,
      dayNumber: d.getDate(),
      isCurrentMonth: false,
      isToday: dateStr === todayKey,
      totalSticks: dayData?.totalSticks || 0,
      estimatedCost: dayData?.estimatedCost || 0,
      packsCount: dayData?.packsPurchased.reduce((acc, p) => acc + p.quantity, 0) || 0,
      packCost: dayData?.totalPackSpend || 0,
      hasPacks: (dayData?.packsPurchased.length || 0) > 0,
      exceededLimit: (dayData?.totalSticks || 0) > dailyLimit,
      ratio: dailyLimit > 0 ? (dayData?.totalSticks || 0) / dailyLimit : 0,
    });
  }

  // Current month days
  for (let day = 1; day <= totalDays; day++) {
    const d = new Date(year, month, day);
    const dateStr = getLocalDateKey(d.getTime());
    const dayData = dailyData.get(dateStr);
    cells.push({
      date: d,
      dateStr,
      dayNumber: day,
      isCurrentMonth: true,
      isToday: dateStr === todayKey,
      totalSticks: dayData?.totalSticks || 0,
      estimatedCost: dayData?.estimatedCost || 0,
      packsCount: dayData?.packsPurchased.reduce((acc, p) => acc + p.quantity, 0) || 0,
      packCost: dayData?.totalPackSpend || 0,
      hasPacks: (dayData?.packsPurchased.length || 0) > 0,
      exceededLimit: (dayData?.totalSticks || 0) > dailyLimit,
      ratio: dailyLimit > 0 ? (dayData?.totalSticks || 0) / dailyLimit : 0,
    });
  }

  // Trailing next month padding
  const remaining = (7 - (cells.length % 7)) % 7;
  for (let i = 1; i <= remaining; i++) {
    const d = new Date(year, month + 1, i);
    const dateStr = getLocalDateKey(d.getTime());
    const dayData = dailyData.get(dateStr);
    cells.push({
      date: d,
      dateStr,
      dayNumber: dayNumber(d),
      isCurrentMonth: false,
      isToday: dateStr === todayKey,
      totalSticks: dayData?.totalSticks || 0,
      estimatedCost: dayData?.estimatedCost || 0,
      packsCount: dayData?.packsPurchased.reduce((acc, p) => acc + p.quantity, 0) || 0,
      packCost: dayData?.totalPackSpend || 0,
      hasPacks: (dayData?.packsPurchased.length || 0) > 0,
      exceededLimit: (dayData?.totalSticks || 0) > dailyLimit,
      ratio: dailyLimit > 0 ? (dayData?.totalSticks || 0) / dailyLimit : 0,
    });
  }

  return cells;
}

function dayNumber(d: Date) {
  return d.getDate();
}
