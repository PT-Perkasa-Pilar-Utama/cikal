export type { ChangeRequestPort } from "./application/change-request-port.js";
export {
  type ApplyResult,
  ChangeRequestRegistry,
  type ChangeRequestSnapshot,
  type EntityHandler,
} from "./application/change-request-registry.js";
/** Kelas checker-maker untuk uji lintas modul; modul pemilik data memakai `CHANGE_REQUEST_PORT`. */
export { SubmitChangeRequest, type SubmitInput } from "./application/submit-change-request.js";
export { changeRequestData } from "./change-request.data.js";
export { ChangeRequestModule } from "./change-request.module.js";
/** Hanya untuk foreign key `change_request_id` modul lain (XM-05); modul lain tidak membaca tabel ini (XM-02). */
export { changeRequests, type JsonRecord } from "./db/schema.js";
