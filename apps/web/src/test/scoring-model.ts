import {
  type FormulaVariable,
  type FormulaVariableListResponse,
  formulaVariableListResponseMock,
  type ParameterOptionsResponse,
  type ScoringModelDetail,
  type ScoringModelDetailResponse,
  type SessionResponse,
  scoringModelDetailResponseMock,
  scoringModelListResponseMock,
  sessionResponseMock,
} from "@cikal/contracts";
import type { ApiRoutes, StubResponse } from "./render-app";

export const DRAFT = scoringModelDetailResponseMock.data;
export const MODEL_PATH = `/master/scoring/${DRAFT.id}`;
export const MODEL_KEY = `GET /api/v1/scoring-models/${DRAFT.id}`;
export const CRITERIA_KEY = `POST /api/v1/scoring-models/${DRAFT.id}/criteria`;
export const SUBMIT_KEY = `POST /api/v1/scoring-models/${DRAFT.id}/submit`;

/** Sesi Maker: Scoring Model View, Create, dan Update (api-specs 01 §1.11). */
export const makerSession: StubResponse = {
  status: 200,
  body: {
    data: {
      ...sessionResponseMock.data,
      menus: [
        {
          menuCode: "MST",
          menuName: "Master Data",
          link: null,
          iconName: "database",
          actions: ["VIEW"],
          children: [
            {
              menuCode: "MST-SCORING",
              menuName: "Scoring Model",
              link: "/master/scoring",
              iconName: "gauge",
              actions: ["VIEW", "CREATE", "UPDATE"],
              children: [],
            },
          ],
        },
      ],
    },
  } satisfies SessionResponse,
};

/** Katalog contoh api-specs 09 §9.2 ditambah Age untuk pembanding bertipe angka. */
const variables: FormulaVariable[] = [
  ...formulaVariableListResponseMock.data,
  { variableCode: "AGE", label: "Age", dataType: "NUMBER", paramType: null, source: "APPLICATION" },
];

export const modelOf = (model: Partial<ScoringModelDetail> = {}): StubResponse => ({
  status: 200,
  body: { data: { ...DRAFT, ...model } } satisfies ScoringModelDetailResponse,
});

/** Rute API halaman Scoring Model; `extra` menambah atau mengganti respons. */
export function scoringRoutes(extra: ApiRoutes = {}): ApiRoutes {
  return {
    "GET /api/v1/auth/session": makerSession,
    "GET /api/v1/scoring-models?page=1": { status: 200, body: scoringModelListResponseMock },
    [MODEL_KEY]: modelOf(),
    "GET /api/v1/formula-variables?usage=SCORING": {
      status: 200,
      body: { data: variables } satisfies FormulaVariableListResponse,
    },
    "GET /api/v1/parameters/Occupation/options": {
      status: 200,
      body: {
        data: [
          { paramId: "001", paramValue: "Karyawan Swasta", isActive: true },
          { paramId: "003", paramValue: "ASN", isActive: true },
          { paramId: "004", paramValue: "Karyawan BUMN", isActive: true },
        ],
      } satisfies ParameterOptionsResponse,
    },
    ...extra,
  };
}
