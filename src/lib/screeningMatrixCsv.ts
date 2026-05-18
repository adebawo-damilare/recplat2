import type { ScreeningMatrix } from "./screeningsApi";
import { buildCsvContent, downloadCsv } from "./exportCsv";

function screeningStatusLabel(status: ScreeningMatrix["rows"][0]["screeningStatus"]): string {
  if (status === "not_invited") return "Not invited";
  if (status === "pending") return "Awaiting responses";
  return "Submitted";
}

function answerForCsv(
  status: ScreeningMatrix["rows"][0]["screeningStatus"],
  answer: string | null | undefined,
): string {
  if (status !== "submitted") return "";
  return answer?.trim() ?? "";
}

export function buildScreeningMatrixCsv(matrix: ScreeningMatrix): string {
  const { questions, rows } = matrix;
  const headers = [
    "Candidate name",
    "Email",
    "Job",
    "Application ID",
    "Vacancy ID",
    "Screening status",
    ...questions.map((q, i) => `Q${i + 1}: ${q.prompt}`),
  ];

  const dataRows = rows.map((row) => [
    row.candidateName,
    row.candidateEmail,
    row.jobTitle,
    row.applicationId,
    row.vacancyId,
    screeningStatusLabel(row.screeningStatus),
    ...questions.map((q) => answerForCsv(row.screeningStatus, row.answersByQuestionId[q.id])),
  ]);

  return buildCsvContent(headers, dataRows);
}

export function downloadScreeningMatrixCsv(
  matrix: ScreeningMatrix,
  options?: { vacancyJobTitle?: string | null },
): void {
  const date = new Date().toISOString().slice(0, 10);
  const jobPart = options?.vacancyJobTitle
    ? `-${options.vacancyJobTitle.replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").slice(0, 40)}`
    : "";
  const filename = `marketers-screening${jobPart}-${date}.csv`;
  downloadCsv(filename, buildScreeningMatrixCsv(matrix));
}
