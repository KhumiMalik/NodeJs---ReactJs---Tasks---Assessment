import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { taskFormSchema, type TaskFormValues } from '../../schemas/task';
import { getErrorMessage } from '../../services/api';
import type { Task, TaskInput } from '../../types/task';
import { applyServerFieldErrors } from '../../utils/forms';
import { Button } from '../common/Button';
import { FormError } from '../common/FormError';
import { Input, Textarea } from '../common/Input';

interface TaskFormProps {
  /** When provided the form edits this task and shows the completion checkbox. */
  task?: Task;
  submitLabel: string;
  onSubmit: (input: TaskInput) => Promise<unknown>;
  onCancel: () => void;
}

/** Reusable create/edit form. Client validation mirrors the API; server 422 errors map to fields. */
export function TaskForm({ task, submitLabel, onSubmit, onCancel }: TaskFormProps) {
  const isEditing = Boolean(task);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: task?.title ?? '',
      description: task?.description ?? '',
      isCompleted: task?.isCompleted ?? false,
    },
  });

  const submit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await onSubmit({
        title: values.title,
        description: values.description || null,
        ...(isEditing && { isCompleted: values.isCompleted }),
      });
    } catch (error) {
      if (!applyServerFieldErrors(error, setError, ['title', 'description', 'isCompleted'])) {
        setFormError(getErrorMessage(error));
      }
    }
  });

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <FormError message={formError} />
      <Input
        label="Title"
        placeholder="What needs to be done?"
        autoFocus
        maxLength={255}
        error={errors.title?.message}
        {...register('title')}
      />
      <Textarea
        label="Description"
        placeholder="Add more details (optional)"
        rows={4}
        maxLength={5000}
        hint="Optional. Up to 5000 characters."
        error={errors.description?.message}
        {...register('description')}
      />
      {isEditing && (
        <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
            {...register('isCompleted')}
          />
          Mark as completed
        </label>
      )}
      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
