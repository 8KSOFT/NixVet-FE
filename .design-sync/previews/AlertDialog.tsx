import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "nixvet-ui";

export const Open = () => (
  <AlertDialog defaultOpen>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Excluir paciente?</AlertDialogTitle>
        <AlertDialogDescription>
          Esta ação removerá o prontuário de Rex permanentemente e não pode
          ser desfeita.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancelar</AlertDialogCancel>
        <AlertDialogAction>Excluir</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);
