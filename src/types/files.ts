import { z } from "zod";

export const createFileSchema = z.object({
  name: z.string().min(1).max(100),
  file: z.optional(z.instanceof(File)),
});

export const updateFileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().min(2).max(500).optional(),
});

export const fileSchema = createFileSchema.extend({
  _id: z.string(),
  _creationTime: z.number(),
  chatId: z.string(),
  storageId: z.string(), // This is a reference to the Convex storage object
  url: z.string(), // This is the URL we can use to download the file
  description: z.optional(z.string().min(2).max(500)),
  status: z.enum(["pending", "processed"]), // File is processed after vectorization
});

export type CreateFileType = z.infer<typeof createFileSchema>;
export type UpdateFileType = z.infer<typeof updateFileSchema>;
export type FileType = z.infer<typeof fileSchema>;
