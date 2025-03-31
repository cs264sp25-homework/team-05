import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Trash } from "lucide-react";

interface DeleteConfirmationProps {
  onDelete: (e: React.MouseEvent<HTMLButtonElement>) => void;
  name?: string;
  trigger?: React.ReactNode;
}

const DeleteConfirmation: React.FC<DeleteConfirmationProps> = ({
  onDelete,
  name,
  trigger,
}) => {
  return (
    <AlertDialog>
      {trigger ? (
        trigger
      ) : (
        <AlertDialogTrigger asChild>
          <Button variant="destructive" className="w-full">
            <Trash className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:block">Delete {name}</span>
          </Button>
        </AlertDialogTrigger>
      )}

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete your{" "}
            <span className="lowercase">{name}</span>.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onDelete}>Continue</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteConfirmation;
