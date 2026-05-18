import assert from "node:assert/strict";
import { buildScreeningMatrixCsv } from "../src/lib/screeningMatrixCsv.ts";

const csv = buildScreeningMatrixCsv({
  questions: [
    { id: "q1", sortOrder: 10, prompt: 'Say "hello", team', responseType: "textarea" },
    { id: "q2", sortOrder: 20, prompt: "Channels?", responseType: "textarea" },
  ],
  rows: [
    {
      applicationId: "app-1",
      candidateUserId: "u1",
      candidateName: "Ada Lovelace",
      candidateEmail: "ada@example.test",
      jobTitle: "Growth Lead",
      vacancyId: "vac-1",
      screeningStatus: "submitted",
      invitationId: "inv-1",
      answersByQuestionId: { q1: "Campaign A", q2: null },
    },
    {
      applicationId: "app-2",
      candidateUserId: "u2",
      candidateName: "Bob",
      candidateEmail: "bob@example.test",
      jobTitle: "Growth Lead",
      vacancyId: "vac-1",
      screeningStatus: "pending",
      invitationId: "inv-2",
      answersByQuestionId: { q1: null, q2: null },
    },
  ],
});

assert.match(csv, /^\uFEFF/);
assert.match(csv, /Q1: Say ""hello"", team/);
assert.match(csv, /Ada Lovelace/);
assert.match(csv, /Submitted/);
assert.match(csv, /Awaiting responses/);
assert.match(csv, /Campaign A/);

console.log("test-screening-matrix-csv: ok");
