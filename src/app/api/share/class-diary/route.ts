import prisma from "@/utils/db";
import { NextRequest, NextResponse } from "next/server";
export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return new Response(JSON.stringify({ error: "Missing ID" }), { status: 400 });
    }

    const diary = await (prisma as any).classDiary.findUnique({
      where: { id },
    });

    if (!diary) {
      return new Response(JSON.stringify({ error: "Diary not found" }), { status: 404 });
    }

    // Normalize for Client
    const normalizedDiary = {
      ...diary,
      id: diary.id.toString(),
      userId: diary.userId.toString(),
      instituteId: diary.instituteId.toString(),
    };

    return NextResponse.json({ success: true, data: normalizedDiary });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, token, tId, entries, logTypes, targetClass, targetDates } = body;

    if (!id || (!token && !tId) || !entries) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }

    // 1. Fetch diary from DB
    const diary = await (prisma as any).classDiary.findUnique({
      where: { id },
    });

    if (!diary) {
      return new Response(JSON.stringify({ error: "Diary not found" }), { status: 404 });
    }

    let allowedConfig: Record<string, string[]>;

    if (tId) {
      const links = diary.teacherLinks || [];
      const linkObj = links.find((l: any) => l.id === tId);
      if (!linkObj || !linkObj.config) {
        return new Response(JSON.stringify({ error: "Invalid or expired teacher link" }), { status: 403 });
      }
      allowedConfig = linkObj.config;
    } else {
      // 2. Decode token (legacy support)
      let decoded;
      try {
        decoded = JSON.parse(decodeURIComponent(escape(atob(token))));
      } catch (e) {
        return new Response(JSON.stringify({ error: "Invalid token" }), { status: 400 });
      }
      allowedConfig = decoded.config;
    }

    // 3. Security Check: Validate that incoming changes are ONLY in allowed classes and books
    const currentEntries = diary.entries || {};
    
    // We compare incoming entries with current entries
    // For any difference, we check if the difference is in allowedConfig
    for (const date in entries) {
      const classMap = entries[date] || {};
      const currentClassMap = currentEntries[date] || {};

      for (const className in classMap) {
        const booksMap = classMap[className] || {};
        const currentBooksMap = currentClassMap[className] || {};

        for (const bookId in booksMap) {
          const log = booksMap[bookId] || {};
          const currentLog = currentBooksMap[bookId] || {};

          // Dynamic diff check for all keys
          let hasDiff = false;
          const allKeys = new Set([...Object.keys(log), ...Object.keys(currentLog)]);
          for (const key of allKeys) {
            if ((log[key] || "") !== (currentLog[key] || "")) {
              hasDiff = true;
              break;
            }
          }

          if (hasDiff) {
            // Check if this class is allowed
            const allowedBooks = allowedConfig[className];
            if (!allowedBooks) {
              return new Response(
                JSON.stringify({ error: `Unauthorized modification to class ${className}` }),
                { status: 403 }
              );
            }
            if (bookId !== 'CLASS_NOTICE' && !allowedBooks.includes(bookId)) {
              return new Response(
                JSON.stringify({ error: `Unauthorized modification to class ${className}, book ${bookId}` }),
                { status: 403 }
              );
            }
          }
        }
      }
    }

    // Merge logic to prevent data loss
    let updatedEntries = entries;
    const currentDbEntries = diary.entries || {};

    if (targetClass && targetDates && Array.isArray(targetDates)) {
      const mergedEntries = JSON.parse(JSON.stringify(currentDbEntries));
      const targetClasses = Array.isArray(targetClass) ? targetClass : [targetClass];

      for (const date of targetDates) {
        if (!mergedEntries[date]) {
          mergedEntries[date] = {};
        }
        for (const clsName of targetClasses) {
          if (entries[date] && entries[date][clsName] !== undefined) {
            // Merge only the allowed books inside this class
            if (!mergedEntries[date][clsName]) {
              mergedEntries[date][clsName] = {};
            }
            
            if (clsName === 'GLOBAL') {
              // Only merge GLOBAL_NOTICE
              if (entries[date]['GLOBAL'] && entries[date]['GLOBAL']['GLOBAL_NOTICE'] !== undefined) {
                mergedEntries[date]['GLOBAL']['GLOBAL_NOTICE'] = entries[date]['GLOBAL']['GLOBAL_NOTICE'];
              } else if (mergedEntries[date]['GLOBAL']) {
                delete mergedEntries[date]['GLOBAL']['GLOBAL_NOTICE'];
              }
            } else {
              const allowedBooks = allowedConfig[clsName] || [];
              const clientBooks = entries[date][clsName] || {};
              const dbBooks = mergedEntries[date][clsName];

              for (const bookId of allowedBooks) {
                if (clientBooks[bookId] !== undefined) {
                  dbBooks[bookId] = clientBooks[bookId];
                } else {
                  delete dbBooks[bookId];
                }
              }

              // CLASS_NOTICE
              if (clientBooks['CLASS_NOTICE'] !== undefined) {
                dbBooks['CLASS_NOTICE'] = clientBooks['CLASS_NOTICE'];
              } else {
                delete dbBooks['CLASS_NOTICE'];
              }
            }
          } else {
            if (mergedEntries[date][clsName]) {
              if (clsName === 'GLOBAL') {
                delete mergedEntries[date]['GLOBAL']['GLOBAL_NOTICE'];
              } else {
                const allowedBooks = allowedConfig[clsName] || [];
                for (const bookId of allowedBooks) {
                  delete mergedEntries[date][clsName][bookId];
                }
                delete mergedEntries[date][clsName]['CLASS_NOTICE'];
              }
            }
          }

          // Clean up empty class maps
          if (mergedEntries[date][clsName] && Object.keys(mergedEntries[date][clsName]).length === 0) {
            delete mergedEntries[date][clsName];
          }
        }

        // Clean up empty date maps
        if (Object.keys(mergedEntries[date]).length === 0) {
          delete mergedEntries[date];
        }
      }
      updatedEntries = mergedEntries;
    } else {
      // Fallback: merge based on all allowed classes and books
      const mergedEntries = JSON.parse(JSON.stringify(currentDbEntries));
      for (const date in entries) {
        const clientClassMap = entries[date] || {};
        if (!mergedEntries[date]) {
          mergedEntries[date] = {};
        }
        const dbClassMap = mergedEntries[date];

        for (const className in allowedConfig) {
          const allowedBooks = allowedConfig[className] || [];
          if (!dbClassMap[className]) {
            dbClassMap[className] = {};
          }
          const clientBooksMap = clientClassMap[className] || {};
          const dbBooksMap = dbClassMap[className];

          for (const bookId of allowedBooks) {
            if (clientBooksMap[bookId] !== undefined) {
              dbBooksMap[bookId] = clientBooksMap[bookId];
            } else {
              delete dbBooksMap[bookId];
            }
          }

          if (clientBooksMap['CLASS_NOTICE'] !== undefined) {
            dbBooksMap['CLASS_NOTICE'] = clientBooksMap['CLASS_NOTICE'];
          } else {
            delete dbBooksMap['CLASS_NOTICE'];
          }

          if (Object.keys(dbBooksMap).length === 0) {
            delete dbClassMap[className];
          }
        }

        const clientGlobal = clientClassMap['GLOBAL'] || {};
        const dbGlobal = dbClassMap['GLOBAL'] || {};
        if (clientGlobal['GLOBAL_NOTICE'] !== undefined) {
          if (!dbClassMap['GLOBAL']) {
            dbClassMap['GLOBAL'] = {};
          }
          dbClassMap['GLOBAL']['GLOBAL_NOTICE'] = clientGlobal['GLOBAL_NOTICE'];
        } else if (dbGlobal['GLOBAL_NOTICE'] !== undefined && clientClassMap['GLOBAL'] !== undefined) {
          delete dbGlobal['GLOBAL_NOTICE'];
          if (Object.keys(dbGlobal).length === 0) {
            delete dbClassMap['GLOBAL'];
          }
        }

        if (Object.keys(dbClassMap).length === 0) {
          delete mergedEntries[date];
        }
      }
      updatedEntries = mergedEntries;
    }

    // 4. Update DB
    const updateData: any = { entries: updatedEntries };
    if (logTypes !== undefined) {
      updateData.logTypes = logTypes;
    }

    const updated = await (prisma as any).classDiary.update({
      where: { id },
      data: updateData,
    });

    // Normalize for Client
    const normalizedDiary = {
      ...updated,
      id: updated.id.toString(),
      userId: updated.userId.toString(),
      instituteId: updated.instituteId.toString(),
    };

    return NextResponse.json({ success: true, data: normalizedDiary });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Failed to save" }), { status: 500 });
  }
}
