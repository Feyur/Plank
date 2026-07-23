import { useEffect, useState } from 'react';
import * as api from './boardApi';
import type { ArchivedCard } from './types';

// Панель архива доски: список убранных карточек с восстановлением и удалением.
// Данные тянет сама; доска за панелью обновится сама через realtime-сигнал.
export function ArchivePanel({ boardId, onClose }: { boardId: string; onClose: () => void }) {
  const [cards, setCards] = useState<ArchivedCard[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function reload() {
    try {
      const data = await api.fetchArchive(boardId);
      setCards(data.cards);
    } catch {
      setCards([]);
    }
  }

  useEffect(() => {
    reload();
  }, [boardId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function restore(id: string) {
    setBusyId(id);
    try {
      await api.setCardArchived(id, false);
      await reload();
    } finally {
      setBusyId(null);
    }
  }

  async function remove(card: ArchivedCard) {
    if (!window.confirm(`Удалить карточку «${card.title}» навсегда? Отменить нельзя.`)) return;
    setBusyId(card.id);
    try {
      await api.deleteCard(card.id);
      await reload();
    } finally {
      setBusyId(null);
    }
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
        padding: '80px 20px',
        zIndex: 110,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 480,
          maxWidth: '100%',
          maxHeight: 'calc(100vh - 140px)',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-modal)',
          boxShadow: 'var(--shadow-modal)',
          padding: 22,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, font: 'var(--text-section-title)', flex: 1 }}>Архив</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            style={{
              width: 32,
              height: 32,
              border: 'none',
              borderRadius: 9,
              background: 'var(--color-border-soft)',
              color: 'var(--color-text-secondary)',
              fontSize: 17,
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {cards === null ? (
            <p style={{ color: 'var(--color-text-muted)', font: 'var(--text-secondary)' }}>
              Загрузка…
            </p>
          ) : cards.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)', font: 'var(--text-secondary)' }}>
              Архив пуст. Убранные с доски карточки появятся здесь.
            </p>
          ) : (
            cards.map((card) => (
              <div
                key={card.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  border: '1px solid var(--color-border)',
                  borderRadius: 10,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      font: 'var(--text-ui)',
                      color: 'var(--color-text)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {card.title}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--color-text-muted-soft)' }}>
                    из списка «{card.listTitle}»
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => restore(card.id)}
                  disabled={busyId === card.id}
                  style={{
                    height: 32,
                    padding: '0 12px',
                    border: '1px solid var(--color-border)',
                    borderRadius: 8,
                    background: 'var(--color-surface)',
                    color: 'var(--color-accent)',
                    font: 'var(--text-secondary)',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Вернуть
                </button>
                <button
                  type="button"
                  onClick={() => remove(card)}
                  disabled={busyId === card.id}
                  aria-label={`Удалить навсегда: ${card.title}`}
                  style={{
                    width: 32,
                    height: 32,
                    border: '1px solid var(--color-border)',
                    borderRadius: 8,
                    background: 'transparent',
                    color: 'var(--color-text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  🗑
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
