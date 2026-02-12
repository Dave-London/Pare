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

/** Zod schema for structured docker inspect output with container/image details. */
export const DockerInspectSchema = z.object({
  id: z.string(),
  name: z.string(),
  state: z.object({
    status: z.string(),
    running: z.boolean(),
    startedAt: z.string().optional(),
  }),
  image: z.string(),
  platform: z.string().optional(),
  created: z.string(),
});

export type DockerInspect = z.infer<typeof DockerInspectSchema>;

/** Zod schema for a single Docker network entry. */
export const NetworkSchema = z.object({
  id: z.string(),
  name: z.string(),
  driver: z.string(),
  scope: z.string(),
});

/** Zod schema for structured docker network ls output. */
export const DockerNetworkLsSchema = z.object({
  networks: z.array(NetworkSchema),
  total: z.number(),
});

export type DockerNetworkLs = z.infer<typeof DockerNetworkLsSchema>;

/** Zod schema for a single Docker volume entry. */
export const VolumeSchema = z.object({
  name: z.string(),
  driver: z.string(),
  mountpoint: z.string(),
  scope: z.string(),
});

/** Zod schema for structured docker volume ls output. */
export const DockerVolumeLsSchema = z.object({
  volumes: z.array(VolumeSchema),
  total: z.number(),
});

export type DockerVolumeLs = z.infer<typeof DockerVolumeLsSchema>;

/** Zod schema for a single Docker Compose service entry. */
export const ComposeServiceSchema = z.object({
  name: z.string(),
  service: z.string(),
  state: z.string(),
  status: z.string(),
  ports: z.string().optional(),
});

/** Zod schema for structured docker compose ps output. */
export const DockerComposePsSchema = z.object({
  services: z.array(ComposeServiceSchema),
  total: z.number(),
});

export type DockerComposePs = z.infer<typeof DockerComposePsSchema>;
