import { useQueryAssistants } from "@/hooks/use-query-assistants";
import Loading from "@/components/loading";
import Empty from "@/components/empty";
import Assistant from "./assistant";

const AssistantList: React.FC = () => {
  const { data: assistants, loading, error } = useQueryAssistants();

  console.log("Current state of the assistants being passedi n:", assistants);

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return <Empty message="Error loading assistants" />;
  }

  if (assistants && assistants.length === 0) {
    return <Empty message="No assistants found. Create one to get started!" />;
  }

  console.log(assistants);

  return (
    <div aria-label="Assistant list" className="flex flex-col gap-2">
      {assistants &&
        assistants
          .filter((assistant) => assistant !== null)
          .map(({ _id, name, description, model }) => (
            <div key={_id} role="listitem">
              <Assistant
                _id={_id}
                name={name}
                description={description}
                model={model}
              />
            </div>
          ))}
    </div>
  );
};

export default AssistantList;