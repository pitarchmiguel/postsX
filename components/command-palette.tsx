"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { PenSquareIcon, FileTextIcon, PlayIcon, SearchIcon } from "lucide-react";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ id: string; text: string }[]>([]);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(() => {
      fetch(`/api/posts?q=${encodeURIComponent(searchQuery)}`)
        .then((r) => r.json())
        .then((posts: { id: string; text: string }[]) =>
          setSearchResults(posts.slice(0, 5))
        )
        .catch(() => setSearchResults([]));
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <Command>
        <CommandInput
          placeholder="Search posts or run a command..."
          value={searchQuery}
          onValueChange={setSearchQuery}
        />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {searchResults.length > 0 && (
            <CommandGroup heading="Search results">
              {searchResults.map((post) => (
                <CommandItem
                  key={post.id}
                  onSelect={() => {
                    router.push(`/composer?edit=${post.id}`);
                    setOpen(false);
                  }}
                >
                  <SearchIcon className="mr-2 size-4" />
                  <span className="truncate">{post.text.slice(0, 60)}...</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          <CommandGroup heading="Actions">
            <CommandItem
              onSelect={() => {
                router.push("/composer");
                setOpen(false);
              }}
            >
              <PenSquareIcon className="mr-2 size-4" />
              Create post
            </CommandItem>
            <CommandItem
              onSelect={() => {
                router.push("/posts");
                setOpen(false);
              }}
            >
              <FileTextIcon className="mr-2 size-4" />
              Go to posts
            </CommandItem>
            <CommandItem
              onSelect={async () => {
                try {
                  await fetch("/api/scheduler/run", { method: "POST" });
                  setOpen(false);
                } catch {
                  // ignore
                }
              }}
            >
              <PlayIcon className="mr-2 size-4" />
              Run scheduler now
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
