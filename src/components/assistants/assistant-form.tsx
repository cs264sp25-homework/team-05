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
import { defaultValues, formFields, formSchema } from "./form-config";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

interface AssistantFormProps {
  onSubmit: (values: z.infer<typeof formSchema>) => void | Promise<void>;
  onCancel: () => void;
  initialValues?: z.infer<typeof formSchema>;
  submitLabel?: string;
  isEditing?: boolean;
}

const AssistantForm: React.FC<AssistantFormProps> = ({
  onSubmit,
  onCancel,
  initialValues = defaultValues,
  submitLabel = "Submit",
  isEditing = false,
}) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialValues,
  });

  // // For handling tool switches
  // const handleToolToggle = (
  //   toolType: "file_search" | "code_interpreter",
  //   checked: boolean,
  // ) => {
  //   const currentTools = form.getValues("tools") || [];

  //   if (checked) {
  //     // Add the tool if it doesn't exist
  //     if (!currentTools.some((tool) => tool.type === toolType)) {
  //       form.setValue("tools", [...currentTools, { type: toolType }]);
  //     }
  //   } else {
  //     // Remove the tool if it exists
  //     form.setValue(
  //       "tools",
  //       currentTools.filter((tool) => tool.type !== toolType),
  //     );
  //   }
  // };

  // // Check if a tool is enabled
  // const isToolEnabled = (toolType: string) => {
  //   const tools = form.getValues("tools") || [];
  //   return tools.some((tool) => tool.type === toolType);
  // };

  // Filter fields based on creation/editing mode
  const visibleFields = formFields.filter(
    (field) => !(field.hideOnCreate && !isEditing),
  );

  console.log(visibleFields);

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
      >
        {visibleFields.map((field) => (
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
                      value={
                        typeof fieldProps.value === "string"
                          ? fieldProps.value
                          : ""
                      }
                      rows={5}
                      disabled={field.disabled}
                    />
                  ) : field.type === "slider" &&
                    field.name === "temperature" ? (
                    <div className="pt-6 pb-2">
                      {/* <DualRangeSlider
                        min={field.min || 0}
                        max={field.max || 2}
                        step={field.step || 0.1}
                        value={temperatureValue}
                        onValueChange={setTemperatureValue}
                        label={(value) => value?.toFixed(1)}
                        disabled={field.disabled}
                      /> */}
                    </div>
                  ) : field.type === "switch" &&
                    field.name === "tools" &&
                    field.switchOptions ? (
                    <div className="flex flex-col gap-4">
                      {field.switchOptions.map((option) => (
                        <div
                          key={option.value}
                          className="flex items-center justify-between"
                        >
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">
                              {option.label}
                            </FormLabel>
                          </div>
                          {/* <Switch
                            checked={isToolEnabled(option.value)}
                            onCheckedChange={(checked) =>
                              handleToolToggle(
                                option.value as
                                  | "file_search"
                                  | "code_interpreter",
                                checked,
                              )
                            }
                            disabled={field.disabled}
                          /> */}
                        </div>
                      ))}
                    </div>
                  ) : field.type === "select" ? (
                    <Select>
                      <SelectTrigger className="w-[700px]">
                        <SelectValue placeholder="Select how many weeks" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="one">1</SelectItem>
                          <SelectItem value="two">2</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  ): 
                    (
                    <Input
                      {...fieldProps}
                      value={
                        typeof fieldProps.value === "string"
                          ? fieldProps.value
                          : ""
                      }
                      disabled={field.disabled}
                    />
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

export default AssistantForm;