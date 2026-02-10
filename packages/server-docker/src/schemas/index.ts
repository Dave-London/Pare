import { z } from "zod";

/** Zod schema for a single Docker container with ID, name, image, state, and port mappings. */
export const ContainerSchema = z.object({
  id: z.string(),
  name: z.string(),
  image: z.string(),
  status: z.string(),
  state: z.enum(["running", "exited", "paused", "restarting", "dead", "created", "removing"]),
  ports: z.array(
    z.object({
      host: z.number().optional(),
      container: z.number(),
      protocol: z.enum(["tcp", "udp"]),
    }),
  ),
  created: z.string(),
});

/** Zod schema for structured docker ps output with container list and running/stopped counts. */
export const DockerPsSchema = z.object({
  containers: z.array(ContainerSchema),
  total: z.number(),
  running: z.number(),
  stopped: z.number(),
});

export type DockerPs = z.infer<typeof DockerPsSchema>;

/** Zod schema for structured docker build output with success status, image ID, and build errors. */
export const DockerBuildSchema = z.object({
  success: z.boolean(),
  imageId: z.string().optional(),
  duration: z.number(),
  steps: z.number().optional(),
  errors: z.array(z.string()),
});

export type DockerBuild = z.infer<typeof DockerBuildSchema>;

/** Zod schema for structured docker logs output with container name, log lines, and total count. */
export const DockerLogsSchema = z.object({
  container: z.string(),
  lines: z.array(z.string()),
  total: z.number(),
});

export type DockerLogs = z.infer<typeof DockerLogsSchema>;

/** Zod schema for a single Docker image with ID, repository, tag, size, and creation time. */
export const ImageSchema = z.object({
  id: z.string(),
  repository: z.string(),
  tag: z.string(),
  size: z.string(),
  created: z.string(),
});

/** Zod schema for structured docker images output with image list and total count. */
export const DockerImagesSchema = z.object({
  images: z.array(ImageSchema),
  total: z.number(),
});

export type DockerImages = z.infer<typeof DockerImagesSchema>;
