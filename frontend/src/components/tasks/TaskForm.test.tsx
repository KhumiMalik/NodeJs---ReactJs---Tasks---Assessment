import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { apiError, makeTask } from '../../test/utils';
import { TaskForm } from './TaskForm';

function renderForm(props: Partial<Parameters<typeof TaskForm>[0]> = {}) {
  const onSubmit = props.onSubmit ?? vi.fn().mockResolvedValue(undefined);
  const onCancel = props.onCancel ?? vi.fn();
  render(<TaskForm submitLabel="Save" {...props} onSubmit={onSubmit} onCancel={onCancel} />);
  return { onSubmit, onCancel };
}

describe('TaskForm', () => {
  it('requires a title', async () => {
    const { onSubmit } = renderForm();
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('The title field is required.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('rejects a title longer than 255 characters', async () => {
    const { onSubmit } = renderForm();
    const title = screen.getByLabelText('Title');
    // Bypass the maxLength attribute to exercise the schema rule.
    title.removeAttribute('maxLength');
    await userEvent.click(title);
    await userEvent.paste('a'.repeat(256));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('The title must not be greater than 255 characters.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits trimmed values and sends an empty description as null', async () => {
    const { onSubmit } = renderForm();
    await userEvent.type(screen.getByLabelText('Title'), '  Buy groceries  ');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSubmit).toHaveBeenCalledWith({ title: 'Buy groceries', description: null });
    expect(screen.queryByLabelText('Mark as completed')).not.toBeInTheDocument();
  });

  it('pre-fills values and includes completion status when editing', async () => {
    const { onSubmit } = renderForm({
      task: makeTask({ title: 'Existing', description: 'Details', isCompleted: false }),
    });

    expect(screen.getByLabelText('Title')).toHaveValue('Existing');
    expect(screen.getByLabelText('Description')).toHaveValue('Details');

    await userEvent.click(screen.getByLabelText('Mark as completed'));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSubmit).toHaveBeenCalledWith({ title: 'Existing', description: 'Details', isCompleted: true });
  });

  it('shows server validation errors on the matching field', async () => {
    const onSubmit = vi
      .fn()
      .mockRejectedValue(apiError(422, 'Validation failed.', { title: ['The title field is required.'] }));
    renderForm({ onSubmit });
    await userEvent.type(screen.getByLabelText('Title'), 'x');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('The title field is required.')).toBeInTheDocument();
  });

  it('shows a form-level error for non-validation failures', async () => {
    const onSubmit = vi.fn().mockRejectedValue(apiError(500, 'An unexpected error occurred.'));
    renderForm({ onSubmit });
    await userEvent.type(screen.getByLabelText('Title'), 'x');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('An unexpected error occurred.');
  });

  it('calls onCancel', async () => {
    const { onCancel } = renderForm();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalled();
  });
});
