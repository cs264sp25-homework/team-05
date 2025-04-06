import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import {
  formFields,
  formSchema,
  defaultValues,
} from "./form-config";

interface ChatFormProps {
  onSubmit: (values: z.infer<typeof formSchema>) => void;
  onCancel: () => void;
  initialValues?: z.infer<typeof formSchema>;
  submitLabel?: string;
}

const ChatForm: React.FC<ChatFormProps> = ({
  onSubmit,
  onCancel,
  initialValues = defaultValues,
  submitLabel = "Submit",
}) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialValues,
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
      >
        {formFields.map((field) => (
          <FormField
            key={field.name}
            control={form.control}
            name={field.name}
            render={({ field: fieldProps }) => (
              <FormItem>
                <FormLabel>{field.label}</FormLabel>
                <FormDescription>{field.description}</FormDescription>
                <FormControl>
                  {field.type === "textarea" ? (
                    <Textarea
                      {...fieldProps}
                      value={fieldProps.value ?? ""}
                      rows={5}
                    />
                  ) : (
                    <Input {...fieldProps} value={fieldProps.value ?? ""} />
                  )}
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ))}
        <div className="flex items-center justify-end gap-2">
          <Button type="submit">{submitLabel}</Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default ChatForm;
