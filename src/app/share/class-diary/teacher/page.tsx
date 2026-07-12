import prisma from "@/utils/db";
import { notFound } from "next/navigation";
import TeacherDiaryClient from "./TeacherDiaryClient";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ id?: string; token?: string; date?: string; class?: string; tId?: string }>;
}

export default async function SharedTeacherDiaryPage({ searchParams }: PageProps) {
  const { id, token, tId, date, class: className } = await searchParams;

  if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
    return notFound();
  }

  if (!token && !tId) {
    return notFound();
  }

  // 1. Fetch Class Diary master record from DB
  const diary = await (prisma as any).classDiary.findUnique({
    where: { id },
  });

  if (!diary) {
    return notFound();
  }

  // 2. Decode the teacher sharing token or get from tId
  let tName = "";
  let config: any = null;

  if (tId) {
    const links = diary.teacherLinks || [];
    const linkObj = links.find((l: any) => l.id === tId);
    if (!linkObj || !linkObj.config) {
      return notFound();
    }
    tName = linkObj.name;
    config = linkObj.config;
  } else if (token) {
    let decoded;
    try {
      decoded = JSON.parse(decodeURIComponent(escape(atob(token))));
    } catch (e) {
      return notFound();
    }
    tName = decoded.tName;
    config = decoded.config;
  } else {
    return notFound();
  }

  if (!tName || !config) {
    return notFound();
  }

  // 3. Fetch Institute details
  const institute = await prisma.institute.findUnique({
    where: { id: diary.instituteId },
    select: { name: true },
  });

  const instituteName = institute?.name || "Easy-Q Software";

  // Normalize diary structure
  const normalizedDiary = {
    ...diary,
    id: diary.id.toString(),
    userId: diary.userId.toString(),
    instituteId: diary.instituteId.toString(),
  };

  const defaultDate = date || new Date().toISOString().split("T")[0];

  return (
    <div className="min-h-screen bg-slate-50 md:py-10">
      <main className="w-full">
        <TeacherDiaryClient
          diary={normalizedDiary}
          token={token || ""}
          tId={tId || ""}
          instituteName={instituteName}
          allowedConfig={config}
          teacherName={tName}
          initialDate={defaultDate}
        />
      </main>
    </div>
  );
}
