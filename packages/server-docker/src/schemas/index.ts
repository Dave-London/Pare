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

/** Zod schema for structured docker run output with container ID, image, and detach status. */
export const DockerRunSchema = z.object({
  containerId: z.string(),
  image: z.string(),
  detached: z.boolean(),
  name: z.string().optional(),
});

export type DockerRun = z.infer<typeof DockerRunSchema>;

/** Zod schema for structured docker exec output with exit code, stdout, stderr, and success flag. */
export const DockerExecSchema = z.object({
  exitCode: z.number(),
  stdout: z.string(),
  stderr: z.string(),
  success: z.boolean(),
});

export type DockerExec = z.infer<typeof DockerExecSchema>;

/** Zod schema for structured docker compose up output with service list and started count. */
export const DockerComposeUpSchema = z.object({
  success: z.boolean(),
  services: z.array(z.string()),
  started: z.number(),
});

export type DockerComposeUp = z.infer<typeof DockerComposeUpSchema>;

/** Zod schema for structured docker compose down output with stopped and removed counts. */
export const DockerComposeDownSchema = z.object({
  success: z.boolean(),
  stopped: z.number(),
  removed: z.number(),
});

export type DockerComposeDown = z.infer<typeof DockerComposeDownSchema>;

/** Zod schema for structured docker pull output with image, tag, digest, and success flag. */
export const DockerPullSchema = z.object({
  image: z.string(),
  tag: z.string(),
  digest: z.string().optional(),
  success: z.boolean(),
});

export type DockerPull = z.infer<typeof DockerPullSchema>;
