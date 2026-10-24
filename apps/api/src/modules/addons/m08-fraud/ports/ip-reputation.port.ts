import type { IntegrationPort } from "@cikal/contracts";
import { z } from "zod";

/** Permintaan kanonik reputasi IP M08 (tech ref 10.4). */
export const ipReputationRequestSchema = z.object({ ipAddress: z.union([z.ipv4(), z.ipv6()]) });
export type IpReputationRequest = z.infer<typeof ipReputationRequestSchema>;

/** Respons kanonik; `province` dan `city` berupa kode wilayah Kemendagri agar bisa dibandingkan dengan alamat KTP. */
export const ipReputationResponseSchema = z.object({
  isVpnOrProxy: z.boolean(),
  country: z.string(),
  province: z.string().nullable(),
  city: z.string().nullable(),
  riskScore: z.int().min(0).max(100),
});
export type IpReputationResponse = z.infer<typeof ipReputationResponseSchema>;

/** `IpReputationPort` (technical-specs 05 §5.18). */
export const ipReputationPort: IntegrationPort<IpReputationRequest, IpReputationResponse> = {
  moduleCode: "M08",
  request: ipReputationRequestSchema,
  response: ipReputationResponseSchema,
};
