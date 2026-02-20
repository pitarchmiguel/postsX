import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon } from "lucide-react";
import { FeedbackAdminList } from "@/components/feedback-admin-list";

export default function FeedbackAdminPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/feedback">
            <ArrowLeftIcon className="size-4 mr-1" />
            Back
          </Link>
        </Button>
      </div>
      <h1 className="text-xl font-semibold">Feedback received</h1>
      <FeedbackAdminList />
    </div>
  );
}
