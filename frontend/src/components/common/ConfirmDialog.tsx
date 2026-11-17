import { Button } from './Button';
import { Modal } from './Modal';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  isProcessing?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  isProcessing = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={isProcessing ? () => undefined : onCancel}
      title={title}
      description={message}
      size="sm"
    >
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onCancel} disabled={isProcessing}>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm} isLoading={isProcessing}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
