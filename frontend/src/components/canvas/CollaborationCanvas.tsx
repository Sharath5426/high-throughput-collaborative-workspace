import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useBoardStore } from '../../store/boardStore';
import { useCanvasStore } from '../../store/canvasStore';
import { CanvasElement } from '../../types';
import { Plus, StickyNote, Square, Type, Pencil, Trash2, RotateCw } from 'lucide-react';

function getElementStyle(element: CanvasElement): React.CSSProperties {
  return {
    left: `${element.x}px`,
    top: `${element.y}px`,
    width: `${element.width}px`,
    height: `${element.height}px`,
    transform: `rotate(${element.rotation || 0}deg)`,
    ...((element.style as Record<string, any>) || {}),
  };
}

export function CollaborationCanvas() {
  const board = useBoardStore((state) => state.board);
  const { canvasElements, isCanvasLoading, fetchCanvasElements, createCanvasElement, updateCanvasElement, deleteCanvasElement, selectedElementId, setSelectedElementId } = useCanvasStore();
  const [dragState, setDragState] = useState<{ id: string; startX: number; startY: number; originX: number; originY: number } | null>(null);
  const [localPreview, setLocalPreview] = useState<Record<string, { x: number; y: number }>>({});
  const canvasRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (board?.id) {
      fetchCanvasElements(board.id);
    }
  }, [board?.id, fetchCanvasElements]);

  const selectedElement = useMemo(() => canvasElements.find((element) => element.id === selectedElementId) || null, [canvasElements, selectedElementId]);

  const addElement = async (type: CanvasElement['type']) => {
    if (!board?.id) return;
    const next = {
      type,
      x: 80 + Math.random() * 150,
      y: 70 + Math.random() * 120,
      width: type === 'text' ? 200 : type === 'shape' ? 180 : 220,
      height: type === 'text' ? 90 : type === 'shape' ? 140 : 150,
      rotation: 0,
      content: type === 'text' ? 'New board note' : type === 'sticky' ? 'Shared idea' : type === 'shape' ? 'Shape' : 'Sketch',
      style:
        type === 'sticky'
          ? { backgroundColor: '#fbbf24', color: '#111827', borderColor: '#f59e0b' }
          : type === 'shape'
            ? { backgroundColor: '#60a5fa', borderColor: '#2563eb', borderRadius: '18px' }
            : type === 'text'
              ? { backgroundColor: '#0f172a', color: '#e2e8f0', borderColor: '#475569' }
              : { backgroundColor: '#1f2937', borderColor: '#38bdf8', borderRadius: '12px' },
      points: type === 'draw' ? [20, 20, 70, 55, 120, 25, 160, 90] : [],
    } as Partial<CanvasElement>;

    await createCanvasElement(board.id, next);
  };

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>, element: CanvasElement) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    setDragState({
      id: element.id,
      startX: event.clientX,
      startY: event.clientY,
      originX: element.x,
      originY: element.y,
    });
    setSelectedElementId(element.id);
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!dragState || !canvasRef.current) return;
    const dx = event.clientX - dragState.startX;
    const dy = event.clientY - dragState.startY;
    const nextX = Math.max(12, dragState.originX + dx / 1.15);
    const nextY = Math.max(12, dragState.originY + dy / 1.15);
    setLocalPreview((prev) => ({ ...prev, [dragState.id]: { x: nextX, y: nextY } }));
  };

  const handleMouseUp = async () => {
    if (!dragState) return;
    const currentElement = canvasElements.find((item) => item.id === dragState.id);
    const preview = localPreview[dragState.id];
    if (currentElement && preview) {
      await updateCanvasElement(board!.id, dragState.id, { x: preview.x, y: preview.y }, currentElement.version);
    }
    setLocalPreview((prev) => {
      const next = { ...prev };
      delete next[dragState.id];
      return next;
    });
    setDragState(null);
  };

  const handleResize = async (direction: 'expand' | 'shrink') => {
    if (!selectedElement || !board) return;
    const delta = direction === 'expand' ? 20 : -20;
    await updateCanvasElement(
      board.id,
      selectedElement.id,
      {
        width: Math.max(80, selectedElement.width + delta),
        height: Math.max(80, selectedElement.height + delta),
      },
      selectedElement.version
    );
  };

  if (!board) return null;

  return (
    <div className="flex-1 flex flex-col border-t border-slate-800 bg-slate-950/70">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-800 bg-slate-900/70">
        <div>
          <h3 className="text-sm font-semibold text-slate-200">Collaboration Canvas</h3>
          <p className="text-xs text-slate-400">Live multi-user board objects</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => addElement('sticky')} className="inline-flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-300 hover:bg-amber-500/20"><StickyNote className="w-3.5 h-3.5" /> Sticky</button>
          <button onClick={() => addElement('text')} className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-300 hover:bg-cyan-500/20"><Type className="w-3.5 h-3.5" /> Text</button>
          <button onClick={() => addElement('shape')} className="inline-flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-300 hover:bg-blue-500/20"><Square className="w-3.5 h-3.5" /> Shape</button>
          <button onClick={() => addElement('draw')} className="inline-flex items-center gap-2 rounded-lg border border-fuchsia-500/30 bg-fuchsia-500/10 px-3 py-1.5 text-xs font-medium text-fuchsia-300 hover:bg-fuchsia-500/20"><Pencil className="w-3.5 h-3.5" /> Draw</button>
        </div>
      </div>

      {isCanvasLoading ? (
        <div className="flex flex-1 items-center justify-center text-sm text-slate-400">Loading collaboration canvas…</div>
      ) : (
        <div
          ref={canvasRef}
          className="relative flex-1 overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.08),transparent_48%),linear-gradient(180deg,#0f172a_0%,#020617_100%)]"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {canvasElements.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">No canvas elements yet. Add a sticky note, shape, or text card.</div>
          )}

          {canvasElements.map((element) => {
            const preview = localPreview[element.id];
            const style = getElementStyle({ ...element, x: preview?.x ?? element.x, y: preview?.y ?? element.y });
            const isSelected = selectedElementId === element.id;

            return (
              <div
                key={element.id}
                className={`absolute border shadow-lg transition ${isSelected ? 'ring-2 ring-blue-400' : ''}`}
                style={{
                  ...style,
                  cursor: 'grab',
                  borderStyle: 'solid',
                  borderWidth: '1px',
                  borderColor: isSelected ? '#60a5fa' : 'rgba(148,163,184,0.4)',
                  background: element.type === 'sticky' ? '#fbbf24' : element.type === 'shape' ? '#60a5fa' : element.type === 'text' ? '#0f172a' : '#1e293b',
                  color: element.type === 'text' ? '#e2e8f0' : '#111827',
                  borderRadius: element.type === 'shape' ? '18px' : '12px',
                  userSelect: 'none',
                }}
                onMouseDown={(event) => handleMouseDown(event, element)}
                onDoubleClick={() => setSelectedElementId(element.id)}
              >
                {element.type === 'draw' && element.points && (
                  <svg viewBox="0 0 200 160" className="w-full h-full">
                    <polyline fill="none" stroke="#7dd3fc" strokeWidth="4" points={element.points.join(',')} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}

                {element.type !== 'draw' && (
                  <div className="h-full w-full p-3 overflow-hidden text-sm leading-relaxed">
                    {element.type === 'sticky' ? element.content || 'Shared idea' : element.type === 'text' ? element.content || 'Text note' : element.content || 'Shape'}
                  </div>
                )}

                {isSelected && (
                  <div className="absolute -top-8 left-0 flex gap-1">
                    <button onClick={() => handleResize('expand')} className="rounded bg-slate-800 p-1 text-[10px] text-slate-200 border border-slate-700"><RotateCw className="w-3 h-3" /></button>
                    <button onClick={() => handleResize('shrink')} className="rounded bg-slate-800 p-1 text-[10px] text-slate-200 border border-slate-700"><RotateCw className="w-3 h-3 rotate-180" /></button>
                    <button onClick={() => deleteCanvasElement(board.id, element.id)} className="rounded bg-rose-500/20 p-1 text-[10px] text-rose-300 border border-rose-400/40"><Trash2 className="w-3 h-3" /></button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between border-t border-slate-800 bg-slate-900/70 px-4 py-2 text-[11px] text-slate-400">
        <span>{canvasElements.length} canvas objects</span>
        <span>{selectedElement ? `Selected: ${selectedElement.type}` : 'No selection'}</span>
      </div>
    </div>
  );
}
