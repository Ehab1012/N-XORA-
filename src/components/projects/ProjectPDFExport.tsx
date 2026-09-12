import React, { useEffect, useRef } from 'react';
import { Project, Task, Milestone } from '../../../shared/types.js';
import { ProjectTimeline } from './ProjectTimeline.js';
import { StatusBadge } from '../common/Badges.js';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface ProjectPDFExportProps {
  project: Project;
  tasks: Task[];
  milestones: Milestone[];
  onComplete: () => void;
}

export function ProjectPDFExport({ project, tasks, milestones, onComplete }: ProjectPDFExportProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;

    const generatePDF = async () => {
      // Small delay to ensure D3 renders the SVG and layout is complete
      await new Promise(r => setTimeout(r, 500));

      if (!containerRef.current || !isMounted) return;

      try {
        const canvas = await html2canvas(containerRef.current, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#090a14',
          logging: false
        });

        const data = canvas.toDataURL('image/png');
        
        // A4 proportions
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'px',
          format: [canvas.width, canvas.height],
        });

        pdf.addImage(data, 'PNG', 0, 0, canvas.width, canvas.height);
        pdf.save(`${project.title.replace(/\s+/g, '_')}_Summary.pdf`);
      } catch (err) {
        console.error('Error generating PDF:', err);
      } finally {
        if (isMounted) onComplete();
      }
    };

    generatePDF();

    return () => {
      isMounted = false;
    };
  }, [project, onComplete]);

  return (
    <div 
      style={{ position: 'fixed', top: '-10000px', left: 0, width: '900px' }}
      className="pointer-events-none"
    >
      <div 
        ref={containerRef} 
        id="pdf-export-container"
        className="bg-[#090a14] text-white p-10 w-[900px] flex flex-col gap-8"
        style={{ minHeight: '1200px' }}
      >
        <div className="flex flex-col gap-4 border-b border-[#1c1f38] pb-6">
          <div className="flex justify-between items-start">
            <h1 className="text-3xl font-sharp font-bold text-slate-100">{project.title}</h1>
            <StatusBadge status={project.status} />
          </div>
          <p className="text-slate-400 text-sm leading-relaxed">{project.description}</p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-[#0b0d1a] border border-[#1c1f38]">
            <div className="text-xs text-slate-500 uppercase font-mono mb-1">Total Tasks</div>
            <div className="text-2xl font-bold">{tasks.length}</div>
          </div>
          <div className="p-4 rounded-xl bg-[#0b0d1a] border border-[#1c1f38]">
            <div className="text-xs text-slate-500 uppercase font-mono mb-1">Completed</div>
            <div className="text-2xl font-bold text-emerald-400">
              {tasks.filter(t => t.status === 'complete').length}
            </div>
          </div>
          <div className="p-4 rounded-xl bg-[#0b0d1a] border border-[#1c1f38]">
            <div className="text-xs text-slate-500 uppercase font-mono mb-1">Milestones</div>
            <div className="text-2xl font-bold text-purple-400">{milestones.length}</div>
          </div>
        </div>

        <div className="flex-1 w-full mt-4 h-[600px]">
          <ProjectTimeline tasks={tasks} milestones={milestones} />
        </div>
        
        <div className="mt-auto pt-8 border-t border-[#1c1f38] text-center text-slate-500 text-xs font-mono">
          Generated on {new Date().toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}
