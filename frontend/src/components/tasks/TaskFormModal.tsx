import { useCreateTask, useUpdateTask } from '../../hooks/useTasks';
import type { Task, TaskInput } from '../../types/task';
import { Modal } from '../common/Modal';
import { useToast } from '../../hooks/useToast';
import { TaskForm } from './TaskForm';

interface TaskFormModalProps {
  open: boolean;
  /** The task to edit; omit to create a new task. */
  task?: Task;
  onClose: () => void;
}

export function TaskFormModal({ open, task, onClose }: TaskFormModalProps) {
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const toast = useToast();

  async function handleSubmit(input: TaskInput) {
    if (task) {
      await updateTask.mutateAsync({ id: task.id, input });
      toast.success('Task updated successfully.');
    } else {
      await createTask.mutateAsync(input);
      toast.success('Task created successfully.');
    }
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={task ? 'Edit task' : 'New task'}
      description={task ? 'Update the details of this task.' : 'Add a task to your list.'}
    >
      {/* Keyed so the form resets when switching between tasks. */}
      <TaskForm
        key={task?.id ?? 'new'}
        task={task}
        submitLabel={task ? 'Save changes' : 'Create task'}
        onSubmit={handleSubmit}
        onCancel={onClose}
      />
    </Modal>
  );
}
