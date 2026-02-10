import { z } from "zod";

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

export const DockerPsSchema = z.object({
  containers: z.array(ContainerSchema),
  total: z.number(),
  running: z.number(),
  stopped: z.number(),
});

export type DockerPs = z.infer<typeof DockerPsSchema>;

export const DockerBuildSchema = z.object({
  success: z.boolean(),
  imageId: z.string().optional(),
  duration: z.number(),
  steps: z.number().optional(),
  errors: z.array(z.string()),
});

export type DockerBuild = z.infer<typeof DockerBuildSchema>;

export const DockerLogsSchema = z.object({
  container: z.string(),
  lines: z.array(z.string()),
  total: z.number(),
});

export type DockerLogs = z.infer<typeof DockerLogsSchema>;

export const ImageSchema = z.object({
  id: z.string(),
  repository: z.string(),
  tag: z.string(),
  size: z.string(),
  created: z.string(),
});

export const DockerImagesSchema = z.object({
  images: z.array(ImageSchema),
  total: z.number(),
});

export type DockerImages = z.infer<typeof DockerImagesSchema>;
