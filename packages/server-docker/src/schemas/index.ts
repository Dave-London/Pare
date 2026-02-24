import { z } from "zod";

/** Zod schema for a single Docker container with ID, name, image, state, and port mappings. */
export const ContainerSchema = z.object({
  id: z.string(),
  name: z.string(),
  image: z.string(),
  status: z.string(),
  state: z
    .enum(["running", "exited", "paused", "restarting", "dead", "created", "removing"])
    .optional(),
  ports: z
    .array(
      z.object({
        host: z.number().optional(),
        container: z.number(),
        protocol: z.enum(["tcp", "udp"]),
      }),
    )
    .optional(),
  created: z.string().optional(),
  /** #117: Container labels as key-value pairs. */
  labels: z.record(z.string(), z.string()).optional(),
  /** #118: Networks the container is connected to. */
  networks: z.array(z.string()).optional(),
});

/** Zod schema for structured docker ps output with container list. */
export const DockerPsSchema = z.object({
  containers: z.array(ContainerSchema),
});

export type DockerPs = z.infer<typeof DockerPsSchema>;

/** Zod schema for a structured build error with line number and context. (#97) */
export const BuildErrorSchema = z.object({
  message: z.string(),
  line: z.number().optional(),
  dockerfile: z.string().optional(),
});

/** Zod schema for structured docker build output with success status, image ID, and build errors. */
export const DockerBuildSchema = z.object({
  success: z.boolean(),
  imageId: z.string().optional(),
  cacheByStep: z
    .array(
      z.object({
        step: z.string(),
        cached: z.boolean(),
      }),
    )
    .optional(),
  /** #97: Structured error objects with optional line numbers and Dockerfile context. */
  errors: z.array(BuildErrorSchema).optional(),
});

export type DockerBuild = z.infer<typeof DockerBuildSchema>;

/** Zod schema for structured docker logs output with log lines and entries. */
export const DockerLogsSchema = z.object({
  lines: z.array(z.string()).optional(),
  entries: z
    .array(
      z.object({
        timestamp: z.string().optional(),
        message: z.string(),
      }),
    )
    .optional(),
  isTruncated: z.boolean().optional(),
  head: z.array(z.string()).optional(),
  tail: z.array(z.string()).optional(),
  /** #113: Separate stdout lines. */
  stdoutLines: z.array(z.string()).optional(),
  /** #113: Separate stderr lines. */
  stderrLines: z.array(z.string()).optional(),
});

export type DockerLogs = z.infer<typeof DockerLogsSchema>;

/** Zod schema for a single Docker image with ID, repository, tag, size, digest, and creation time. */
export const ImageSchema = z.object({
  id: z.string(),
  repository: z.string(),
  tag: z.string(),
  size: z.string(),
  sizeBytes: z.number().optional(),
  digest: z.string().optional(),
  created: z.string().optional(),
  /** #110: ISO 8601 timestamp for machine-readable creation dates. */
  createdAt: z.string().optional(),
  labels: z.record(z.string(), z.string()).optional(),
});

/** Zod schema for structured docker images output with image list. */
export const DockerImagesSchema = z.object({
  images: z.array(ImageSchema),
});

export type DockerImages = z.infer<typeof DockerImagesSchema>;

/** Zod schema for structured docker run output with container ID and detach status. */
export const DockerRunSchema = z.object({
  containerId: z.string(),
  detached: z.boolean(),
  name: z.string().optional(),
  /** #121/#122: Exit code for non-detached runs or error runs. */
  exitCode: z.number().optional(),
  /** #122: Captured stdout for non-detached runs. */
  stdout: z.string().optional(),
  /** #121/#122: Captured stderr for error/non-detached runs. */
  stderr: z.string().optional(),
  /** #121: Error category for structured error responses. */
  errorCategory: z
    .enum(["image-not-found", "port-conflict", "permission-denied", "daemon-error", "unknown"])
    .optional(),
});

export type DockerRun = z.infer<typeof DockerRunSchema>;

/** Zod schema for structured docker exec output with exit code, stdout, and stderr. */
export const DockerExecSchema = z.object({
  exitCode: z.number(),
  stdout: z.string().optional(),
  stderr: z.string().optional(),
  /** #108: Whether the output was truncated to the limit. */
  isTruncated: z.boolean().optional(),
  timedOut: z.boolean().optional(),
  json: z.unknown().optional(),
  parseJsonError: z.string().optional(),
});

export type DockerExec = z.infer<typeof DockerExecSchema>;

/** Zod schema for a per-service state entry in compose-up output. (#107) */
export const ComposeUpServiceStateSchema = z.object({
  name: z.string(),
  action: z.string(),
});

/** Zod schema for structured docker compose up output with service list. */
export const DockerComposeUpSchema = z.object({
  success: z.boolean(),
  services: z.array(z.string()).optional(),
  /** #107: Per-service state details. */
  serviceStates: z.array(ComposeUpServiceStateSchema).optional(),
  networksCreated: z.number().optional(),
  volumesCreated: z.number().optional(),
});

export type DockerComposeUp = z.infer<typeof DockerComposeUpSchema>;

/** Zod schema for a per-container action entry in compose-down output. (#100) */
export const ComposeDownContainerSchema = z.object({
  name: z.string(),
  action: z.string(),
});

/** Zod schema for structured docker compose down output with stopped count. */
export const DockerComposeDownSchema = z.object({
  success: z.boolean(),
  stopped: z.number(),
  /** #100: Per-container details with name and action. */
  containers: z.array(ComposeDownContainerSchema).optional(),
  /** #101: Count of volumes removed (separated from container/network removal count). */
  volumesRemoved: z.number().optional(),
  /** #101: Count of networks removed (separated from container removal count). */
  networksRemoved: z.number().optional(),
});

export type DockerComposeDown = z.infer<typeof DockerComposeDownSchema>;

/** Zod schema for structured docker pull output with digest, status, and success flag. */
export const DockerPullSchema = z.object({
  digest: z.string().optional(),
  status: z.enum(["pulled", "up-to-date", "error"]),
  success: z.boolean(),
  /** #120: Size parsed from pull output summary line. */
  size: z.string().optional(),
  errorType: z.enum(["auth", "not-found", "network-timeout", "rate-limit", "unknown"]).optional(),
  errorMessage: z.string().optional(),
});

export type DockerPull = z.infer<typeof DockerPullSchema>;

/** Zod schema for network settings in inspect output. (#111) */
export const NetworkSettingsSchema = z.object({
  ipAddress: z.string(),
  ports: z
    .record(
      z.string(),
      z
        .array(
          z.object({
            hostIp: z.string().optional(),
            hostPort: z.string().optional(),
          }),
        )
        .nullable(),
    )
    .optional(),
});

/** Zod schema for a mount entry in inspect output. (#112) */
export const MountSchema = z.object({
  source: z.string(),
  destination: z.string(),
  mode: z.string().optional(),
});

/** Zod schema for structured docker inspect output with container/image details.
 *  The `inspectType` field distinguishes between container and image inspect results.
 *  Container-specific fields: `state`, `healthStatus`, `restartPolicy`.
 *  Image-specific fields: `repoTags`, `repoDigests`, `size`, `cmd`, `entrypoint`.
 */
export const DockerInspectSchema = z.object({
  id: z.string(),
  name: z.string(),
  /** Discriminates between container and image inspect results. */
  inspectType: z.enum(["container", "image", "volume", "network"]).optional(),
  state: z
    .object({
      status: z.string(),
      running: z.boolean(),
      startedAt: z.string().optional(),
    })
    .optional(),
  image: z.string(),
  platform: z.string().optional(),
  created: z.string().optional(),
  status: z.string().optional(),
  running: z.boolean().optional(),
  healthStatus: z.enum(["healthy", "unhealthy", "starting", "none"]).optional(),
  env: z.array(z.string()).optional(),
  restartPolicy: z.string().optional(),
  // Image-specific fields (present when inspectType === "image")
  /** Repository tags for the image (e.g., ["nginx:latest", "nginx:1.25"]). */
  repoTags: z.array(z.string()).optional(),
  /** Repository digests for the image (e.g., ["nginx@sha256:abc..."]). */
  repoDigests: z.array(z.string()).optional(),
  /** Image size in bytes. */
  size: z.number().optional(),
  /** Default command (Config.Cmd) for the image. */
  cmd: z.array(z.string()).optional(),
  /** Entrypoint (Config.Entrypoint) for the image. */
  entrypoint: z.array(z.string()).optional(),
  /** #111: Network settings with IP and port bindings. */
  networkSettings: NetworkSettingsSchema.optional(),
  /** #112: Mount/volume information. */
  mounts: z.array(MountSchema).optional(),
  // Network/volume inspect fields
  driver: z.string().optional(),
  scope: z.string().optional(),
  mountpoint: z.string().optional(),
  labels: z.record(z.string(), z.string()).optional(),
  relatedTargets: z
    .array(
      z.object({
        target: z.string(),
        id: z.string(),
        name: z.string(),
        inspectType: z.enum(["container", "image", "volume", "network"]).optional(),
      }),
    )
    .optional(),
});

export type DockerInspect = z.infer<typeof DockerInspectSchema>;

/** Zod schema for a single Docker network entry. */
export const NetworkSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  driver: z.string(),
  scope: z.string().optional(),
  createdAt: z.string().optional(),
  /** #115: Network labels for compose-project identification. */
  labels: z.record(z.string(), z.string()).optional(),
  /** #116: Whether IPv6 is enabled. */
  ipv6: z.boolean().optional(),
  /** #116: Whether the network is internal (no external connectivity). */
  internal: z.boolean().optional(),
  /** #116: Whether the network is attachable. */
  attachable: z.boolean().optional(),
});

/** Zod schema for structured docker network ls output. */
export const DockerNetworkLsSchema = z.object({
  networks: z.array(NetworkSchema),
});

export type DockerNetworkLs = z.infer<typeof DockerNetworkLsSchema>;

/** Zod schema for a single Docker volume entry. */
export const VolumeSchema = z.object({
  name: z.string(),
  driver: z.string(),
  mountpoint: z.string().optional(),
  scope: z.string().optional(),
  status: z.string().optional(),
  createdAt: z.string().optional(),
  /** #125: Volume labels for compose-project identification. */
  labels: z.record(z.string(), z.string()).optional(),
});

/** Zod schema for structured docker volume ls output. */
export const DockerVolumeLsSchema = z.object({
  volumes: z.array(VolumeSchema),
});

export type DockerVolumeLs = z.infer<typeof DockerVolumeLsSchema>;

/** Zod schema for a single Docker Compose service port entry parsed from the Publishers array. */
export const ComposeServicePortSchema = z.object({
  host: z.number().optional(),
  container: z.number(),
  protocol: z.enum(["tcp", "udp"]),
});

/** Zod schema for a single Docker Compose service entry. */
export const ComposeServiceSchema = z.object({
  name: z.string(),
  service: z.string(),
  state: z
    .enum(["running", "exited", "paused", "restarting", "dead", "created", "removing"])
    .catch("created"),
  status: z.string().optional(),
  ports: z.array(ComposeServicePortSchema).optional(),
  /** #105: Health status from compose ps JSON output. */
  health: z.string().optional(),
  exitCode: z.number().optional(),
});

/** Zod schema for structured docker compose ps output. */
export const DockerComposePsSchema = z.object({
  services: z.array(ComposeServiceSchema),
});

export type DockerComposePs = z.infer<typeof DockerComposePsSchema>;

/** Zod schema for a single compose log entry with timestamp, service, and message. */
export const ComposeLogEntrySchema = z.object({
  timestamp: z.string().optional(),
  service: z.string(),
  message: z.string(),
  /** #104: Log level extracted from common patterns. */
  level: z.enum(["debug", "info", "warn", "error", "fatal"]).optional(),
});

/** Zod schema for structured docker compose logs output with service-separated log entries. */
export const DockerComposeLogsSchema = z.object({
  entries: z.array(ComposeLogEntrySchema).optional(),
  isTruncated: z.boolean().optional(),
  head: z
    .array(
      z.object({
        service: z.string(),
        message: z.string(),
        timestamp: z.string().optional(),
        level: z.enum(["debug", "info", "warn", "error", "fatal"]).optional(),
      }),
    )
    .optional(),
  tail: z
    .array(
      z.object({
        service: z.string(),
        message: z.string(),
        timestamp: z.string().optional(),
        level: z.enum(["debug", "info", "warn", "error", "fatal"]).optional(),
      }),
    )
    .optional(),
});

export type DockerComposeLogs = z.infer<typeof DockerComposeLogsSchema>;

/** Zod schema for a single service build result in docker compose build output. */
export const ComposeBuildServiceSchema = z.object({
  service: z.string(),
  success: z.boolean(),
  duration: z.number().optional(),
  error: z.string().optional(),
  imageId: z.string().optional(),
  image: z.string().optional(),
});

/** Zod schema for structured docker compose build output with per-service build status. */
export const DockerComposeBuildSchema = z.object({
  success: z.boolean(),
  services: z.array(ComposeBuildServiceSchema).optional(),
});

export type DockerComposeBuild = z.infer<typeof DockerComposeBuildSchema>;

/** Zod schema for a single container's resource usage stats. */
export const ContainerStatsSchema = z.object({
  id: z.string(),
  name: z.string(),
  state: z.string().optional(),
  cpuPercent: z.number(),
  memoryUsage: z.string().optional(),
  memoryLimit: z.string().optional(),
  memoryPercent: z.number(),
  netIO: z.string().optional(),
  blockIO: z.string().optional(),
  pids: z.number(),
  /** #123: Memory usage in bytes. */
  memoryUsageBytes: z.number().optional(),
  /** #123: Memory limit in bytes. */
  memoryLimitBytes: z.number().optional(),
  /** #124: Network input in bytes. */
  netIn: z.number().optional(),
  /** #124: Network output in bytes. */
  netOut: z.number().optional(),
  /** #124: Block read in bytes. */
  blockRead: z.number().optional(),
  /** #124: Block write in bytes. */
  blockWrite: z.number().optional(),
});

/** Zod schema for structured docker stats output with container stats list. */
export const DockerStatsSchema = z.object({
  containers: z.array(ContainerStatsSchema),
});

export type DockerStats = z.infer<typeof DockerStatsSchema>;
