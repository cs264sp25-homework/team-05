import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
  } from "@/components/ui/select";
import { useQueryAssistantsAccess } from "@/hooks/use-query-assistants-access";
  import { AssistantIdDisplay } from "@/types/chat";
  
  interface AssistantDropdownProps {
    value: AssistantIdDisplay;
    onChange: (value: AssistantIdDisplay) => void | Promise<void>;
    className?: string;
    disabled?: boolean;
  }
  
  const AssistantDropdown: React.FC<AssistantDropdownProps> = ({
    value,
    onChange,
    className = "",
    disabled = false,
  }) => {
    const { data: assistants, loading, error } = useQueryAssistantsAccess();
  
    const handleChange = async (newValue: string) => {
      await onChange(newValue as AssistantIdDisplay);
    };
  
    return (
      <Select
        value={value}
        onValueChange={handleChange}
        disabled={disabled || loading}
      >
        <SelectTrigger className={className}>
          <SelectValue placeholder="Select an assistant" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="default">Default Assistant</SelectItem>
          {loading && (
            <SelectItem value="loading" disabled>
              Loading...
            </SelectItem>
          )}
          {error && (
            <SelectItem value="error" disabled>
              Error loading assistants
            </SelectItem>
          )}
          {assistants?.map((assistant: any) => (
            <SelectItem key={assistant._id} value={assistant._id}>
              {assistant.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  };
  
  export default AssistantDropdown;