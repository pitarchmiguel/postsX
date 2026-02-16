"use client";

import { useState } from "react";
import { TopPostItem } from "@/components/top-post-item";
import { Button } from "@/components/ui/button";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";

interface Post {
  post: {
    id: string;
    text: string;
    publishedAt: Date | null;
  };
  impressions: number;
  likes: number;
}

interface TopPostsListProps {
  initialPosts: Post[];
}

export function TopPostsList({ initialPosts }: TopPostsListProps) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [allPostsLoaded, setAllPostsLoaded] = useState(false);

  const handleExpand = async () => {
    if (allPostsLoaded) {
      // Already have all posts, just toggle view
      setIsExpanded(true);
      setPosts(allPostsCache);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/analytics/top-posts?limit=all");
      if (!res.ok) {
        throw new Error("Failed to fetch posts");
      }
      const allPosts = await res.json();
      allPostsCache = allPosts;
      setPosts(allPosts);
      setAllPostsLoaded(true);
      setIsExpanded(true);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load all posts");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCollapse = () => {
    setPosts(initialPosts);
    setIsExpanded(false);
  };

  // Show button only if there are more than 10 posts
  const showExpandButton = !isExpanded && initialPosts.length === 10;
  const showCollapseButton = isExpanded;

  return (
    <>
      <ol className="space-y-2">
        {posts.map((item, i) => (
          <TopPostItem
            key={item.post.id}
            post={item.post}
            index={i}
            impressions={item.impressions}
            likes={item.likes}
          />
        ))}
      </ol>

      {showExpandButton && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleExpand}
          disabled={isLoading}
          className="w-full mt-4"
        >
          {isLoading ? (
            <>
              <Loader2Icon className="size-3 mr-2 animate-spin" />
              Loading...
            </>
          ) : (
            "View All Posts"
          )}
        </Button>
      )}

      {showCollapseButton && (
        <div className="mt-4 space-y-2">
          <p className="text-xs text-muted-foreground text-center">
            Showing all {posts.length} posts
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCollapse}
            className="w-full"
          >
            Show Top 10
          </Button>
        </div>
      )}
    </>
  );
}

// Cache for all posts to avoid refetching
let allPostsCache: Post[] = [];
