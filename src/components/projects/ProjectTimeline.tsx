import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Task, Milestone } from '../../../shared/types.js';

interface ProjectTimelineProps {
  tasks: Task[];
  milestones: Milestone[];
}

export function ProjectTimeline({ tasks, milestones }: ProjectTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!containerRef.current || !svgRef.current) return;

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      drawChart();
    });
    
    resizeObserver.observe(containerRef.current);
    
    const drawChart = () => {
      if (!containerRef.current || !svgRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = Math.max(400, (tasks.length + milestones.length) * 40 + 100);

      const margin = { top: 30, right: 30, bottom: 30, left: 200 };
      const innerWidth = Math.max(600, width - margin.left - margin.right);
      const innerHeight = height - margin.top - margin.bottom;

      const svg = d3.select(svgRef.current);
      svg.selectAll('*').remove();

      svg.attr('width', innerWidth + margin.left + margin.right).attr('height', height);

      const g = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      // Prepare data
      const now = new Date();
      
      // Convert milestones
      const milestoneData = milestones.map((m) => ({
        id: m.id,
        name: m.title,
        type: 'milestone',
        start: new Date(m.createdAt),
        end: m.dueDate ? new Date(m.dueDate) : new Date(now.getTime() + 7 * 86400000),
        status: m.status,
      }));

      // Convert tasks
      const taskData = tasks.map((t) => ({
        id: t.id,
        name: t.title,
        type: 'task',
        start: new Date(t.createdAt),
        end: t.dueDate ? new Date(t.dueDate) : new Date(now.getTime() + 7 * 86400000),
        status: t.status,
      }));

      const data = [...milestoneData, ...taskData].sort((a, b) => a.start.getTime() - b.start.getTime());

      if (data.length === 0) {
        g.append('text')
          .attr('x', innerWidth / 2)
          .attr('y', innerHeight / 2)
          .attr('text-anchor', 'middle')
          .attr('fill', '#94a3b8')
          .text('No timeline data available');
        return;
      }

      const minDate = d3.min(data, (d) => d.start) || now;
      const maxDate = d3.max(data, (d) => d.end) || new Date(now.getTime() + 30 * 86400000);

      // Add some padding to dates
      const paddedMinDate = new Date(minDate.getTime() - 3 * 86400000);
      const paddedMaxDate = new Date(maxDate.getTime() + 3 * 86400000);

      const xScale = d3
        .scaleTime()
        .domain([paddedMinDate, paddedMaxDate])
        .range([0, innerWidth]);

      const yScale = d3
        .scaleBand()
        .domain(data.map((d) => d.id))
        .range([0, innerHeight])
        .padding(0.3);

      // Axes
      const xAxis = d3.axisTop(xScale).tickFormat(d3.timeFormat('%b %d') as any);
      const yAxis = d3.axisLeft(yScale).tickFormat((d) => {
        const item = data.find((i) => i.id === d);
        let name = item ? item.name : d;
        if (name.length > 25) name = name.substring(0, 22) + '...';
        return name;
      });

      g.append('g')
        .attr('class', 'x-axis')
        .call(xAxis)
        .selectAll('text')
        .attr('fill', '#94a3b8')
        .attr('font-size', '12px');

      g.select('.x-axis').selectAll('path, line').attr('stroke', '#1e293b');

      g.append('g')
        .attr('class', 'y-axis')
        .call(yAxis)
        .selectAll('text')
        .attr('fill', (d) => {
          const item = data.find((i) => i.id === d);
          return item?.type === 'milestone' ? '#c084fc' : '#94a3b8';
        })
        .attr('font-size', '12px')
        .attr('font-weight', (d) => {
          const item = data.find((i) => i.id === d);
          return item?.type === 'milestone' ? 'bold' : 'normal';
        });

      g.select('.y-axis').selectAll('path, line').attr('stroke', '#1e293b');

      // Add grid lines
      const xGrid = d3.axisBottom(xScale).tickSize(innerHeight).tickFormat(() => '');
      g.append('g')
        .attr('class', 'x-grid')
        .call(xGrid)
        .selectAll('path, line')
        .attr('stroke', '#1e293b')
        .attr('stroke-dasharray', '3,3')
        .attr('opacity', 0.5);

      // Today line
      g.append('line')
        .attr('x1', xScale(now))
        .attr('x2', xScale(now))
        .attr('y1', 0)
        .attr('y2', innerHeight)
        .attr('stroke', '#ef4444')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '4,4');

      // Gradients
      const defs = svg.append('defs');
      const gradient = defs
        .append('linearGradient')
        .attr('id', 'milestone-gradient')
        .attr('x1', '0%')
        .attr('y1', '0%')
        .attr('x2', '100%')
        .attr('y2', '0%');
      
      gradient.append('stop').attr('offset', '0%').attr('stop-color', '#9333ea');
      gradient.append('stop').attr('offset', '100%').attr('stop-color', '#c084fc');

      // Bars
      g.selectAll('.bar')
        .data(data)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x', (d) => Math.max(0, xScale(d.start)))
        .attr('y', (d) => yScale(d.id) || 0)
        .attr('width', (d) => Math.max(4, xScale(d.end) - xScale(d.start)))
        .attr('height', yScale.bandwidth())
        .attr('rx', 4)
        .attr('fill', (d) => {
          if (d.type === 'milestone') return 'url(#milestone-gradient)';
          if (d.status === 'complete') return '#10b981';
          if (d.status === 'in_progress') return '#3b82f6';
          return '#475569';
        });

      // Label on bars
      g.selectAll('.bar-label')
        .data(data)
        .enter()
        .append('text')
        .attr('class', 'bar-label')
        .attr('x', (d) => Math.max(0, xScale(d.start)) + 8)
        .attr('y', (d) => (yScale(d.id) || 0) + yScale.bandwidth() / 2)
        .attr('dy', '0.35em')
        .attr('fill', '#ffffff')
        .attr('font-size', '10px')
        .text((d) => (d.status === 'complete' ? '✓' : ''));
    };

    drawChart();

    return () => resizeObserver.disconnect();
  }, [tasks, milestones]);

  return (
    <div className="bg-[#0b0d1a] border border-[#1c1f38] rounded-xl overflow-hidden p-6 w-full h-full flex flex-col">
      <h3 className="text-lg font-bold text-slate-100 mb-6 font-display">Timeline</h3>
      <div ref={containerRef} className="w-full flex-1 overflow-x-auto overflow-y-auto min-h-[400px]">
        <svg ref={svgRef} className="min-w-full"></svg>
      </div>
      
      <div className="mt-6 flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-gradient-to-r from-purple-600 to-purple-400" />
          <span>Milestone</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-emerald-500" />
          <span>Completed Task</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-blue-500" />
          <span>In Progress Task</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-slate-600" />
          <span>Pending Task</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-0 border-t-2 border-red-500 border-dashed" />
          <span>Today</span>
        </div>
      </div>
    </div>
  );
}
