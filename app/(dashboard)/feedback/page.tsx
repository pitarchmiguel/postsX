import Link from "next/link";
import { FeedbackForm } from "@/components/feedback-form";
import { isAdmin } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { LayoutListIcon } from "lucide-react";

export default async function FeedbackPage() {
  const admin = await isAdmin();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Feedback</h1>
        {admin && (
          <Button variant="outline" size="sm" asChild>
            <Link href="/feedback/admin">
              <LayoutListIcon className="size-4 mr-2" />
              View received
            </Link>
          </Button>
        )}
      </div>
      <FeedbackForm />
    </div>
  );
}
