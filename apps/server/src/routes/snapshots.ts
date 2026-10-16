import type { FastifyInstance } from "fastify";
import { z } from "zod";

import type { SnapshotsRepository } from "../db/repositories/snapshots-repository.ts";
import { toCsv } from "../export/csv.ts";
import { toVcard } from "../export/vcard.ts";
import type { SnapshotService } from "../services/snapshot-service.ts";

const ParamsSchema = z.object({ id: z.string().min(1).max(64) });
const ExportQuerySchema = z.object({ format: z.enum(["vcf", "csv"]) });

export function registerSnapshotRoutes(
  app: FastifyInstance,
  deps: { snapshotService: SnapshotService; snapshots: SnapshotsRepository },
): void {
  app.post("/api/v1/snapshots", async (_request, reply) => {
    const snapshot = deps.snapshotService.start();
    return reply.status(202).header("location", `/api/v1/snapshots/${snapshot.id}`).send(snapshot);
  });

  app.get("/api/v1/snapshots", async () => ({
    items: deps.snapshotService.list(),
    nextCursor: null,
  }));

  app.get("/api/v1/snapshots/:id", async (request) => {
    const { id } = ParamsSchema.parse(request.params);
    return deps.snapshotService.get(id);
  });

  app.get("/api/v1/snapshots/:id/export", async (request, reply) => {
    const { id } = ParamsSchema.parse(request.params);
    const { format } = ExportQuerySchema.parse(request.query);
    const snapshot = deps.snapshotService.requireCompleted(id);
    const rows = deps.snapshots.iterateContacts(snapshot.id);
    const body =
      format === "vcf"
        ? toVcard(
            (function* () {
              for (const row of rows) yield row.contact;
            })(),
          )
        : toCsv(rows);
    const date = snapshot.createdAt.slice(0, 10);
    return reply
      .header(
        "content-type",
        format === "vcf" ? "text/vcard; charset=utf-8" : "text/csv; charset=utf-8",
      )
      .header("content-disposition", `attachment; filename="contact-fuse-backup-${date}.${format}"`)
      .header("cache-control", "no-store")
      .send(body);
  });

  app.delete("/api/v1/snapshots/:id", async (request, reply) => {
    const { id } = ParamsSchema.parse(request.params);
    deps.snapshotService.delete(id);
    return reply.status(204).send();
  });
}
