import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Annotation, FactorTag } from '@aerospec/types';
import { FACTOR_TAGS } from '@aerospec/types';
import { createAnnotation } from '../api/annotations';
import './AnnotationDialog.css';

interface AnnotationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  homeId: string;
  roomId?: string | null;
  deviceId?: string | null;
  onSuccess?: (annotation: Annotation) => void;
}

interface TagMeta {
  label: string;
  emoji: string;
}

export const TAG_META: Record<FactorTag, TagMeta> = {
  cooking: { label: 'Cooking', emoji: '🍳' },
  cleaning: { label: 'Cleaning', emoji: '🧹' },
  windows_open: { label: 'Windows open', emoji: '🪟' },
  guests: { label: 'Guests', emoji: '👥' },
  candles_incense: { label: 'Candles / incense', emoji: '🕯️' },
  smoking: { label: 'Smoking', emoji: '🚬' },
  air_purifier_on: { label: 'Air purifier on', emoji: '💨' },
  hvac_on: { label: 'HVAC on', emoji: '❄️' },
  pets: { label: 'Pets', emoji: '🐾' },
  outdoor_event: { label: 'Outdoor event', emoji: '🎪' },
  other: { label: 'Other', emoji: '📝' },
};

function toDateTimeLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function dateTimeLocalToIso(value: string): string {
  return new Date(`${value}:00`).toISOString();
}

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function AnnotationDialog({
  isOpen,
  onClose,
  homeId,
  roomId,
  deviceId,
  onSuccess,
}: AnnotationDialogProps) {
  const [selectedTags, setSelectedTags] = useState<FactorTag[]>([]);
  const [note, setNote] = useState('');
  const [ts, setTs] = useState(() => toDateTimeLocal(new Date()));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    setSelectedTags([]);
    setNote('');
    setTs(toDateTimeLocal(new Date()));
    setError(null);
    setSubmitting(false);

    const focusFirst = () => {
      const panel = panelRef.current;
      if (!panel) return;
      const focusables = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      const first = focusables.find(el => !el.hasAttribute('disabled'));
      first?.focus();
    };

    const timer = window.setTimeout(focusFirst, 0);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;

      const panel = panelRef.current;
      if (!panel) return;

      const focusables = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter(el => !el.hasAttribute('disabled'));

      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey) {
        if (active === first || !focusables.includes(active!)) {
          event.preventDefault();
          last.focus();
        }
      } else {
        if (active === last || !focusables.includes(active!)) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const toggleTag = (tag: FactorTag) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === overlayRef.current) {
      onClose();
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (selectedTags.length === 0 || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const annotation = await createAnnotation({
        homeId,
        roomId,
        deviceId,
        ts: dateTimeLocalToIso(ts),
        tags: selectedTags,
        note: note.trim() || null,
      });
      onSuccess?.(annotation);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save reaction');
    } finally {
      setSubmitting(false);
    }
  };

  const dialog = (
    <div
      ref={overlayRef}
      className="annotation-overlay"
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        ref={panelRef}
        className="annotation-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="annotation-dialog-title"
        tabIndex={-1}
      >
        <div className="annotation-dialog__header">
          <h2 id="annotation-dialog-title" className="annotation-dialog__title">
            Record a reaction
          </h2>
          <button
            type="button"
            className="annotation-dialog__close"
            onClick={onClose}
            aria-label="Close dialog"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="annotation-dialog__body">
          <div className="annotation-dialog__field">
            <label htmlFor="annotation-time" className="annotation-dialog__label">
              When did it happen?
            </label>
            <input
              id="annotation-time"
              type="datetime-local"
              className="annotation-dialog__input"
              value={ts}
              onChange={e => setTs(e.target.value)}
              required
            />
          </div>

          <fieldset className="annotation-dialog__field annotation-dialog__fieldset">
            <legend className="annotation-dialog__label">What happened?</legend>
            <div className="annotation-dialog__tags">
              {FACTOR_TAGS.map(tag => {
                const selected = selectedTags.includes(tag);
                const { label, emoji } = TAG_META[tag];
                return (
                  <button
                    key={tag}
                    type="button"
                    className={`annotation-dialog__pill ${
                      selected ? 'annotation-dialog__pill--selected' : ''
                    }`}
                    onClick={() => toggleTag(tag)}
                    aria-pressed={selected}
                    aria-label={label}
                  >
                    <span aria-hidden="true">{emoji}</span>
                    {label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="annotation-dialog__field">
            <label htmlFor="annotation-note" className="annotation-dialog__label">
              Notes <span className="annotation-dialog__optional">(optional)</span>
            </label>
            <textarea
              id="annotation-note"
              className="annotation-dialog__note"
              rows={3}
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Anything else to remember?"
            />
          </div>

          {error && <p className="annotation-dialog__error" role="alert">{error}</p>}

          <div className="annotation-dialog__actions">
            <button
              type="button"
              className="annotation-dialog__cancel"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="annotation-dialog__save"
              disabled={selectedTags.length === 0 || submitting}
            >
              {submitting ? 'Saving…' : 'Save reaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
}
