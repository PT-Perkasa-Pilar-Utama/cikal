import type { Address, ApplicationDetail } from "@cikal/contracts";
import { formatDate, formatMoney } from "../../lib/format";
import { ResultFields } from "../application-workflow/ResultLayout";
import { DASH, orDash } from "./labels";

type Sections = ApplicationDetail["sections"];

const money = (value: string | null) => (value ? formatMoney(value) : DASH);
const date = (value: string | null) => (value ? formatDate(value) : DASH);
const address = (value: Address | null) =>
  value
    ? [value.address, value.rt && `RT ${value.rt}`, value.rw && `RW ${value.rw}`, value.zipCode]
        .filter(Boolean)
        .join(", ") || DASH
    : DASH;

/** Tab "Detail": section Application (api-specs 12 §12.5). */
export function ApplicationPanel({ section }: { section: Sections["application"] }) {
  return (
    <ResultFields
      fields={[
        ["Application Type", orDash(section.applicationType)],
        ["Product Category", section.productCategory],
        ["Segment", orDash(section.segment)],
        ["Purpose of Loan", orDash(section.purposeOfLoan)],
        ["Tenor Proposed", orDash(section.tenorProposed)],
        ["Requested Limit", money(section.requestedLimit)],
        ["Source Code", orDash(section.sourceCode)],
        ["Sales Code", orDash(section.salesCode)],
        ["Referral Code", orDash(section.referralCode)],
        ["Marketing Code", orDash(section.marketingCode)],
      ]}
    />
  );
}

export function PersonalPanel({ section }: { section: Sections["personal"] }) {
  return (
    <ResultFields
      fields={[
        ["ID Type", section.idType],
        ["ID Card Number", section.idCardNumber],
        ["Full Name", section.fullName],
        ["Full Name ID", section.fullNameId],
        ["Place of Birth", orDash(section.placeOfBirth)],
        ["Date of Birth", date(section.dateOfBirth)],
        ["Gender", orDash(section.gender)],
        ["Religion", orDash(section.religion)],
        ["Nationality", orDash(section.nationality)],
        ["Education", orDash(section.education)],
        ["Marital Status", orDash(section.marital)],
        ["NPWP Number", orDash(section.npwpNumber)],
        ["Mobile Number", orDash(section.mobileNumber)],
        ["Email", orDash(section.email)],
        ["ID Address", address(section.addresses.id)],
        ["Residence Address", address(section.addresses.residence)],
      ]}
    />
  );
}

export function OccupationPanel({ section }: { section: Sections["occupation"] }) {
  if (!section) return <p>{DASH}</p>;
  return (
    <ResultFields
      fields={[
        ["Source of Income", orDash(section.sourceOfIncome)],
        ["Occupation", orDash(section.occupation)],
        ["Industry of Profession", orDash(section.industryOfProfession)],
        ["Position", orDash(section.position)],
        ["Tenure at Current Job", orDash(section.tenureAtCurrentJob)],
        ["Monthly Income", money(section.monthlyIncomeAllowance)],
        ["Company Name", orDash(section.company.name)],
        ["Company Phone", orDash(section.company.phoneNumber)],
      ]}
    />
  );
}

export function EmergencyContactPanel({ section }: { section: Sections["emergency-contact"] }) {
  if (!section) return <p>{DASH}</p>;
  return (
    <ResultFields
      fields={[
        ["Contact Name", orDash(section.contactName)],
        ["Relation to Applicant", orDash(section.relationToApplicant)],
        ["Mobile Number", orDash(section.mobileNumber)],
        ["Home Phone Number", orDash(section.homePhoneNumber)],
        ["Address", address(section.address)],
      ]}
    />
  );
}
