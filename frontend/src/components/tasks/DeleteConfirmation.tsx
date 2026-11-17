import { useDeleteTask } from '../../hooks/useTasks';
import { getErrorMessage } from '../../services/api';
import type { Task } from '../../types/task';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { useToast } from '../../hooks/useToast';

interface DeleteConfirmationProps {
  /** The task to delete; the dialog is open while this is set. */
  task: Task | null;
  onClose: () => void;
  onDeleted?: () => void;
}

/** Confirms moving a task to the trash (soft delete). */
export function DeleteConfirmation({ task, onClose, onDeleted }: DeleteConfirmationProps) {
  const deleteTask = useDeleteTask();
  const toast = useToast();

  function handleConfirm() {
    if (!task) return;
    deleteTask.mutate(task.id, {
      onSuccess: () => {
        toast.success('Task moved to trash.');
        onClose();
        onDeleted?.();
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  return (
    <ConfirmDialog
      open={task !== null}
      title="Move task to trash?"
      message={task ? `“${task.title}” will be moved to the trash. You can restore it later.` : ''}
      confirmLabel="Move to trash"
      isProcessing={deleteTask.isPending}
      onConfirm={handleConfirm}
      onCancel={onClose}
    />
  );
}
