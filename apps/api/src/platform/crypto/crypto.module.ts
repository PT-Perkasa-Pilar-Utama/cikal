import { Global, Module } from "@nestjs/common";
import { TenantKeysRepository } from "../db/tenant-keys.repository.js";
import { TenantEncryption } from "./tenant-encryption.js";

/** Layanan kunci platform untuk API dan worker (technical-specs 07 §7.4). */
@Global()
@Module({ providers: [TenantKeysRepository, TenantEncryption], exports: [TenantEncryption] })
export class CryptoModule {}
