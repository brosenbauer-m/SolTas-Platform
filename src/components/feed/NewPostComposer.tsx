"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ImagePlus, X } from "lucide-react";
import Image from "next/image";

type Organisation = {
  id: string;
  name: string | null;
};

type NewPostComposerProps = {
  userId: string;
  userName: string;
  organisations?: Organisation[];
};

type ImagePreview = {
  file: File;
  preview: string;
};

export function NewPostComposer({ userName, organisations = [] }: NewPostComposerProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [postAs, setPostAs] = useState<string>("me");
  const [visibility, setVisibility] = useState<"public" | "followers">("public");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [images, setImages] = useState<ImagePreview[]>([]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newImages: ImagePreview[] = [];
    Array.from(files).forEach((file) => {
      // Validate file type
      if (!["image/jpeg", "image/png", "image/gif", "image/webp"].includes(file.type)) {
        setError("Only JPEG, PNG, GIF, and WebP images are allowed");
        return;
      }

      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError("Image size must be less than 10MB");
        return;
      }

      newImages.push({
        file,
        preview: URL.createObjectURL(file),
      });
    });

    setImages((prev) => [...prev, ...newImages]);
    setError(null);
    e.target.value = ""; // Reset input
  };

  const removeImage = (index: number) => {
    setImages((prev) => {
      const newImages = [...prev];
      URL.revokeObjectURL(newImages[index].preview);
      newImages.splice(index, 1);
      return newImages;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      setError("Please enter some content for your post.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Create the post first
      const response = await fetch("/api/feed-posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: content.trim(),
          author_organisation_id: postAs === "me" ? null : postAs,
          visibility,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to create post" }));
        throw new Error(errorData.error || "Failed to create post");
      }

      const { post } = await response.json();

      // Upload images if any
      if (images.length > 0) {
        const uploadPromises = images.map(async (image) => {
          const formData = new FormData();
          formData.append("file", image.file);

          const uploadResponse = await fetch(`/api/feed-posts/${post.id}/attachments`, {
            method: "POST",
            body: formData,
          });

          if (!uploadResponse.ok) {
            const errorData = await uploadResponse.json().catch(() => ({ error: "Failed to upload image" }));
            throw new Error(errorData.error || "Failed to upload image");
          }
        });

        await Promise.all(uploadPromises);
      }

      // Success - reset form
      setContent("");
      setPostAs("me");
      setVisibility("public");
      images.forEach((img) => URL.revokeObjectURL(img.preview));
      setImages([]);

      // Show success toast
      toast({
        title: "Post created",
        description: "Your post has been published successfully.",
        duration: 3000,
      });

      // Refresh the feed data without full page reload
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred while creating the post");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-soltas-line bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold tracking-tight text-soltas-text">
        New post
      </h2>

      <div className="space-y-4">
        <Textarea
          placeholder="What's happening?"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          disabled={isSubmitting}
          className="resize-none"
        />

        {organisations.length > 0 && (
          <div className="flex items-center gap-2">
            <label htmlFor="post-as" className="text-sm font-medium text-soltas-text">
              Post as:
            </label>
            <Select value={postAs} onValueChange={setPostAs} disabled={isSubmitting}>
              <SelectTrigger id="post-as" className="w-auto min-w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="me">Me ({userName})</SelectItem>
                {organisations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    Organisation: {org.name || "Unnamed organisation"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex items-center gap-2">
          <label htmlFor="visibility" className="text-sm font-medium text-soltas-text">
            Visible to:
          </label>
          <Select value={visibility} onValueChange={(v) => setVisibility(v as "public" | "followers")} disabled={isSubmitting}>
            <SelectTrigger id="visibility" className="w-auto min-w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="public">Everyone</SelectItem>
              <SelectItem value="followers">Followers only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {error && (
          <div className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {images.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {images.map((image, index) => (
              <div key={index} className="relative aspect-video overflow-hidden rounded-lg border border-soltas-line">
                <Image
                  src={image.preview}
                  alt="Preview"
                  fill
                  className="object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  disabled={isSubmitting}
                  className="absolute right-1 top-1 rounded-full bg-black/50 p-1 text-white transition-colors hover:bg-black/70 disabled:opacity-50"
                  aria-label="Remove image"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <input
              type="file"
              id="image-upload"
              accept="image/jpeg,image/png,image/gif,image/webp"
              multiple
              onChange={handleImageSelect}
              disabled={isSubmitting}
              className="sr-only"
            />
            <label
              htmlFor="image-upload"
              className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border border-soltas-line px-3 py-2 text-sm font-medium text-soltas-text transition-colors hover:bg-soltas-off-white ${
                isSubmitting ? "cursor-not-allowed opacity-50" : ""
              }`}
            >
              <ImagePlus className="h-4 w-4" />
              Add images
            </label>
          </div>
          <Button type="submit" disabled={isSubmitting || !content.trim()}>
            {isSubmitting ? "Posting..." : "Post"}
          </Button>
        </div>
      </div>
    </form>
  );
}
