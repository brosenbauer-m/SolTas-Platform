"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  post_to_feed: z.boolean().default(false),
  feed_message: z.string().optional(),
});

type Values = z.infer<typeof schema>;

export default function WatchdogIssueForm() {
  const [showFeedMessage, setShowFeedMessage] = React.useState(false);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      description: "",
      post_to_feed: false,
      feed_message: "",
    },
    mode: "onSubmit",
  });

  async function onSubmit(values: Values) {
    console.log(values);
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-5 pb-20 pt-12">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-soltas-text">Report an issue</h1>
        <p className="text-sm text-soltas-muted">Help us keep the community safe and informed.</p>
      </div>

      <div className="rounded-2xl border border-soltas-line bg-white p-7 shadow-sm">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Issue title</FormLabel>
                  <FormControl>
                    <Input placeholder="Short summary" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Describe the issue..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="post_to_feed"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-soltas-line p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(checked) => {
                        field.onChange(checked);
                        setShowFeedMessage(!!checked);
                      }}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Post to feed</FormLabel>
                    <FormDescription>
                      Share this issue to the community feed
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            {showFeedMessage && (
              <FormField
                control={form.control}
                name="feed_message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Feed message (optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add a message to share with the community..."
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      This message will appear in the feed alongside the issue
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <Button type="submit">Submit</Button>
          </form>
        </Form>
      </div>
    </main>
  );
}
