import type { Metadata } from "next";
import { ConsultantsDirectoryClient } from "@/features/consultants/consultants-directory-client";
import { listConsultants } from "@/repositories/consultants-repository";
import { listUserTags } from "@/repositories/tags-repository";
import { requireUser } from "@/server/session";

export const metadata: Metadata = {
  title: "Consultantes",
};

export default async function ConsultantesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const params = (await searchParams.catch(() => ({}))) as Record<
    string,
    string | string[] | undefined
  >;

  const q = typeof params?.q === "string" ? params.q : "";
  const tag = typeof params?.tag === "string" ? params.tag : "";
  const showingArchived = params?.archivados === "1";
  const openCreateInitially = params?.nuevo === "1";

  const consultants = await listConsultants(user.id, {
    query: q,
    tag,
    onlyArchived: showingArchived,
  }).catch(() => []);

  const allTags = (await listUserTags(user.id, "consultant").catch(() => [])).map(
    (tag) => tag.name
  );

  return (
    <ConsultantsDirectoryClient
      consultants={consultants}
      allTags={allTags}
      initialQuery={q}
      initialTag={tag}
      showingArchived={showingArchived}
      openCreateInitially={openCreateInitially}
    />
  );
}
