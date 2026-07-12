const fs = require('fs');
const path = require('path');

const srcDir = 'c:/Users/Minhaz/Downloads/Easy-Q-Software';
const destDir = 'f:/Edusy User flow/Edusy app';

function ensureDirectoryExistence(filePath) {
  const dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return true;
  }
  ensureDirectoryExistence(dirname);
  fs.mkdirSync(dirname);
}

function copyAndReplace(srcPath, destPath, replacements = []) {
  if (!fs.existsSync(srcPath)) {
    console.error(`Source file not found: ${srcPath}`);
    return;
  }
  let content = fs.readFileSync(srcPath, 'utf-8');
  for (const { search, replace } of replacements) {
    if (search instanceof RegExp) {
        content = content.replace(search, replace);
    } else {
        content = content.split(search).join(replace);
    }
  }
  ensureDirectoryExistence(destPath);
  fs.writeFileSync(destPath, content);
  console.log(`Copied & updated: ${destPath}`);
}

console.log('Starting copy process...');

// 1. Copy PublicDiaryClient.tsx
copyAndReplace(
  path.join(srcDir, 'src/app/share/class-diary/PublicDiaryClient.tsx'),
  path.join(destDir, 'src/app/share/class-diary/PublicDiaryClient.tsx')
);

// 2. Copy guardian page.tsx
copyAndReplace(
  path.join(srcDir, 'src/app/share/class-diary/page.tsx'),
  path.join(destDir, 'src/app/share/class-diary/page.tsx'),
  [{ search: '@/config/prisma', replace: '@/utils/db' }]
);

// 3. Copy TeacherDiaryClient.tsx
copyAndReplace(
  path.join(srcDir, 'src/app/share/class-diary/teacher/TeacherDiaryClient.tsx'),
  path.join(destDir, 'src/app/share/class-diary/teacher/TeacherDiaryClient.tsx'),
  [{ search: '@/app/user/class-diary/_components/CheckupModal', replace: '@/app/dashboard/class-diary/_components/CheckupModal' }]
);

// 4. Copy teacher page.tsx
copyAndReplace(
  path.join(srcDir, 'src/app/share/class-diary/teacher/page.tsx'),
  path.join(destDir, 'src/app/share/class-diary/teacher/page.tsx'),
  [{ search: '@/config/prisma', replace: '@/utils/db' }]
);

// 5. Create API route
copyAndReplace(
  path.join(srcDir, 'src/app/apis/share/class-diary/route.ts'),
  path.join(destDir, 'src/app/api/share/class-diary/route.ts'),
  [
    { search: '@/config/prisma', replace: '@/utils/db' },
    { search: 'import { successResponse } from "@/utils/serverError";', replace: 'import { NextResponse } from "next/server";' },
    { search: /return successResponse\((.*?)\);/g, replace: 'return NextResponse.json({ success: true, data: $1 });' },
    { search: 'import { NextRequest } from "next/server";', replace: 'import { NextRequest, NextResponse } from "next/server";' }
  ]
);

console.log('Finished copying share pages and API to Edusy app!');
