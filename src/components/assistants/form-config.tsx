import { z } from "zod";

import { createAssistantSchema } from "@/types/assistant";

export const formSchema = createAssistantSchema;

export type FormField = {
  name: keyof z.infer<typeof formSchema>;
  label: string;
  placeholder?: string;
  description?: string;
  type: "text" | "textarea" | "number" | "select" | "slider" | "switch";
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  step?: number;
  switchOptions?: { value: string; label: string }[];
  hideOnCreate?: boolean;
  disabled?: boolean;
  numWeeks?: "one" | "two";
};

export const formFields: FormField[] = [
  {
    name: "name",
    label: "Name",
    placeholder: "Assistant name",
    description: "Keep the name short and descriptive. (Limit 50 characters)",
    type: "text",
  },
  {
    name: "description",
    label: "Description",
    placeholder: "Assistant description",
    description:
      "You can add a brief description for your assistant. (Limit 200 characters)",
    type: "textarea",
  },
  {
    name: "instructions",
    label: "Preferences",
    placeholder: "Preferences",
    description:
      "Provide detailed preferences for how the assistant should try to schedule tasks on your behalf (Ex. 'I'm not a morning person, so please avoid scheduling meetings before 10 AM').",
    type: "textarea",
  },
  // {
  //   name: "model",
  //   label: "Model",
  //   placeholder: "Select a model",
  //   description: "Choose the AI model to power this assistant.",
  //   type: "text",
  // },
  {
    name: "numWeeks",
    label: "Availability",
    type: "select",
    description: "Select how many weeks on your schedule that colleagues can view"
  },
  {
    name: "openaiAssistantId",
    label: "OpenAI Assistant ID",
    placeholder: "asst_...",
    description:
      "The ID of the assistant in OpenAI's system. This is automatically assigned and cannot be modified.",
    type: "text",
    hideOnCreate: true,
    disabled: true,
  },
];

export const defaultValues: z.infer<typeof formSchema> = {
  name: "",
  description: undefined,
  instructions: "",
  model: "gpt-4o-mini",
  temperature: 1.0,
  openaiAssistantId: "",
  tools: [],
  numWeeks: 1,
};