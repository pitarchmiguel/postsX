import { PostsTable } from "@/components/posts-table";

export default function PostsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Posts</h1>
      <PostsTable />
    </div>
  );
}
