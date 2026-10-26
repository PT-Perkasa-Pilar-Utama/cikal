import { describe, expect, it } from "vitest";
import { z } from "zod";
import * as c from "./index.js";

/** Setiap mock yang dipakai stub API dan test frontend harus lolos skema kontraknya. */
const pairs: Array<[string, z.ZodType, unknown]> = [
  ["loginResponse", c.loginResponseSchema, c.loginResponseMock],
  ["sessionResponse", c.sessionResponseSchema, c.sessionResponseMock],
  ["roleList", c.roleListResponseSchema, c.roleListResponseMock],
  ["menuTree", c.menuTreeResponseSchema, c.menuTreeResponseMock],
  ["roleAccessList", c.roleAccessListResponseSchema, c.roleAccessListResponseMock],
  ["changeRequestList", c.changeRequestListResponseSchema, c.changeRequestListResponseMock],
  ["changeRequestDetail", c.changeRequestDetailResponseSchema, c.changeRequestDetailResponseMock],
  ["changeRequestApprove", c.changeRequestReviewResponseSchema, c.changeRequestApproveResponseMock],
  ["changeRequestReject", c.changeRequestReviewResponseSchema, c.changeRequestRejectResponseMock],
  ["changeRequestAccepted", c.changeRequestAcceptedSchema, c.changeRequestAcceptedMock("PRODUCT", null)],
  ["productList", c.productListResponseSchema, c.productListResponseMock],
  ["productDetail", c.productDetailResponseSchema, c.productDetailResponseMock],
  ["productPricing", c.productPricingResponseSchema, c.productPricingResponseMock],
  ["productRoute", c.productRouteResponseSchema, c.productRouteResponseMock],
  ["availableProducts", c.availableProductsResponseSchema, c.availableProductsResponseMock],
  ["processTimeline", c.processTimelineResponseSchema, c.processTimelineResponseMock],
  ["processMonitoring", c.processMonitoringResponseSchema, c.processMonitoringResponseMock],
  ["stepRetry", c.stepRetryResponseSchema, c.stepRetryResponseMock],
  ["processFinish", c.processFinishResponseSchema, c.processFinishResponseMock],
  ["taskList", c.taskListResponseSchema, c.taskListResponseMock],
  ["taskAssign", c.taskStateResponseSchema, c.taskAssignResponseMock],
  ["taskRelease", c.taskStateResponseSchema, c.taskReleaseResponseMock],
  ["license", c.licenseResponseSchema, c.licenseResponseMock],
  ["licenseInstall", c.licenseInstallResponseSchema, c.licenseInstallResponseMock],
  ["cityOptions", c.regionOptionsResponseSchema, c.cityOptionsResponseMock],
  ["subDistrictOptions", c.subDistrictOptionsResponseSchema, c.subDistrictOptionsResponseMock],
  ["regionSearch", c.regionSearchResponseSchema, c.regionSearchResponseMock],
  ["regionSyncStarted", c.regionSyncStartedResponseSchema, c.regionSyncStartedResponseMock],
  ["regionSyncCompleted", c.regionSyncStateResponseSchema, c.regionSyncCompletedResponseMock],
  ["regionSyncFailed", c.regionSyncStateResponseSchema, c.regionSyncFailedResponseMock],
  ["documentChecklistList", c.documentChecklistListResponseSchema, c.documentChecklistListResponseMock],
  ["occupationOptions", c.parameterOptionsResponseSchema, c.occupationOptionsResponseMock],
  ["fileDownloadUrl", c.fileDownloadUrlResponseSchema, c.fileDownloadUrlResponseMock],
  ["decisionMatrixList", c.decisionMatrixListResponseSchema, c.decisionMatrixListResponseMock],
  ["branchList", c.branchListResponseSchema, c.branchListResponseMock],
  ["regionalList", c.regionalListResponseSchema, c.regionalListResponseMock],
  ["approverList", c.userListResponseSchema, c.approverListResponseMock],
  ["approvalHierarchyList", c.approvalHierarchyListResponseSchema, c.approvalHierarchyListResponseMock],
  ["formulaVariableList", c.formulaVariableListResponseSchema, c.formulaVariableListResponseMock],
  ["scoringModelList", c.scoringModelListResponseSchema, c.scoringModelListResponseMock],
  ["scoringModelDetail", c.scoringModelDetailResponseSchema, c.scoringModelDetailResponseMock],
  ["criterion", c.criterionResponseSchema, c.criterionResponseMock],
  ["applicationApproval", c.applicationApprovalResponseSchema, c.applicationApprovalResponseMock],
  ["financing", c.financingResponseSchema, c.financingResponseMock],
  ["decisionSimulation", c.decisionSimulationResponseSchema, c.decisionSimulationResponseMock],
  ["applicationDecision", c.applicationDecisionResponseSchema, c.applicationDecisionResponseMock],
  ["applicationDedup", c.applicationDedupResponseSchema, c.applicationDedupResponseMock],
  ["applicationDukcapil", c.applicationDukcapilResponseSchema, c.applicationDukcapilResponseMock],
  ["applicationFraud", c.applicationFraudResponseSchema, c.applicationFraudResponseMock],
  ["applicationCreditBureau", c.applicationCreditBureauResponseSchema, c.applicationCreditBureauResponseMock],
  ["applicationScoring", c.applicationScoringResponseSchema, c.applicationScoringResponseMock],
  ["applicationDraft", c.applicationDraftResponseSchema, c.applicationDraftResponseMock],
  ["applicationDraftList", c.applicationDraftListResponseSchema, c.applicationDraftListResponseMock],
  ["applicationForm", c.applicationFormResponseSchema, c.applicationFormResponseMock],
  ["sectionSave", c.sectionSaveResponseSchema, c.sectionSaveResponseMock],
  ["applicationDocuments", c.applicationDocumentsResponseSchema, c.applicationDocumentsResponseMock],
  ["documentUpload", c.documentUploadResponseSchema, c.documentUploadResponseMock],
  ["applicationSubmit", c.applicationSubmitResponseSchema, c.applicationSubmitResponseMock],
  ["insurances", c.insuranceListResponseSchema, c.insuranceListResponseMock],
];

describe("contract mocks", () => {
  it.each(pairs)("%s satisfies its schema", (_name, schema, mock) => {
    const result = schema.safeParse(mock);
    expect(result.success, result.success ? "" : JSON.stringify(result.error.issues)).toBe(true);
  });

  it("reports the AC message for empty login fields (AC-01.04)", () => {
    const result = c.loginRequestSchema.safeParse({ username: "", password: "" });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((i) => i.message)).toEqual(["Username is required", "Password is required"]);
  });
});
