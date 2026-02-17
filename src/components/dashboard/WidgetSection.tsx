'use client';

import React, { useState, useCallback } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragStartEvent,
    UniqueIdentifier,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    rectSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { WidgetDefinition, WidgetAction } from '@/types/widget';
import { useWidgetState } from '@/hooks/useWidgetState';
import { useWidgetRegistry } from '@/hooks/useWidgetRegistry';
import WidgetCard from './WidgetCard';
import WidgetDrawer from './WidgetDrawer';
import QuickActionModal from './QuickActionModal';

// ─── Sortable Widget Wrapper ───
function SortableWidgetItem({
    widget,
    onAction,
    isDraggingThis,
}: {
    widget: WidgetDefinition;
    onAction: (action: WidgetAction) => void;
    isDraggingThis: boolean;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: widget.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
    };

    return (
        <div ref={setNodeRef} style={style}>
            <div className="relative group">
                {/* Drag Handle */}
                <button
                    {...attributes}
                    {...listeners}
                    className="absolute -top-2 -left-2 z-10 w-7 h-7 rounded-lg bg-white/[0.05] border border-white/[0.05] flex items-center justify-center text-white/20 hover:text-white/60 hover:bg-white/[0.1] transition-all opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing"
                    aria-label="위젯 순서 변경"
                >
                    <span className="text-[10px]">⠿</span>
                </button>
                <WidgetCard definition={widget} onAction={onAction} isDragging={isDraggingThis} />
            </div>
        </div>
    );
}

// ─── Main WidgetSection ───
export default function WidgetSection() {
    const { modals: allModals } = useWidgetRegistry();

    const {
        activeWidgetDefinitions,
        availableWidgets,
        reorderWidgets,
        addWidget,
        removeWidget,
        resetToDefault,
        state,
    } = useWidgetState();

    const [drawerOpen, setDrawerOpen] = useState(false);
    const [activeModal, setActiveModal] = useState<string | null>(null);
    const [activeDragId, setActiveDragId] = useState<UniqueIdentifier | null>(null);
    const [showTrash, setShowTrash] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const handleDragStart = (event: DragStartEvent) => {
        setActiveDragId(event.active.id);
        setShowTrash(true);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveDragId(null);
        setShowTrash(false);

        if (!over) return;

        // Trash Zone에 드롭
        if (over.id === 'trash-zone') {
            removeWidget(String(active.id));
            return;
        }

        // 순서 변경
        if (active.id !== over.id) {
            const oldIndex = state.activeWidgets.indexOf(String(active.id));
            const newIndex = state.activeWidgets.indexOf(String(over.id));
            if (oldIndex !== -1 && newIndex !== -1) {
                reorderWidgets(arrayMove(state.activeWidgets, oldIndex, newIndex));
            }
        }
    };

    const handleAction = useCallback((action: WidgetAction) => {
        if (action.type === 'modal' && action.modalId) {
            setActiveModal(action.modalId);
        }
    }, []);

    const handleModalSuccess = useCallback((_refreshWidgets: string[]) => {
        setActiveModal(null);
    }, []);

    const currentModal = activeModal
        ? allModals.find(m => m.id === activeModal)
        : null;

    return (
        <div className="space-y-6">
            {/* Section Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-2xl font-black italic tracking-tighter uppercase">Quick Actions</h3>
                    <p className="text-[9px] text-white/20 uppercase tracking-widest mt-1">
                        Drag to reorder · Click + to add widgets
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={resetToDefault}
                        className="px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest text-white/30 bg-white/[0.03] border border-white/[0.05] hover:text-white/50 hover:bg-white/[0.05] transition-all"
                    >
                        Reset
                    </button>
                    <button
                        onClick={() => setDrawerOpen(true)}
                        className="px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest text-white transition-all"
                        style={{
                            background: 'var(--primary)',
                            boxShadow: '0 0 20px var(--primary-glow)',
                        }}
                    >
                        + 위젯 추가
                    </button>
                </div>
            </div>

            {/* DnD Widget Grid */}
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <SortableContext items={state.activeWidgets} strategy={rectSortingStrategy}>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                        {activeWidgetDefinitions.map(widget => (
                            <SortableWidgetItem
                                key={widget.id}
                                widget={widget}
                                onAction={handleAction}
                                isDraggingThis={activeDragId === widget.id}
                            />
                        ))}
                    </div>
                </SortableContext>

                {/* Empty State */}
                {activeWidgetDefinitions.length === 0 && (
                    <div className="py-16 text-center">
                        <p className="text-4xl opacity-20 mb-4">🧩</p>
                        <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">No Widgets</p>
                        <p className="text-[9px] text-white/10 mt-2">위젯 추가 버튼을 눌러 위젯을 추가하세요</p>
                    </div>
                )}

                {/* Trash Zone (드래그 시에만 표시) */}
                {showTrash && <TrashZone />}
            </DndContext>

            {/* Drawer */}
            <WidgetDrawer
                isOpen={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                availableWidgets={availableWidgets}
                onAddWidget={addWidget}
            />

            {/* Modal */}
            {currentModal && (
                <QuickActionModal
                    modal={currentModal}
                    isOpen={!!activeModal}
                    onClose={() => setActiveModal(null)}
                    onSuccess={handleModalSuccess}
                />
            )}
        </div>
    );
}

// ─── Trash Zone ───
function TrashZone() {
    const { setNodeRef, isOver } = useSortable({ id: 'trash-zone' });

    return (
        <div
            ref={setNodeRef}
            className={`
        mt-8 py-6 rounded-2xl border-2 border-dashed text-center transition-all duration-300
        ${isOver
                    ? 'border-red-500/50 bg-red-500/10 scale-[1.02]'
                    : 'border-white/10 bg-white/[0.02]'
                }
      `}
        >
            <p className={`text-[10px] font-black uppercase tracking-[0.3em] ${isOver ? 'text-red-400' : 'text-white/20'}`}>
                {isOver ? '🗑️ Drop to Remove' : '🗑️ Drag Here to Remove Widget'}
            </p>
        </div>
    );
}
