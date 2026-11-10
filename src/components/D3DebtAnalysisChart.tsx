import React, { useMemo, useState, useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { Bakery, DebtRecord } from '../types';
import { Scale, AlertTriangle, CheckCircle2, TrendingUp, Filter, ShieldAlert, ArrowLeft } from 'lucide-react';

interface D3DebtAnalysisChartProps {
  bakeries: Bakery[];
  debts: DebtRecord[];
  onSelectTierFilter?: (minAmount: number, maxAmount: number, tierLabel: string) => void;
}

export interface DebtTier {
  id: 'LOW' | 'MEDIUM' | 'HIGH';
  label: string;
  minAmount: number;
  maxAmount: number;
  color: string;
  hoverColor: string;
  bakeriesCount: number;
  totalDebt: number;
  percentage: number;
  bakeriesList: { bakeryId: string; ownerName: string; debt: number }[];
}

export const D3DebtAnalysisChart: React.FC<D3DebtAnalysisChartProps> = ({
  bakeries,
  debts,
  onSelectTierFilter,
}) => {
  const [activeTierId, setActiveTierId] = useState<string | null>(null);
  const [hoveredSlice, setHoveredSlice] = useState<DebtTier | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // 1. Calculate remaining debt per bakery
  const bakeryDebtMap = useMemo(() => {
    const map: Record<string, number> = {};
    debts.forEach((d) => {
      map[d.bakeryId] = (map[d.bakeryId] || 0) + (d.netRemainingDebt || 0);
    });
    return map;
  }, [debts]);

  // 2. Classify bakeries into the 3 requested value tiers
  const tierData = useMemo(() => {
    let lowCount = 0, lowDebt = 0;
    let medCount = 0, medDebt = 0;
    let highCount = 0, highDebt = 0;

    const lowList: { bakeryId: string; ownerName: string; debt: number }[] = [];
    const medList: { bakeryId: string; ownerName: string; debt: number }[] = [];
    const highList: { bakeryId: string; ownerName: string; debt: number }[] = [];

    bakeries.forEach((b) => {
      const debt = bakeryDebtMap[b.id] || 0;
      if (debt > 0 && debt < 10000) {
        lowCount++;
        lowDebt += debt;
        lowList.push({ bakeryId: b.id, ownerName: b.bakeryOwnerName, debt });
      } else if (debt >= 10000 && debt <= 50000) {
        medCount++;
        medDebt += debt;
        medList.push({ bakeryId: b.id, ownerName: b.bakeryOwnerName, debt });
      } else if (debt > 50000) {
        highCount++;
        highDebt += debt;
        highList.push({ bakeryId: b.id, ownerName: b.bakeryOwnerName, debt });
      }
    });

    const overallDebt = lowDebt + medDebt + highDebt || 1;

    const tiers: DebtTier[] = [
      {
        id: 'LOW',
        label: 'أقل من 10 آلاف ج.م (منخفضة)',
        minAmount: 1,
        maxAmount: 9999,
        color: '#10b981',
        hoverColor: '#34d399',
        bakeriesCount: lowCount,
        totalDebt: lowDebt,
        percentage: Number(((lowDebt / overallDebt) * 100).toFixed(1)),
        bakeriesList: lowList,
      },
      {
        id: 'MEDIUM',
        label: '10,000 - 50,000 ج.م (متوسطة)',
        minAmount: 10000,
        maxAmount: 50000,
        color: '#f59e0b',
        hoverColor: '#fbbf24',
        bakeriesCount: medCount,
        totalDebt: medDebt,
        percentage: Number(((medDebt / overallDebt) * 100).toFixed(1)),
        bakeriesList: medList,
      },
      {
        id: 'HIGH',
        label: 'أكثر من 50,000 ج.م (حادة مرتفعة)',
        minAmount: 50001,
        maxAmount: Infinity,
        color: '#ef4444',
        hoverColor: '#f87171',
        bakeriesCount: highCount,
        totalDebt: highDebt,
        percentage: Number(((highDebt / overallDebt) * 100).toFixed(1)),
        bakeriesList: highList,
      },
    ];

    return tiers;
  }, [bakeries, bakeryDebtMap]);

  const totalOverallDebt = useMemo(() => {
    return tierData.reduce((acc, t) => acc + t.totalDebt, 0);
  }, [tierData]);

  const totalBakeriesWithDebt = useMemo(() => {
    return tierData.reduce((acc, t) => acc + t.bakeriesCount, 0);
  }, [tierData]);

  // 3. Render D3 SVG Donut Chart
  useEffect(() => {
    if (!svgRef.current) return;

    const width = 280;
    const height = 280;
    const radius = Math.min(width, height) / 2;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const container = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${width / 2}, ${height / 2})`);

    // D3 Pie Generator
    const pie = d3
      .pie<DebtTier>()
      .value((d) => d.totalDebt)
      .sort(null);

    // D3 Arc Generators
    const arc = d3
      .arc<d3.PieArcDatum<DebtTier>>()
      .innerRadius(radius * 0.58)
      .outerRadius(radius * 0.88)
      .cornerRadius(6);

    const hoverArc = d3
      .arc<d3.PieArcDatum<DebtTier>>()
      .innerRadius(radius * 0.55)
      .outerRadius(radius * 0.94)
      .cornerRadius(8);

    const arcs = pie(tierData.filter((t) => t.totalDebt > 0));

    // Render Slices
    const path = container
      .selectAll('path')
      .data(arcs)
      .enter()
      .append('path')
      .attr('d', arc)
      .attr('fill', (d) => d.data.color)
      .attr('stroke', '#090d16')
      .attr('stroke-width', '2px')
      .style('cursor', 'pointer')
      .style('transition', 'all 0.3s ease');

    path
      .on('mouseover', function (event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('d', hoverArc(d) || '')
          .attr('fill', d.data.hoverColor);
        setHoveredSlice(d.data);
      })
      .on('mouseout', function (event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('d', arc(d) || '')
          .attr('fill', d.data.color);
        setHoveredSlice(null);
      })
      .on('click', function (event, d) {
        setActiveTierId(d.data.id);
        if (onSelectTierFilter) {
          onSelectTierFilter(d.data.minAmount, d.data.maxAmount, d.data.label);
        }
      });

    // Outer Glow / Ring Overlay
    container
      .append('circle')
      .attr('r', radius * 0.57)
      .attr('fill', 'none')
      .attr('stroke', 'rgba(255,255,255,0.08)')
      .attr('stroke-width', 1);

  }, [tierData, onSelectTierFilter]);

  return (
    <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-black border-2 border-slate-800 rounded-2xl p-4 shadow-2xl space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-amber-500/20 text-amber-300 rounded-xl border border-amber-400/40 shadow-inner">
            <Scale className="w-5 h-5 icon-animated" />
          </div>
          <div>
            <h3 className="text-sm font-black text-amber-300 flex items-center gap-2">
              <span>قسم تحليل المديونيات حسب فئات القيمة (D3.js Donut Chart)</span>
              <span className="text-[10px] bg-red-600 text-white font-black px-2 py-0.5 rounded-full border border-amber-300 animate-pulse">
                قرارات التحصيل الفوري ⚡
              </span>
            </h3>
            <p className="text-[11px] text-slate-400 font-bold">
              توزيع المديونيات المتبقية على المخابز (أقل من 10 آلاف، 10-50 ألف، أكثر من 50 ألف) اتخاذ قرارات التحصيل
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-black">
          <span className="bg-slate-900 text-slate-300 px-3 py-1 rounded-xl border border-slate-800">
            إجمالي المديونيات: <strong className="text-rose-400">{totalOverallDebt.toLocaleString()} ج.م</strong>
          </span>
        </div>
      </div>

      {/* Main Grid: D3 Donut Chart Left/Center, Breakdown Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
        {/* D3 Donut Visualization Container (5 cols) */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center relative p-3 bg-slate-900/60 rounded-2xl border border-slate-800 shadow-inner">
          <div className="relative flex items-center justify-center">
            <svg ref={svgRef} className="drop-shadow-2xl" />

            {/* Donut Center Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none p-2">
              <span className="text-[10px] font-bold text-slate-400 block">
                {hoveredSlice ? hoveredSlice.label : 'إجمالي المديونية'}
              </span>
              <span className="text-base font-black text-amber-300 num-enlarged my-0.5">
                {(hoveredSlice ? hoveredSlice.totalDebt : totalOverallDebt).toLocaleString()} ج.م
              </span>
              <span className="text-[10px] font-black text-emerald-400 bg-slate-950/80 px-2 py-0.5 rounded-full border border-slate-800">
                {hoveredSlice ? `${hoveredSlice.percentage}% من الكلي` : `${totalBakeriesWithDebt} مخبز عليه مديونية`}
              </span>
            </div>
          </div>

          <p className="text-[10px] text-slate-400 font-bold mt-2 text-center">
            💡 مرر الفأرة فوق شرائح الرسم البياني أو انقر للتصفية السريعة
          </p>
        </div>

        {/* Breakdown Cards Grid (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          {tierData.map((tier) => {
            const isSelected = activeTierId === tier.id;
            return (
              <div
                key={tier.id}
                onClick={() => {
                  setActiveTierId(tier.id);
                  if (onSelectTierFilter) {
                    onSelectTierFilter(tier.minAmount, tier.maxAmount, tier.label);
                  }
                }}
                className={`p-3.5 rounded-2xl border transition-all duration-300 cursor-pointer relative overflow-hidden ${
                  isSelected
                    ? 'bg-slate-900 border-amber-400 shadow-xl ring-2 ring-amber-500/30 scale-[1.01]'
                    : 'bg-slate-950 hover:bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Accent Color Bar */}
                <div
                  className="absolute top-0 right-0 bottom-0 w-1.5"
                  style={{ backgroundColor: tier.color }}
                />

                <div className="pr-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: tier.color }}
                    />
                    <h4 className="text-xs font-black text-white">{tier.label}</h4>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-slate-300">
                      نسبة الشريحة: <strong className="text-amber-300 font-mono">{tier.percentage}%</strong>
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveTierId(tier.id);
                        if (onSelectTierFilter) {
                          onSelectTierFilter(tier.minAmount, tier.maxAmount, tier.label);
                        }
                      }}
                      className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-400/50 rounded-lg text-[10px] font-black transition flex items-center gap-1 cursor-pointer"
                    >
                      <Filter className="w-3 h-3" />
                      <span>تصفية الشريحة ({tier.bakeriesCount})</span>
                    </button>
                  </div>
                </div>

                <div className="pr-2 mt-2.5 grid grid-cols-3 gap-2 text-center text-xs font-black">
                  <div className="bg-black/50 p-2 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block mb-0.5">عدد المخابز</span>
                    <span className="text-amber-300 block">{tier.bakeriesCount} مخبز</span>
                  </div>

                  <div className="bg-black/50 p-2 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block mb-0.5">إجمالي المديونية</span>
                    <span className="text-rose-400 block num-enlarged">
                      {tier.totalDebt.toLocaleString()} ج.م
                    </span>
                  </div>

                  <div className="bg-black/50 p-2 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block mb-0.5">متوسط المخبز</span>
                    <span className="text-cyan-300 block num-enlarged">
                      {tier.bakeriesCount > 0
                        ? Math.round(tier.totalDebt / tier.bakeriesCount).toLocaleString()
                        : 0}{' '}
                      ج.م
                    </span>
                  </div>
                </div>

                {/* Top 2 Bakeries Preview in this Tier */}
                {tier.bakeriesList.length > 0 && (
                  <div className="pr-2 mt-2 pt-2 border-t border-slate-800/80 text-[10px] font-bold text-slate-400 flex items-center justify-between">
                    <span>أبرز أصحاب المخابز بالشريحة:</span>
                    <span className="text-slate-200">
                      {tier.bakeriesList.slice(0, 2).map((b) => b.ownerName).join(' ، ')}
                      {tier.bakeriesList.length > 2 ? ` (+${tier.bakeriesList.length - 2} آخرين)` : ''}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
