import { useEffect, useState } from 'react';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAuth } from '../auth/AuthContext';
import { Avatar } from './avatar';
import type { CardPatch } from './boardApi';
import { DatePicker } from './DatePicker';
import { formatCommentTime } from './dates';
import { colorOf } from './labelColors';
import type { Card, ChecklistItem, Label, Member } from './types';

interface CardModalProps {
  card: Card;
  labels: Label[];
  members: Member[];
  onClose: () => void;
  onPatch: (patch: CardPatch) => void;
  onToggleLabel: (labelId: string, active: boolean) => void;
  onSetAssignee: (userId: string | null) => void;
  onManageLabels: () => void;
  onAddChecklistItem: (text: string) => void;
  onToggleChecklistItem: (itemId: string, done: boolean) => void;
  onDeleteChecklistItem: (itemId: string) => void;
  onMoveChecklistItem: (itemId: string, overItemId: string) => void;
  onAddComment: (text: string) => void;
  onDeleteComment: (commentId: string) => void;
  onToggleDone: (done: boolean) => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onDelete: () => void;
}

const sectionLabel = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase' as const,
  letterSpacing: '.06em',
  color: 'var(--color-text-muted-soft)',
  marginBottom: 8,
};

export function CardModal({
  card,
  labels,
  members,
  onClose,
  onPatch,
  onToggleLabel,
  onSetAssignee,
  onManageLabels,
  onAddChecklistItem,
  onToggleChecklistItem,
  onDeleteChecklistItem,
  onMoveChecklistItem,
  onAddComment,
  onDeleteComment,
  onToggleDone,
  onDuplicate,
  onArchive,
  onDelete,
}: CardModalProps) {
  const { user } = useAuth();
  // Заголовок/описание/срок правим локально и сохраняем по кнопке.
  // Метку/ответственного/чек-лист меняем сразу по клику — отдельными запросами.
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description);
  const [dueDate, setDueDate] = useState<string | null>(card.dueDate);
  const [dueTime, setDueTime] = useState<string | null>(card.dueTime);
  const [newItem, setNewItem] = useState('');
  const [commentDraft, setCommentDraft] = useState('');

  function submitComment() {
    const text = commentDraft.trim();
    if (!text) return;
    onAddComment(text);
    setCommentDraft('');
  }

  function addMention(handle: string) {
    setCommentDraft((current) => {
      const separator = current && !/\s$/.test(current) ? ' ' : '';
      return `${current}${separator}@${handle} `;
    });
  }

  const doneCount = card.checklist.filter((i) => i.done).length;
  const progress = card.checklist.length
    ? Math.round((doneCount / card.checklist.length) * 100)
    : 0;

  const checklistSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  function onChecklistDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) onMoveChecklistItem(String(active.id), String(over.id));
  }

  function addItem() {
    const text = newItem.trim();
    if (!text) return;
    onAddChecklistItem(text);
    setNewItem('');
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const trimmedTitle = title.trim();

  function save() {
    const patch: CardPatch = {};
    if (trimmedTitle && trimmedTitle !== card.title) patch.title = trimmedTitle;
    if (description !== card.description) patch.description = description;
    if (dueDate !== card.dueDate) patch.dueDate = dueDate;
    // Время без даты не имеет смысла — при отсутствии даты обнуляем.
    const effectiveTime = dueDate ? dueTime : null;
    if (effectiveTime !== card.dueTime) patch.dueTime = effectiveTime;
    if (Object.keys(patch).length > 0) onPatch(patch);
    onClose();
  }

  return (
    <div
      onClick={onClose}
      className="modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--overlay-modal)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '48px 20px',
        zIndex: 100,
        overflowY: 'auto',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 640,
          maxWidth: '100%',
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-modal)',
          boxShadow: 'var(--shadow-modal)',
          padding: 24,
        }}
      >
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 20 }}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{
              flex: 1,
              border: '1px solid transparent',
              borderRadius: 8,
              padding: '6px 8px',
              margin: '-6px -8px',
              font: 'var(--text-section-title)',
              color: 'var(--color-text)',
              outline: 'none',
              background: 'transparent',
            }}
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            style={{
              width: 34,
              height: 34,
              flexShrink: 0,
              border: 'none',
              borderRadius: 9,
              background: 'var(--color-border-soft)',
              color: 'var(--color-text-secondary)',
              fontSize: 18,
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 8 }}>
          <div style={{ ...sectionLabel, marginBottom: 0, flex: 1 }}>Метки</div>
          <button
            type="button"
            onClick={onManageLabels}
            style={{
              border: 'none',
              background: 'none',
              padding: 0,
              color: 'var(--color-accent)',
              font: 'var(--text-secondary)',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Управление метками
          </button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
          {labels.length === 0 ? (
            <span style={{ color: 'var(--color-text-muted)', font: 'var(--text-secondary)' }}>
              Пока нет меток — создайте в «Управлении метками».
            </span>
          ) : (
            labels.map((label) => {
              const c = colorOf(label.color);
              const active = card.labels.some((l) => l.id === label.id);
              return (
                <button
                  key={label.id}
                  type="button"
                  onClick={() => onToggleLabel(label.id, !active)}
                  style={{
                    fontSize: 11.5,
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-chip)',
                    border: active ? '1px solid transparent' : '1px solid var(--color-border)',
                    background: active ? c.bg : 'transparent',
                    color: active ? c.fg : 'var(--color-text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  {label.name}
                </button>
              );
            })
          )}
        </div>

        <div style={sectionLabel}>Ответственный</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
          {members.map((member) => {
            const active = card.assignee?.id === member.id;
            return (
              <button
                key={member.id}
                type="button"
                onClick={() => onSetAssignee(active ? null : member.id)}
                title={member.name}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7,
                  height: 32,
                  padding: '0 10px 0 4px',
                  borderRadius: 99,
                  border: active
                    ? '1px solid var(--color-accent)'
                    : '1px solid var(--color-border)',
                  background: active ? 'rgba(91,91,214,.08)' : 'transparent',
                  cursor: 'pointer',
                }}
              >
                <Avatar id={member.id} name={member.name} avatar={member.avatar} size={24} />
                <span style={{ font: 'var(--text-ui)', color: 'var(--color-text)' }}>
                  {member.name}
                </span>
              </button>
            );
          })}
        </div>

        <div style={sectionLabel}>Срок</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <DatePicker
            value={dueDate}
            onChange={(next) => {
              setDueDate(next);
              if (!next) setDueTime(null);
            }}
          />
          {dueDate && (
            <input
              type="time"
              value={dueTime ?? ''}
              onChange={(e) => setDueTime(e.target.value || null)}
              aria-label="Время срока"
              style={{
                height: 36,
                border: '1px solid var(--color-border)',
                borderRadius: 9,
                padding: '0 10px',
                font: 'var(--text-ui)',
                color: 'var(--color-text)',
                background: 'var(--color-surface)',
                outline: 'none',
              }}
            />
          )}
        </div>

        <div style={sectionLabel}>Описание</div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Добавьте детали…"
          rows={5}
          style={{
            width: '100%',
            resize: 'vertical',
            border: '1px solid var(--color-border)',
            borderRadius: 10,
            padding: '10px 12px',
            font: 'var(--text-ui)',
            fontWeight: 500,
            color: 'var(--color-text)',
            outline: 'none',
            marginBottom: 22,
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{ ...sectionLabel, marginBottom: 0 }}>Чек-лист</div>
          {card.checklist.length > 0 && (
            <>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)' }}>
                {doneCount}/{card.checklist.length}
              </span>
              <div
                style={{
                  flex: 1,
                  height: 6,
                  borderRadius: 99,
                  background: 'var(--color-border-soft)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${progress}%`,
                    height: '100%',
                    background: 'var(--color-accent)',
                    transition: 'width .2s',
                  }}
                />
              </div>
            </>
          )}
        </div>
        <DndContext
          sensors={checklistSensors}
          collisionDetection={closestCenter}
          onDragEnd={onChecklistDragEnd}
        >
          <SortableContext
            items={card.checklist.map((i) => i.id)}
            strategy={verticalListSortingStrategy}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
              {card.checklist.map((item) => (
                <ChecklistRow
                  key={item.id}
                  item={item}
                  onToggle={() => onToggleChecklistItem(item.id, !item.done)}
                  onDelete={() => onDeleteChecklistItem(item.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
        <input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addItem();
            }
          }}
          placeholder="Добавить пункт…"
          style={{
            width: '100%',
            height: 36,
            border: '1px solid var(--color-border)',
            borderRadius: 9,
            padding: '0 12px',
            font: 'var(--text-ui)',
            color: 'var(--color-text)',
            outline: 'none',
            marginBottom: 22,
          }}
        />

        <div style={sectionLabel}>Комментарии</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 12 }}>
          {card.comments.map((comment) => (
            <div key={comment.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <Avatar
                id={comment.author.id}
                name={comment.author.name}
                avatar={comment.author.avatar}
                size={28}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span
                    style={{ font: 'var(--text-ui)', fontWeight: 700, color: 'var(--color-text)' }}
                  >
                    {comment.author.name}
                  </span>
                  <span style={{ fontSize: 11.5, color: 'var(--color-text-muted-soft)' }}>
                    {formatCommentTime(comment.createdAt)}
                  </span>
                  {comment.author.id === user?.id && (
                    <button
                      type="button"
                      onClick={() => onDeleteComment(comment.id)}
                      aria-label="Удалить комментарий"
                      style={{
                        marginLeft: 'auto',
                        border: 'none',
                        background: 'none',
                        color: 'var(--color-text-muted-soft)',
                        cursor: 'pointer',
                        fontSize: 13,
                        padding: 0,
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
                <div
                  style={{
                    font: 'var(--text-ui)',
                    fontWeight: 500,
                    color: 'var(--color-text-secondary-strong)',
                    whiteSpace: 'pre-wrap',
                    overflowWrap: 'break-word',
                  }}
                >
                  {comment.text}
                </div>
              </div>
            </div>
          ))}
        </div>
        {members.some((member) => member.id !== user?.id) && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 6,
              marginBottom: 8,
            }}
          >
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Упомянуть:</span>
            {members
              .filter((member) => member.id !== user?.id)
              .map((member) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => addMention(member.handle)}
                  style={{
                    border: '1px solid var(--color-border)',
                    borderRadius: 99,
                    padding: '3px 8px',
                    background: 'var(--color-surface)',
                    color: 'var(--color-accent)',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  @{member.handle}
                </button>
              ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, marginBottom: 22 }}>
          <input
            value={commentDraft}
            onChange={(e) => setCommentDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                submitComment();
              }
            }}
            placeholder="Написать комментарий или @ник…"
            style={{
              flex: 1,
              height: 38,
              border: '1px solid var(--color-border)',
              borderRadius: 9,
              padding: '0 12px',
              font: 'var(--text-ui)',
              color: 'var(--color-text)',
              outline: 'none',
            }}
          />
          <button
            type="button"
            onClick={submitComment}
            aria-label="Отправить комментарий"
            style={{
              height: 38,
              padding: '0 15px',
              border: 'none',
              borderRadius: 9,
              background: 'var(--color-accent)',
              color: '#fff',
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            ↑
          </button>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 10,
            borderTop: '1px solid var(--color-border)',
            paddingTop: 16,
          }}
        >
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={() => onToggleDone(!card.done)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                height: 38,
                padding: '0 14px',
                borderRadius: 9,
                border: card.done ? '1px solid transparent' : '1px solid var(--color-border)',
                background: card.done ? 'var(--color-success-bg)' : 'var(--color-surface)',
                color: card.done ? 'var(--color-success)' : 'var(--color-text-secondary)',
                font: 'var(--text-ui)',
                fontWeight: card.done ? 700 : 400,
                cursor: 'pointer',
              }}
            >
              <span
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: card.done ? 'var(--color-success)' : 'transparent',
                  border: card.done ? 'none' : '1.6px solid var(--drag-placeholder)',
                  color: '#fff',
                }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
              {card.done ? 'Выполнено' : 'Отметить выполненной'}
            </button>
            <button
              type="button"
              onClick={onDuplicate}
              title="Дублировать карточку"
              aria-label="Дублировать карточку"
              style={{
                width: 38,
                height: 38,
                border: '1px solid var(--color-border)',
                borderRadius: 9,
                background: 'var(--color-surface)',
                color: 'var(--color-text-secondary)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="12" height="12" rx="2.5" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            </button>
            <button
              type="button"
              onClick={onArchive}
              title="Убрать в архив"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                height: 38,
                padding: '0 14px',
                border: '1px solid var(--color-border)',
                borderRadius: 9,
                background: 'var(--color-surface)',
                color: 'var(--color-text-secondary)',
                font: 'var(--text-ui)',
                cursor: 'pointer',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="4" rx="1" />
                <path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8" />
                <line x1="10" y1="12" x2="14" y2="12" />
              </svg>
              В архив
            </button>
            <button
              type="button"
              onClick={onDelete}
              style={{
                height: 38,
                padding: '0 14px',
                border: '1px solid var(--color-danger)',
                borderRadius: 9,
                background: 'var(--color-danger-bg)',
                color: 'var(--color-danger)',
                font: 'var(--text-ui)',
                cursor: 'pointer',
              }}
            >
              Удалить
            </button>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                height: 38,
                padding: '0 16px',
                border: '1px solid var(--color-border)',
                borderRadius: 9,
                background: 'var(--color-surface)',
                color: 'var(--color-text-secondary)',
                font: 'var(--text-ui)',
                cursor: 'pointer',
              }}
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={save}
              style={{
                height: 38,
                padding: '0 18px',
                border: 'none',
                borderRadius: 9,
                background: 'var(--color-accent)',
                color: '#fff',
                font: 'var(--text-ui)',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: 'var(--shadow-accent-button)',
              }}
            >
              Сохранить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Строка чек-листа: перетаскивается для смены порядка (drag за текст,
// кнопки работают как обычно — порог 5px отличает клик от переноса).
function ChecklistRow({
  item,
  onToggle,
  onDelete,
}: {
  item: ChecklistItem;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        touchAction: 'none',
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-label={item.done ? 'Снять отметку' : 'Отметить выполненным'}
        style={{
          width: 18,
          height: 18,
          flexShrink: 0,
          borderRadius: 5,
          border: item.done
            ? '1.5px solid var(--color-accent)'
            : '1.5px solid var(--drag-placeholder)',
          background: item.done ? 'var(--color-accent)' : 'transparent',
          color: '#fff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {item.done && (
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </button>
      <span
        style={{
          flex: 1,
          font: 'var(--text-ui)',
          fontWeight: 500,
          color: item.done ? 'var(--color-text-muted-soft)' : 'var(--color-text)',
          textDecoration: item.done ? 'line-through' : 'none',
          cursor: 'grab',
        }}
      >
        {item.text}
      </span>
      <button
        type="button"
        onClick={onDelete}
        aria-label="Удалить пункт"
        style={{
          width: 26,
          height: 26,
          border: 'none',
          borderRadius: 7,
          background: 'transparent',
          color: 'var(--color-text-muted-soft)',
          cursor: 'pointer',
        }}
      >
        ✕
      </button>
    </div>
  );
}
