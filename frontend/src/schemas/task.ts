import { z } from 'zod';

export const taskFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'The title field is required.')
    .max(255, 'The title must not be greater than 255 characters.'),
  description: z.string().trim().max(5000, 'The description must not be greater than 5000 characters.'),
  isCompleted: z.boolean(),
});

export type TaskFormValues = z.infer<typeof taskFormSchema>;
