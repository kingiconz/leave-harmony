export const DEPARTMENTS = [
  "RID",
  "Corporate Support",
  "People and Culture",
  "Financial Crimes and Investigation",
  "Cybersecurity",
  "Project",
  "Business Practice Area",
  "Legal Support",
] as const;

export type Department = (typeof DEPARTMENTS)[number];
