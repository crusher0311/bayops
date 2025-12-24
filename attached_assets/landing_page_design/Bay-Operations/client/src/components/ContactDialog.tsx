import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertContactRequestSchema, type InsertContactRequest } from "@shared/schema";
import { useSubmitContact } from "@/hooks/use-contact";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

interface ContactDialogProps {
  children: React.ReactNode;
}

export function ContactDialog({ children }: ContactDialogProps) {
  const [open, setOpen] = useState(false);
  const mutation = useSubmitContact();
  
  const form = useForm<InsertContactRequest>({
    resolver: zodResolver(insertContactRequestSchema),
    defaultValues: {
      name: "",
      email: "",
      companyName: "",
      message: "",
    },
  });

  const onSubmit = (data: InsertContactRequest) => {
    mutation.mutate(data, {
      onSuccess: () => {
        setOpen(false);
        form.reset();
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Get Started with BayOPS</DialogTitle>
          <DialogDescription>
            Fill out the form below and our team will get you set up with a free trial.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" {...form.register("name")} placeholder="John Doe" data-testid="input-name" />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input id="email" type="email" {...form.register("email")} placeholder="john@autoshop.com" data-testid="input-email" />
            {form.formState.errors.email && (
              <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="companyName">Shop Name</Label>
            <Input id="companyName" {...form.register("companyName")} placeholder="Acme Auto Repair" data-testid="input-company" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">How can we help?</Label>
            <Textarea id="message" {...form.register("message")} placeholder="Tell us about your shop..." data-testid="input-message" />
          </div>

          <Button type="submit" className="w-full bg-sky-500 hover:bg-sky-400" disabled={mutation.isPending} data-testid="button-submit">
            {mutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Request Free Trial"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
