// Unggah satu foto progres ke proyek (POST multipart: `file`, opsional `caption`, `takenAt`).
// Client: uploadWithProgress(projectPhotoUploadUrl(id), file, { fields }). Balasan ActionResult.

import { Prisma } from "@prisma/client";
import { requireAdmin } from "@/features/auth/dal";
import { revalidateProject } from "@/features/projects/revalidate";
import { projectPhotoUploadSchema } from "@/features/projects/schema";
import { fromZodError } from "@/lib/action";
import { wibToUtc } from "@/lib/date";
import { db } from "@/lib/db";
import { discardStoredImage } from "@/lib/images";
import { jsonResult, receiveImageUpload, uploadError } from "@/lib/upload-route";

const NOT_FOUND = "Proyek tidak ditemukan";

function textField(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;

  const project = await db.project.findUnique({ where: { id }, select: { id: true } });
  if (!project) return uploadError(NOT_FOUND, 404);

  const upload = await receiveImageUpload(request);
  if (upload instanceof Response) return upload;

  const fields = projectPhotoUploadSchema.safeParse({
    caption: textField(upload.form, "caption"),
    takenAt: textField(upload.form, "takenAt"),
  });
  if (!fields.success) {
    await discardStoredImage(upload.image);
    return jsonResult(fromZodError(fields.error));
  }

  try {
    const photo = await db.projectPhoto.create({
      data: {
        projectId: project.id,
        storageKey: upload.image.storageKey,
        width: upload.image.width,
        height: upload.image.height,
        caption: fields.data.caption || null,
        takenAt: fields.data.takenAt ? wibToUtc(fields.data.takenAt) : null,
      },
      select: { id: true },
    });
    revalidateProject(project.id);
    return jsonResult({
      ok: true,
      data: {
        id: photo.id,
        storageKey: upload.image.storageKey,
        width: upload.image.width,
        height: upload.image.height,
      },
    });
  } catch (error) {
    await discardStoredImage(upload.image); // jangan tinggalkan file yatim
    // Proyek terhapus di tengah unggahan (FK gagal).
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return uploadError(NOT_FOUND, 404);
    }
    throw error;
  }
}
