import { it, expect } from "vitest";
import {
  pageNumber,
  shouldPollAnalysis,
  sameKeywordColumns,
} from "../src/lib/efficiency";
it("never polls closed or completed reviews even when the worker is offline", () => {
  expect(shouldPollAnalysis(false, "PENDING")).toBe(false);
  expect(shouldPollAnalysis(true, "SUCCEEDED")).toBe(false);
  expect(shouldPollAnalysis(true, "FAILED")).toBe(false);
  expect(shouldPollAnalysis(true, "RUNNING")).toBe(true);
  expect(shouldPollAnalysis(true, "PENDING")).toBe(true);
});
it("bounds invalid pagination without losing the first page", () => {
  for (const n of [-3, 0, "bad", 1.2, Infinity]) expect(pageNumber(n)).toBe(1);
  expect(pageNumber("2")).toBe(2);
  expect(pageNumber(900000)).toBe(100000);
});

it("ignores JSONB key order when deciding whether a CSV needs rewriting", () => {
  expect(
    sameKeywordColumns(
      { keyword: "green mural", competition: "100" },
      { competition: "100", keyword: "green mural" },
    ),
  ).toBe(true);
  expect(
    sameKeywordColumns({ competition: "100" }, { competition: "101" }),
  ).toBe(false);
});
