import { useForm } from "react-hook-form";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  Input,
} from "nixvet-ui";

type Values = { petName: string };

export const Default = () => {
  const form = useForm<Values>({
    defaultValues: { petName: "" },
    errors: {
      petName: { type: "required", message: "Informe o nome do pet." },
    },
  });

  return (
    <Form {...form}>
      <form className="w-72">
        <FormField
          control={form.control}
          name="petName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do pet</FormLabel>
              <FormControl>
                <Input placeholder="Rex" {...field} />
              </FormControl>
              <FormDescription>
                Como o pet é chamado pelo tutor.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
};
