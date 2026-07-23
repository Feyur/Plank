import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CardView } from './CardView';
import type { Card } from './types';

export function CardItem({
  card,
  onOpen,
  onToggleDone,
}: {
  card: Card;
  onOpen: (card: Card) => void;
  onToggleDone: (cardId: string, done: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
  });

  return (
    <CardView
      card={card}
      innerRef={setNodeRef}
      className={isDragging ? 'plank-card dragging' : 'plank-card'}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        ...(isDragging
          ? {
              border: '2px dashed var(--drag-placeholder)',
              background: 'var(--drag-ghost-bg)',
              boxShadow: 'none',
            }
          : {}),
      }}
      onClick={() => onOpen(card)}
      onToggleDone={(done) => onToggleDone(card.id, done)}
      {...attributes}
      {...listeners}
    />
  );
}
