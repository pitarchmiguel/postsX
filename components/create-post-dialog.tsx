"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ComposerForm } from "@/components/composer-form";
import { PenSquareIcon } from "lucide-react";

export function CreatePostDialog() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const handleSuccess = () => {
    setOpen(false);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <PenSquareIcon className="size-4" />
          Create post
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-h-[90vh] max-w-2xl overflow-y-auto sm:max-w-2xl"
        showCloseButton={true}
      >
        <DialogHeader>
          <DialogTitle>Create post</DialogTitle>
        </DialogHeader>
        <ComposerForm onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  );
}
