"use client";

import dynamic from "next/dynamic";
import { EditorLoading } from "@/components/editor-loading";

const TestEditorV2 = dynamic(
  () =>
    import("@/components/notes/test-editor-v2").then(
      (mod) => mod.TestEditorV2
    ),
  {
    ssr: false,
    loading: () => <EditorLoading />,
  }
);

export default function NewNotePage() {
  return <TestEditorV2 />;
}
