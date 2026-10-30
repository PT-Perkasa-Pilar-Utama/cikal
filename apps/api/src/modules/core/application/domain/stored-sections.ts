import {
  type ApplicationFormSections,
  type ApplicationSectionInput,
  applicationSectionInputSchema,
  type BusinessSectionInput,
  businessSectionInputSchema,
  type CollateralSectionInput,
  collateralSectionInputSchema,
  type EmergencyContactSectionInput,
  emergencyContactSectionInputSchema,
  type OccupationSectionInput,
  occupationSectionInputSchema,
  type PersonalSectionInput,
  personalSectionInputSchema,
  type SpouseSectionInput,
  spouseSectionInputSchema,
} from "@cikal/contracts";

/** Section tersimpan dalam bentuk body section, agar submit memakai aturan strict yang sama dengan "Next". */
export interface StoredSectionInputs {
  application: ApplicationSectionInput;
  personal: PersonalSectionInput;
  spouse: SpouseSectionInput;
  occupation: OccupationSectionInput;
  business: BusinessSectionInput;
  collateral: CollateralSectionInput;
  emergencyContact: EmergencyContactSectionInput;
}

/** Field kosong tersimpan `null`; body section memakai field yang tidak dikirim. Objek bertingkat ikut dibersihkan. */
function withoutNulls(value: object | null): Record<string, unknown> {
  if (value === null) return {};
  return Object.fromEntries(
    Object.entries(value).flatMap(([key, field]: [string, unknown]) => {
      if (field === null) return [];
      return [[key, typeof field === "object" ? withoutNulls(field) : field]];
    }),
  );
}

/** Section yang belum pernah disimpan dibaca sebagai body kosong sehingga semua field wajibnya ditandai. */
export function storedSectionInputs(sections: ApplicationFormSections): StoredSectionInputs {
  const { consentAt, addresses, ...personal } = sections.personal;
  return {
    application: applicationSectionInputSchema.parse(withoutNulls(sections.application)),
    personal: personalSectionInputSchema.parse({
      ...withoutNulls(personal),
      addresses: { id: withoutNulls(addresses.id), residence: withoutNulls(addresses.residence) },
      consentGiven: consentAt !== null,
    }),
    spouse: spouseSectionInputSchema.parse(withoutNulls(sections.spouse)),
    occupation: occupationSectionInputSchema.parse(withoutNulls(sections.occupation)),
    business: businessSectionInputSchema.parse(withoutNulls(sections.business)),
    collateral: collateralSectionInputSchema.parse(withoutNulls(sections.collateral)),
    emergencyContact: emergencyContactSectionInputSchema.parse(withoutNulls(sections["emergency-contact"])),
  };
}
