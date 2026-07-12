import prisma from "@/utils/db";
import { notFound } from "next/navigation";
import PublicDiaryClient from "./PublicDiaryClient";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ id?: string; date?: string; class?: string }>;
}

export default async function PublicDiaryPage({ searchParams }: PageProps) {
  const { id, date, class: className } = await searchParams;

  if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
    return notFound();
  }

  // 1. Fetch Class Diary master record from DB
  const diary = await (prisma as any).classDiary.findUnique({
    where: { id },
  });

  if (!diary) {
    return notFound();
  }

  // 2. Fetch Institute details for display
  const institute = await prisma.institute.findUnique({
    where: { id: diary.instituteId },
    select: { name: true },
  });

  const instituteName = institute?.name || "Easy-Q Software";

  // Standardize dates
  const defaultDate = date || new Date().toISOString().split("T")[0];
  const defaultClass = className || "";

  // Normalize diary structure
  const normalizedDiary = {
    ...diary,
    id: diary.id.toString(),
    userId: diary.userId.toString(),
    instituteId: diary.instituteId.toString(),
  };

  return (
    <div className="min-h-screen bg-slate-50 md:py-10">
      <main className="w-full">
        <PublicDiaryClient
          diary={normalizedDiary}
          initialDate={defaultDate}
          initialClass={defaultClass}
          instituteName={instituteName}
        />
      </main>
    </div>
  );
}
